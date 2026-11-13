export interface QuestionRecognizer {
  lang:string; continuous:boolean; interimResults:boolean;
  onstart:(()=>void)|null;
  onresult:((event:any)=>void)|null; onerror:((event:any)=>void)|null; onend:(()=>void)|null;
  start:()=>void; abort:()=>void;
}
interface Callbacks { question:(text:string)=>void; listening:(value:boolean)=>void; status:(text:string)=>void; }
export function createQuestionDictation(factory:()=>QuestionRecognizer,callbacks:Callbacks) {
  let active:QuestionRecognizer|null=null,disposed=false;
  function release(){
    const previous=active;active=null;
    if(previous){previous.onresult=null;previous.onerror=null;previous.onend=null;try{previous.abort();}catch{}}
  }
  return {
    start(base:string){
      if(disposed)return;
      release();
      try {
        const recognition=factory();active=recognition;
        recognition.lang='es-PE';recognition.continuous=false;recognition.interimResults=true;
        recognition.onstart=()=>{
          if(active!==recognition||disposed){try{recognition.abort();}catch{}return;}
          callbacks.status('Micrófono activo. Escuchando tu pregunta…');
        };
        let heard=false;
        recognition.onresult=event=>{
          if(active!==recognition||disposed)return;
          let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';
          text=text.trim();if(!text)return;heard=true;
          const combined=[base.trim(),text].filter(Boolean).join(' ');
          callbacks.question(combined.slice(0,1500));
          callbacks.status(combined.length>1500?'Llegaste al límite de 1500 caracteres. Detén el dictado para revisar.':'Escuchando… La pregunta aparecerá aquí; no se envía automáticamente.');
        };
        recognition.onerror=event=>{
          if(active!==recognition||disposed)return;
          const messages:Record<string,string>={
            'not-allowed':'Permite el micrófono en tu navegador o escribe tu pregunta.',
            'service-not-allowed':'El navegador no permite el dictado. Puedes escribir tu pregunta.',
            'audio-capture':'No encontramos un micrófono disponible. Puedes escribir tu pregunta.',
            'no-speech':'No se detectó voz. Puedes volver a dictar o escribir.',
            'network':'No se pudo conectar el reconocimiento de voz. Puedes escribir tu pregunta.',
          };
          release();callbacks.listening(false);callbacks.status(messages[event.error]||'No se pudo completar el dictado. Tu texto se conserva; puedes escribir o reintentar.');
        };
        recognition.onend=()=>{
          if(active!==recognition||disposed)return;
          release();callbacks.listening(false);callbacks.status(heard?'Revisa o edita tu pregunta y pulsa «Consultar al asistente».':'No se detectó voz. Puedes volver a dictar o escribir.');
        };
        callbacks.listening(true);callbacks.status('Solicitando acceso al micrófono…');recognition.start();
      } catch {release();callbacks.listening(false);callbacks.status('No se pudo iniciar el micrófono. Tu texto se conserva; puedes escribir o reintentar.');}
    },
    stop(){if(!active)return;release();if(!disposed){callbacks.listening(false);callbacks.status('Dictado detenido. Revisa tu pregunta antes de enviarla.');}},
    dispose(){disposed=true;release();},
  };
}
