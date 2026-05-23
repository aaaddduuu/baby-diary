import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import NumberKeyboard from "../components/NumberKeyboard";
import SleepTimePicker from "../components/SleepTimePicker";
import { useBaby } from "../lib/BabyContext";
import { fetchRecordById, updateRecord } from "../lib/api";
import {
  calcDuration,
  DIAPER_COLORS,
  DIAPER_TYPES,
  FEEDING_SIDES,
  FORMULA_PRESETS,
  formatDateTimeDisplay,
  getDefaultTime,
  isEndBeforeStart,
  parseDateTime,
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

export default function EditRecordPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { baby } = useBaby();

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

  const [diaperType, setDiaperType] = useState("wet");
  const [diaperColor, setDiaperColor] = useState("yellow");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!id) return;

    setFetchLoading(true);
    fetchRecordById(Number(id))
      .then((record) => {
        setType(record.type);
        const recordData = JSON.parse(record.data);

        if (record.type === "breast_milk") {
          setBreastSide(recordData.side || "both");
          setBreastLeft(recordData.leftMin || 0);
          setBreastRight(recordData.rightMin || 0);
        } else if (record.type === "formula") {
          setFormulaMl(recordData.ml || 120);
          setFormulaPreset(FORMULA_PRESETS.includes(recordData.ml) ? recordData.ml : null);
        } else if (record.type === "sleep") {
          setSleepStart(parseDateTime(recordData.start));
          setSleepEnd(parseDateTime(recordData.end || recordData.start));
          setSleeping(recordData.sleeping || false);
        } else if (record.type === "diaper") {
          setDiaperType(recordData.diaper_type || "wet");
          setDiaperColor(recordData.color || "yellow");
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
    } else if (type === "formula") {
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
    } else if (type === "diaper") {
      data = { diaper_type: diaperType, color: diaperColor, note };
    }

    try {
      await updateRecord(Number(id), { type, data });
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
              <div className="panel-note mt-1">和新增页使用同一套卡片风格</div>
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
                  <div className="panel-note mt-1">左右侧选择保持一致</div>
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
                  <div className="panel-note mt-1">在干净的白卡中调整分钟数</div>
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
                  <div className="panel-note mt-1">继续用原来的加减逻辑</div>
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
                <div className="panel-note mt-1">时间输入集中在一组白卡里，编辑时更直观</div>
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
                  <div className="panel-note mt-1">和记录页主流程保持统一的卡片语言</div>
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
                  <div className="panel-note mt-1">颜色状态卡更接近主页面的视觉节奏</div>
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
              <div className="panel-note mt-1">只改界面，不改原有备注提交逻辑</div>
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
