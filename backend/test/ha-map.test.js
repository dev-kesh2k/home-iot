import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AC_MODE, AC_MODE_BACK, FAN, FAN_BACK, stateToPatch } from '../src/ha-map.js';

const dev = (id) => ({ haEntityId: id });

test('mapas de ida e volta do ar-condicionado', () => {
  for (const [nome, ha] of Object.entries(AC_MODE)) assert.equal(AC_MODE_BACK[ha], nome);
  for (const [nome, ha] of Object.entries(FAN)) assert.equal(FAN_BACK[ha], nome);
});

test('stateToPatch: indisponível ou desconhecido não muda nada', () => {
  assert.equal(stateToPatch(dev('light.sala'), null), null);
  assert.equal(stateToPatch(dev('light.sala'), { state: 'unavailable' }), null);
  assert.equal(stateToPatch(dev('light.sala'), { state: 'unknown' }), null);
});

test('stateToPatch: luz com brilho em % (mínimo 1)', () => {
  assert.deepEqual(stateToPatch(dev('light.sala'), { state: 'on', attributes: { brightness: 128 } }), { on: true, brightness: 50 });
  assert.deepEqual(stateToPatch(dev('light.sala'), { state: 'on', attributes: { brightness: 1 } }), { on: true, brightness: 1 });
  assert.deepEqual(stateToPatch(dev('light.sala'), { state: 'off', attributes: { brightness: 200 } }), { on: false });
});

test('stateToPatch: ar-condicionado com temperatura, modo e ventilação', () => {
  assert.deepEqual(stateToPatch(dev('climate.quarto'), { state: 'cool', attributes: { temperature: 22.6, fan_mode: 'high' } }), {
    on: true, temp: 23, acMode: 'Frio', fanSpeed: 'Alta',
  });
  assert.deepEqual(stateToPatch(dev('climate.quarto'), { state: 'off', attributes: {} }), { on: false });
});

test('stateToPatch: fechadura, câmera e outros', () => {
  assert.deepEqual(stateToPatch(dev('lock.porta'), { state: 'locked' }), { on: true });
  assert.deepEqual(stateToPatch(dev('lock.porta'), { state: 'unlocked' }), { on: false });
  assert.deepEqual(stateToPatch(dev('camera.entrada'), { state: 'idle' }), { on: true });
  assert.deepEqual(stateToPatch(dev('media_player.tv'), { state: 'playing' }), { on: true });
  assert.deepEqual(stateToPatch(dev('switch.tomada'), { state: 'off' }), { on: false });
});
