// Modelo local de la vista de diseño. No importa clientes ni servicios externos.
export const REFERENCE_DATE = '2026-11-11';
export const STAGES = [
  { name: 'Semilla', range: '0 %', example: 0, message: 'Una nueva meta acaba de echar raíces.' },
  { name: 'Primeros brotes', range: '1–24 %', example: 12, message: 'Tu ahorro está echando raíces. Cada aporte cuenta.' },
  { name: 'Planta joven', range: '25–49 %', example: 35, message: 'Tu planta gana hojas y tu meta toma forma.' },
  { name: 'Lista para florecer', range: '50–74 %', example: 60, message: 'Ya superaste la mitad. Tu constancia se hace visible.' },
  { name: 'Primeras flores', range: '75–99 %', example: 85, message: 'Las primeras flores anuncian lo cerca que estás.' },
  { name: 'Meta florecida', range: '100 %', example: 100, message: 'Lo lograste. Esta floración celebra tu esfuerzo.' },
];
export const SAMPLE_GOALS = [
  { id: 'laptop', title: 'Mi nueva laptop', target: 3000, saved: 270, started: '2026-11-01', due: '2027-03-22', group: null },
  { id: 'viaje', title: 'Viaje a Cusco', target: 3000, saved: 2340, started: '2026-10-01', due: '2027-01-31', group: 'Familia' },
  { id: 'emergencia', title: 'Fondo de emergencia', target: 1000, saved: 1000, started: '2026-09-01', due: '2026-12-31', group: null },
  { id: 'materiales', title: 'Materiales del proyecto', target: 500, saved: 210, started: '2026-10-01', due: '2026-11-18', group: 'Equipo IHC' },
];
export const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(value);
export const number = value => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(value);
const clamp = value => Math.min(100, Math.max(0, value));
export function percent(goal) {
  return Number.isFinite(goal.saved) && Number.isFinite(goal.target) && goal.target > 0 ? clamp(goal.saved / goal.target * 100) : 0;
}
export function stageOf(value) {
  return value >= 100 ? 5 : value >= 75 ? 4 : value >= 50 ? 3 : value >= 25 ? 2 : value > 0 ? 1 : 0;
}
export function summary(goals) {
  const included = [...new Map(goals.filter(goal => !goal.archived).map(goal => [goal.id, goal])).values()];
  return {
    count: included.length,
    average: included.length ? included.reduce((total, goal) => total + percent(goal), 0) / included.length : 0,
    completed: included.filter(goal => percent(goal) >= 100).length,
  };
}
function utcDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const result = Date.parse(value + 'T12:00:00Z');
  return Number.isFinite(result) && new Date(result).toISOString().slice(0, 10) === value ? result : NaN;
}
export function pace(goal, reference = REFERENCE_DATE) {
  const actual = percent(goal);
  if (actual >= 100) return { kind: 'complete', label: 'Meta alcanzada', message: 'Tu planta floreció. Puedes conservarla para recordar este logro.', expected: 100 };
  const start = utcDay(goal.started), end = utcDay(goal.due), now = utcDay(reference);
  if (![start, end, now].every(Number.isFinite) || end <= start || now < start) {
    return { kind: 'neutral', label: 'A tu ritmo', message: 'Tu crecimiento refleja lo ahorrado. Define un plazo válido para revisar el ritmo.', expected: null };
  }
  const expected = clamp((now - start) / (end - start) * 100);
  if (now > end) return { kind: 'review', label: 'Revisemos la fecha', message: 'Tu ahorro sigue aquí. Puedes ampliar la fecha o ajustar el plan.', expected };
  if (actual + 10 < expected) return { kind: 'review', label: 'Un momento para ajustar', message: 'Tu planta conserva lo que ha crecido. Puedes ajustar tus aportes o ampliar la fecha.', expected };
  return { kind: 'steady', label: 'Vas a buen ritmo', message: 'Tu ahorro acompaña el tiempo de tu meta. Sigue a tu ritmo.', expected };
}
export function addContribution(goal, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return goal;
  return { ...goal, saved: Math.min(goal.target, Math.max(0, goal.saved) + amount) };
}
