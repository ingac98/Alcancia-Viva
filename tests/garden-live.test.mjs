import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SPACES, goalPercent, growthStage, goalsForScope, gardenSummary, goalPace, movementPreset } from '../src/live/garden.ts';
const goal=(id,target_amount,current_amount,group_id=null)=>({id,title:id,target_amount,current_amount,group_id,owner_id:'owner',created_at:'2026-11-01T12:00:00Z',target_date:'2026-12-01'});

test('el jardín real promedia porcentajes y no pondera por el precio',()=>{
  const a=goal('laptop',3000,270),b=goal('grafica',1499.96,20);
  assert.ok(Math.abs(gardenSummary([a,b]).percent-(9+20/1499.96*100)/2)<1e-10);
  assert.equal(gardenSummary([a,b]).saved,290);
});
test('vista general, personal y grupos usan exclusivamente sus metas',()=>{
  const a=goal('personal',100,10),b=goal('familiar',100,50,'familia'),c=goal('equipo',100,90,'equipo');
  assert.deepEqual(goalsForScope([a,b,c,b],ALL_SPACES).map(g=>g.id),['personal','familiar','equipo']);
  assert.deepEqual(goalsForScope([a,b,c],'').map(g=>g.id),['personal']);
  assert.deepEqual(goalsForScope([a,b,c],'familia').map(g=>g.id),['familiar']);
  assert.equal(gardenSummary([a,b,c,b]).percent,50);
});
test('semilla, hitos y exceso de ahorro conservan cifras válidas',()=>{
  assert.deepEqual([0,.1,24.99,25,49.99,50,74.99,75,99.99,100].map(growthStage),[0,1,1,2,2,3,3,4,4,5]);
  assert.equal(goalPercent(goal('x',100,120)),100);
  assert.equal(gardenSummary([goal('x',100,120)]).saved,120);
  assert.equal(goalPercent(goal('x',0,10)),0);
  assert.equal(goalPercent(goal('x',100,NaN)),0);
  assert.equal(goalPercent(goal('x',100,-10)),0);
  assert.equal(gardenSummary([]).percent,0);
});
test('el plazo cambia el mensaje sin restar crecimiento y mantiene una referencia real al completar',()=>{
  const a=goal('x',100,20);
  assert.equal(goalPace(a,'2026-11-06').kind,'steady');
  assert.equal(goalPace(a,'2026-11-26').kind,'review');
  assert.equal(goalPace(a,'2026-12-02').label,'Revisemos la fecha');
  assert.equal(goalPercent(a),20);
  const completed=goalPace({...a,current_amount:100},'2026-11-16');
  assert.equal(completed.kind,'complete');assert.equal(completed.expected,50);
});
test('sin fecha de creación en cachés antiguas no se inventa un ritmo',()=>{
  const a=goal('x',100,20);
  assert.equal(goalPace({...a,created_at:undefined},'2026-11-11').expected,null);
  assert.equal(goalPace({...a,target_date:'2026-02-30'},'2026-11-11').expected,null);
  assert.equal(goalPace({...a,target_date:'2026-11-01'},'2026-11-11').expected,null);
});
test('la fecha de creación se interpreta en Perú aunque el servidor guarde UTC',()=>{
  const a={...goal('x',100,20),created_at:'2026-11-02T03:00:00Z'};
  assert.equal(goalPace(a,'2026-11-16').expected,50);
});
test('el aporte abierto desde una maceta conserva su meta y su grupo',()=>{
  const a=goal('a',100,20),b=goal('b',100,60,'familia');
  assert.deepEqual(movementPreset([a,b],ALL_SPACES,b.id),{goalId:'b',destination:'familia',type:'savings'});
  assert.deepEqual(movementPreset([a,b],'familia',a.id),{goalId:'a',destination:'',type:'savings'});
  assert.deepEqual(movementPreset([a,b],ALL_SPACES,''),{goalId:'',destination:'',type:''});
  assert.deepEqual(movementPreset([a,b],'familia','no-existe'),{goalId:'',destination:'familia',type:''});
});
test('una meta nueva cambia el promedio sin modificar las cantidades existentes',()=>{
  const a=goal('a',100,100),b=goal('b',100,0);
  assert.equal(gardenSummary([a,b]).percent,50);
  assert.equal(gardenSummary([a,b]).saved,100);
  assert.equal(gardenSummary([a,{...b,archived:true}]).percent,100);
  assert.equal(a.current_amount,100);
});
