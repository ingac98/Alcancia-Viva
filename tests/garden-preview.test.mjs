import test from 'node:test';
import assert from 'node:assert/strict';
import { percent, stageOf, summary, pace, addContribution, SAMPLE_GOALS } from '../public/design/garden-model.js';

test('el promedio da el mismo peso a metas de importes diferentes', () => {
  const goals = [{ id: 'a', target: 3000, saved: 270 }, { id: 'b', target: 1499.96, saved: 20 }];
  assert.ok(Math.abs(summary(goals).average - (9 + 20 / 1499.96 * 100) / 2) < 1e-10);
  assert.notEqual(summary(goals).average, 290 / 4499.96 * 100);
});
test('una meta compartida se cuenta una vez y las archivadas se excluyen', () => {
  const shared = { id: 'shared', target: 100, saved: 50 };
  assert.deepEqual(summary([shared, shared, { id: 'old', target: 100, saved: 100, archived: true }]), { count: 1, average: 50, completed: 0 });
});
test('crecimiento finito y acotado con conjuntos vacíos y montos inválidos', () => {
  assert.deepEqual(summary([]), { count: 0, average: 0, completed: 0 });
  assert.equal(percent({ saved: 10, target: 0 }), 0);
  assert.equal(percent({ saved: NaN, target: 100 }), 0);
  assert.equal(percent({ saved: -20, target: 100 }), 0);
  assert.equal(percent({ saved: 130, target: 100 }), 100);
});
test('los hitos cambian de planta en el límite correcto', () => {
  assert.deepEqual([0, .1, 24.99, 25, 49.99, 50, 74.99, 75, 99.99, 100].map(stageOf), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
});
test('el tiempo cambia el mensaje y conserva el crecimiento económico', () => {
  const goal = { target: 1000, saved: 200, started: '2026-11-01', due: '2026-12-01' };
  assert.equal(pace(goal, '2026-11-06').kind, 'steady');
  assert.equal(pace(goal, '2026-11-26').kind, 'review');
  assert.equal(percent(goal), 20);
  assert.equal(pace(goal, '2026-12-02').label, 'Revisemos la fecha');
  assert.equal(pace({ ...goal, saved: 1000 }, '2026-12-02').kind, 'complete');
});
test('fechas inexistentes o sin intervalo no producen un ritmo inventado', () => {
  const goal = { target: 1000, saved: 200, started: '2026-11-01', due: '2026-11-01' };
  assert.equal(pace(goal).expected, null);
  assert.equal(pace({ ...goal, due: '2026-02-30' }).expected, null);
  assert.equal(pace({ ...goal, due: null }).kind, 'neutral');
});
test('un aporte solo modifica la meta elegida y no sobrepasa el objetivo de esta vista', () => {
  const originals = SAMPLE_GOALS.map(goal => ({ ...goal }));
  const chosen = originals[0];
  const next = addContribution(chosen, 50);
  assert.equal(next.saved, 320);
  assert.equal(chosen.saved, 270);
  assert.deepEqual(originals, SAMPLE_GOALS);
  assert.equal(addContribution({ target: 100, saved: 90 }, 50).saved, 100);
  assert.equal(addContribution(chosen, -50), chosen);
});
test('añadir una meta baja el promedio sin restar dinero a las existentes', () => {
  const goals = [{ id: 'a', target: 100, saved: 100 }];
  assert.equal(summary(goals).average, 100);
  assert.equal(summary([...goals, { id: 'b', target: 100, saved: 0 }]).average, 50);
  assert.equal(goals[0].saved, 100);
});
