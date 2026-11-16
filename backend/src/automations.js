import { randomUUID } from 'crypto';
import { prisma, localParts, logActivity, getHome } from './db.js';
import { setDeviceState, accrueAll } from './devices.js';
import { getWeather } from './weather.js';
import { haConfigured, haFetch, stateToPatch } from './ha.js';

export const ACTION_OPS = ['on', 'off', 'toggle', 'lock', 'unlock', 'temp', 'brightness'];

async function actionPatch(action) {
  switch (action.op) {
    case 'on':
    case 'lock':
      return { on: true };
    case 'off':
    case 'unlock':
      return { on: false };
    case 'toggle': {
      const d = await prisma.device.findUnique({ where: { id: action.deviceId } });
      return d ? { on: !d.on } : null;
    }
    case 'temp':
      return { on: true, temp: Number(action.value) || 24 };
    case 'brightness':
      return { on: true, brightness: Number(action.value) || 50 };
    default:
      return null;
  }
}

/** Executa as ações de uma automação. Retorna avisos (ex.: falha no Home Assistant). */
export async function runAutomation(automation, reason = 'agendada') {
  const actions = Array.isArray(automation.actions) ? automation.actions : [];
  const warnings = [];
  let done = 0;
  for (const action of actions) {
    try {
      const patch = await actionPatch(action);
      if (!patch) continue;
      const { warning } = await setDeviceState(action.deviceId, patch, { source: 'automation' });
      if (warning) warnings.push(warning);
      done++;
    } catch (e) {
      warnings.push(e.message);
    }
  }
  await prisma.automation.update({ where: { id: automation.id }, data: { lastRunAt: new Date() } }).catch(() => {});
  await logActivity({
    title: `Automação executada: ${automation.title}`,
    detail: `${done} ação(ões) · ${reason}`,
    kind: 'automation',
  });
  return { done, warnings };
}

export async function runDeviceTriggers(device) {
  const list = await prisma.automation.findMany({
    where: { enabled: true, triggerType: 'device', triggerDeviceId: device.id, triggerState: device.on ? 'on' : 'off' },
  });
  for (const a of list) await runAutomation(a, `gatilho: ${device.name}`);
}

async function tickTime() {
  const { day, time, weekday } = localParts();
  const key = `${day} ${time}`;
  const due = await prisma.automation.findMany({ where: { enabled: true, triggerType: 'time', triggerTime: time } });
  for (const a of due) {
    if (!String(a.triggerDays || '').includes(String(weekday))) continue;
    const claim = await prisma.automation.updateMany({
      where: { id: a.id, OR: [{ lastRunKey: null }, { lastRunKey: { not: key } }] },
      data: { lastRunKey: key },
    });
    if (claim.count === 1) await runAutomation(a, `horário ${time}`);
  }
}

async function tickTemperature() {
  const list = await prisma.automation.findMany({ where: { enabled: true, triggerType: 'temperature' } });
  if (!list.length) return;
  const w = await getWeather();
  if (!w) return;
  for (const a of list) {
    const above = w.temperature > (a.triggerTemp ?? 28);
    if (above && a.lastRunKey !== 'above') {
      const claim = await prisma.automation.updateMany({
        where: { id: a.id, OR: [{ lastRunKey: null }, { lastRunKey: { not: 'above' } }] },
        data: { lastRunKey: 'above' },
      });
      if (claim.count === 1) await runAutomation(a, `temperatura ${w.temperature}°C`);
    } else if (!above && a.lastRunKey === 'above') {
      await prisma.automation.update({ where: { id: a.id }, data: { lastRunKey: 'below' } });
    }
  }
}

/** Puxa do Home Assistant o estado atual dos dispositivos vinculados. */
export async function syncFromHa() {
  const home = await getHome();
  if (!haConfigured(home)) return;
  const devices = await prisma.device.findMany({ where: { haEntityId: { not: null } } });
  if (!devices.length) return;
  const states = await haFetch(home, '/api/states');
  const byId = new Map(states.map((s) => [s.entity_id, s]));
  for (const d of devices) {
    const patch = stateToPatch(d, byId.get(d.haEntityId));
    if (!patch) continue;
    const changed = Object.keys(patch).some((k) => patch[k] !== d[k]);
    if (changed) await setDeviceState(d.id, patch, { source: 'ha' });
  }
}

// ---- Agendador com "lease" no banco: só uma réplica executa por vez ----
const ME = randomUUID();

async function isLeader() {
  const now = new Date();
  const until = new Date(now.getTime() + 45000);
  const res = await prisma.lease.updateMany({
    where: { name: 'scheduler', OR: [{ holder: ME }, { until: { lt: now } }] },
    data: { holder: ME, until },
  });
  if (res.count === 1) return true;
  try {
    await prisma.lease.create({ data: { name: 'scheduler', holder: ME, until } });
    return true;
  } catch {
    return false;
  }
}

function every(ms, fn, name) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      if (await isLeader()) await fn();
    } catch (e) {
      console.error(`${name}:`, e.message);
    } finally {
      running = false;
    }
  };
  setInterval(run, ms);
  setTimeout(run, 3000);
}

export function startScheduler() {
  every(15000, tickTime, 'automações por horário');
  every(20000, syncFromHa, 'sync Home Assistant');
  every(5 * 60000, accrueAll, 'energia');
  every(10 * 60000, tickTemperature, 'automações por temperatura');
  every(6 * 3600000, () => prisma.activity.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 60 * 86400000) } } }), 'limpeza');
}
