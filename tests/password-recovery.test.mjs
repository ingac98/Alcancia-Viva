import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryTracker, cleanRecoveryUrl, requestPasswordReset, recoverySentMessage, recoveryError, saveRecoveredPassword } from '../src/live/recoveryFlow.ts';
const origin='https://alcancia-viva-jardin.netlify.app/';
function memory(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};}
test('el enlace válido conserva la pantalla de recuperación durante inicialización y actualización',()=>{
  const storage=memory(),tracker=createRecoveryTracker(origin+'#type=recovery&access_token=secret',storage);
  assert.equal(tracker.getSnapshot(),'pending');tracker.observe('PASSWORD_RECOVERY','ana');tracker.observe('INITIAL_SESSION','ana');tracker.observe('USER_UPDATED','ana');assert.equal(tracker.getSnapshot(),'active');
  assert.deepEqual([...storage.map.values()],['ana']);tracker.finish();assert.equal(tracker.getSnapshot(),'none');assert.equal(storage.map.size,0);
});
test('recargar restaura solo la recuperación de la misma cuenta y cerrar sesión la invalida',()=>{
  const storage=memory(),first=createRecoveryTracker(origin,storage);first.observe('PASSWORD_RECOVERY','ana');
  const reloaded=createRecoveryTracker(origin,storage);reloaded.observe('INITIAL_SESSION','ana');assert.equal(reloaded.getSnapshot(),'active');
  reloaded.observe('SIGNED_OUT',null);assert.equal(reloaded.getSnapshot(),'expired');assert.equal(storage.map.size,0);
});
test('un fragmento inventado no convierte una sesión anterior en recuperación válida',()=>{
  const tracker=createRecoveryTracker(origin+'#type=recovery');tracker.observe('INITIAL_SESSION','ana');assert.equal(tracker.getSnapshot(),'expired');
  const normal=createRecoveryTracker(origin);normal.observe('INITIAL_SESSION','ana');assert.equal(normal.getSnapshot(),'none');
});
test('enlace vencido o cambio de cuenta no permite continuar con el formulario válido',()=>{
  const expired=createRecoveryTracker(origin+'#error=access_denied&error_code=otp_expired');expired.observe('INITIAL_SESSION','ana');assert.equal(expired.getSnapshot(),'expired');
  const storage=memory(),tracker=createRecoveryTracker(origin,storage);tracker.observe('PASSWORD_RECOVERY','ana');tracker.observe('SIGNED_IN','luis');assert.equal(tracker.getSnapshot(),'expired');
});
test('funciona sin almacenamiento y notifica solo los cambios de estado',()=>{
  const tracker=createRecoveryTracker(origin,{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});let calls=0;const stop=tracker.subscribe(()=>calls++);tracker.observe('PASSWORD_RECOVERY','ana');tracker.observe('USER_UPDATED','ana');assert.equal(calls,1);stop();tracker.finish();assert.equal(calls,1);
});
test('solicita al correo normalizado usando el Site URL y una respuesta sin revelar cuentas',async()=>{
  let received;const message=await requestPasswordReset({resetPasswordForEmail:async(...args)=>{received=args;return {error:null};}},' ana@example.test ');assert.deepEqual(received,['ana@example.test']);assert.equal(message,recoverySentMessage);
  await assert.rejects(requestPasswordReset({resetPasswordForEmail:async()=>({error:{message:'rate limit',status:429}})},'ana@example.test'));assert.match(recoveryError({status:429}),/Espera/);
});
test('contraseñas cortas o distintas no llegan al servidor',async()=>{
  const auth={getUser:()=>{throw Error('No debe consultarse');},updateUser:()=>{throw Error('No debe guardarse');}};
  await assert.rejects(saveRecoveredPassword(auth,'ana','corta','corta'),/8 caracteres/);await assert.rejects(saveRecoveredPassword(auth,'ana','UnaClaveSegura','OtraClaveSegura'),/no coinciden/);
});
test('verifica la identidad en el servidor antes de actualizar la contraseña',async()=>{
  const writes=[],auth={getUser:async()=>({data:{user:{id:'ana'}},error:null}),updateUser:async value=>{writes.push(value);return {error:null};}};
  await saveRecoveredPassword(auth,'ana','UnaClaveSegura','UnaClaveSegura');assert.deepEqual(writes,[{password:'UnaClaveSegura'}]);
  await assert.rejects(saveRecoveredPassword(auth,'luis','UnaClaveSegura','UnaClaveSegura'),/venció/);assert.equal(writes.length,1);
  auth.getUser=async()=>({data:{user:null},error:{message:'expired',status:401}});await assert.rejects(saveRecoveredPassword(auth,'ana','UnaClaveSegura','UnaClaveSegura'),/venció/);assert.equal(writes.length,1);
});
test('rechazo del proveedor no se presenta como contraseña guardada',async()=>{
  const auth={getUser:async()=>({data:{user:{id:'ana'}},error:null}),updateUser:async()=>({error:{code:'same_password',message:'same'}})};
  await assert.rejects(saveRecoveredPassword(auth,'ana','UnaClaveSegura','UnaClaveSegura'),/diferente/);assert.match(recoveryError({code:'weak_password'}),/segura/);
});
test('limpia errores del enlace y conserva rutas de navegación e invitaciones',()=>{
  assert.equal(cleanRecoveryUrl(origin+'?invite=abc#error=access_denied&error_description=secret'),'/?invite=abc');assert.equal(cleanRecoveryUrl(origin+'#av-main'),'/#av-main');
});

test('el SDK instalado emite recuperación y actualiza al usuario por su API autenticada',async()=>{
  const {createClient}=await import('@supabase/supabase-js');
  const id='00000000-0000-4000-8000-000000000001',user={id,aud:'authenticated',role:'authenticated',email:'qa@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
  const calls=[],tracker=createRecoveryTracker(origin),db=createClient('https://auth.example.test','public-test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,options)=>{
    const path=new URL(String(input)).pathname,method=options?.method||'GET';calls.push({path,method,body:options?.body?JSON.parse(options.body):null});
    return new Response(JSON.stringify(path.endsWith('/verify')?{access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user}:path.endsWith('/user')?user:{}),{status:200,headers:{'content-type':'application/json'}});
  }}});
  const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>tracker.observe(event,session?.user.id||null));
  try {
    const result=await db.auth.verifyOtp({token_hash:'test-only-recovery',type:'recovery'});assert.equal(result.error,null);assert.equal(tracker.getSnapshot(),'active');
    await saveRecoveredPassword(db.auth,id,'UnaClaveSegura','UnaClaveSegura');assert.ok(calls.some(c=>c.path.endsWith('/user')&&c.method==='GET'));assert.ok(calls.some(c=>c.path.endsWith('/user')&&c.method==='PUT'&&c.body.password==='UnaClaveSegura'));
    await requestPasswordReset(db.auth,'qa@example.test');assert.ok(calls.some(c=>c.path.endsWith('/recover')&&c.method==='POST'));
  } finally {subscription.unsubscribe();await db.auth.signOut({scope:'local'});}
});
