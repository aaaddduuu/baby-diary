import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import NumberKeyboard from "../components/NumberKeyboard";
import RecordTimeField from "../components/RecordTimeField";
import RecordTypeIcon from "../components/RecordTypeIcon";
import type { RecordIconName } from "../components/RecordTypeIcon";
import SleepTimePicker from "../components/SleepTimePicker";
import { useBaby } from "../lib/BabyContext";
import { isRecordTypeVisible, useCarePreferences } from "../lib/carePreferences";
import { fetchRecordById, updateRecord } from "../lib/api";
import {
  calcDuration,
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
  getRecordEntryType,
  isRecordTimeInFuture,
  isEndBeforeStart,
  JAUNDICE_SITES,
  parseDateTime,
  parseRecordedAt,
  RECORD_TYPES,
  STOOL_TEXTURES,
  TEMPERATURE_SITES,
  toRecordedAtISOString,
  toLocalDateTimeString,
} from "./recordFormShared";

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

export default function EditRecordPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { baby } = useBaby();
  const { preferences } = useCarePreferences(baby);

  const [type, setType] = useState("breast_milk");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");

  const [breastSide, setBreastSide] = useState<"left" | "right" | "both">("both");
  const [breastLeft, setBreastLeft] = useState(10);
  const [breastRight, setBreastRight] = useState(10);
  const [formulaMl, setFormulaMl] = useState(120);
  const [formulaPreset, setFormulaPreset] = useState<number | null>(120);
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
  const diaperType = getDiaperTypeFromRecordType(type);
  const isVolumeFeedType = type === "formula" || type === "breast_milk_bottle";
  const volumeFeedLabel = type === "breast_milk_bottle" ? "瓶喂母乳" : "配方奶";
  const shouldSelectDiaperColor = preferences.diaperDetails && (diaperType === "dirty" || diaperType === "both");
  const visibleRecordTypes = useMemo(() => {
    const visible = RECORD_TYPES.filter((recordType) => isRecordTypeVisible(recordType.type, preferences, "add"));
    if (visible.some((recordType) => recordType.type === type)) return visible;
    const currentType = RECORD_TYPES.find((recordType) => recordType.type === type);
    return currentType ? [...visible, currentType] : visible;
  }, [preferences, type]);

  useEffect(() => {
    if (!id) return;

    setFetchLoading(true);
    fetchRecordById(Number(id))
      .then((record) => {
        setRecordedAt(parseRecordedAt(record.recorded_at));
        const recordData = JSON.parse(record.data);
        setType(getRecordEntryType(record.type, recordData.diaper_type));

        if (record.type === "breast_milk") {
          setBreastSide(recordData.side || "both");
          setBreastLeft(recordData.leftMin || 0);
          setBreastRight(recordData.rightMin || 0);
        } else if (record.type === "formula" || record.type === "breast_milk_bottle") {
          setFormulaMl(recordData.ml || 120);
          setFormulaPreset(FORMULA_PRESETS.includes(recordData.ml) ? recordData.ml : null);
        } else if (record.type === "sleep") {
          setSleepStart(parseDateTime(recordData.start));
          setSleepEnd(parseDateTime(recordData.end || recordData.start));
          setSleeping(recordData.sleeping || false);
        } else if (record.type === "diaper") {
          setDiaperColor(recordData.color || "yellow");
          setDiaperAmount(recordData.amount || "medium");
          setStoolTexture(recordData.texture || "pasty");
        } else if (record.type === "medicine") {
          setMedicineName(recordData.medicine_name || "");
          setMedicineDose(recordData.dose || "");
        } else if (record.type === "temperature") {
          setTemperatureValue(recordData.value ? String(recordData.value) : "36.5");
          setTemperatureSite(recordData.site || "armpit");
        } else if (record.type === "jaundice") {
          setJaundiceValue(recordData.value ? String(recordData.value) : "");
          setJaundiceSite(recordData.site || "forehead");
        } else if (record.type === "cord_care") {
          setCordStatus(recordData.status || "dry");
        } else if (record.type === "bath_touch") {
          setCareAction(recordData.action || "bath");
        }

        if (recordData.note) {
          setNote(recordData.note);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载记录失败"))
      .finally(() => setFetchLoading(false));
  }, [id]);

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

  const handleSubmit = async () => {
    if (!baby || !id) return;

    setLoading(true);
    setError("");

    let data: Record<string, unknown> = {};

    if (type === "breast_milk") {
      data = {
        side: breastSide,
        leftMin: breastSide === "right" ? 0 : breastLeft,
        rightMin: breastSide === "left" ? 0 : breastRight,
        note,
      };
    } else if (isVolumeFeedType) {
      data = { ml: formulaMl, note };
    } else if (type === "sleep") {
      if (isInvalidTime) {
        setLoading(false);
        setError("结束时间不能早于开始时间。");
        return;
      }

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

    try {
      await updateRecord(Number(id), {
        type: getApiRecordType(type),
        data,
        recorded_at: toRecordedAtISOString(recordedAt),
      });
      navigate("/record");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout className="secondary-page">
        <Header title="编辑记录" subtitle="同步调整这次记录" variant="hero" back />
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-[20px] bg-white/90 px-5 py-4 text-sm text-[#607066] shadow-soft">
            {"加载中…"}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="secondary-page">
      <Header
        title="编辑记录"
        subtitle="保留原有内容，只改需要的部分"
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

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">记录类型</div>
              <div className="panel-note mt-1">选择这条记录所属的类型。</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visibleRecordTypes.map((recordType) => (
                <SelectorChip
                  key={recordType.type}
                  active={type === recordType.type}
                  iconName={recordType.iconName}
                  label={recordType.label}
                  tone={recordType.tone}
                  surface={recordType.surface}
                  className={recordType.type === "diaper_both" ? "col-span-2" : ""}
                  onClick={() => setType(recordType.type)}
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
                  <div className="panel-note mt-1">选择本次喂养的侧别。</div>
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
                  <div className="panel-note mt-1">调整每一侧的喂养分钟数。</div>
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

          {isVolumeFeedType ? (
            <>
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">常用奶量</div>
                  <div className="panel-note mt-1">快速切换常用值，必要时再自定义</div>
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
                    {"自定义"}
                  </button>
                </div>
              </SectionCard>

              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">奶量</div>
                  <div className="panel-note mt-1">按 10ml 增减，或选择常用奶量。</div>
                </div>
                <AmountAdjuster
                  label={volumeFeedLabel}
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
                <div className="panel-note mt-1">调整开始和结束时间，也可以标记为睡眠中。</div>
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
                  {"结束时间不能早于开始时间。"}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {diaperType && preferences.diaperDetails ? (
            <SectionCard className="space-y-3 p-4">
              <div>
                <div className="panel-title text-[17px]">尿布情况</div>
                <div className="panel-note mt-1">调整本次量的多少。</div>
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
                  <div className="panel-note mt-1">调整颜色和性状，便于后续观察。</div>
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
                    {
                      "绿色便便可能和饮食或肠胃状态有关，如果持续出现，建议结合宝宝状态留意观察。"
                    }
                  </div>
                ) : null}
              </SectionCard>
          ) : null}

          {type === "temperature" ? (
            <SectionCard className="space-y-4 p-4">
              <div>
                <div className="panel-title text-[17px]">体温</div>
                <div className="panel-note mt-1">调整温度和测量部位。</div>
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
                <div className="panel-note mt-1">调整本次测量数值和部位。</div>
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
                <div className="panel-note mt-1">调整消毒后的脐部状态。</div>
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
                <div className="panel-note mt-1">调整洗澡、抚触或组合护理。</div>
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
                <div className="panel-note mt-1">修改药品名称或本次实际用量。</div>
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
              <div className="panel-note mt-1">补充这次记录的细节，留空也可以。</div>
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
          className="h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] disabled:opacity-50"
        >
          {loading ? "更新中…" : "更新记录"}
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
    </Layout>
  );
}
