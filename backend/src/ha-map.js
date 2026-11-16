// Tradução entre os campos do app e o Home Assistant (sem rede nem banco: testável).

export const AC_MODE = { Frio: 'cool', Ventilar: 'fan_only', Seco: 'dry', Auto: 'auto' };
export const AC_MODE_BACK = Object.fromEntries(Object.entries(AC_MODE).map(([k, v]) => [v, k]));
export const FAN = { Baixa: 'low', Média: 'medium', Alta: 'high' };
export const FAN_BACK = Object.fromEntries(Object.entries(FAN).map(([k, v]) => [v, k]));

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
