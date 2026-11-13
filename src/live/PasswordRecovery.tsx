import React, { useRef, useState } from 'react';
import { requireDatabase } from './client';
import { recoveryError, requestPasswordReset, saveRecoveredPassword } from './recoveryFlow';

export function RecoveryEmailForm({initialEmail='',onBack}:{initialEmail?:string;onBack:()=>void}) {
  const [email,setEmail]=useState(initialEmail),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setMessage('');setError('');
    try { setMessage(await requestPasswordReset(requireDatabase().auth,email)); }
    catch(e) { setError(recoveryError(e)); }
    finally { submitting.current=false;setBusy(false); }
  }
  return <><h2 id="auth-title" tabIndex={-1}>Recupera tu contraseña</h2><p>Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.</p>
    <form onSubmit={submit} aria-busy={busy}><label>Correo electrónico<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><button disabled={busy}>{busy?'Enviando…':'Enviar enlace de recuperación'}</button></form>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="av-error">{error}</p>}
    <button className="av-link" disabled={busy} onClick={onBack}>Volver a iniciar sesión</button></>;
}

export function PasswordRecovery({userId,valid,onFinish}:{userId:string|null;valid:boolean;onFinish:()=>void}) {
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[retry,setRetry]=useState(false),[error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(submitting.current||!valid||!userId)return;submitting.current=true;setBusy(true);setError('');
    try { await saveRecoveredPassword(requireDatabase().auth,userId,password,confirmation);setPassword('');setConfirmation('');setSaved(true); }
    catch(e) { setError(e instanceof Error?e.message:recoveryError(e)); }
    finally { submitting.current=false;setBusy(false); }
  }
  return <main className="av-page av-recovery"><div className="av-brand"><img className="av-brand-icon" src="/brand/piggy-bank.svg" alt=""/>Alcancía Viva</div>
    <section className="av-card" aria-labelledby="auth-title">
      {saved?<><h1 id="auth-title">Contraseña actualizada</h1><p role="status">Tu nueva contraseña se guardó correctamente. Ya puedes volver a tu jardín.</p><button onClick={onFinish}>Volver a mi jardín</button></>:
      retry?<RecoveryEmailForm onBack={onFinish}/>:
      !valid?<><h1 id="auth-title">Necesitas un nuevo enlace</h1><p role="alert">El enlace de recuperación venció o ya fue utilizado. Solicita otro para continuar.</p><button onClick={()=>setRetry(true)}>Solicitar otro enlace</button><button className="av-link" onClick={onFinish}>Volver al inicio</button></>:
      <><h1 id="auth-title">Elige tu nueva contraseña</h1><p id="password-help">Usa al menos 8 caracteres. Combina palabras, números y símbolos para proteger tu cuenta.</p>
        <form onSubmit={submit} aria-busy={busy}><label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-help" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><label>Confirmar nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label>
        {error&&<p role="alert" className="av-error">{error}</p>}<button disabled={busy}>{busy?'Guardando…':'Guardar nueva contraseña'}</button></form><button className="av-link" disabled={busy} onClick={onFinish}>Cancelar</button></>}
    </section></main>;
}
