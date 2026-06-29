export type VoiceParseStatus = "parsed" | "partial" | "unsupported" | "unrecognized";

export type VoiceCandidateType =
  | "breast_milk"
  | "formula"
  | "sleep"
  | "temperature"
  | "diaper"
  | "medicine"
  | "jaundice"
  | "cord_care"
  | "bath_touch";

export type VoiceParseCandidate = {
  type: VoiceCandidateType;
  recorded_at: string;
  data: Record<string, unknown>;
};

export type VoiceParseResponse = {
  status: VoiceParseStatus;
  transcript: string;
  candidate?: VoiceParseCandidate;
  missing_fields?: string[];
  confidence: number;
  message: string;
};

export function isStandaloneWebApp() {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = "standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const mediaStandalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return navigatorStandalone || mediaStandalone;
}

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
