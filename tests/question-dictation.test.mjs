import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuestionDictation } from '../src/services/voice/questionDictation.ts';
function setup(fail=false){
  const state={text:'',listening:false,status:'',aborts:0};
  const recognizers=[];
  const controller=createQuestionDictation(()=>{const r={start(){if(fail)throw Error('unavailable');},abort(){state.aborts++;}};recognizers.push(r);return r;},{question:text=>state.text=text,listening:value=>state.listening=value,status:text=>state.status=text});
  return {state,controller,recognizers};
}
const result=(r,text)=>r.onresult({results:[[{transcript:text}]]});
test('el dictado usa español peruano y sustituye resultados parciales sin duplicarlos',()=>{
  const {state,controller,recognizers}=setup();controller.start('Hola');const r=recognizers[0];
  assert.equal(r.lang,'es-PE');assert.equal(r.interimResults,true);assert.equal(state.listening,true);
  result(r,'cómo');result(r,'cómo ahorro');assert.equal(state.text,'Hola cómo ahorro');r.onend();assert.equal(state.listening,false);
});
test('detener conserva el texto y descarta resultados tardíos',()=>{
  const {state,controller,recognizers}=setup();controller.start('');const r=recognizers[0];const late=r.onresult;
  result(r,'ahorrar cien soles');controller.stop();late({results:[[{transcript:'resultado tardío'}]]});
  assert.equal(state.text,'ahorrar cien soles');assert.equal(state.listening,false);assert.equal(state.aborts,1);
});
test('denegar permisos mantiene la pregunta y libera la escucha',()=>{
  const {state,controller,recognizers}=setup();controller.start('');result(recognizers[0],'mi pregunta');recognizers[0].onerror({error:'not-allowed'});
  assert.equal(state.text,'mi pregunta');assert.equal(state.listening,false);assert.match(state.status,/Permite el micrófono/);
});
test('un fallo de inicio no deja bloqueado el formulario',()=>{
  const {state,controller}=setup(true);controller.start('');assert.equal(state.listening,false);assert.match(state.status,/No se pudo iniciar/);
});
test('desmontar cancela el micrófono y evita escrituras posteriores',()=>{
  const {state,controller,recognizers}=setup();controller.start('');const late=recognizers[0].onresult;controller.dispose();late({results:[[{transcript:'no aplicar'}]]});assert.equal(state.text,'');assert.equal(state.aborts,1);
});
test('el texto dictado respeta el límite del asistente',()=>{
  const {state,controller,recognizers}=setup();controller.start('a'.repeat(1490));result(recognizers[0],'b'.repeat(50));assert.equal(state.text.length,1500);
});
test('un permiso concedido tarde no vuelve a activar un dictado detenido',()=>{
  const {state,controller,recognizers}=setup();controller.start('');const lateStart=recognizers[0].onstart;
  controller.stop();lateStart();assert.equal(state.listening,false);assert.equal(state.aborts,2);
});
