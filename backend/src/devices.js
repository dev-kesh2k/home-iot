import { prisma, dayKey, getHome, logActivity } from './db.js';
import { pushToHa } from './ha.js';
import { runDeviceTriggers } from './automations.js';

export const DEFAULT_POWER = { light: 9, ac: 1200, tv: 120, plug: 500, lock: 2, camera: 5 };
export const TYPES = Object.keys(DEFAULT_POWER);

export { HttpError } from './errors.js';
import { HttpError } from './errors.js';

/** Potência efetiva (W): luzes consomem proporcional ao brilho. */
function effectiveWatts(d) {
  if (d.type === 'light') return d.powerW * Math.max(0.05, d.brightness / 100);
  return d.powerW;
}

/**
 * Contabiliza o consumo desde onSince até agora e move onSince para agora.
 * O updateMany condicional evita contar em dobro quando há várias réplicas.
 */
export async function accrue(device, now = new Date()) {
  if (!device.on || !device.onSince) return;
  const start = new Date(device.onSince);
  if (now <= start) return;
  const claim = await prisma.device.updateMany({
    where: { id: device.id, onSince: device.onSince },
    data: { onSince: now },
  });
  if (claim.count !== 1) return;

  const watts = effectiveWatts(device);
  const buckets = new Map();
  for (let t = start.getTime(); t < now.getTime(); ) {
    const next = Math.min(now.getTime(), t + 3600000);
    const key = dayKey(new Date(t));
    buckets.set(key, (buckets.get(key) || 0) + (watts * (next - t)) / 3600000);
    t = next;
  }
  for (const [day, wh] of buckets) {
    await prisma.energyLog.upsert({
      where: { deviceId_day: { deviceId: device.id, day } },
      update: { wh: { increment: wh } },
      create: { deviceId: device.id, type: device.type, day, wh },
    });
  }
}

export async function accrueAll() {
  const devices = await prisma.device.findMany({ where: { on: true, onSince: { not: null } } });
  const now = new Date();
  for (const d of devices) await accrue(d, now).catch((e) => console.error('accrue:', e.message));
}

function describe(d) {
  switch (d.type) {
    case 'lock':
      return `${d.on ? 'Trancou' : 'Destrancou'}: ${d.name}`;
    case 'camera':
      return `${d.on ? 'Ativou' : 'Desativou'}: ${d.name}`;
    default:
      return `${d.on ? 'Ligou' : 'Desligou'}: ${d.name}`;
  }
}

const EDITABLE = ['on', 'brightness', 'lightMode', 'temp', 'acMode', 'fanSpeed', 'swing'];

/**
 * Altera o estado de um dispositivo, contabiliza energia, envia para o Home Assistant
 * e dispara automações. source: 'user' | 'automation' | 'ha' | 'scene'.
 */
export async function setDeviceState(id, patch, { actor = null, source = 'user' } = {}) {
  const d = await prisma.device.findUnique({ where: { id }, include: { room: true } });
  if (!d) throw new HttpError(404, 'Dispositivo não encontrado');

  const data = {};
  for (const k of EDITABLE) if (patch[k] !== undefined) data[k] = patch[k];
  if (data.brightness !== undefined) data.brightness = Math.min(100, Math.max(1, Math.round(Number(data.brightness) || 1)));
  if (data.temp !== undefined) data.temp = Math.min(30, Math.max(16, Math.round(Number(data.temp) || 24)));
  if (Object.keys(data).length === 0) return { device: d };

  const now = new Date();
  await accrue(d, now);
  const newOn = data.on !== undefined ? !!data.on : d.on;
  data.on = newOn;
  data.onSince = newOn ? now : null;

  const updated = await prisma.device.update({ where: { id }, data, include: { room: true } });

  let warning;
  if (source !== 'ha') {
    try {
      await pushToHa(updated);
    } catch (e) {
      warning = e.message;
    }
  }

  if (updated.on !== d.on) {
    const where = updated.room ? ` · ${updated.room.name}` : '';
    const by = source === 'automation' ? 'Automação' : source === 'ha' ? 'Home Assistant' : actor || '';
    await logActivity({
      title: describe(updated),
      detail: `${by}${where}`.replace(/^ · /, ''),
      kind: updated.type === 'lock' || updated.type === 'camera' ? 'security' : 'device',
      deviceId: updated.id,
      userName: actor,
    });

    if (updated.type === 'lock' && !updated.on) {
      const home = await getHome();
      if (home.securityArmed) {
        await logActivity({
          title: 'Alerta: porta destrancada com o alarme armado',
          detail: updated.name,
          kind: 'alert',
          deviceId: updated.id,
        });
      }
    }
    if (source !== 'automation') await runDeviceTriggers(updated).catch((e) => console.error('trigger:', e.message));
  }

  return { device: updated, warning };
}
