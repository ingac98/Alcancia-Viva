import { REFERENCE_DATE, SAMPLE_GOALS, STAGES, percent, stageOf, summary, pace, addContribution, money, number } from './garden-model.js';

const byId = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let goals = SAMPLE_GOALS.map(goal => ({ ...goal }));
let selectedId = goals[0].id;
let scope = 'all';
let paused = false;
let nextPot = 1;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const position = stage => `${[0, 50, 100][stage % 3]}% ${stage < 3 ? 0 : 100}%`;
const filtered = () => goals.filter(goal => scope === 'all' || (scope === 'personal' ? !goal.group : goal.group === scope));
const selected = () => goals.find(goal => goal.id === selectedId);
const announce = text => { byId('announcement').textContent = text; };

function sprite(stage, index = 0) {
  return `<span class="sprite" aria-hidden="true"><span class="sprite-stage ${stage < 3 ? 'top-row' : ''}" style="--sprite-position:${position(stage)};--wind-delay:${index * -.85}s"><span class="pot-vessel"></span><span class="pot-foliage"></span></span></span>`;
}
function formattedDate(date) {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
}
function renderPots(visible) {
  const focusedId = document.activeElement?.dataset.goal;
  byId('pots').classList.toggle('many', visible.length > 4);
  byId('pots').innerHTML = visible.map((goal, index) => {
    const value = percent(goal), stage = stageOf(value), group = goal.group ? `Grupo · ${goal.group}` : 'Personal';
    return `<button class="pot-button" data-goal="${escape(goal.id)}" aria-pressed="${goal.id === selectedId}" aria-controls="detail" aria-label="${escape(goal.title)}. ${escape(group)}. ${number(value)} por ciento. ${STAGES[stage].name}. Ver estado.">${sprite(stage, index)}<span class="plant-label"><strong>${escape(goal.title)}</strong><small>${escape(group)}</small><b>${number(value)} %</b></span></button>`;
  }).join('');
  if (!visible.length) byId('pots').innerHTML = '<p class="empty">Aquí crecerán las metas de este espacio.</p>';
  if (focusedId) byId('pots').querySelector(`[data-goal="${CSS.escape(focusedId)}"]`)?.focus({ preventScroll: true });
}
function renderSummary(visible) {
  const value = summary(visible);
  byId('average').textContent = `${number(value.average)} %`;
  byId('average-ring').style.setProperty('--average', `${value.average}%`);
  byId('average-explanation').textContent = `Promedio simple de ${value.count} meta${value.count === 1 ? '' : 's'} visible${value.count === 1 ? '' : 's'}. Cada una tiene el mismo peso.`;
  byId('scene-count').textContent = `${value.count} maceta${value.count === 1 ? '' : 's'}`;
  byId('completed').textContent = `${value.completed} meta${value.completed === 1 ? '' : 's'} florecida${value.completed === 1 ? '' : 's'}`;
  byId('scene-title').textContent = !value.count ? 'Un espacio para nuevos comienzos' : value.average >= 75 ? 'Tu jardín se llena de flores' : value.average >= 50 ? 'Tu jardín se prepara para florecer' : 'Tu jardín está creciendo';
  byId('scene').style.setProperty('--garden-saturation', String(.85 + value.average * .003));
}
function renderDetail() {
  const goal = selected();
  byId('detail').hidden = !goal;
  if (!goal) return;
  const value = percent(goal), stage = stageOf(value), rhythm = pace(goal);
  byId('detail-title').textContent = goal.title;
  byId('detail-group').textContent = goal.group ? `Grupo · ${goal.group}` : 'Personal';
  byId('detail-stage').textContent = STAGES[stage].name;
  byId('detail-saved').textContent = money(goal.saved);
  byId('detail-target').textContent = `de ${money(goal.target)}`;
  byId('detail-percent').textContent = `${number(value)} %`;
  byId('detail-progress').value = value;
  byId('growth-copy').textContent = STAGES[stage].message;
  byId('pace-title').textContent = rhythm.label;
  byId('pace-copy').textContent = rhythm.message;
  byId('pace-message').classList.toggle('review', rhythm.kind === 'review');
  byId('pace-message').querySelector('.pace-mark').textContent = rhythm.kind === 'complete' ? '✓' : rhythm.kind === 'review' ? '↻' : '↗';
  byId('detail-due').textContent = formattedDate(goal.due);
  byId('detail-elapsed').textContent = rhythm.expected === null ? 'Sin referencia de plazo' : rhythm.kind === 'complete' ? 'Meta alcanzada' : `${number(rhythm.expected)} % del plazo`;
  byId('growth').value = Math.round(value);
  byId('growth-value').value = `${number(value)} %`;
  byId('growth').setAttribute('aria-label', `Explorar el crecimiento de ${goal.title}`);
  byId('contribute').disabled = value >= 100;
  byId('contribute').innerHTML = value >= 100 ? 'Tu meta ya floreció ✓' : 'Probar aporte de S/ 50 <span aria-hidden="true">↗</span>';
}
function renderCards(visible) {
  byId('goal-cards').innerHTML = visible.map((goal, index) => {
    const value = percent(goal), stage = stageOf(value), rhythm = pace(goal);
    return `<article class="goal-card"><div class="goal-card-art">${sprite(stage, index)}<span class="goal-card-type">${escape(goal.group ? `Grupo · ${goal.group}` : 'Personal')}</span></div><div class="goal-card-body"><h3>${escape(goal.title)}</h3><p>${escape(money(goal.saved))} de ${escape(money(goal.target))}</p><div class="progress-heading"><span>${STAGES[stage].name}</span><strong>${number(value)} %</strong></div><progress max="100" value="${value}" aria-label="Avance de ${escape(goal.title)}"></progress><p>${rhythm.label} · ${escape(formattedDate(goal.due))}</p><button class="secondary" data-open-goal="${escape(goal.id)}">Ver mi maceta <span aria-hidden="true">↗</span></button></div></article>`;
  }).join('');
}
function render() {
  const visible = filtered();
  if (!visible.some(goal => goal.id === selectedId)) selectedId = visible[0]?.id;
  renderPots(visible); renderSummary(visible); renderDetail(); renderCards(visible);
  byId('add-pot').disabled = goals.length >= 8;
}
function showView(view) {
  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  for (const name of ['garden', 'cards', 'elements']) byId(`${name}-view`).hidden = name !== view;
  byId('scope').disabled = view === 'elements';
}
function chooseGoal(id, openGarden = false) {
  selectedId = id;
  if (openGarden) showView('garden');
  render();
  const goal = selected();
  announce(`${goal.title}: ${number(percent(goal))} % ahorrado. ${STAGES[stageOf(percent(goal))].message} ${pace(goal).label}.`);
  if (openGarden) byId('pots').querySelector(`[data-goal="${CSS.escape(id)}"]`)?.focus({ preventScroll: false });
}
function replaceGoal(next) { goals = goals.map(goal => goal.id === next.id ? next : goal); render(); }

byId('pots').addEventListener('click', event => { const button = event.target.closest('[data-goal]'); if (button) chooseGoal(button.dataset.goal); });
byId('goal-cards').addEventListener('click', event => { const button = event.target.closest('[data-open-goal]'); if (button) chooseGoal(button.dataset.openGoal, true); });
document.querySelector('.views').addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (button) showView(button.dataset.view); });
byId('scope').addEventListener('change', event => { scope = event.target.value; render(); const count = filtered().length; announce(`Ahora ves ${count} ${count === 1 ? 'meta' : 'metas'} de ${event.target.selectedOptions[0].textContent}.`); });
byId('growth').addEventListener('input', event => { const goal = selected(); replaceGoal({ ...goal, saved: Math.round(goal.target * Number(event.target.value)) / 100 }); });
byId('growth').addEventListener('change', () => { const goal = selected(); announce(`${goal.title}: ${number(percent(goal))} %. ${STAGES[stageOf(percent(goal))].name}. El promedio del jardín se ha actualizado.`); });
byId('contribute').addEventListener('click', () => {
  const previous = selected(), next = addContribution(previous, 50);
  replaceGoal(next);
  const added = next.saved - previous.saved;
  if (!paused && !reducedMotion.matches) {
    const water = document.createElement('span'); water.className = 'watering'; water.setAttribute('aria-hidden', 'true');
    water.innerHTML = Array.from({ length: 6 }, (_, index) => `<i style="--i:${index}"></i>`).join('');
    byId('pots').querySelector(`[data-goal="${CSS.escape(next.id)}"]`)?.append(water);
    window.setTimeout(() => water.remove(), 1500);
  }
  announce(`Aporte de ejemplo: ${money(added)} para ${next.title}. Ahora lleva ${number(percent(next))} %. Ninguna otra meta cambió.`);
});
byId('add-pot').addEventListener('click', () => {
  if (goals.length >= 8) return;
  const id = `new-pot-${nextPot++}`;
  goals.push({ id, title: `Nueva meta ${nextPot - 1}`, target: 600, saved: 0, started: REFERENCE_DATE, due: '2027-01-10', group: scope === 'all' || scope === 'personal' ? null : scope });
  selectedId = id; render();
  announce('Plantaste una nueva meta. Se añadió una maceta y se recalculó el promedio; el dinero de las otras metas se conserva.');
});
byId('reset').addEventListener('click', () => { goals = SAMPLE_GOALS.map(goal => ({ ...goal })); nextPot = 1; selectedId = goals[0].id; scope = 'all'; byId('scope').value = 'all'; render(); announce('Se restableció la propuesta visual inicial.'); });
function renderMotion() {
  const stopped = paused || reducedMotion.matches;
  document.body.classList.toggle('paused', stopped);
  byId('motion').setAttribute('aria-pressed', String(stopped));
  byId('motion').textContent = reducedMotion.matches ? 'Movimiento reducido' : paused ? 'Reanudar movimiento' : 'Pausar movimiento';
  byId('motion').disabled = reducedMotion.matches;
  byId('motion').setAttribute('aria-label', reducedMotion.matches ? 'Movimiento reducido por la preferencia de tu dispositivo' : byId('motion').textContent);
}
byId('motion').addEventListener('click', () => { paused = !paused; renderMotion(); });
reducedMotion.addEventListener('change', renderMotion);

if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
  const resetSpeechButton = () => { byId('listen').innerHTML = 'Escuchar jardín <span aria-hidden="true">↗</span>'; };
  byId('listen').addEventListener('click', () => {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); resetSpeechButton(); return; }
    const visible = filtered(), value = summary(visible), goal = selected();
    const message = `Tu jardín tiene ${value.count} metas, con un avance promedio de ${number(value.average)} por ciento. ${visible.map(item => `${item.title}: ${number(percent(item))} por ciento, ${STAGES[stageOf(percent(item))].name}`).join('. ')}. ${goal ? `Seleccionaste ${goal.title}. ${pace(goal).message}` : ''}`;
    const utterance = new SpeechSynthesisUtterance(message); utterance.lang = 'es-PE'; utterance.rate = .95;
    const voice = window.speechSynthesis.getVoices().find(item => item.lang === 'es-PE') || window.speechSynthesis.getVoices().find(item => item.lang.startsWith('es'));
    if (voice) utterance.voice = voice;
    utterance.onend = resetSpeechButton; utterance.onerror = resetSpeechButton;
    byId('listen').textContent = 'Detener lectura'; window.speechSynthesis.speak(utterance);
  });
  window.addEventListener('pagehide', () => window.speechSynthesis.cancel());
} else { byId('listen').disabled = true; byId('listen').textContent = 'Lectura no disponible'; }

byId('stage-gallery').innerHTML = STAGES.map((stage, index) => `<article class="stage-card">${sprite(index, index)}<h3>${stage.name}</h3><span>${stage.range}</span><button data-example="${index}">Probar esta etapa</button></article>`).join('');
byId('stage-gallery').addEventListener('click', event => {
  const button = event.target.closest('[data-example]');
  if (!button) return;
  const stage = STAGES[Number(button.dataset.example)], goal = selected();
  if (!goal) return;
  replaceGoal({ ...goal, saved: Math.round(goal.target * stage.example) / 100 });
  chooseGoal(goal.id, true);
});
renderMotion(); render();
