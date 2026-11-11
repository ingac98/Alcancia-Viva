import assert from 'node:assert/strict';
import { adviceInSoles, hasUnsupportedCurrency, MONEY_RULES, SAFE_ADVICE } from '../supabase/functions/financial-assistant/currency-policy.ts';

for (const text of ['120 €', '24€', '220 euros', '$ 10', 'USD 100', 'dólares', 'MXN 10', 'pesos', '£20']) {
  assert.equal(hasUnsupportedCurrency(text), true, text);
  assert.equal(adviceInSoles(text), SAFE_ADVICE);
}
for (const text of ['Ahorraste S/ 150.00.', 'soles peruanos', 'PEN 100', 'Revisa tus gastos esenciales.']) {
  assert.equal(hasUnsupportedCurrency(text), false, text);
  assert.equal(adviceInSoles(text), text);
}

let handler;
globalThis.Deno = { env: { get: name => ({ SUPABASE_URL: 'https://qa.invalid', SUPABASE_ANON_KEY: 'qa-public', GROQ_API_KEY: 'qa-server-only' })[name] }, serve: callback => { handler = callback; } };
await import('../supabase/functions/financial-assistant/index.ts');
const originalFetch = globalThis.fetch;
let llmAnswer = 'Con tus S/ 100.00 registrados, revisa primero los gastos esenciales.';
let groqCalls = 0;
globalThis.fetch = async (url, init) => {
  if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'qa-user' });
  if (url.includes('/rest/v1/movements?')) {
    assert.ok(url.includes('currency'));
    return Response.json([{ type: 'income', amount: 100, currency: 'PEN', category: 'Trabajo', occurred_on: '2026-11-11' }]);
  }
  assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
  groqCalls++;
  const payload = JSON.parse(init.body);
  assert.ok(payload.messages[0].content.includes(MONEY_RULES));
  if (!payload.response_format) assert.equal(JSON.parse(JSON.parse(payload.messages[1].content).contexto).moneda, 'PEN');
  return Response.json({ choices: [{ message: { content: llmAnswer } }] });
};
const invoke = (action, question, authenticated = true) => handler(new Request('https://qa.invalid', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer qa-token' } : {}) }, body: JSON.stringify({ action, question }),
}));
try {
  let response = await invoke('advice', 'como puedo mejorar mi ahorros');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).answer, llmAnswer);
  // La regresión reportada no puede llegar al usuario, aunque el modelo ignore el prompt.
  llmAnswer = 'Calcula el 20 % de 120 € y programa una transferencia de 24€.';
  response = await invoke('advice', 'como puedo mejorar mi ahorros');
  assert.equal((await response.json()).answer, SAFE_ADVICE);
  const callsBefore = groqCalls;
  response = await invoke('interpret', 'Ahorré 100 euros');
  assert.equal(response.status, 400);
  assert.equal(groqCalls, callsBefore);
  llmAnswer = JSON.stringify({ type: 'savings', amount: 100, category: '' });
  response = await invoke('interpret', 'Ahorré 100 soles');
  assert.equal((await response.json()).interpretation.amount, 100);
  assert.equal((await invoke('advice', 'Mis ahorros', false)).status, 401);
  console.log('PASS: moneda PEN, bloqueo de euros y otras monedas, contexto, interpretación y sesión obligatoria.');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.Deno;
}
