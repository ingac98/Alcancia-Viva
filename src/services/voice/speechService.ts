// Servicio de reconocimiento y síntesis de voz usando Web Speech API estándar

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
}

export class SpeechService {
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
    if (!this.isSynthesisSupported()) return;

    window.speechSynthesis.cancel(); // Detener pronunciaciones previas

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = import.meta.env.VITE_SPEECH_LANG || 'es-PE';
    utterance.rate = rate;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  static stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
