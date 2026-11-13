import React, { useEffect, useRef, useState } from 'react';
import { createQuestionDictation } from '../services/voice/questionDictation';
import { SpeechService } from '../services/voice/speechService';

export function AssistantQuestionForm({question,onQuestion,busy,onSubmit}:{question:string;onQuestion:(text:string)=>void;busy:boolean;onSubmit:(event:React.FormEvent)=>void}) {
  const [listening,setListening]=useState(false),[status,setStatus]=useState('');
  const input=useRef<HTMLTextAreaElement>(null),controller=useRef<ReturnType<typeof createQuestionDictation>|null>(null);
  const update=useRef(onQuestion);update.current=onQuestion;
  const supported=SpeechService.isRecognitionSupported();
  useEffect(()=>{
    const recognitionWindow=window as any;
    const Recognition=recognitionWindow.SpeechRecognition||recognitionWindow.webkitSpeechRecognition;
    if(!Recognition)return;
    const dictation=createQuestionDictation(()=>new Recognition(),{question:text=>update.current(text),listening:setListening,status:setStatus});
    controller.current=dictation;
    const hidden=()=>{if(document.hidden)dictation.stop();};
    document.addEventListener('visibilitychange',hidden);
    return()=>{document.removeEventListener('visibilitychange',hidden);dictation.dispose();controller.current=null;};
  },[]);
  useEffect(()=>{if(busy&&listening)controller.current?.stop();},[busy,listening]);
  function dictate(){
    if(listening){controller.current?.stop();input.current?.focus();return;}
    SpeechService.stopSpeaking();controller.current?.start(question);
  }
  return <form onSubmit={event=>{if(listening||busy){event.preventDefault();return;}onSubmit(event);}} className="av-card">
    <label>¿Qué quieres comprender?<textarea ref={input} value={question} onChange={event=>onQuestion(event.target.value)} required maxLength={1500} readOnly={listening||busy} aria-describedby="av-assistant-voice-help"/></label>
    <div className="av-actions"><button type="button" className="av-secondary" onClick={dictate} aria-pressed={listening} disabled={busy||!supported} aria-describedby="av-assistant-voice-help">{listening?'Detener dictado':'Dictar pregunta'}</button>
      <button type="submit" disabled={busy||listening||!question.trim()}>{busy?'Consultando…':'Consultar al asistente'}</button></div>
    <p id="av-assistant-voice-help">{supported?'Dicta tu pregunta, revisa el texto y luego envíalo. Puedes continuar escribiendo al terminar.':'Este navegador no admite dictado de voz. Puedes escribir tu pregunta.'}</p>
    {status&&<p role="status" aria-live="polite" aria-atomic="true">{status}</p>}
  </form>;
}
