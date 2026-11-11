import type { Goal } from './client';

export const ALL_SPACES = 'all';
export const GROWTH_STAGES = [
  { name: 'Semilla', message: 'Una nueva meta acaba de echar raíces.' },
  { name: 'Primeros brotes', message: 'Tu ahorro está echando raíces. Cada aporte cuenta.' },
  { name: 'Planta joven', message: 'Tu planta gana hojas y tu meta toma forma.' },
  { name: 'Lista para florecer', message: 'Ya superaste la mitad. Tu constancia se hace visible.' },
  { name: 'Primeras flores', message: 'Las primeras flores anuncian lo cerca que estás.' },
  { name: 'Meta florecida', message: 'Lo lograste. Esta floración celebra tu esfuerzo.' },
] as const;
const nonnegative = (value:number) => Number.isFinite(value) ? Math.max(0,value) : 0;
const clamp = (value:number) => Math.min(100,Math.max(0,value));
export const gardenNumber = (value:number) => new Intl.NumberFormat('es-PE',{maximumFractionDigits:1}).format(value);
export function goalPercent(goal:Goal) {
  return Number.isFinite(goal.target_amount)&&goal.target_amount>0 ? clamp(nonnegative(goal.current_amount)/goal.target_amount*100) : 0;
}
export function growthStage(value:number) {
  return value>=100?5:value>=75?4:value>=50?3:value>=25?2:value>0?1:0;
}
export function uniqueGoals(goals:Goal[]) {
  return [...new Map(goals.filter(goal=>!goal.archived).map(goal=>[goal.id,goal])).values()];
}
export function goalsForScope(goals:Goal[],scope:string) {
  return uniqueGoals(goals).filter(goal=>scope===ALL_SPACES||goal.group_id===(scope||null));
}
export function gardenSummary(goals:Goal[]) {
  const included=uniqueGoals(goals);
  const percent=included.length?included.reduce((total,goal)=>total+goalPercent(goal),0)/included.length:0;
  return {percent,count:included.length,saved:included.reduce((total,goal)=>total+nonnegative(goal.current_amount),0),target:included.reduce((total,goal)=>total+nonnegative(goal.target_amount),0),completed:included.filter(goal=>goalPercent(goal)>=100).length,
    label:!included.length?'Un espacio para nuevos comienzos':percent>=75?'Tu jardín se llena de flores':percent>=50?'Tu jardín se prepara para florecer':'Tu jardín está creciendo'};
}
function day(value:string|null|undefined) {
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const result=Date.parse(value+'T12:00:00Z');
  return Number.isFinite(result)&&new Date(result).toISOString().slice(0,10)===value?result:NaN;
}
function creationDay(value:string|null|undefined) {
  if(!value)return NaN;
  if(value.length===10)return day(value);
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return NaN;
  return day(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(date));
}
export function goalPace(goal:Goal,today:string) {
  const start=creationDay(goal.created_at),end=day(goal.target_date),now=day(today);
  const expected=[start,end,now].every(Number.isFinite)&&end>start&&now>=start?clamp((now-start)/(end-start)*100):null;
  if(goalPercent(goal)>=100)return {kind:'complete',label:'Meta alcanzada',message:'Tu planta floreció. Puedes conservarla para recordar este logro.',expected};
  if(expected===null)return {kind:'neutral',label:'A tu ritmo',message:'Tu crecimiento refleja lo ahorrado. El ritmo se mostrará cuando haya un plazo de referencia.',expected};
  if(now>end)return {kind:'review',label:'Revisemos la fecha',message:'Tu ahorro sigue aquí. Puedes ampliar la fecha o ajustar el plan.',expected};
  if(goalPercent(goal)+10<expected)return {kind:'review',label:'Un momento para ajustar',message:'Tu planta conserva lo que ha crecido. Puedes ajustar tus aportes o ampliar la fecha.',expected};
  return {kind:'steady',label:'Vas a buen ritmo',message:'Tu ahorro acompaña el tiempo de tu meta. Sigue a tu ritmo.',expected};
}
export function goalDateLabel(value:string) {
  return Number.isFinite(day(value))?new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Sin fecha disponible';
}
export function movementPreset(goals:Goal[],scope:string,initialGoalId:string) {
  const goal=uniqueGoals(goals).find(goal=>goal.id===initialGoalId);
  return {goalId:goal?.id||'',destination:goal?.group_id||(goal?'':scope===ALL_SPACES?'':scope),type:goal?'savings' as const:'' as const};
}
