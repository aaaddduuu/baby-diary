/// <reference types="vite/client" />

interface SpeechRecognitionResultLike {
  0: {
    transcript: string;
    confidence: number;
  };
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: SpeechRecognitionResultLike;
    length: number;
  };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}
