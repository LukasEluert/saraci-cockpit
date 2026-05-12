/** Browser-SpeechRecognition (inkl. iOS webkitSpeechRecognition). */

export type SpeechRecognitionResultLike = {
  readonly 0?: { readonly transcript?: string };
};

export type SpeechRecognitionEventLike = {
  readonly results: Iterable<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
