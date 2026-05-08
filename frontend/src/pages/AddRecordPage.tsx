import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { createRecord } from "../lib/api";
import { useBaby } from "../lib/BabyContext";

const RECORD_TYPES = [
  { type: "breast_milk", icon: "🤱", label: "母乳", color: "bg-rose-light border-rose text-rose-dark" },
  { type: "formula", icon: "🍼", label: "配方奶", color: "bg-sky-light border-sky text-sky-dark" },
  { type: "sleep", icon: "💤", label: "睡眠", color: "bg-indigo-light border-indigo text-indigo-dark" },
  { type: "diaper", icon: "💧", label: "尿布", color: "bg-amber-light border-amber text-amber-dark" },
];

export default function AddRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { baby } = useBaby();

  const initialType = searchParams.get("type") || "breast_milk";
  const [type, setType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [breastLeft, setBreastLeft] = useState(10);
  const [breastRight, setBreastRight] = useState(10);
  const [formulaMl, setFormulaMl] = useState(120);
  const [sleepStart, setSleepStart] = useState("");
  const [sleepEnd, setSleepEnd] = useState("");
  const [diaperType, setDiaperType] = useState("wet");
  const [diaperColor, setDiaperColor] = useState("yellow");
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    if (!baby) {
      setError("请先添加宝宝");
      return;
    }

    setLoading(true);
    setError("");

    let data: Record<string, unknown> = {};

    if (type === "breast_milk") {
      data = { left_minutes: breastLeft, right_minutes: breastRight, note };
    } else if (type === "formula") {
      data = { ml: formulaMl, note };
    } else if (type === "sleep") {
      if (!sleepStart || !sleepEnd) {
        setError("请填写睡眠时间");
        setLoading(false);
        return;
      }
      data = { start: sleepStart, end: sleepEnd, note };
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="添加记录" variant="light" back />
      <ScrollArea>
        <div className="p-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">记录类型</div>
            <div className="grid grid-cols-4 gap-2">
              {RECORD_TYPES.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => setType(rt.type)}
                  className={`p-3 rounded-sm text-center cursor-pointer border-2 transition-all ${
                    type === rt.type ? rt.color + " border-current" : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  <div className="text-2xl mb-1">{rt.icon}</div>
                  <div className="text-[10px] font-medium">{rt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {type === "breast_milk" && (
            <div className="space-y-3.5">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">左侧（分钟）</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBreastLeft(Math.max(0, breastLeft - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                  <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{breastLeft}</div>
                  <button onClick={() => setBreastLeft(breastLeft + 1)} className="w-10 h-10 rounded-full bg-mint-light text-xl font-bold text-mint-dark border-none cursor-pointer">+</button>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">右侧（分钟）</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBreastRight(Math.max(0, breastRight - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                  <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{breastRight}</div>
                  <button onClick={() => setBreastRight(breastRight + 1)} className="w-10 h-10 rounded-full bg-mint-light text-xl font-bold text-mint-dark border-none cursor-pointer">+</button>
                </div>
              </div>
            </div>
          )}

          {type === "formula" && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">奶量（ml）</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setFormulaMl(Math.max(0, formulaMl - 10))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 border-none cursor-pointer">-</button>
                <div className="flex-1 text-center font-serif text-3xl font-bold text-gray-900">{formulaMl} ml</div>
                <button onClick={() => setFormulaMl(formulaMl + 10)} className="w-10 h-10 rounded-full bg-sky-light text-xl font-bold text-sky-dark border-none cursor-pointer">+</button>
              </div>
            </div>
          )}

          {type === "sleep" && (
            <div className="space-y-3.5">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">开始时间</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
                  type="datetime-local"
                  value={sleepStart}
                  onChange={(e) => setSleepStart(e.target.value)}
                />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">结束时间</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
                  type="datetime-local"
                  value={sleepEnd}
                  onChange={(e) => setSleepEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {type === "diaper" && (
            <div className="space-y-3.5">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">类型</div>
                <div className="flex gap-2">
                  {[
                    { value: "wet", label: "小便 💧", color: "bg-sky-light border-sky text-sky-dark" },
                    { value: "dirty", label: "大便 💩", color: "bg-amber-light border-amber text-amber-dark" },
                    { value: "both", label: "都有 🔄", color: "bg-green-light border-green text-green-dark" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDiaperType(opt.value)}
                      className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-2 transition-all ${
                        diaperType === opt.value ? opt.color : "bg-gray-100 border-transparent text-gray-600"
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
                        diaperColor === opt.value
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "bg-gray-100 border-transparent text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
          {loading ? "保存中..." : "保存记录"}
        </button>
      </div>
    </Layout>
  );
}
