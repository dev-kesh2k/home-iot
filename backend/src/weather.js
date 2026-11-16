// Clima atual via Open-Meteo (gratuito, sem chave).
import { prisma, getHome } from './db.js';

let cache = { key: '', at: 0, data: null };

const CODES = [
  [[0], 'Céu limpo'],
  [[1, 2], 'Parcialmente nublado'],
  [[3], 'Nublado'],
  [[45, 48], 'Neblina'],
  [[51, 53, 55, 56, 57], 'Garoa'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Chuva'],
  [[71, 73, 75, 77, 85, 86], 'Neve'],
  [[95, 96, 99], 'Tempestade'],
];

function describe(code) {
  return CODES.find(([list]) => list.includes(code))?.[1] ?? '—';
}

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function geocode(city) {
  const data = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=${encodeURIComponent(city)}`,
  );
  const r = data.results?.[0];
  return r ? { latitude: r.latitude, longitude: r.longitude, label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', ') } : null;
}

export async function getWeather() {
  let home = await getHome();
  try {
    if ((home.latitude == null || home.longitude == null) && home.city) {
      const g = await geocode(home.city);
      if (!g) return null;
      home = await prisma.home.update({ where: { id: 1 }, data: { latitude: g.latitude, longitude: g.longitude } });
    }
    if (home.latitude == null) return null;
    const key = `${home.latitude},${home.longitude}`;
    if (cache.key === key && Date.now() - cache.at < 10 * 60000) return cache.data;
    const data = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${home.latitude}&longitude=${home.longitude}` +
        '&current=temperature_2m,relative_humidity_2m,weather_code,is_day&timezone=auto',
    );
    const c = data.current;
    const out = {
      temperature: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m),
      code: c.weather_code,
      isDay: !!c.is_day,
      description: describe(c.weather_code),
      city: home.city,
    };
    cache = { key, at: Date.now(), data: out };
    return out;
  } catch (e) {
    console.error('weather:', e.message);
    return cache.data;
  }
}
