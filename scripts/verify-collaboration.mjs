// Cuentas efímeras de prueba, creadas exclusivamente para esta verificación.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const qaPath=new URL('../../tmp/pc3-qa.json',import.meta.url);
const q=JSON.parse(await fs.readFile(qaPath,'utf8'));
const env=Object.fromEntries((await fs.readFile(new URL('../.env.local',import.meta.url),'utf8')).trim().split(/\r?\n/).map(s=>s.split('=')));
const options={auth:{persistSession:false,autoRefreshToken:false}};
const a=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const b=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const check=r=>{if(r.error)throw r.error;return r.data;};
try {
 check(await a.auth.signInWithPassword({email:q.alice_email,password:q.password}));
 check(await b.auth.signInWithPassword({email:q.bob_email,password:q.password}));
 const group=check(await a.rpc('create_group',{p_name:'Familia · prueba PC3'}));
 q.group=group.group_id;q.code=group.invitation_code;
 const goal=check(await a.rpc('create_goal',{p_title:'Viaje',p_amount:1000,p_date:'2027-12-31',p_group:q.group}));q.goal=goal;
 const emergency=check(await a.rpc('create_goal',{p_title:'Emergencia',p_amount:2000,p_date:'2027-12-31',p_group:q.group}));
 const request=check(await b.rpc('request_group_access',{p_code:q.code}));
 assert.equal(request.status,'pending');
 assert.equal(check(await b.from('goals').select('*')).length,0);
 assert.ok((await b.rpc('decide_group_request',{p_request:request.request_id,p_approve:true})).error);
 check(await a.rpc('decide_group_request',{p_request:request.request_id,p_approve:true}));
 assert.equal(check(await b.from('goals').select('*')).length,2);
 let events=0;
 const channel=b.channel('qa-contributions').on('postgres_changes',{event:'INSERT',schema:'public',table:'movements'},()=>events++);
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Realtime no se conectó')),20000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(t);resolve();}});});
 const movement=(id,amount)=>({p_id:id,p_type:'savings',p_amount:amount,p_category:'Ahorro',p_description:'Aporte de prueba',p_date:'2026-11-11',p_source:'text',p_goal:goal});
 const idA=randomUUID(),idB=randomUUID();
 await Promise.all([a.rpc('record_movement',movement(idA,100)).then(check),b.rpc('record_movement',movement(idB,50)).then(check)]);
 check(await b.rpc('record_movement',movement(idB,50)));
 const total=check(await b.from('goal_progress').select('*').eq('id',goal).single());assert.equal(Number(total.current_amount),150);
 assert.equal(Number(check(await b.from('goal_progress').select('*').eq('id',emergency).single()).current_amount),0);
 check(await a.rpc('record_movement',{p_id:randomUUID(),p_type:'expense',p_amount:25,p_category:'Transporte',p_description:'Gasto privado',p_date:'2026-11-11',p_source:'text'}));
 assert.equal(check(await b.from('movements').select('*').eq('type','expense')).length,0);
 const deadline=Date.now()+10000;while(events<2&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
 assert.ok(events>=2,'No llegaron ambos eventos compartidos');
 await b.removeChannel(channel);
 const group2=check(await a.rpc('create_group',{p_name:'Amigos · prueba PC3'}));q.group2=group2.group_id;
 assert.equal(check(await b.from('groups').select('*')).length,1);
 const request2=check(await b.rpc('request_group_access',{p_code:group2.invitation_code}));
 check(await a.rpc('decide_group_request',{p_request:request2.request_id,p_approve:true}));
 assert.equal(check(await b.from('groups').select('*')).length,2);
 const health=check(await a.functions.invoke('financial-assistant',{body:{action:'health'}}));
 q.groqReady=health.ready;
 if(health.ready){
   const interpretation=check(await a.functions.invoke('financial-assistant',{body:{action:'interpret',question:'Recibí 100 soles por un trabajo'}}));
   assert.equal(interpretation.interpretation.type,'income');assert.equal(interpretation.interpretation.amount,100);
   const advice=check(await a.functions.invoke('financial-assistant',{body:{action:'advice',question:'¿Cuánto registré de ahorro y gastos?'}}));
   assert.ok(advice.answer);q.advice=advice.answer;
 }
 await fs.writeFile(qaPath,JSON.stringify(q));
 const result={auth:true,approval:true,goals:2,multipleGroups:true,privacy:true,concurrentTotal:150,retryDidNotDuplicate:true,realtimeEvents:events,groqReady:health.ready,groqVerified:Boolean(q.advice)};
 await fs.mkdir(new URL('../docs/evidence/',import.meta.url),{recursive:true});
 await fs.writeFile(new URL('../docs/evidence/collaboration-api.json',import.meta.url),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
} finally {await a.removeAllChannels();await b.removeAllChannels();await a.auth.signOut();await b.auth.signOut();}
