import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import DatePickerSheet from "../components/DatePickerSheet";
import DateFieldButton from "../components/DateFieldButton";
import { createBaby } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import { getLocalDateString } from "./recordFormShared";

const RELATIONS = [
  { value: "妈妈", emoji: "👩" },
  { value: "爸爸", emoji: "👨" },
  { value: "奶奶", emoji: "👵" },
  { value: "爷爷", emoji: "👴" },
  { value: "外婆", emoji: "👵" },
  { value: "外公", emoji: "👴" },
  { value: "其他", emoji: "🧑" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useBaby();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [feedingType, setFeedingType] = useState("mixed");
  const [relation, setRelation] = useState("妈妈");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入宝宝昵称");
      return;
    }
    if (!birthDate) {
      setError("请选择出生日期");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createBaby({
        name: name.trim(),
        birth_date: birthDate,
        gender,
        feeding_type: feedingType,
        relation,
      });
      await refresh();
      navigate("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="h-[200px] flex items-center justify-center relative overflow-hidden flex-shrink-0" style={{ background: "var(--header-grad)" }}>
        <div className="header-readable-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(255,255,255,.16),transparent_60%)]" />
        <div className="text-center relative z-10">
          <div className="text-[56px] mb-2.5">🌱</div>
          <div className="header-title">宝宝日记</div>
          <div className="header-subtitle text-sm mt-1">记录每一个珍贵的成长瞬间</div>
        </div>
      </div>
      <ScrollArea>
        <div className="px-4 pt-5 pb-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">
              {error}
            </div>
          )}

          <div className="font-serif text-lg font-bold text-gray-900 mb-1">先认识一下你的宝宝 👶</div>
          <div className="text-sm text-gray-400 mb-5 leading-relaxed">填写宝宝基本信息，随时可在「我的」中修改。</div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">宝宝昵称</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 font-serif text-lg font-semibold text-gray-900 outline-none focus:border-mint"
              placeholder="给宝宝起个昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">出生日期</div>
            <DateFieldButton
              value={birthDate}
              ariaLabel="选择宝宝出生日期"
              onClick={() => setShowDatePicker(true)}
            />
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">宝宝性别</div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setGender("male")}
                className={`flex-1 py-3.5 rounded-sm cursor-pointer border-2 text-center transition-all ${
                  gender === "male"
                    ? "border-mint bg-mint-light"
                    : "border-border bg-gray-100"
                }`}
              >
                <div className="text-[28px] mb-1">👦</div>
                <div className={`text-sm font-semibold ${gender === "male" ? "text-mint-dark" : "text-gray-600"}`}>男宝</div>
              </button>
              <button
                onClick={() => setGender("female")}
                className={`flex-1 py-3.5 rounded-sm cursor-pointer border-2 text-center transition-all ${
                  gender === "female"
                    ? "border-rose bg-rose-light"
                    : "border-border bg-gray-100"
                }`}
              >
                <div className="text-[28px] mb-1">👧</div>
                <div className={`text-sm font-semibold ${gender === "female" ? "text-rose-dark" : "text-gray-600"}`}>女宝</div>
              </button>
            </div>
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">喂养方式</div>
            <div className="flex gap-2">
              {[
                { value: "breast", label: "母乳" },
                { value: "formula", label: "配方奶" },
                { value: "mixed", label: "混合" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFeedingType(opt.value)}
                  className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-2 transition-all ${
                    feedingType === opt.value
                      ? "bg-mint-light border-mint text-mint-dark"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">你与宝宝的关系</div>
            <div className="grid grid-cols-4 gap-2">
              {RELATIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRelation(r.value)}
                  className={`py-2.5 rounded-sm text-center cursor-pointer border-2 transition-all ${
                    relation === r.value
                      ? "border-lavender bg-lavender-light"
                      : "border-border bg-gray-100"
                  }`}
                >
                  <div className="text-xl mb-0.5">{r.emoji}</div>
                  <div className={`text-[10px] font-semibold ${relation === r.value ? "text-lavender-dark" : "text-gray-600"}`}>{r.value}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-[52px] rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50"
          >
            {loading ? "创建中..." : "开始记录 🌱"}
          </button>

          <div className="text-center mt-2.5 text-xs text-gray-300">以上信息随时可修改</div>
        </div>
      </ScrollArea>

      <DatePickerSheet
        visible={showDatePicker}
        value={birthDate}
        maxDate={getLocalDateString()}
        onConfirm={(date) => {
          setBirthDate(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Layout>
  );
}
