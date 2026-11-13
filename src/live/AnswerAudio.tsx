import React, { useEffect, useRef, useState } from 'react';
import { SpeechService } from '../services/voice/speechService';

export function AnswerAudio({answer}:{answer:string}) {
  const [playback,setPlayback]=useState(()=>SpeechService.getPlaybackState());
  const [ownId,setOwnId]=useState<number|null>(null);
  const own=useRef<number|null>(null);
  useEffect(()=>{
    const unsubscribe=SpeechService.subscribePlayback(setPlayback);
    return()=>{unsubscribe();if(own.current!==null&&SpeechService.getPlaybackState().id===own.current)SpeechService.stopSpeaking();};
  },[]);
  const active=ownId!==null&&playback.id===ownId&&playback.status!=='idle';
  const paused=active&&playback.status==='paused';
  return <div className="av-actions" style={{justifyContent:'flex-start'}}>
    <button type="button" className="av-secondary" disabled={!SpeechService.isSynthesisSupported()} onClick={()=>{const id=SpeechService.speak(answer);own.current=id;setOwnId(id);}}>Escuchar respuesta</button>
    {active&&<button type="button" className="av-secondary" aria-pressed={paused} aria-label={paused?'Reanudar respuesta':'Pausar respuesta'} onClick={()=>{if(ownId!==null){if(paused)SpeechService.resumeSpeaking(ownId);else SpeechService.pauseSpeaking(ownId);}}}>{paused?'Reanudar':'Pausar'}</button>}
  </div>;
}
