import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import NumberKeyboard from "../components/NumberKeyboard";
import SleepTimePicker from "../components/SleepTimePicker";
import { useBaby } from "../lib/BabyContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const RECORD_TYPES = [
  { type: "breast_milk", icon: "🤱", label: "母乳" },
  { type: "formula", icon: "🍼", label: "配方奶" },
  { type: "sleep", icon: "💤", label: "睡眠" },
  { type: "diaper", icon: "💧", label: "尿布" },
];

const FORMULA_PRESETS = [60, 90, 120, 150, 180, 210];

function getDefaultTime(): { date: string; hour: number; minute: number } {
  const now = new Date();
  const roundedMinute = Math.ceil(now.getMinutes() / 5) * 5;
  return {
    date: now.toISOString().slice(0, 10),
    hour: now.getHours(),
    minute: roundedMinute >= 60 ? 0 : roundedMinute,
  };
}

function formatDateTimeDisplay(dt: { date: string; hour: number; minute: number }): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let dateLabel: string;
  if (dt.date === today) {
    dateLabel = "今天";
  } else if (dt.date === yesterday) {
    dateLabel = "昨天";
  } else {
    const [, m, d] = dt.date.split("-");
    dateLabel = `${Number(m)}月${Number(d)}日`;
  }

  const timeLabel = `${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`;
  return `${dateLabel}  ${timeLabel}`;
}

function parseDateTime(isoStr: string): { date: string; hour: number; minute: number } {
  const d = new Date(isoStr);
  return {
    date: isoStr.slice(0, 10),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
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
    fetch(`${API_BASE}/records/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const record = data.data;
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
            setSleepEnd(parseDateTime(recordData.end));
            setSleeping(recordData.sleeping || false);
          } else if (record.type === "diaper") {
            setDiaperType(recordData.diaper_type || "wet");
            setDiaperColor(recordData.color || "yellow");
          }

          if (recordData.note) setNote(recordData.note);
        }
      })
      .catch(() => setError("加载记录失败"))
      .finally(() => setFetchLoading(false));
  }, [id]);

  const handleFormulaPreset = (ml: number) => {
    setFormulaMl(ml);
    setFormulaPreset(ml);
  };

  const handleFormulaAdjust = (delta: number) => {
    const newVal = Math.max(0, Math.min(999, formulaMl + delta));
    setFormulaMl(newVal);
    setFormulaPreset(FORMULA_PRESETS.includes(newVal) ? newVal : null);
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
      const startStr = `${sleepStart.date}T${String(sleepStart.hour).padStart(2, "0")}:${String(sleepStart.minute).padStart(2, "0")}:00`;
      const endStr = sleeping ? null : `${sleepEnd.date}T${String(sleepEnd.hour).padStart(2, "0")}:${String(sleepEnd.minute).padStart(2, "0")}:00`;
      data = { start: startStr, end: endStr, sleeping, note };
    } else if (type === "diaper") {
      data = { diaper_type: diaperType, color: diaperColor, note };
    }

    try {
      const res = await fetch(`${API_BASE}/records/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ type, data }),
      });
      const result = await res.json();
      if (result.success) {
        navigate("/record");
      } else {
        setError(result.message || "更新失败");
      }
    } catch {
      setError("更新失败");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <Header title="编辑记录" variant="light" back />
        <div className="flex items-center justify-center flex-1">
          <div className="text-gray-400 text-sm">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="编辑记录" variant="light" back />
      <ScrollArea>
        <div className="p-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">{error}</div>
          )}

          <div className="mb-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">记录类型</div>
            <div className="grid grid-cols-2 gap-2">
              {RECORD_TYPES.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => setType(rt.type)}
                  className={`h-[72px] rounded-sm text-center cursor-pointer border-2 transition-all duration-150 ${
                    type === rt.type
                      ? "bg-[#F0FAF6] border-[#4AB89A] text-mint-dark"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  <div className="text-[28px] mb-0.5">{rt.icon}</div>
                  <div className="text-[13px] font-medium">{rt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="transition-all duration-150" style={{ opacity: 1, transform: "translateY(0)" }}>
            {type === "breast_milk" && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">喂养方式</div>
                  <div className="flex gap-2">
                    {[
                      { value: "left" as const, label: "左侧" },
                      { value: "right" as const, label: "右侧" },
                      { value: "both" as const, label: "双侧" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setBreastSide(opt.value)}
                        className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-none transition-all ${
                          breastSide === opt.value ? "bg-[#4AB89A] text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(breastSide === "left" || breastSide === "both") && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">左侧（分钟）</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setBreastLeft(Math.max(0, breastLeft - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                      <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{breastLeft}</div>
                      <button onClick={() => setBreastLeft(Math.min(60, breastLeft + 1))} className="w-10 h-10 rounded-full bg-mint-light text-xl font-bold text-mint-dark border-none cursor-pointer">+</button>
                    </div>
                  </div>
                )}
                {(breastSide === "right" || breastSide === "both") && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">右侧（分钟）</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setBreastRight(Math.max(0, breastRight - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                      <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{breastRight}</div>
                      <button onClick={() => setBreastRight(Math.min(60, breastRight + 1))} className="w-10 h-10 rounded-full bg-mint-light text-xl font-bold text-mint-dark border-none cursor-pointer">+</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === "formula" && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">常用奶量</div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {FORMULA_PRESETS.map((ml) => (
                      <button
                        key={ml}
                        onClick={() => handleFormulaPreset(ml)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-sm font-medium cursor-pointer border transition-all ${
                          formulaPreset === ml ? "bg-[#4AB89A] text-white border-[#4AB89A]" : "bg-white text-[#4AB89A] border-[#4AB89A]"
                        }`}
                      >
                        {ml}ml
                      </button>
                    ))}
                    <button
                      onClick={() => setShowFormulaKeyboard(true)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-pill text-sm font-medium cursor-pointer bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      自定义
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">奶量（ml）</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleFormulaAdjust(-10)} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                    <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{formulaMl} ml</div>
                    <button onClick={() => handleFormulaAdjust(10)} className="w-10 h-10 rounded-full bg-mint-light text-xl font-bold text-mint-dark border-none cursor-pointer">+</button>
                  </div>
                </div>
              </div>
            )}

            {type === "sleep" && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">开始时间</div>
                  <button onClick={() => setShowPicker("start")} className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 text-left cursor-pointer">
                    {formatDateTimeDisplay(sleepStart)}
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">结束时间</div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={sleeping} onChange={(e) => setSleeping(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-mint focus:ring-mint" />
                      <span className="text-xs text-gray-500">睡眠中</span>
                    </label>
                  </div>
                  <button
                    onClick={() => !sleeping && setShowPicker("end")}
                    disabled={sleeping}
                    className={`w-full h-11 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-left cursor-pointer transition-all ${
                      sleeping ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {sleeping ? "睡眠中..." : formatDateTimeDisplay(sleepEnd)}
                  </button>
                </div>
              </div>
            )}

            {type === "diaper" && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">类型</div>
                  <div className="flex gap-2">
                    {[
                      { value: "wet", label: "小便 💧" },
                      { value: "dirty", label: "大便 💩" },
                      { value: "both", label: "都有 🔄" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDiaperType(opt.value)}
                        className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-2 transition-all ${
                          diaperType === opt.value ? "bg-[#F0FAF6] border-[#4AB89A] text-mint-dark" : "bg-gray-100 border-transparent text-gray-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">颜色</div>
                  <div className="flex gap-2">
                    {[
                      { value: "yellow", label: "黄色" },
                      { value: "green", label: "绿色" },
                      { value: "brown", label: "棕色" },
                      { value: "other", label: "其他" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDiaperColor(opt.value)}
                        className={`flex-1 h-9 rounded-sm text-xs font-semibold cursor-pointer border-2 transition-all ${
                          diaperColor === opt.value ? "bg-[#F0FAF6] border-[#4AB89A] text-mint-dark" : "bg-gray-100 border-transparent text-gray-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">备注（选填）</div>
            <textarea
              className="w-full h-20 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 py-2.5 text-sm font-sans text-gray-900 outline-none focus:border-mint resize-none"
              placeholder="添加备注..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 bg-white border-t border-border flex-shrink-0">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50"
        >
          {loading ? "更新中..." : "更新记录"}
        </button>
      </div>

      <SleepTimePicker
        visible={showPicker === "start"}
        title="选择开始时间"
        value={sleepStart}
        onConfirm={(val) => { setSleepStart(val); setShowPicker(null); }}
        onCancel={() => setShowPicker(null)}
      />
      <SleepTimePicker
        visible={showPicker === "end"}
        title="选择结束时间"
        value={sleepEnd}
        onConfirm={(val) => { setSleepEnd(val); setShowPicker(null); }}
        onCancel={() => setShowPicker(null)}
      />
      <NumberKeyboard
        visible={showFormulaKeyboard}
        value={String(formulaMl)}
        onConfirm={(v) => { setFormulaMl(Number(v)); setShowFormulaKeyboard(false); }}
        onCancel={() => setShowFormulaKeyboard(false)}
      />
    </Layout>
  );
}
