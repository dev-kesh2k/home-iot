import { prisma, lastDays, getHome } from './db.js';

const GROUPS = [
  { key: 'ac', label: 'Ar-condicionado', types: ['ac'] },
  { key: 'light', label: 'Luzes', types: ['light'] },
  { key: 'tv', label: 'TV e entretenimento', types: ['tv'] },
  { key: 'other', label: 'Outros', types: ['plug', 'lock', 'camera'] },
];

const groupOf = (type) => GROUPS.find((g) => g.types.includes(type))?.key ?? 'other';

function liveWh(d, now) {
  if (!d.on || !d.onSince) return 0;
  const watts = d.type === 'light' ? d.powerW * Math.max(0.05, d.brightness / 100) : d.powerW;
  return (watts * (now - new Date(d.onSince).getTime())) / 3600000;
}

export async function energySummary(period = 'day') {
  const n = period === 'month' ? 30 : period === 'week' ? 7 : 1;
  const all = lastDays(n * 2);
  const days = all.slice(0, n);
  const prevDays = all.slice(n);
  const now = Date.now();

  const [logs, devices, home] = await Promise.all([
    prisma.energyLog.findMany({ where: { day: { in: all } } }),
    prisma.device.findMany(),
    getHome(),
  ]);

  const byGroup = Object.fromEntries(GROUPS.map((g) => [g.key, 0]));
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  const byDevice = new Map();
  let prev = 0;
  for (const l of logs) {
    if (days.includes(l.day)) {
      byGroup[groupOf(l.type)] += l.wh;
      byDay[l.day] += l.wh;
      byDevice.set(l.deviceId, (byDevice.get(l.deviceId) || 0) + l.wh);
    } else {
      prev += l.wh;
    }
  }
  // Trecho ainda não contabilizado dos aparelhos ligados agora
  for (const d of devices) {
    const wh = liveWh(d, now);
    if (!wh) continue;
    byGroup[groupOf(d.type)] += wh;
    byDay[days[0]] += wh;
    byDevice.set(d.id, (byDevice.get(d.id) || 0) + wh);
  }

  const totalWh = Object.values(byGroup).reduce((a, b) => a + b, 0);
  const kwh = (wh) => Math.round(wh / 10) / 100;
  const names = new Map(devices.map((d) => [d.id, d]));

  return {
    period,
    totalKwh: kwh(totalWh),
    cost: Math.round((totalWh / 1000) * home.tariff * 100) / 100,
    tariff: home.tariff,
    previousKwh: kwh(prev),
    changePct: prev > 0 ? Math.round(((totalWh - prev) / prev) * 100) : null,
    groups: GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      kwh: kwh(byGroup[g.key]),
      pct: totalWh > 0 ? Math.round((byGroup[g.key] / totalWh) * 100) : 0,
    })),
    daily: [...days].reverse().map((d) => ({ day: d, kwh: kwh(byDay[d]) })),
    topDevices: [...byDevice.entries()]
      .filter(([id]) => names.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, wh]) => ({ id, name: names.get(id).name, type: names.get(id).type, kwh: kwh(wh) })),
  };
}
