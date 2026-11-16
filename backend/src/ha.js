// Integração com o Home Assistant (REST API + token de longa duração).
import { getHome } from './db.js';

export class HaError extends Error {}

function baseUrl(home) {
  return String(home.haUrl || '').replace(/\/+$/, '');
}

export function haConfigured(home) {
  return !!(home.haUrl && home.haToken);
}

export async function haFetch(home, path, { method = 'GET', body, raw = false, timeout = 8000 } = {}) {
  if (!haConfigured(home)) throw new HaError('Home Assistant não configurado');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${baseUrl(home)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${home.haToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new HaError(`Home Assistant respondeu ${res.status}`);
    return raw ? res : res.json();
  } catch (e) {
    if (e instanceof HaError) throw e;
    throw new HaError(e.name === 'AbortError' ? 'Home Assistant não respondeu (tempo esgotado)' : `Falha ao falar com o Home Assistant: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

const callService = (home, domain, service, data) => haFetch(home, `/api/services/${domain}/${service}`, { method: 'POST', body: data });

const AC_MODE = { Frio: 'cool', Ventilar: 'fan_only', Seco: 'dry', Auto: 'auto' };
const AC_MODE_BACK = Object.fromEntries(Object.entries(AC_MODE).map(([k, v]) => [v, k]));
const FAN = { Baixa: 'low', Média: 'medium', Alta: 'high' };
const FAN_BACK = Object.fromEntries(Object.entries(FAN).map(([k, v]) => [v, k]));

/** Envia o estado do dispositivo para a entidade vinculada no Home Assistant. */
export async function pushToHa(device) {
  if (!device.haEntityId) return;
  const home = await getHome();
  if (!haConfigured(home)) return;
  const entity_id = device.haEntityId;
  const domain = entity_id.split('.')[0];

  switch (domain) {
    case 'light':
      if (!device.on) return callService(home, 'light', 'turn_off', { entity_id });
      return callService(home, 'light', 'turn_on', {
        entity_id,
        brightness_pct: device.brightness,
        ...(device.lightMode === 'warm' ? { color_temp_kelvin: 2700 } : device.lightMode === 'cool' ? { color_temp_kelvin: 6000 } : {}),
      });
    case 'climate':
      if (!device.on) return callService(home, 'climate', 'turn_off', { entity_id });
      await callService(home, 'climate', 'set_hvac_mode', { entity_id, hvac_mode: AC_MODE[device.acMode] || 'cool' });
      await callService(home, 'climate', 'set_temperature', { entity_id, temperature: device.temp });
      await callService(home, 'climate', 'set_fan_mode', { entity_id, fan_mode: FAN[device.fanSpeed] || 'auto' }).catch(() => {});
      await callService(home, 'climate', 'set_swing_mode', { entity_id, swing_mode: device.swing === 'Auto' ? 'vertical' : 'off' }).catch(() => {});
      return;
    case 'lock':
      return callService(home, 'lock', device.on ? 'lock' : 'unlock', { entity_id });
    case 'camera':
      return callService(home, 'camera', device.on ? 'turn_on' : 'turn_off', { entity_id }).catch(() => {});
    default:
      return callService(home, 'homeassistant', device.on ? 'turn_on' : 'turn_off', { entity_id });
  }
}

/** Converte o estado de uma entidade do HA nos campos do dispositivo. */
export function stateToPatch(device, st) {
  if (!st || st.state === 'unavailable' || st.state === 'unknown') return null;
  const a = st.attributes || {};
  const domain = device.haEntityId.split('.')[0];
  switch (domain) {
    case 'light': {
      const patch = { on: st.state === 'on' };
      if (st.state === 'on' && typeof a.brightness === 'number') patch.brightness = Math.max(1, Math.round((a.brightness / 255) * 100));
      return patch;
    }
    case 'climate': {
      const patch = { on: st.state !== 'off' };
      if (typeof a.temperature === 'number') patch.temp = Math.round(a.temperature);
      if (AC_MODE_BACK[st.state]) patch.acMode = AC_MODE_BACK[st.state];
      if (FAN_BACK[a.fan_mode]) patch.fanSpeed = FAN_BACK[a.fan_mode];
      return patch;
    }
    case 'lock':
      return { on: st.state === 'locked' };
    case 'camera':
      return { on: true };
    default:
      return { on: ['on', 'playing', 'open', 'home'].includes(st.state) };
  }
}

export async function listEntities() {
  const home = await getHome();
  const states = await haFetch(home, '/api/states');
  const allowed = ['light', 'switch', 'climate', 'lock', 'camera', 'media_player', 'fan', 'input_boolean'];
  return states
    .filter((s) => allowed.includes(s.entity_id.split('.')[0]))
    .map((s) => ({ entityId: s.entity_id, name: s.attributes?.friendly_name || s.entity_id, state: s.state }))
    .sort((x, y) => x.entityId.localeCompare(y.entityId));
}
