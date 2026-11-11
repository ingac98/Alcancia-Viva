export const MONEY_RULES = 'La única moneda de la aplicación es el sol peruano, código PEN, símbolo S/. Todos los importes del contexto están en PEN. Escribe cualquier importe monetario como S/ 100.00 o en soles peruanos. No uses euros, dólares ni otras monedas y no conviertas importes. No inventes ingresos, saldos ni ejemplos numéricos que parezcan datos del usuario. Alcancía Viva registra datos educativos: no conecta bancos ni ejecuta transferencias o ahorro automático. No propongas automatizaciones bancarias, porcentajes fijos sin conocer el presupuesto ni garantices resultados. Si faltan datos, pide ingresos, gastos esenciales y la meta antes de proponer un monto.';

// Rechazar la respuesta completa evita presentar una conversión ficticia de € a S/.
export function hasUnsupportedCurrency(text: string): boolean {
  return /[€$£¥₹₽₩₿]|\b(?:EUR|USD|GBP|JPY|CNY|CAD|AUD|MXN|ARS|CLP|COP|BRL|BTC|USDT)\b|\b(?:euros?|d[oó]lares?|pesos?|yen(?:es)?|yuan(?:es)?|libras?\s+esterlinas?|reales\s+brasile[ñn]os?)\b/iu.test(text);
}

export const SAFE_ADVICE = 'En Alcancía Viva trabajamos en soles peruanos (S/). Para mejorar tu ahorro, revisa tus gastos esenciales y elige una meta concreta. ¿Cuánto recibes y cuánto necesitas para esos gastos? Con esos datos podemos plantear un aporte que puedas mantener. La app registra tus aportes; no realiza transferencias bancarias.';

export function adviceInSoles(answer: string): string {
  return hasUnsupportedCurrency(answer) ? SAFE_ADVICE : answer;
}
