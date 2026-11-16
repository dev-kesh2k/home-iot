import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, lastDays, localParts } from '../src/dates.js';

test('localParts: dia, hora e dia da semana no fuso de São Paulo', () => {
  assert.deepEqual(localParts(new Date('2026-11-16T02:30:00Z')), { day: '2026-11-15', time: '23:30', weekday: 0 });
  assert.deepEqual(localParts(new Date('2026-11-16T12:05:00Z')), { day: '2026-11-16', time: '09:05', weekday: 1 });
});

test('dayKey: troca de dia à meia-noite local', () => {
  assert.equal(dayKey(new Date('2026-11-16T02:59:00Z')), '2026-11-15');
  assert.equal(dayKey(new Date('2026-11-16T03:00:00Z')), '2026-11-16');
});

test('lastDays: n dias até hoje, do mais novo para o mais velho', () => {
  assert.deepEqual(lastDays(3, new Date('2026-11-01T15:00:00Z')), ['2026-11-01', '2026-10-31', '2026-10-30']);
  assert.deepEqual(lastDays(0), []);
});
