import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import NumberKeyboard from "../components/NumberKeyboard";
import RecordTimeField from "../components/RecordTimeField";
import RecordTypeIcon from "../components/RecordTypeIcon";
import type { RecordIconName } from "../components/RecordTypeIcon";
import SleepTimePicker from "../components/SleepTimePicker";
import { createRecord, parseVoiceRecord } from "../lib/api";
import type { VoiceCandidateType, VoiceParseResult } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import { isRecordTypeVisible, useCarePreferences } from "../lib/carePreferences";
import { getSpeechRecognitionConstructor, isSpeechRecognitionSupported, isStandaloneWebApp } from "../lib/recordVoice";
import useAppScrollLock from "../hooks/useAppScrollLock";
import {
  calcDuration,
  ADD_RECORD_TYPES,
  CARE_ACTIONS,
  CORD_STATUSES,
  DIAPER_AMOUNTS,
  DIAPER_COLORS,
  FEEDING_SIDES,
  FORMULA_PRESETS,
  formatDateTimeDisplay,
  getApiRecordType,
  getCurrentRecordTime,
  getDefaultTime,
  getDiaperTypeFromRecordType,
  isRecordTimeInFuture,
  isEndBeforeStart,
  JAUNDICE_SITES,
  parseDateTime,
  parseRecordedAt,
  STOOL_TEXTURES,
  TEMPERATURE_SITES,
  toRecordedAtISOString,
  toLocalDateTimeString,
  type RecordDateTimeValue,
} from "./recordFormShared";

type PageMode = "manual" | "reviewingVoice";
type VoiceUiStatus =
  | "idle"
  | "listening"
  | "transcribed"
  | "parsed"
  | "partial"
  | "unsupported"
  | "unrecognized"
  | "unsupported_env"
  | "error";

type VoiceSession = {
  status: VoiceUiStatus;
  transcript: string;
  message: string;
  inferredType?: VoiceCandidateType;
  missingFields: string[];
  confidence: number;
};

type RecordFormSnapshot = {
  type: string;
  breastSide: "left" | "right" | "both";
  breastLeft: number;
  breastRight: number;
  formulaMl: number;
  formulaPreset: number | null;
  sleepStart: RecordDateTimeValue;
  sleepEnd: RecordDateTimeValue;
  sleeping: boolean;
  diaperColor: string;
  diaperAmount: string;
  stoolTexture: string;
  medicineName: string;
  medicineDose: string;
  temperatureValue: string;
  temperatureSite: string;
  jaundiceValue: string;
  jaundiceSite: string;
  cordStatus: string;
  careAction: string;
  note: string;
  recordedAt: RecordDateTimeValue;
};

const VOICE_NOTICE_KEY = "voice_record_notice_seen_v1";
const VOICE_RECORD_ENABLED = false;

const RECORD_TYPE_LABELS: Record<string, string> = {
  breast_milk: "母乳",
  formula: "配方奶",
  sleep: "睡眠",
  diaper: "尿布",
  diaper_wet: "小便",
  diaper_dirty: "大便",
  temperature: "体温",
  medicine: "吃药",
  jaundice: "黄疸",
  cord_care: "脐护",
  bath_touch: "洗护",
};

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</div>;
}

function SelectorChip({
  active,
  iconName,
  label,
  tone,
  surface,
  className = "",
  onClick,
}: {
  active: boolean;
  iconName: RecordIconName;
  label: string;
  tone: string;
  surface: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-[20px] border px-3 py-3 text-center transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] shadow-[0_10px_24px_rgba(74,184,154,.14)]"
          : "border-white/70 bg-white/80"
      } ${className}`}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: surface, color: tone }}
      >
        <RecordTypeIcon name={iconName} className="h-6 w-6" />
      </span>
      <span className={`text-sm font-semibold ${active ? "text-[#1A5C3A]" : "text-[#526258]"}`}>{label}</span>
    </button>
  );
}

function MiniCardButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] text-[#1A5C3A] shadow-[0_8px_20px_rgba(74,184,154,.12)]"
          : "border-[#E8E1D5] bg-white text-[#526258]"
      }`}
    >
      {icon ? <span className="text-base">{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function AmountAdjuster({
  label,
  value,
  onDecrease,
  onIncrease,
  suffix = "分钟",
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  suffix?: string;
}) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <div className="text-xs text-[#7A8B80]">{suffix}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrease}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F1E9] text-xl font-bold text-[#607066]"
        >
          -
        </button>
        <div className="flex-1 text-center">
          <div className="font-tabular text-[34px] font-bold leading-none text-[#21382E]">{value}</div>
          <div className="mt-1 text-xs text-[#7A8B80]">{suffix}</div>
        </div>
        <button
          type="button"
          onClick={onIncrease}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DDF5EA] text-xl font-bold text-[#1A5C3A]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function VoicePermissionSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useAppScrollLock(visible);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[240]" role="dialog" aria-modal="true" aria-label="语音录入说明">
      <button type="button" aria-label="关闭语音说明" className="absolute inset-0 w-full border-none bg-[#21382E]/38 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="absolute inset-x-3 bottom-3 rounded-[28px] border border-white/70 bg-[rgba(248,247,239,.98)] shadow-[0_24px_48px_rgba(33,56,46,.22)] backdrop-blur-md">
        <div className="border-b border-[#EFE8DD] px-5 py-4">
          <div className="font-serif text-lg font-semibold text-[#21382E]">语音快捷录入</div>
          <div className="mt-1 text-sm leading-6 text-[#7A8B80]">当前只支持母乳、配方奶、睡眠和体温，其他类型会自动切到手动填写。</div>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-[22px] border border-[#D8EEE1] bg-[#F4FCF7] px-4 py-4 text-sm leading-6 text-[#315244]">
            <div>1. 录音仅用于本次识别，不上传音频文件。</div>
            <div>2. 系统会把识别后的文字发给后端做结构化解析。</div>
            <div>3. 保存前你仍然可以确认和修改所有字段。</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onCancel} className="h-12 rounded-full bg-white text-sm font-bold text-[#5F7368] shadow-soft">
              先不用
            </button>
            <button type="button" onClick={onConfirm} className="h-12 rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-sm font-bold text-white shadow-[0_12px_28px_rgba(47,155,115,.24)]">
              继续录音
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getVoiceStatusLabel(status: VoiceUiStatus, pageMode: PageMode) {
  if (status === "listening") return "正在听你说";
  if (status === "transcribed") return "正在分析";
  if (status === "parsed") return pageMode === "reviewingVoice" ? "请确认后保存" : "已识别";
  if (status === "partial") return "待补全";
  if (status === "unsupported") return "转为手动填写";
  if (status === "unrecognized") return "没有听懂";
  if (status === "unsupported_env") return "当前环境不支持";
  return "语音录入";
}

function VoiceSummaryCard({
  session,
  pageMode,
  canSubmit,
  loading,
  onConfirmSave,
  onSwitchToManual,
  onRetry,
  onResetAndRetry,
}: {
  session: VoiceSession;
  pageMode: PageMode;
  canSubmit: boolean;
  loading: boolean;
  onConfirmSave: () => void;
  onSwitchToManual: () => void;
  onRetry: () => void;
  onResetAndRetry: () => void;
}) {
  const typeLabel = session.inferredType ? RECORD_TYPE_LABELS[session.inferredType] : "";
  const isBusy = session.status === "listening" || session.status === "transcribed";
  const showConfirm = pageMode === "reviewingVoice" && !isBusy;
  const showManual = pageMode === "reviewingVoice" && !isBusy;
  const showRetry = !isBusy && (session.status === "partial" || session.status === "unrecognized" || session.status === "unsupported");

  return (
    <SectionCard className="overflow-hidden border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6C8879]">语音录入</div>
          <div className="mt-1 text-lg font-black text-[#21382E]">{getVoiceStatusLabel(session.status, pageMode)}</div>
        </div>
        {typeLabel ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2D805E] shadow-soft">{typeLabel}</span>
        ) : null}
      </div>

      <div className="mt-3 rounded-[20px] bg-white/90 px-4 py-4 shadow-soft">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">识别原文</div>
        <div className="mt-2 text-sm leading-6 text-[#315244]">
          {session.transcript || (session.status === "listening" ? "正在等待语音内容…" : "正在准备语音识别…")}
        </div>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/70 bg-white/75 px-4 py-3 text-sm leading-6 text-[#5B7768]">
        {session.message}
        {session.missingFields.length > 0 ? ` 仍需补充：${session.missingFields.join("、")}。` : ""}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {showConfirm ? (
          <button
            type="button"
            onClick={onConfirmSave}
            disabled={!canSubmit || loading}
            className="rounded-full bg-[#2D9B6A] px-4 py-2 text-sm font-bold text-white shadow-soft disabled:opacity-50"
          >
            {loading ? "保存中…" : "确认并保存"}
          </button>
        ) : null}
        {showManual ? (
          <button
            type="button"
            onClick={onSwitchToManual}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#315244] shadow-soft"
          >
            改为手动填写
          </button>
        ) : null}
        {showRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#315244] shadow-soft"
          >
            重试语音
          </button>
        ) : null}
        {!isBusy ? (
          <button
            type="button"
            onClick={onResetAndRetry}
            className="rounded-full bg-[#FFF4F4] px-4 py-2 text-sm font-bold text-[#C9664D] shadow-soft"
          >
            清空并重录
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

function toPageRecordType(type: VoiceCandidateType): string {
  if (type === "diaper") return "diaper_wet";
  return type;
}

export default function AddRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { baby } = useBaby();
  const { preferences } = useCarePreferences(baby);
  const requestedType = searchParams.get("type") || "breast_milk";
  const normalizedType = requestedType === "diaper"
    ? "diaper_wet"
    : requestedType === "diaper_both"
      ? "diaper_dirty"
      : requestedType;
  const [type, setType] = useState(normalizedType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const visibleRecordTypes = useMemo(() => {
    const visible = ADD_RECORD_TYPES.filter((recordType) => isRecordTypeVisible(recordType.type, preferences, "add"));
    if (visible.some((recordType) => recordType.type === type)) return visible;
    const currentType = ADD_RECORD_TYPES.find((recordType) => recordType.type === type);
    return currentType ? [...visible, currentType] : visible;
  }, [preferences, type]);

  const [breastSide, setBreastSide] = useState<"left" | "right" | "both">("both");
  const [breastLeft, setBreastLeft] = useState(10);
  const [breastRight, setBreastRight] = useState(10);
  const [formulaMl, setFormulaMl] = useState(() => {
    const saved = localStorage.getItem("last_formula_ml");
    return saved ? Number(saved) : 120;
  });
  const [formulaPreset, setFormulaPreset] = useState<number | null>(() => {
    const saved = localStorage.getItem("last_formula_ml");
    return saved && FORMULA_PRESETS.includes(Number(saved)) ? Number(saved) : 120;
  });
  const [showFormulaKeyboard, setShowFormulaKeyboard] = useState(false);

  const [sleepStart, setSleepStart] = useState(getDefaultTime);
  const [sleepEnd, setSleepEnd] = useState(getDefaultTime);
  const [sleeping, setSleeping] = useState(false);
  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);

  const [diaperColor, setDiaperColor] = useState("yellow");
  const [diaperAmount, setDiaperAmount] = useState("medium");
  const [stoolTexture, setStoolTexture] = useState("pasty");
  const [medicineName, setMedicineName] = useState("");
  const [medicineDose, setMedicineDose] = useState("");
  const [temperatureValue, setTemperatureValue] = useState("36.5");
  const [temperatureSite, setTemperatureSite] = useState("armpit");
  const [jaundiceValue, setJaundiceValue] = useState("");
  const [jaundiceSite, setJaundiceSite] = useState("forehead");
  const [cordStatus, setCordStatus] = useState("dry");
  const [careAction, setCareAction] = useState("bath");
  const [note, setNote] = useState("");
  const [recordedAt, setRecordedAt] = useState(getCurrentRecordTime);

  const [pageMode, setPageMode] = useState<PageMode>("manual");
  const [voiceSession, setVoiceSession] = useState<VoiceSession | null>(null);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);
  const [preVoiceSnapshot, setPreVoiceSnapshot] = useState<RecordFormSnapshot | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const canUseVoiceInput = VOICE_RECORD_ENABLED && isSpeechRecognitionSupported() && !isStandaloneWebApp();
  const voiceUnavailableMessage = isStandaloneWebApp()
    ? "主屏幕模式暂不支持语音输入，请在浏览器中打开。"
    : "当前浏览器暂不支持语音输入。";

  const diaperType = getDiaperTypeFromRecordType(type);
  const shouldSelectDiaperColor = preferences.diaperDetails && (diaperType === "dirty" || diaperType === "both");

  useEffect(() => {
    if (type === "formula") {
      localStorage.setItem("last_formula_ml", String(formulaMl));
    }
  }, [formulaMl, type]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  const buildSnapshot = (): RecordFormSnapshot => ({
    type,
    breastSide,
    breastLeft,
    breastRight,
    formulaMl,
    formulaPreset,
    sleepStart,
    sleepEnd,
    sleeping,
    diaperColor,
    diaperAmount,
    stoolTexture,
    medicineName,
    medicineDose,
    temperatureValue,
    temperatureSite,
    jaundiceValue,
    jaundiceSite,
    cordStatus,
    careAction,
    note,
    recordedAt,
  });

  const applySnapshot = (snapshot: RecordFormSnapshot) => {
    setType(snapshot.type);
    setBreastSide(snapshot.breastSide);
    setBreastLeft(snapshot.breastLeft);
    setBreastRight(snapshot.breastRight);
    setFormulaMl(snapshot.formulaMl);
    setFormulaPreset(snapshot.formulaPreset);
    setSleepStart(snapshot.sleepStart);
    setSleepEnd(snapshot.sleepEnd);
    setSleeping(snapshot.sleeping);
    setDiaperColor(snapshot.diaperColor);
    setDiaperAmount(snapshot.diaperAmount);
    setStoolTexture(snapshot.stoolTexture);
    setMedicineName(snapshot.medicineName);
    setMedicineDose(snapshot.medicineDose);
    setTemperatureValue(snapshot.temperatureValue);
    setTemperatureSite(snapshot.temperatureSite);
    setJaundiceValue(snapshot.jaundiceValue);
    setJaundiceSite(snapshot.jaundiceSite);
    setCordStatus(snapshot.cordStatus);
    setCareAction(snapshot.careAction);
    setNote(snapshot.note);
    setRecordedAt(snapshot.recordedAt);
  };

  const selectRecordType = (nextType: string, source: "user" | "system") => {
    setType(nextType);
    if (source === "user") {
      setPageMode("manual");
      setVoiceSession(null);
    }
  };

  const sleepDuration = useMemo(() => {
    if (sleeping) return null;
    return calcDuration(sleepStart, sleepEnd);
  }, [sleepEnd, sleepStart, sleeping]);

  const isInvalidTime = useMemo(() => {
    if (sleeping) return false;
    return isEndBeforeStart(sleepStart, sleepEnd);
  }, [sleepEnd, sleepStart, sleeping]);

  const canSubmit = useMemo(() => {
    if (type === "sleep" && !sleeping && isInvalidTime) return false;
    if (type === "medicine" && !medicineName.trim()) return false;
    if (type === "temperature") {
      const value = Number(temperatureValue);
      if (!Number.isFinite(value) || value < 30 || value > 43) return false;
    }
    if (type === "jaundice") {
      const value = Number(jaundiceValue);
      if (!Number.isFinite(value) || value < 0) return false;
    }
    if (isRecordTimeInFuture(recordedAt)) return false;
    return true;
  }, [isInvalidTime, jaundiceValue, medicineName, recordedAt, sleeping, temperatureValue, type]);

  const handleFormulaPreset = (ml: number) => {
    setFormulaMl(ml);
    setFormulaPreset(ml);
  };

  const handleFormulaAdjust = (delta: number) => {
    const newValue = Math.max(0, Math.min(999, formulaMl + delta));
    setFormulaMl(newValue);
    setFormulaPreset(FORMULA_PRESETS.includes(newValue) ? newValue : null);
  };

  const handleFormulaKeyboardConfirm = (value: string) => {
    const amount = Number(value);
    if (amount > 0) {
      setFormulaMl(amount);
      setFormulaPreset(FORMULA_PRESETS.includes(amount) ? amount : null);
    }
    setShowFormulaKeyboard(false);
  };

  const buildPayload = () => {
    let data: Record<string, unknown> = {};

    if (type === "breast_milk") {
      data = {
        side: breastSide,
        leftMin: breastSide === "right" ? 0 : breastLeft,
        rightMin: breastSide === "left" ? 0 : breastRight,
        note,
      };
    } else if (type === "formula") {
      data = { ml: formulaMl, note };
    } else if (type === "sleep") {
      const startStr = toLocalDateTimeString(sleepStart);
      const endStr = sleeping ? null : toLocalDateTimeString(sleepEnd);
      data = { start: startStr, end: endStr, sleeping, note };
    } else if (diaperType) {
      data = {
        diaper_type: diaperType,
        ...(preferences.diaperDetails ? { amount: diaperAmount } : {}),
        ...(shouldSelectDiaperColor ? { color: diaperColor } : {}),
        ...(shouldSelectDiaperColor ? { texture: stoolTexture } : {}),
        note,
      };
    } else if (type === "medicine") {
      data = {
        medicine_name: medicineName.trim(),
        dose: medicineDose.trim(),
        note,
      };
    } else if (type === "temperature") {
      data = {
        value: Number(temperatureValue),
        site: temperatureSite,
        note,
      };
    } else if (type === "jaundice") {
      data = {
        value: Number(jaundiceValue),
        site: jaundiceSite,
        note,
      };
    } else if (type === "cord_care") {
      data = {
        status: cordStatus,
        note,
      };
    } else if (type === "bath_touch") {
      data = {
        action: careAction,
        note,
      };
    }

    return {
      type: getApiRecordType(type),
      data,
      recorded_at: toRecordedAtISOString(recordedAt),
    };
  };

  const handleSubmit = async () => {
    if (!baby) {
      setError("请先添加宝宝");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = buildPayload();
      await createRecord({
        baby_id: baby.id,
        type: payload.type,
        data: payload.data,
        recorded_at: payload.recorded_at,
      });
      navigate("/record");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const applyVoiceCandidate = (result: VoiceParseResult) => {
    const candidate = result.candidate;
    if (!candidate) return;

    selectRecordType(toPageRecordType(candidate.type), "system");

    if (candidate.recorded_at) {
      setRecordedAt(parseRecordedAt(candidate.recorded_at));
    }

    if (candidate.type === "breast_milk") {
      if (typeof candidate.data.side === "string" && ["left", "right", "both"].includes(candidate.data.side)) {
        setBreastSide(candidate.data.side as "left" | "right" | "both");
      }
      if (typeof candidate.data.leftMin === "number") setBreastLeft(candidate.data.leftMin);
      if (typeof candidate.data.rightMin === "number") setBreastRight(candidate.data.rightMin);
      return;
    }

    if (candidate.type === "formula") {
      if (typeof candidate.data.ml === "number") {
        setFormulaMl(candidate.data.ml);
        setFormulaPreset(FORMULA_PRESETS.includes(candidate.data.ml) ? candidate.data.ml : null);
      }
      return;
    }

    if (candidate.type === "sleep") {
      if (typeof candidate.data.start === "string") {
        setSleepStart(parseDateTime(candidate.data.start));
      }
      if (typeof candidate.data.end === "string") {
        setSleepEnd(parseDateTime(candidate.data.end));
      }
      if (typeof candidate.data.sleeping === "boolean") {
        setSleeping(candidate.data.sleeping);
      }
      return;
    }

    if (candidate.type === "temperature") {
      if (typeof candidate.data.value === "number") {
        setTemperatureValue(String(candidate.data.value));
      }
      if (typeof candidate.data.site === "string") {
        setTemperatureSite(candidate.data.site);
      }
    }
  };

  const handleVoiceParseResult = (result: VoiceParseResult) => {
    const nextSession: VoiceSession = {
      status: result.status,
      transcript: result.transcript,
      message: result.message,
      inferredType: result.candidate?.type,
      missingFields: result.missing_fields || [],
      confidence: result.confidence,
    };

    if (result.status === "parsed") {
      applyVoiceCandidate(result);
      setVoiceSession(nextSession);
      setPageMode("reviewingVoice");
      return;
    }

    if (result.status === "partial") {
      if (result.candidate) {
        applyVoiceCandidate(result);
      }
      setVoiceSession(nextSession);
      setPageMode("manual");
      return;
    }

    if (result.status === "unsupported") {
      if (result.candidate?.type) {
        applyVoiceCandidate(result);
      }
      setVoiceSession(nextSession);
      setPageMode("manual");
      return;
    }

    setVoiceSession(nextSession);
    setPageMode("manual");
  };

  const requestSpeechTranscript = () => new Promise<string>((resolve, reject) => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      reject(new Error("当前浏览器暂不支持语音输入"));
      return;
    }

    let settled = false;
    let transcript = "";
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const finalize = (handler: () => void) => {
      if (settled) return;
      settled = true;
      recognitionRef.current = null;
      handler();
    };

    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_, index) => {
        const result = event.results[index];
        return result?.[0]?.transcript || "";
      }).join("").trim();
      transcript = text;
      recognition.stop();
    };

    recognition.onerror = (event) => {
      const nextMessage = event.error === "not-allowed"
        ? "你拒绝了麦克风权限，请改为手动填写。"
        : event.error === "no-speech"
          ? "没有识别到语音内容，请再说一次。"
          : "语音识别失败，请再试一次。";
      finalize(() => reject(new Error(nextMessage)));
    };

    recognition.onend = () => {
      finalize(() => {
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error("没有识别到语音内容，请再说一次。"));
        }
      });
    };

    recognition.start();
  });

  const startVoiceFlow = async (snapshotOverride?: RecordFormSnapshot) => {
    if (!baby || !canUseVoiceInput) {
      setVoiceSession({
        status: "unsupported_env",
        transcript: "",
        message: voiceUnavailableMessage,
        missingFields: [],
        confidence: 0,
      });
      return;
    }

    setPreVoiceSnapshot(snapshotOverride || buildSnapshot());
    setError("");
    setPageMode("manual");
    setVoiceSession({
      status: "listening",
      transcript: "",
      message: "请一次说完一句记录，例如“左边喂了十二分钟”。",
      missingFields: [],
      confidence: 0,
    });

    const recognitionStartedAt = new Date().toISOString();

    try {
      const transcript = await requestSpeechTranscript();
      setVoiceSession({
        status: "transcribed",
        transcript,
        message: "正在分析语音内容…",
        missingFields: [],
        confidence: 0,
      });

      const result = await parseVoiceRecord({
        baby_id: baby.id,
        transcript,
        recorded_at_context: new Date().toISOString(),
        recognition_started_at: recognitionStartedAt,
      });
      handleVoiceParseResult(result);
    } catch (err) {
      setVoiceSession({
        status: "error",
        transcript: "",
        message: err instanceof Error ? err.message : "语音识别失败，请稍后再试。",
        missingFields: [],
        confidence: 0,
      });
      setPageMode("manual");
    }
  };

  const handleVoiceEntryClick = () => {
    if (!canUseVoiceInput) {
      setVoiceSession({
        status: "unsupported_env",
        transcript: "",
        message: voiceUnavailableMessage,
        missingFields: [],
        confidence: 0,
      });
      return;
    }

    if (!localStorage.getItem(VOICE_NOTICE_KEY)) {
      setShowVoiceNotice(true);
      return;
    }

    void startVoiceFlow();
  };

  const handleVoiceNoticeConfirm = () => {
    localStorage.setItem(VOICE_NOTICE_KEY, "1");
    setShowVoiceNotice(false);
    void startVoiceFlow();
  };

  const handleSwitchToManual = () => {
    setPageMode("manual");
  };

  const handleResetAndRetry = () => {
    if (!preVoiceSnapshot) {
      void startVoiceFlow();
      return;
    }

    applySnapshot(preVoiceSnapshot);
    setVoiceSession(null);
    setPageMode("manual");
    void startVoiceFlow(preVoiceSnapshot);
  };

  return (
    <Layout className="secondary-page">
      <Header
        title="添加记录"
        subtitle="快速记下今天的小事"
        variant="hero"
        back
      />

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-6 pt-4">
          {error ? (
            <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {VOICE_RECORD_ENABLED ? (
            <SectionCard className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="panel-title text-[17px]">语音快捷录入</div>
                  <div className="panel-note mt-1">当前支持母乳、配方奶、睡眠、体温</div>
                </div>
                <span className="rounded-full bg-[#EAF8F2] px-3 py-1 text-[11px] font-bold text-[#2D805E]">v1</span>
              </div>
              <button
                type="button"
                onClick={handleVoiceEntryClick}
                disabled={voiceSession?.status === "listening" || voiceSession?.status === "transcribed"}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
                  canUseVoiceInput
                    ? "border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] shadow-[0_14px_32px_rgba(47,155,115,.14)]"
                    : "border-[#E8E1D5] bg-[#F8F5EE]"
                } disabled:opacity-60`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${canUseVoiceInput ? "bg-white text-[#2D9B6A]" : "bg-white/70 text-[#9A9388]"}`}>
                    🎙️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold ${canUseVoiceInput ? "text-[#21382E]" : "text-[#7A8B80]"}`}>
                      {voiceSession?.status === "listening" ? "正在听你说…" : canUseVoiceInput ? "点击开始语音录入" : "当前环境暂不支持语音输入"}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[#6B7C72]">
                      {canUseVoiceInput
                        ? "例如：左边喂了十二分钟、喝了120毫升奶粉、体温38.2耳温。"
                        : voiceUnavailableMessage}
                    </div>
                  </div>
                </div>
              </button>
            </SectionCard>
          ) : null}

          {VOICE_RECORD_ENABLED && voiceSession && voiceSession.status !== "error" ? (
            <VoiceSummaryCard
              session={voiceSession}
              pageMode={pageMode}
              canSubmit={canSubmit}
              loading={loading}
              onConfirmSave={handleSubmit}
              onSwitchToManual={handleSwitchToManual}
              onRetry={() => void startVoiceFlow()}
              onResetAndRetry={handleResetAndRetry}
            />
          ) : null}

          {VOICE_RECORD_ENABLED && voiceSession?.status === "error" ? (
            <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
              {voiceSession.message}
            </div>
          ) : null}

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">记录类型</div>
              <div className="panel-note mt-1">选择这次要记录的内容</div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {visibleRecordTypes.map((recordType) => (
                <SelectorChip
                  key={recordType.type}
                  active={type === recordType.type}
                  iconName={recordType.iconName}
                  label={recordType.label}
                  tone={recordType.tone}
                  surface={recordType.surface}
                  className="col-span-2"
                  onClick={() => selectRecordType(recordType.type, "user")}
                />
              ))}
            </div>
          </SectionCard>

          <RecordTimeField
            value={recordedAt}
            onChange={setRecordedAt}
            invalid={isRecordTimeInFuture(recordedAt)}
          />

          {type === "breast_milk" ? (
            <>
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">喂养方式</div>
                  <div className="panel-note mt-1">用卡片选择左右侧或双侧</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {FEEDING_SIDES.map((option) => (
                    <MiniCardButton
                      key={option.value}
                      active={breastSide === option.value}
                      icon={option.icon}
                      label={option.label}
                      onClick={() => setBreastSide(option.value)}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="space-y-3 p-4">
                <div>
                  <div className="panel-title text-[17px]">时长</div>
                  <div className="panel-note mt-1">把每一侧的喂养时间记清楚</div>
                </div>
                {(breastSide === "left" || breastSide === "both") && (
                  <AmountAdjuster
                    label="左侧"
                    value={breastLeft}
                    onDecrease={() => setBreastLeft(Math.max(0, breastLeft - 1))}
                    onIncrease={() => setBreastLeft(Math.min(60, breastLeft + 1))}
                  />
                )}
                {(breastSide === "right" || breastSide === "both") && (
                  <AmountAdjuster
                    label="右侧"
                    value={breastRight}
                    onDecrease={() => setBreastRight(Math.max(0, breastRight - 1))}
                    onIncrease={() => setBreastRight(Math.min(60, breastRight + 1))}
                  />
                )}
              </SectionCard>
            </>
          ) : null}

          {type === "formula" ? (
            <>
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">常用奶量</div>
                  <div className="panel-note mt-1">选择常用值，或输入自定义毫升数</div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {FORMULA_PRESETS.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => handleFormulaPreset(ml)}
                      className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        formulaPreset === ml
                          ? "border-[#5BC4A0] bg-[#5BC4A0] text-white"
                          : "border-[#CBE8DA] bg-white text-[#1A5C3A]"
                      }`}
                    >
                      {ml} ml
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowFormulaKeyboard(true)}
                    className="flex-shrink-0 rounded-full border border-[#E3DDD1] bg-[#F6F3EA] px-4 py-2 text-sm font-semibold text-[#526258]"
                  >
                    自定义
                  </button>
                </div>
              </SectionCard>

              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">奶量</div>
                  <div className="panel-note mt-1">增减 10ml，保持记录速度</div>
                </div>
                <AmountAdjuster
                  label="配方奶"
                  value={formulaMl}
                  suffix="ml"
                  onDecrease={() => handleFormulaAdjust(-10)}
                  onIncrease={() => handleFormulaAdjust(10)}
                />
              </SectionCard>
            </>
          ) : null}

          {type === "sleep" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">睡眠时间</div>
                <div className="panel-note mt-1">开始和结束时间放在同一组，查看更清楚</div>
              </div>

              <div className="space-y-3 rounded-[22px] bg-white p-4 shadow-soft">
                <div className="space-y-2">
                  <SectionLabel>{"开始时间"}</SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowPicker("start")}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 py-3 text-left text-sm font-medium text-[#21382E]"
                  >
                    <span>{formatDateTimeDisplay(sleepStart)}</span>
                    <span className="text-[#7A8B80]">编辑</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <SectionLabel>{"结束时间"}</SectionLabel>
                    <label className="flex items-center gap-2 text-sm text-[#526258]">
                      <input
                        type="checkbox"
                        checked={sleeping}
                        onChange={(event) => setSleeping(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-mint focus:ring-mint"
                      />
                      <span>{"睡眠中"}</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => !sleeping && setShowPicker("end")}
                    disabled={sleeping}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      sleeping
                        ? "cursor-not-allowed border-[#EEE8DE] bg-[#F5F2EB] text-[#A39A8C]"
                        : "border-[#E8E1D5] bg-[#FBF9F3] text-[#21382E]"
                    }`}
                  >
                    <span>{sleeping ? "睡眠中…" : formatDateTimeDisplay(sleepEnd)}</span>
                    <span className="text-[#7A8B80]">{sleeping ? "" : "编辑"}</span>
                  </button>
                </div>
              </div>

              {sleepDuration ? (
                <div className="rounded-2xl bg-[#EEF8F3] px-4 py-3 text-center text-sm font-semibold text-[#1A5C3A]">
                  {sleepDuration}
                </div>
              ) : null}

              {isInvalidTime && !sleeping ? (
                <div className="rounded-2xl border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
                  结束时间不能早于开始时间。
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {diaperType && preferences.diaperDetails ? (
            <SectionCard className="space-y-3 p-4">
              <div>
                <div className="panel-title text-[17px]">尿布情况</div>
                <div className="panel-note mt-1">记录本次量的多少，方便一天结束后汇总。</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {DIAPER_AMOUNTS.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={diaperAmount === option.value}
                    label={option.label}
                    onClick={() => setDiaperAmount(option.value)}
                  />
                ))}
              </div>
            </SectionCard>
          ) : null}

          {shouldSelectDiaperColor ? (
            <SectionCard className="space-y-3 p-4">
              <div>
                <div className="panel-title text-[17px]">大便观察</div>
                <div className="panel-note mt-1">记录颜色和性状，便于后续观察</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DIAPER_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDiaperColor(option.value)}
                    className={`relative flex items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-all ${
                      diaperColor === option.value
                        ? "border-[#5BC4A0] bg-[#F0FAF6] shadow-[0_8px_20px_rgba(74,184,154,.12)]"
                        : "border-[#E8E1D5] bg-white"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/70"
                      style={{ backgroundColor: option.dot }}
                    />
                    <span className="flex-1 text-sm font-semibold text-[#21382E]">{option.label}</span>
                    {option.badge ? (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          option.badge === "留意"
                            ? "bg-[#FFF1D9] text-[#B86B16]"
                            : "bg-[#E6F5EC] text-[#2B7A53]"
                        }`}
                      >
                        {option.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {STOOL_TEXTURES.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={stoolTexture === option.value}
                    label={option.label}
                    onClick={() => setStoolTexture(option.value)}
                  />
                ))}
              </div>

              {diaperColor === "green" ? (
                <div className="rounded-[20px] border border-[#F3E0B5] bg-[#FFF7E7] px-4 py-3 text-sm leading-6 text-[#8A6220]">
                  绿色便便可能和饮食或肠胃状态有关，如果持续出现，建议结合宝宝状态留意观察。
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {type === "temperature" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">体温</div>
                <div className="panel-note mt-1">填写温度并选择测量部位。</div>
              </div>
              <div className="rounded-[22px] bg-white p-4 shadow-soft">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">温度（°C）</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="30"
                    max="43"
                    step="0.1"
                    value={temperatureValue}
                    onChange={(event) => setTemperatureValue(event.target.value.slice(0, 5))}
                    placeholder="36.5"
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {TEMPERATURE_SITES.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={temperatureSite === option.value}
                    label={option.label}
                    onClick={() => setTemperatureSite(option.value)}
                  />
                ))}
              </div>
              {Number(temperatureValue) >= 37.5 ? (
                <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm leading-6 text-danger">
                  体温偏高，建议结合宝宝精神状态继续观察。
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {type === "jaundice" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">黄疸观察</div>
                <div className="panel-note mt-1">记录本次测量数值和部位。</div>
              </div>
              <div className="rounded-[22px] bg-white p-4 shadow-soft">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">黄疸数值</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={jaundiceValue}
                    onChange={(event) => setJaundiceValue(event.target.value.slice(0, 5))}
                    placeholder="例如：12.4"
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {JAUNDICE_SITES.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={jaundiceSite === option.value}
                    label={option.label}
                    onClick={() => setJaundiceSite(option.value)}
                  />
                ))}
              </div>
            </SectionCard>
          ) : null}

          {type === "cord_care" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">脐部护理</div>
                <div className="panel-note mt-1">记录消毒后的脐部状态。</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CORD_STATUSES.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={cordStatus === option.value}
                    label={option.label}
                    onClick={() => setCordStatus(option.value)}
                  />
                ))}
              </div>
              {cordStatus !== "dry" ? (
                <div className="rounded-[20px] border border-[#F3E0B5] bg-[#FFF7E7] px-4 py-3 text-sm leading-6 text-[#8A6220]">
                  脐部状态异常时，建议持续观察并记录变化。
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {type === "bath_touch" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">洗护操作</div>
                <div className="panel-note mt-1">记录洗澡、抚触或组合护理。</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {CARE_ACTIONS.map((option) => (
                  <MiniCardButton
                    key={option.value}
                    active={careAction === option.value}
                    label={option.label}
                    onClick={() => setCareAction(option.value)}
                  />
                ))}
              </div>
            </SectionCard>
          ) : null}

          {type === "medicine" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">服药信息</div>
                <div className="panel-note mt-1">记下药品和本次用量，方便家人核对</div>
              </div>
              <div className="space-y-3 rounded-[22px] bg-white p-4 shadow-soft">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">药品名称</span>
                  <input
                    type="text"
                    value={medicineName}
                    onChange={(event) => setMedicineName(event.target.value.slice(0, 60))}
                    placeholder="例如：布洛芬混悬液"
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                    maxLength={60}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">本次用量（选填）</span>
                  <input
                    type="text"
                    value={medicineDose}
                    onChange={(event) => setMedicineDose(event.target.value.slice(0, 40))}
                    placeholder="例如：2.5 ml、半片、1袋"
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                    maxLength={40}
                  />
                </label>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">备注</div>
              <div className="panel-note mt-1">补充这次记录的细节，留空也可以</div>
            </div>
            <div className="rounded-[22px] bg-white p-4 shadow-soft">
              <textarea
                className="h-24 w-full resize-none border-none bg-transparent text-sm leading-6 text-[#21382E] outline-none placeholder:text-[#9A9388]"
                placeholder="添加备注…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </SectionCard>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className={`h-12 w-full rounded-full text-base font-semibold transition-all ${
            canSubmit
              ? "bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-white shadow-[0_12px_28px_rgba(47,155,115,.28)]"
              : "bg-[#D9D7D2] text-[#8C877F]"
          }`}
        >
          {loading ? "保存中…" : pageMode === "reviewingVoice" ? "确认并保存" : "保存记录"}
        </button>
      </div>

      <SleepTimePicker
        visible={showPicker === "start"}
        title="选择开始时间"
        value={sleepStart}
        onConfirm={(value) => {
          setSleepStart(value);
          setShowPicker(null);
        }}
        onCancel={() => setShowPicker(null)}
      />
      <SleepTimePicker
        visible={showPicker === "end"}
        title="选择结束时间"
        value={sleepEnd}
        onConfirm={(value) => {
          setSleepEnd(value);
          setShowPicker(null);
        }}
        onCancel={() => setShowPicker(null)}
      />
      <NumberKeyboard
        visible={showFormulaKeyboard}
        value={String(formulaMl)}
        onConfirm={handleFormulaKeyboardConfirm}
        onCancel={() => setShowFormulaKeyboard(false)}
      />
      {VOICE_RECORD_ENABLED ? (
        <VoicePermissionSheet
          visible={showVoiceNotice}
          onConfirm={handleVoiceNoticeConfirm}
          onCancel={() => setShowVoiceNotice(false)}
        />
      ) : null}
    </Layout>
  );
}
