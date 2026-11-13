export interface PlaybackState { id:number|null; status:'idle'|'speaking'|'paused'; }
export interface PlaybackUtterance {
  lang:string;rate:number;onend:((event:any)=>void)|null;onerror:((event:any)=>void)|null;
  onstart:((event:any)=>void)|null;onpause:((event:any)=>void)|null;onresume:((event:any)=>void)|null;
}
export interface PlaybackDriver { speak:(utterance:any)=>void;cancel:()=>void;pause:()=>void;resume:()=>void; }
export function createSpeechPlayback(driver:PlaybackDriver,makeUtterance:(text:string)=>PlaybackUtterance) {
  let serial=0,current:{id:number;utterance:PlaybackUtterance}|null=null;
  let state:PlaybackState={id:null,status:'idle'};
  const listeners=new Set<(state:PlaybackState)=>void>();
  function publish(next:PlaybackState){state=next;for(const listener of listeners)listener(next);}
  function finish(id:number){if(current?.id!==id)return false;current=null;publish({id:null,status:'idle'});return true;}
  function stop(){
    const previous=current;current=null;
    if(previous){const u=previous.utterance;u.onend=null;u.onerror=null;u.onstart=null;u.onpause=null;u.onresume=null;}
    publish({id:null,status:'idle'});try{driver.cancel();}catch{}
  }
  return {
    getState:()=>state,
    subscribe(listener:(state:PlaybackState)=>void){listeners.add(listener);listener(state);return()=>{listeners.delete(listener);};},
    speak(text:string,rate=1,lang='es-PE',onEnd?:()=>void){
      stop();const id=++serial;
      try{
        const utterance=makeUtterance(text);utterance.lang=lang;utterance.rate=rate;current={id,utterance};
        utterance.onend=()=>{if(finish(id))onEnd?.();};utterance.onerror=()=>{finish(id);};
        utterance.onstart=()=>{if(current?.id===id&&state.status!=='paused')publish({id,status:'speaking'});};
        utterance.onpause=()=>{if(current?.id===id)publish({id,status:'paused'});};
        utterance.onresume=()=>{if(current?.id===id)publish({id,status:'speaking'});};
        publish({id,status:'speaking'});
        driver.resume();driver.speak(utterance);
        return current?.id===id?id:null;
      }catch{finish(id);return null;}
    },
    pause(id:number){if(current?.id!==id||state.status!=='speaking')return;try{driver.pause();if(current?.id===id)publish({id,status:'paused'});}catch{stop();}},
    resume(id:number){if(current?.id!==id||state.status!=='paused')return;try{driver.resume();if(current?.id===id)publish({id,status:'speaking'});}catch{stop();}},
    stop,
  };
}
