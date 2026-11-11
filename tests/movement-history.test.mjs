import test from 'node:test';
import assert from 'node:assert/strict';
import { historyForSpace,contributorName,contributionTotals,canUndoMovement } from '../src/live/history.ts';
const viewer={id:'jorly',display_name:'Jorly'};
const movement=(id,user_id,amount,group_id='cine',reversed_at=null,type='savings')=>({id,user_id,amount,group_id,reversed_at,type});
test('cada movimiento se atribuye al integrante de su propio grupo',()=>{
  const directory={cine:{jean:'Jean Paul'},viaje:{jean:'Otro nombre de referencia'}};
  assert.equal(contributorName(movement('a','jorly',100),viewer,directory),'Jorly (tú)');
  assert.equal(contributorName(movement('b','jean',50),viewer,directory),'Jean Paul');
  assert.equal(contributorName(movement('c','jean',50,'viaje'),viewer,directory),'Otro nombre de referencia');
});
test('un nombre no disponible no se inventa ni se toma de otro grupo',()=>{
  assert.equal(contributorName(movement('x','jean',10,'otro'),viewer,{cine:{jean:'Jean Paul'}}),'Integrante no disponible');
  assert.equal(contributorName(movement('x','jean',10),viewer,{},true),'Cargando integrante…');
});
test('los totales excluyen revertidos, gastos, aportes personales y duplicados',()=>{
  const own=movement('a','jorly',100),other=movement('b','jean',50);
  assert.deepEqual(contributionTotals([own,other,own,movement('r','jorly',500,'cine','2026-11-11'),movement('e','jorly',10,null,null,'expense'),movement('p','jorly',30,null)]),[
    {key:'cine:jorly',user_id:'jorly',group_id:'cine',total:100,count:1},
    {key:'cine:jean',user_id:'jean',group_id:'cine',total:50,count:1},
  ]);
});
test('el total usa céntimos y no mezcla importes entre grupos',()=>{
  const rows=contributionTotals([movement('a','jorly',.1),movement('b','jorly',.2),movement('c','jorly',20,'viaje')]);
  assert.equal(rows[0].total,.3);assert.equal(rows[0].count,2);assert.equal(rows[1].total,20);
});
test('cada espacio conserva el historial autorizado correspondiente',()=>{
  const own=movement('a','jorly',10,null),shared=movement('b','jean',20),another=movement('c','jean',30,'viaje');
  assert.deepEqual(historyForSpace([own,shared,another],'jorly',''),[own]);
  assert.deepEqual(historyForSpace([own,shared,another],'jorly','cine'),[shared]);
  assert.equal(historyForSpace([own,shared,another],'jorly','all').length,3);
});
test('solo el autor puede deshacer un movimiento vigente',()=>{
  assert.equal(canUndoMovement(movement('a','jorly',100),'jorly'),true);
  assert.equal(canUndoMovement(movement('b','jean',100),'jorly'),false);
  assert.equal(canUndoMovement(movement('r','jorly',100,'cine','2026-11-11'),'jorly'),false);
});
