import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import NumberKeyboard from "../components/NumberKeyboard";
import SleepTimePicker from "../components/SleepTimePicker";
import { createRecord } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import {
  calcDuration,
  DIAPER_COLORS,
  DIAPER_TYPES,
  FEEDING_SIDES,
  FORMULA_PRESETS,
  formatDateTimeDisplay,
  getDefaultTime,
  isEndBeforeStart,
  RECORD_TYPES,
  toLocalDateTimeString,
} from "./recordFormShared";

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</div>;
}

function SelectorChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
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
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
          active ? "bg-[#DDF5EA]" : "bg-[#F6F3EA]"
        }`}
      >
        {icon}
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

export default function AddRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { baby } = useBaby();

  const initialType = searchParams.get("type") || "breast_milk";
  const [type, setType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const [diaperType, setDiaperType] = useState("wet");
  const [diaperColor, setDiaperColor] = useState("yellow");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (type === "formula") {
      localStorage.setItem("last_formula_ml", String(formulaMl));
    }
  }, [formulaMl, type]);

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
    return true;
  }, [isInvalidTime, sleeping, type]);

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
    if (!baby) {
      setError("请先添加宝宝");
      return;
    }

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
    } else if (type === "formula") {
      data = { ml: formulaMl, note };
    } else if (type === "sleep") {
      const startStr = toLocalDateTimeString(sleepStart);
      const endStr = sleeping ? null : toLocalDateTimeString(sleepEnd);
      data = { start: startStr, end: endStr, sleeping, note };
    } else if (type === "diaper") {
      data = { diaper_type: diaperType, color: diaperColor, note };
    }

    try {
      await createRecord({
        baby_id: baby.id,
        type,
        data,
        recorded_at: new Date().toISOString(),
      });
      navigate("/record");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
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

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">记录类型</div>
              <div className="panel-note mt-1">选择这次要记录的内容</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {RECORD_TYPES.map((recordType) => (
                <SelectorChip
                  key={recordType.type}
                  active={type === recordType.type}
                  icon={recordType.icon}
                  label={recordType.label}
                  onClick={() => setType(recordType.type)}
                />
              ))}
            </div>
          </SectionCard>

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
                    {"自定义"}
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
                  {"结束时间不能早于开始时间。"}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {type === "diaper" ? (
            <>
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">类型</div>
                  <div className="panel-note mt-1">按今天的情况选择记录内容</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {DIAPER_TYPES.map((option) => (
                    <MiniCardButton
                      key={option.value}
                      active={diaperType === option.value}
                      icon={option.icon}
                      label={option.label}
                      onClick={() => setDiaperType(option.value)}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="space-y-3 p-4">
                <div>
                  <div className="panel-title text-[17px]">颜色</div>
                  <div className="panel-note mt-1">颜色卡和主页面图标语言保持一致</div>
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

                {diaperColor === "green" ? (
                  <div className="rounded-[20px] border border-[#F3E0B5] bg-[#FFF7E7] px-4 py-3 text-sm leading-6 text-[#8A6220]">
                    {
                      "绿色便便可能和饮食或肠胃状态有关，如果持续出现，建议结合宝宝状态留意观察。"
                    }
                  </div>
                ) : null}
              </SectionCard>
            </>
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
          {loading ? "保存中…" : "保存记录"}
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
