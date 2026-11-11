import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { database, requireDatabase, rpc, loadSnapshot, emptySnapshot } from './client';
import type { Snapshot, Profile, Preferences, Movement, Member, Request } from './client';
import { gardenState, interpretLocally, learningKey, localDate, soles, weekExpenses } from './domain';
import { SpeechService } from '../services/voice/speechService';
import './live.css';

const defaults: Preferences = { weeklyBudget:300,highContrast:false,largeText:false,reducedMotion:false,simple:false,audio:false };
const statusNames: Record<string,string> = {pending:'Pendiente de aprobación',approved:'Aprobada',rejected:'Rechazada'};
const movementNames = {expense:'Gasto',income:'Ingreso',savings:'Ahorro'};
const errorMessage = (e:unknown) => e instanceof Error ? e.message : 'No pudimos completar la acción. Conservamos tus datos para reintentar.';

function BrandIcon() {
  return <img className="av-brand-icon" src="/brand/piggy-bank.svg" alt="" aria-hidden="true" width={40} height={40}/>;
}

export function CollaborativeApp() {
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!database){setReady(true);return;}
    database.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});
    const {data}=database.auth.onAuthStateChange((_event,s)=>{setSession(s);setReady(true);});
    return()=>{data.subscription.unsubscribe();SpeechService.stopSpeaking();SpeechService.stopListening();};
  },[]);
  if(!ready)return <main className="av-page"><p role="status">Preparando tu espacio…</p></main>;
  if(!database)return <main className="av-page"><h1>Alcancía Viva</h1><p>Configura la conexión con Supabase para usar las cuentas y los grupos.</p></main>;
  return session ? <Workspace key={session.user.id} session={session}/> : <Auth/>;
}

function Auth() {
  const [signup,setSignup]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [name,setName]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  async function submit(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const db=requireDatabase();
      if(signup) {
        if(!consent)throw new Error('Acepta el tratamiento de tus datos para crear tu cuenta.');
        const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name.trim(),consent_at:new Date().toISOString()}}});
        if(error)throw error;
        if(!data.session)setMessage('Revisa tu correo para confirmar la cuenta. Después vuelve aquí e inicia sesión.');
      } else {
        const {error}=await db.auth.signInWithPassword({email,password});
        if(error)throw new Error(error.message==='Invalid login credentials'?'Correo o contraseña incorrectos.':error.message);
      }
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  return <main className="av-auth av-page">
    <div className="av-brand"><BrandIcon/> Alcancía Viva</div>
    <section className="av-auth-grid">
      <div className="av-welcome"><p className="av-eyebrow">CADA PEQUEÑO PASO CUENTA</p><h1>Tu ahorro,<br/>un jardín que crece.</h1>
        <p>Comprende tus gastos, cuida tus metas y avanza junto a quienes tú elijas.</p>
        <img src="/garden/floreciente.png" alt="Jardín con flores rosadas, margaritas y un sendero de piedra"/>
      </div>
      <section className="av-card" aria-labelledby="auth-title"><h2 id="auth-title">{signup?'Crea tu espacio':'Bienvenido a tu jardín'}</h2>
        <p>Organiza tus gastos, alcanza tus metas y haz crecer tu ahorro.</p>
        <form onSubmit={submit}>
          {signup&&<label>Tu nombre<input autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
          <label>Correo electrónico<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Contraseña<input autoComplete={signup?'new-password':'current-password'} type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          {signup&&<label className="av-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>
            Acepto guardar en Supabase mi perfil y los datos de práctica que registre. En grupos se comparten mis aportes; mis gastos personales son privados.</label>}
          <button disabled={busy}>{busy?'Un momento…':signup?'Crear cuenta':'Entrar'}</button>
        </form>
        {error&&<p role="alert" className="av-error">{error}</p>}{message&&<p role="status">{message}</p>}
        <button className="av-link" onClick={()=>{setSignup(!signup);setError('');setMessage('');}}>{signup?'Ya tengo cuenta':'Quiero crear una cuenta'}</button>
      </section>
    </section>
  </main>;
}

function Workspace({session}:{session:Session}) {
  const userId=session.user.id;
  const [profile,setProfile]=useState<Profile|null>(null),[profileReady,setProfileReady]=useState(false);
  const [data,setData]=useState<Snapshot>(emptySnapshot),[tab,setTab]=useState('garden'),[groupId,setGroupId]=useState('');
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [online,setOnline]=useState(navigator.onLine),[connected,setConnected]=useState(false);
  const [people,setPeople]=useState<{members:Member[];requests:Request[]}>({members:[],requests:[]});
  const [composer,setComposer]=useState(false),[pending,setPending]=useState(0);
  const [notice,setNotice]=useState(''),[chat,setChat]=useState<{question:string;answer:string}[]>([]);
  const [assistantQuestion,setAssistantQuestion]=useState('');
  const [onboardingName,setOnboardingName]=useState(session.user.user_metadata.display_name||'');
  const [consent,setConsent]=useState(false);
  const queueKey=`av-pending-${userId}`;
  const prefs={...defaults,...profile?.preferences};
  const reloadCounter=useRef(0);
  const selectedGroup=data.groups.find(g=>g.id===groupId);
  const selectedGoals=data.goals.filter(g=>groupId?g.group_id===groupId:g.group_id===null);
  const mine=data.movements.filter(m=>m.user_id===userId);
  const currentExpenses=weekExpenses(mine);
  const spent=currentExpenses.reduce((s,m)=>s+m.amount,0);
  const garden=gardenState(selectedGoals);
  const groupAdmin=groupId&&data.roles[groupId]==='admin';
  const refresh=useCallback(async()=>{
    const version=++reloadCounter.current;
    const snapshot=await loadSnapshot(userId);
    if(version===reloadCounter.current){setData(snapshot);localStorage.setItem(`av-snapshot-${userId}`,JSON.stringify(snapshot));}
  },[userId]);
  const readQueue=useCallback(():Movement[]=>{
    try{return JSON.parse(localStorage.getItem(queueKey)||'[]');}catch{return [];}
  },[queueKey]);
  const writeQueue=(q:Movement[])=>{localStorage.setItem(queueKey,JSON.stringify(q));setPending(q.length);};
  async function saveRemote(m:Movement){await rpc('record_movement',{p_id:m.id,p_type:m.type,p_amount:m.amount,p_category:m.category,p_description:m.description,p_date:m.occurred_on,p_source:m.source,p_goal:m.goal_id});}
  async function flushQueue(){
    for(const m of readQueue()){
      try {await saveRemote(m);writeQueue(readQueue().filter(item=>item.id!==m.id));}
      catch(e){setError('Hay registros pendientes. '+errorMessage(e));break;}
    }
    await refresh();
  }
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const {data,error}=await requireDatabase().from('profiles').select('*').eq('id',userId).maybeSingle();
        if(error)throw error;if(alive){setProfile(data);if(data)localStorage.setItem(`av-profile-${userId}`,JSON.stringify(data));}
      }catch(e){if(alive){try{setProfile(JSON.parse(localStorage.getItem(`av-profile-${userId}`)||'null'));setData(JSON.parse(localStorage.getItem(`av-snapshot-${userId}`)||'null')||emptySnapshot);}catch{}setError(navigator.onLine?errorMessage(e):'Estás sin conexión. Puedes registrar por texto y sincronizar después.');}}finally{if(alive)setProfileReady(true);}
    })();
    setPending(readQueue().length);
    return()=>{alive=false;reloadCounter.current++;};
  },[userId,readQueue]);
  useEffect(()=>{
    if(!profile)return;
    refresh().catch(e=>setError(errorMessage(e)));
    const channel=requireDatabase().channel(`workspace-${userId}`)
      .on('postgres_changes',{event:'*',schema:'public'},()=>{refresh().catch(()=>{});})
      .subscribe(status=>setConnected(status==='SUBSCRIBED'));
    const onOnline=()=>{setOnline(true);flushQueue().catch(e=>setError(errorMessage(e)));};
    const onOffline=()=>setOnline(false);
    window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);
    if(navigator.onLine&&readQueue().length)flushQueue().catch(e=>setError(errorMessage(e)));
    return()=>{requireDatabase().removeChannel(channel);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);};
  },[Boolean(profile),refresh]);
  useEffect(()=>{
    let alive=true;
    if(!groupId){setPeople({members:[],requests:[]});return;}
    rpc<{members:Member[];requests:Request[]}>('group_people',{p_group:groupId}).then(p=>{if(alive)setPeople(p);}).catch(e=>{if(alive)setError(errorMessage(e));});
    return()=>{alive=false;};
  },[groupId,data]);
  useEffect(()=>{
    const code=new URLSearchParams(location.search).get('invite');
    if(code){setTab('groups');setNotice('Hay una invitación en el enlace. Revisa el código y envía tu solicitud.');}
  },[]);
  async function act(action:()=>Promise<void>){
    setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function updateProfile(next:Profile){
    const previous=profile;
    setProfile(next);
    const {error}=await requireDatabase().from('profiles').upsert(next);
    if(error){setProfile(previous);throw error;}localStorage.setItem(`av-profile-${userId}`,JSON.stringify(next));
  }
  async function finishProfile(e:React.FormEvent){
    e.preventDefault();if(!consent)return;
    await act(async()=>{
      const next={id:userId,display_name:onboardingName.trim(),preferences:defaults,learned_categories:{},consent_at:new Date().toISOString()};
      const {error}=await requireDatabase().from('profiles').upsert(next);if(error)throw error;setProfile(next);
    });
  }
  async function saveMovement(m:Movement,phrase:string,originalCategory:string){
    if(!online){writeQueue([...readQueue(),m]);setMessage('Guardado como pendiente en este dispositivo. Se sincronizará al recuperar conexión.');return;}
    await saveRemote(m);
    setMessage(m.type==='savings'?`${soles(m.amount)} sumados a ${data.goals.find(g=>g.id===m.goal_id)?.title}.`: `${movementNames[m.type]} de ${soles(m.amount)} guardado.`);
    if(profile&&phrase&&m.type==='expense'&&originalCategory!==m.category){
      const key=learningKey(phrase);const previous=profile.learned_categories[key];
      try{await updateProfile({...profile,learned_categories:{...profile.learned_categories,[key]:{category:m.category,count:previous?.category===m.category?previous.count+1:1}}});}
      catch{setNotice('El movimiento se guardó; no se pudo actualizar la categoría aprendida.');}
    }
    await refresh();
  }
  async function askAssistant(e:React.FormEvent){
    e.preventDefault();const question=assistantQuestion.trim();if(!question)return;
    await act(async()=>{
      const {data:reply,error}=await requireDatabase().functions.invoke('financial-assistant',{body:{action:'advice',question}});
      if(error)throw new Error('El asistente aún no está disponible. Tus registros no se han modificado.');
      if(reply.error)throw new Error(reply.error);
      setChat(previous=>[...previous,{question,answer:reply.answer}]);setAssistantQuestion('');
    });
  }
  if(!profileReady)return <main className="av-page"><p role="status">Cargando tu perfil…</p></main>;
  if(!profile)return <main className="av-page"><section className="av-card"><h1>Prepara tu jardín</h1><form onSubmit={finishProfile}>
    <label>Tu nombre<input required maxLength={100} value={onboardingName} onChange={e=>setOnboardingName(e.target.value)}/></label>
    <p>Usa datos de práctica. Guardaremos tu perfil, preferencias y movimientos en Supabase. Solo los aportes de un grupo son visibles para sus miembros.</p>
    <label className="av-check"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Acepto este uso de mis datos.</label>
    <button disabled={busy}>Continuar</button></form>{error&&<p role="alert">{error}</p>}
    <button className="av-link" onClick={()=>requireDatabase().auth.signOut()}>Cerrar sesión</button></section></main>;
  return <div className={`av-app ${prefs.highContrast?'av-contrast':''} ${prefs.largeText?'av-large':''} ${prefs.reducedMotion?'av-still':''}`}>
    <a className="av-skip" href="#av-main">Saltar al contenido</a>
    <header className="av-header"><a className="av-brand" href="#av-main"><BrandIcon/> Alcancía Viva</a>
      <div><span>{profile.display_name}</span><button className="av-secondary" onClick={()=>requireDatabase().auth.signOut()}>Salir</button></div></header>
    <div className="av-layout"><nav aria-label="Navegación principal" className="av-nav">
      {[['garden','Mi jardín'],['goals','Metas'],['groups','Mis grupos'],['history','Movimientos'],['assistant','Asistente'],['settings','Preferencias']].map(([id,title])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{title}</button>)}
      <p className="av-connection" role="status">{!online?'Sin conexión':connected?'Conectado en tiempo real':'Conectando actualizaciones…'}</p>
    </nav>
    <main id="av-main" tabIndex={-1} className="av-main">
      <div className="av-toolbar"><label>Tu espacio<select value={groupId} onChange={e=>{setGroupId(e.target.value);setError('');}}><option value="">Personal</option>{data.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <button onClick={()=>setComposer(true)}>+ Registrar movimiento</button></div>
      <div role="status" aria-live="polite" className={message?'av-notice':''}>{message}</div>
      {error&&<p role="alert" className="av-error">{error}</p>}{notice&&<p className="av-notice">{notice}<button className="av-link" onClick={()=>setNotice('')}>Cerrar aviso</button></p>}
      {pending>0&&<p role="status">{pending} movimiento(s) pendiente(s). <button className="av-link" disabled={!online||busy} onClick={()=>act(flushQueue)}>Reintentar sincronización</button></p>}
      {tab==='garden'&&<>
        <p className="av-eyebrow">{selectedGroup?`JARDÍN COMPARTIDO · ${selectedGroup.name}`:'TU ESPACIO PARA CRECER'}</p>
        <h1>{garden.label}</h1><p>{prefs.simple?'Cada aporte cuenta.':'Tu progreso se construye con pequeños pasos, a tu ritmo.'}</p>
        <figure className="av-garden"><img src={garden.flourishing?'/garden/floreciente.png':'/garden/crecimiento.png'} alt={garden.flourishing?'El mismo jardín con abundantes flores abiertas':'Jardín con plantas verdes, brotes y primeras flores'}/>
          <figcaption><strong>{garden.label}</strong><span>{garden.target?`${soles(garden.saved)} de ${soles(garden.target)} · ${garden.percent}% de las metas de este espacio`:'Crea tu primera meta para comenzar a ver tu progreso.'}</span></figcaption></figure>
        <button className="av-secondary" onClick={()=>SpeechService.speak(`${garden.label}. ${garden.target?`Llevas ${garden.percent} por ciento de tus metas.`:'Aún no tienes metas.'}`)}>Escuchar estado del jardín</button>
        <div className="av-stats"><section className="av-card"><h2>Ahorro de este espacio</h2><strong>{soles(garden.saved)}</strong><p>{selectedGoals.length} meta(s) · las flores aparecen al alcanzar el 50 % conjunto.</p></section>
          <section className="av-card"><h2>Tu presupuesto semanal</h2><strong>{soles(spent)} de {soles(prefs.weeklyBudget)}</strong><p>Solo tus gastos de esta semana, de lunes a hoy.</p><progress max={prefs.weeklyBudget} value={Math.min(spent,prefs.weeklyBudget)} aria-label="Gasto respecto al presupuesto semanal"/>
            <p>{spent>prefs.weeklyBudget?'Superaste el presupuesto que elegiste. Puedes revisar tus categorías y ajustar el próximo paso.':'Puedes revisar tus movimientos cuando lo necesites.'}</p></section></div>
      </>}
      {tab==='goals'&&<><h1>{selectedGroup?`Metas de ${selectedGroup.name}`:'Mis metas'}</h1><p>Un ahorro se suma únicamente a la meta que confirmes.</p>
        {(!groupId||groupAdmin)&&<GoalForm groupId={groupId} busy={busy} onCreate={(title,amount,date)=>act(async()=>{await rpc('create_goal',{p_title:title,p_amount:amount,p_date:date,p_group:groupId||null});await refresh();setMessage('Meta creada.');})}/>}
        {!!groupId&&!groupAdmin&&<p>El administrador crea las metas. Todos los miembros pueden aportar.</p>}
        <div className="av-cards">{selectedGoals.map(g=><article className="av-card" key={g.id}><h2>{g.title}</h2><p>{soles(g.current_amount)} de {soles(g.target_amount)}</p><progress max={g.target_amount} value={Math.min(g.current_amount,g.target_amount)} aria-label={`Progreso de ${g.title}`}/><p>Fecha objetivo: {g.target_date}</p><button onClick={()=>setComposer(true)}>Registrar un aporte</button></article>)}</div>
        {!selectedGoals.length&&<p>Aún no hay metas en este espacio.</p>}</>}
      {tab==='groups'&&<><h1>Ahorrar también es compartir</h1><p>Puedes pertenecer a varios grupos. Tus gastos personales se mantienen privados.</p>
        <GroupForms busy={busy} onCreate={name=>act(async()=>{const r=await rpc<{group_id:string}>('create_group',{p_name:name});await refresh();setGroupId(r.group_id);setMessage('Grupo creado. Ya puedes crear metas e invitar.');})}
          onJoin={code=>act(async()=>{const r=await rpc<{group_name:string;status:string}>('request_group_access',{p_code:code});await refresh();setMessage(`${r.group_name}: ${statusNames[r.status]||'Ya eres miembro'}.`);})}/>
        <section className="av-card"><h2>Mis solicitudes</h2>{!data.requests.length?<p>No tienes solicitudes.</p>:data.requests.map(r=><p key={r.id}>{r.name} · <strong>{statusNames[r.status]}</strong></p>)}</section>
        <h2>Grupos a los que perteneces</h2><div className="av-cards">{data.groups.map(g=><button className="av-group-choice" key={g.id} aria-pressed={g.id===groupId} onClick={()=>setGroupId(g.id)}>{g.name}<span>{data.roles[g.id]==='admin'?'Administrador':'Miembro'}</span></button>)}</div>
        {selectedGroup&&<section className="av-card"><h2>{selectedGroup.name}</h2><p>{people.members.length} integrante(s) · varias metas compartidas</p>
          <ul>{people.members.map(m=><li key={m.user_id}>{m.name} · {m.role==='admin'?'Administrador':'Miembro'}</li>)}</ul>
          {groupAdmin&&<><h3>Invitaciones</h3><p>Compartir el código no concede acceso: debes aprobar la solicitud.</p>
            {data.invitations.filter(i=>i.group_id===groupId&&new Date(i.expires_at)>new Date()).map(i=><div className="av-invitation" key={i.id}><label>Código de invitación<input readOnly value={i.code}/></label>
              <button className="av-secondary" onClick={()=>act(async()=>{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?invite=${i.code}`);setMessage('Enlace copiado.');})}>Copiar enlace</button>
              <button className="av-secondary" disabled={busy} onClick={()=>act(async()=>{await rpc('revoke_group_invitation',{p_invitation:i.id});await refresh();setMessage('Invitación revocada.');})}>Revocar código</button></div>)}
            <button className="av-secondary" disabled={busy} onClick={()=>act(async()=>{await rpc('create_group_invitation',{p_group:groupId});await refresh();setMessage('Nueva invitación creada.');})}>Crear nueva invitación</button>
            <h3>Solicitudes de ingreso</h3>{!people.requests.length?<p>No hay solicitudes pendientes.</p>:people.requests.map(r=><div className="av-request" key={r.id}><strong>{r.name}</strong>
              <button disabled={busy} onClick={()=>act(async()=>{await rpc('decide_group_request',{p_request:r.id,p_approve:true});await refresh();setMessage('Solicitud aprobada.');})}>Aprobar</button>
              <button className="av-secondary" disabled={busy} onClick={()=>act(async()=>{await rpc('decide_group_request',{p_request:r.id,p_approve:false});await refresh();setMessage('Solicitud rechazada.');})}>Rechazar</button></div>)}</>}
        </section>}</>}
      {tab==='history'&&<><h1>{selectedGroup?'Aportes del grupo':'Mis movimientos'}</h1><p>Los movimientos revertidos se conservan identificados para mantener el historial.</p>
        {(groupId?data.movements.filter(m=>m.group_id===groupId):mine).map(m=><article className="av-card av-movement" key={m.id}><div><h2>{movementNames[m.type]} · {soles(m.amount)}</h2><p>{m.description||m.category} · {m.occurred_on}</p><p>{m.goal_id?`Meta: ${data.goals.find(g=>g.id===m.goal_id)?.title||'Meta registrada'}`:`Categoría: ${m.category}`}</p>{m.reversed_at&&<strong>Revertido</strong>}</div>
          {m.user_id===userId&&!m.reversed_at&&<button className="av-secondary" disabled={busy} onClick={()=>act(async()=>{await rpc('reverse_movement',{p_id:m.id});await refresh();setMessage('Movimiento revertido; actualizamos el avance.');})}>Deshacer</button>}</article>)}
        {(groupId?data.movements.filter(m=>m.group_id===groupId):mine).length===0&&<p>Aún no hay movimientos.</p>}</>}
      {tab==='assistant'&&<><h1>Un paso a la vez</h1><p>Soy el asistente de IA de Alcancía Viva. Puedo ayudarte a comprender tus registros; las propuestas no mueven dinero ni crean aportes.</p>
        <div role="log" aria-label="Conversación con el asistente" aria-live="polite">{chat.map((item,i)=><section className="av-card" key={i}><p><strong>Tú:</strong> {item.question}</p><p><strong>Asistente:</strong> {item.answer}</p><button className="av-secondary" onClick={()=>SpeechService.speak(item.answer)}>Escuchar respuesta</button></section>)}</div>
        <form onSubmit={askAssistant} className="av-card"><label>¿Qué quieres comprender?<textarea value={assistantQuestion} onChange={e=>setAssistantQuestion(e.target.value)} required maxLength={1500}/></label><button disabled={busy}>{busy?'Consultando…':'Consultar al asistente'}</button></form></>}
      {tab==='settings'&&<><h1>A tu manera</h1><section className="av-card"><h2>Preferencias de accesibilidad</h2>
        {([['highContrast','Alto contraste'],['largeText','Texto grande (200 %)'],['reducedMotion','Reducir movimiento'],['simple','Mensajes sencillos'],['audio','Leer confirmaciones en voz alta']] as const).map(([key,label])=><label className="av-check" key={key}><input type="checkbox" checked={prefs[key]} disabled={busy} onChange={e=>act(async()=>{await updateProfile({...profile,preferences:{...prefs,[key]:e.target.checked}});setMessage('Preferencia guardada.');})}/>{label}</label>)}
        <label>Presupuesto semanal en soles<input type="number" min="1" step="0.01" defaultValue={prefs.weeklyBudget} onBlur={e=>{const amount=Number(e.target.value);if(amount>0)act(async()=>{await updateProfile({...profile,preferences:{...prefs,weeklyBudget:amount}});setMessage('Presupuesto actualizado.');});}}/></label>
        <p>Las correcciones de categoría se recuerdan. Tras tres correcciones iguales para la misma frase, se proponen en futuros registros.</p>
        <button className="av-secondary" disabled={busy} onClick={()=>act(async()=>{await updateProfile({...profile,learned_categories:{}});setMessage('Aprendizaje de categorías reiniciado.');})}>Reiniciar categorías aprendidas</button>
        <button className="av-secondary" onClick={()=>{const blob=new Blob([JSON.stringify({profile,movements:mine,goals:data.goals.filter(g=>g.owner_id===userId)},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='alcancia-viva-mis-datos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Descargar mis datos</button>
        <details><summary>Ayuda y privacidad</summary><p>Para registrar, elige gasto, ingreso o ahorro. Un ahorro requiere meta. Para compartir, crea un grupo o solicita ingreso con un código y espera aprobación. Puedes usar texto sin micrófono; todas las acciones son accesibles mediante teclado. Usamos datos de práctica. Si consultas a la IA, se envía tu pregunta y un resumen de tus registros a Groq.</p></details>
      </section></>}
    </main></div>
    {composer&&<MovementComposer data={data} profile={profile} groupId={groupId} audio={prefs.audio} onClose={()=>setComposer(false)} onSave={saveMovement}/>}
  </div>;
}

function GoalForm({groupId,busy,onCreate}:{groupId:string;busy:boolean;onCreate:(title:string,amount:number,date:string)=>Promise<void>}) {
  return <details className="av-card" key={groupId}><summary>Crear una meta</summary><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);await onCreate(String(f.get('title')),Number(f.get('amount')),String(f.get('date')));}}>
    <label>Nombre de la meta<input name="title" required maxLength={100}/></label><label>Monto objetivo (S/)<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Fecha objetivo<input name="date" type="date" min={localDate()} required/></label><button disabled={busy}>Crear meta</button></form></details>;
}
function GroupForms({busy,onCreate,onJoin}:{busy:boolean;onCreate:(name:string)=>Promise<void>;onJoin:(code:string)=>Promise<void>}) {
  return <div className="av-cards"><form className="av-card" onSubmit={e=>{e.preventDefault();onCreate(String(new FormData(e.currentTarget).get('name')));}}><h2>Crear un grupo</h2><label>Nombre del grupo<input name="name" required maxLength={100}/></label><button disabled={busy}>Crear grupo</button></form>
    <form className="av-card" onSubmit={e=>{e.preventDefault();onJoin(String(new FormData(e.currentTarget).get('code')));}}><h2>Unirme a un grupo</h2><label>Código de invitación<input name="code" required defaultValue={new URLSearchParams(location.search).get('invite')||''}/></label><button disabled={busy}>Solicitar ingreso</button></form></div>;
}

function MovementComposer({data,profile,groupId,audio,onClose,onSave}:{data:Snapshot;profile:Profile;groupId:string;audio:boolean;onClose:()=>void;onSave:(m:Movement,phrase:string,category:string)=>Promise<void>}) {
  const dialog=useRef<HTMLDialogElement>(null),phraseInput=useRef<HTMLTextAreaElement>(null);
  const previousFocus=useRef(document.activeElement as HTMLElement|null);
  const id=useRef(crypto.randomUUID()),processing=useRef(false);
  const [phrase,setPhrase]=useState(''),[type,setType]=useState<Movement['type']|''>(''),[amount,setAmount]=useState(''),[category,setCategory]=useState('');
  const [goalId,setGoalId]=useState(''),[destination,setDestination]=useState(groupId),[source,setSource]=useState<Movement['source']>('manual');
  const [error,setError]=useState(''),[info,setInfo]=useState(''),[listening,setListening]=useState(false),[busy,setBusy]=useState(false),[originalCategory,setOriginalCategory]=useState('');
  const [date,setDate]=useState(localDate());
  useEffect(()=>{dialog.current?.showModal();phraseInput.current?.focus();return()=>{SpeechService.stopListening();previousFocus.current?.focus();};},[]);
  function applyInterpretation(text:string,voice=false){
    const r=interpretLocally(text,data.goals,profile);setType(r.type);setAmount(r.amount);setCategory(r.category);setOriginalCategory(r.category);setGoalId(r.goalId);setSource(voice?'voice':'text');
    if(r.goalId)setDestination(data.goals.find(g=>g.id===r.goalId)?.group_id||'');
    setInfo(r.planning?'Esto parece una intención. Si ya separaste dinero, elige Ahorro y confirma el aporte.':!r.type?'¿Es un gasto, un ingreso o un ahorro?':r.type==='savings'&&!r.goalId?'¿A qué meta quieres sumar este ahorro?':'Revisa lo interpretado antes de guardar.');
  }
  async function interpret(){
    if(!phrase.trim()||processing.current)return;processing.current=true;setBusy(true);setError('');
    applyInterpretation(phrase);
    try{
      const {data:reply,error}=await requireDatabase().functions.invoke('financial-assistant',{body:{action:'interpret',question:phrase}});
      if(error||reply?.error){setInfo('Interpretación local. Revisa tipo, monto y destino; completa lo que falte.');return;}
      const r=reply.interpretation;
      if(r)setType(['expense','income','savings'].includes(r.type)?r.type:'');
      if(r)setAmount(typeof r.amount==='number'&&r.amount>0?String(r.amount):'');
      if(r&&typeof r.category==='string'){setCategory(r.category);setOriginalCategory(r.category);}
      // El destino solo puede ser una meta real y única; no se confía en un ID generado.
    }catch{setInfo('Interpretación local. Completa los datos que falten.');}finally{processing.current=false;setBusy(false);}
  }
  function voice(){
    if(listening){SpeechService.stopListening();setListening(false);return;}
    if(!SpeechService.isRecognitionSupported()){setError('Este navegador no reconoce voz. Puedes escribir o completar los campos.');phraseInput.current?.focus();return;}
    SpeechService.stopSpeaking();setError('');setListening(true);
    SpeechService.startListening(result=>{setPhrase(result.transcript);if(result.isFinal){applyInterpretation(result.transcript,true);setListening(false);}},()=>{setListening(false);setError('No se pudo captar la voz. Revisa el permiso del micrófono o escribe tu movimiento.');},()=>setListening(false));
  }
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');
    const value=Number(amount);
    if(!type||!Number.isFinite(value)||value<=0){setError('Elige el tipo e ingresa un monto mayor que cero.');return;}
    if(type==='savings'&&!data.goals.some(g=>g.id===goalId&&g.group_id===(destination||null))){setError('Selecciona el espacio y la meta a la que aportarás.');return;}
    if(type!=='savings'&&!category.trim()){setError('Indica la categoría.');return;}
    setBusy(true);
    try{
      const goal=data.goals.find(g=>g.id===goalId);
      await onSave({id:id.current,user_id:profile.id,type,amount:value,category:type==='savings'?'Ahorro':category,description:phrase,occurred_on:date,source,goal_id:type==='savings'?goalId:null,group_id:type==='savings'?(goal?.group_id||null):null,reversed_at:null},phrase,originalCategory);
      if(audio)SpeechService.speak(`${movementNames[type]} de ${value} soles ${navigator.onLine?'registrado':'pendiente de sincronización'}${type==='savings'?` para ${goal?.title}`:''}.`);
      onClose();
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  const goals=data.goals.filter(g=>g.group_id===(destination||null));
  return <dialog ref={dialog} className="av-dialog" aria-labelledby="movement-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
    <div className="av-dialog-title"><h2 id="movement-title">Registrar movimiento</h2><button className="av-secondary" onClick={onClose} disabled={busy} aria-label="Cerrar registro">Cerrar</button></div>
    <p>Puedes hablar, escribir o completar los datos. Confirma el destino antes de guardar.</p>
    <label>Describe tu movimiento<textarea ref={phraseInput} value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="Ahorré 100 soles para mi laptop" maxLength={500}/></label>
    <div className="av-actions"><button type="button" className="av-secondary" aria-pressed={listening} onClick={voice} disabled={busy}>{listening?'Detener micrófono':'Dictar movimiento'}</button><button type="button" disabled={busy||!phrase.trim()} onClick={interpret}>{busy?'Interpretando…':'Interpretar texto'}</button></div>
    <p role="status" aria-live="polite">{listening?'Micrófono activo. Escuchando…':info}</p>
    <form onSubmit={submit}>
      <label>Tipo de movimiento<select value={type} required onChange={e=>setType(e.target.value as Movement['type'])}><option value="">Selecciona el tipo</option><option value="expense">Gasto</option><option value="income">Ingreso</option><option value="savings">Ahorro para una meta</option></select></label>
      <div className="av-fields"><label>Monto en soles<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Fecha<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      {type==='savings'?<><label>Espacio del ahorro<select value={destination} onChange={e=>{setDestination(e.target.value);setGoalId('');}}><option value="">Personal</option>{data.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Meta de destino<select value={goalId} required onChange={e=>setGoalId(e.target.value)}><option value="">¿A qué meta quieres aportar?</option>{goals.map(g=><option value={g.id} key={g.id}>{g.title}</option>)}</select></label>{!goals.length&&<p>Crea una meta en este espacio antes de registrar el ahorro.</p>}</>:<label>Categoría<input list="av-categories" required value={category} maxLength={100} onChange={e=>setCategory(e.target.value)}/><datalist id="av-categories">{['Alimentación','Transporte','Educación','Salud','Trabajo','Ocio','Servicios','Otros'].map(c=><option value={c} key={c}/>)}</datalist></label>}
      {error&&<p role="alert" className="av-error">{error}</p>}
      <p className="av-review">{type?movementNames[type]:'Movimiento'} · {soles(Number(amount)||0)} · {type==='savings'?(data.goals.find(g=>g.id===goalId)?.title||'Falta elegir una meta'):(category||'Falta categoría')}</p>
      <button disabled={busy||listening}>{busy?'Procesando…':'Confirmar y guardar'}</button>
    </form>
  </dialog>;
}
