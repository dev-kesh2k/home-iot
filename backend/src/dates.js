// Datas no fuso do app (sem banco: testáveis isoladamente).
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
