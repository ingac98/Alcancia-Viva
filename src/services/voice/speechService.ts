// Servicio de reconocimiento y síntesis de voz usando Web Speech API estándar
import { createSpeechPlayback } from './speechPlayback';
import type { PlaybackState } from './speechPlayback';

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
}

export class SpeechService {
  private static playback:ReturnType<typeof createSpeechPlayback>|null=null;
  private static getPlayback(){
    if(!this.isSynthesisSupported())return null;
    if(!this.playback)this.playback=createSpeechPlayback(window.speechSynthesis,text=>new SpeechSynthesisUtterance(text));
    return this.playback;
  }
  static getPlaybackState():PlaybackState{return this.getPlayback()?.getState()||{id:null,status:'idle'};}
  static subscribePlayback(listener:(state:PlaybackState)=>void){return this.getPlayback()?.subscribe(listener)||(()=>{});}
  static pauseSpeaking(id:number){this.getPlayback()?.pause(id);}
  static resumeSpeaking(id:number){this.getPlayback()?.resume(id);}
  private static recognition: any = null;
  private static isListening: boolean = false;

  static isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  static isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static startListening(
    onResult: (result: SpeechRecognitionResultPayload) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ) {
    if (!this.isRecognitionSupported()) {
      onError(new Error('El navegador no soporta reconocimiento de voz nativo.'));
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = import.meta.env.VITE_SPEECH_LANG || 'es-PE';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      onResult({
        transcript: finalTranscript || interimTranscript,
        isFinal: Boolean(finalTranscript)
      });
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || 'Error al capturar voz');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Error al iniciar reconocimiento de voz:', e);
    }
  }

  static stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error al detener reconocimiento:', e);
      }
      this.isListening = false;
    }
  }

  static speak(text: string, rate: number = 1.0, onEnd?: () => void) {
    return this.getPlayback()?.speak(text,rate,import.meta.env.VITE_SPEECH_LANG||'es-PE',onEnd)??null;
  }

  static stopSpeaking() {
    this.getPlayback()?.stop();
  }
}
