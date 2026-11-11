import type { Goal, Movement, Profile } from './client';

export const soles = (value: number) => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(value);
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const learningKey = (s:string) => normalize(s).replace(/\d+(?:[.,]\d+)?/g,'').replace(/\b(gaste|soles|sol|pague|s\/)\b/g,'').replace(/\s+/g,' ').trim();
export interface Interpretation { type: Movement['type'] | ''; amount: string; category: string; goalId: string; planning: boolean; }
export function interpretLocally(text:string,goals:Goal[], profile:Profile | null): Interpretation {
  const s=normalize(text);
  const planning=/\b(quiero|quisiera|gustaria|planeo|pienso)\b/.test(s) && /ahorr/.test(s);
  const savings=/ahorr|aporte|aportar|aporta|separe|separar|separa/.test(s);
  const income=/recibi|ingreso|ingrese|cobre|cobro|me pagaron|sueldo/.test(s);
  const expense=/gaste|gasto|pague|pago|compre|compra|taxi|almuerzo|combi|menu|cafe/.test(s);
  const type = planning ? '' : savings ? 'savings' : income ? 'income' : expense ? 'expense' : '';
  const amount=text.match(/-?\d+(?:[.,]\d{1,2})?/g);
  let category='';
  for (const [pattern,label] of [
    ['taxi|combi|bus|pasaje|uber','Transporte'],['almuerzo|menu|comida|cafe|cena','Alimentación'],
    ['cuaderno|libro|curso|copias','Educación'],['salud|medico|farmacia','Salud'],['sueldo|trabajo|salario','Trabajo'],
    ['cine|juego|ocio','Ocio'],['agua|luz|internet|alquiler','Servicios'],
  ]) if (new RegExp(pattern).test(s)) {category=label;break;}
  const learned=profile?.learned_categories?.[learningKey(text)];
  if (learned && learned.count>=3) category=learned.category;
  const matches=goals.filter(g=>s.includes(normalize(g.title)));
  return {type,amount:amount?.length===1 && Number(amount[0].replace(',','.'))>0 ? amount[0].replace(',','.') : '',category:type==='savings'?'Ahorro':category,goalId:matches.length===1?matches[0].id:'',planning};
}
export function weekExpenses(movements:Movement[], now=new Date()) {
  const day=localDate(now);
  const anchor=new Date(day+'T12:00:00Z');
  const daysSinceMonday=(anchor.getUTCDay()+6)%7;
  anchor.setUTCDate(anchor.getUTCDate()-daysSinceMonday);
  const start=anchor.toISOString().slice(0,10);
  return movements.filter(m=>m.type==='expense'&&!m.reversed_at&&m.occurred_on>=start&&m.occurred_on<=day);
}
export function gardenState(goals:Goal[]) {
  const target=goals.reduce((s,g)=>s+g.target_amount,0);
  const saved=goals.reduce((s,g)=>s+Math.min(g.current_amount,g.target_amount),0);
  const percent=target>0?Math.round(saved/target*100):0;
  return {percent,saved,target,flourishing:percent>=50,label:target===0?'Un nuevo comienzo':percent>=50?'Tu jardín está floreciendo':'Tu jardín está creciendo'};
}
