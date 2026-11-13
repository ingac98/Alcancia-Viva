import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechPlayback } from '../src/services/voice/speechPlayback.ts';
function setup(){const utterances=[],calls={pause:0,resume:0,cancel:0};const player=createSpeechPlayback({speak:u=>utterances.push(u),cancel:()=>calls.cancel++,pause:()=>calls.pause++,resume:()=>calls.resume++},text=>({text}));return {player,utterances,calls};}
test('el control solo está activo después de escuchar y se oculta al terminar',()=>{
  const {player,utterances}=setup();assert.equal(player.getState().status,'idle');const id=player.speak('Hola');assert.deepEqual(player.getState(),{id,status:'speaking'});utterances[0].onend();assert.deepEqual(player.getState(),{id:null,status:'idle'});
});
test('pausar y reanudar mantienen la misma lectura sin crear otro audio',()=>{
  const {player,utterances,calls}=setup();const id=player.speak('Respuesta');player.pause(id);assert.equal(player.getState().status,'paused');player.resume(id);assert.equal(player.getState().status,'speaking');assert.equal(utterances.length,1);assert.equal(calls.pause,1);
});
test('escuchar otra respuesta retira el control anterior y descarta eventos tardíos',()=>{
  const {player,utterances}=setup();const first=player.speak('Primera'),oldEnd=utterances[0].onend;const second=player.speak('Segunda');oldEnd();player.pause(first);assert.deepEqual(player.getState(),{id:second,status:'speaking'});
});
test('dictar o salir cancela también una lectura pausada',()=>{
  const {player}=setup();const id=player.speak('Respuesta');player.pause(id);player.stop();assert.deepEqual(player.getState(),{id:null,status:'idle'});
});
test('un error de reproducción elimina el control de pausa',()=>{
  const {player,utterances}=setup();player.speak('Respuesta');utterances[0].onerror();assert.equal(player.getState().status,'idle');
});
test('una lectura nueva sale del estado pausado del navegador y no conserva suscriptores eliminados',()=>{
  const {player,calls}=setup();let events=0;const unsubscribe=player.subscribe(()=>events++);const id=player.speak('Uno');player.pause(id);unsubscribe();const before=events;player.speak('Dos');assert.equal(events,before);assert.ok(calls.resume>=2);
});
