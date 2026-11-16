import { PrismaClient } from '@prisma/client';

// O Postgres do Hub é compartilhado (max_connections baixo): limita o pool deste app.
function dbUrl() {
  const raw = process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    // O Hub injeta connection_limit=10; com vários apps isso estoura o max_connections. Usa o menor.
    const max = Number(process.env.DB_POOL_SIZE) || 3;
    const current = Number(u.searchParams.get('connection_limit')) || Infinity;
    u.searchParams.set('connection_limit', String(Math.min(current, max)));
    return u.toString();
  } catch {
    return raw;
  }
}

export const prisma = new PrismaClient({ datasources: { db: { url: dbUrl() } } });

export const TZ = process.env.TZ || 'America/Sao_Paulo';

/** Partes da data/hora no fuso da casa. */
export function localParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday,
  };
}

export const dayKey = (date = new Date()) => localParts(date).day;

/** Lista as chaves de dia (YYYY-MM-DD) dos últimos n dias, incluindo hoje. */
export function lastDays(n, from = new Date()) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(dayKey(new Date(from.getTime() - i * 86400000)));
  return out;
}

export async function getHome() {
  return prisma.home.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function logActivity({ title, detail = '', kind = 'info', deviceId = null, userName = null }) {
  try {
    await prisma.activity.create({ data: { title, detail, kind, deviceId, userName } });
  } catch (e) {
    console.error('activity:', e.message);
  }
}
