import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { createExpense } from "../lib/api";
import { useBaby } from "../lib/BabyContext";

const CATEGORIES = [
  { icon: "🍼", label: "奶粉" },
  { icon: "🧷", label: "纸尿裤" },
  { icon: "👗", label: "衣物" },
  { icon: "🧸", label: "玩具" },
  { icon: "💊", label: "医疗" },
  { icon: "🛁", label: "洗护" },
  { icon: "🍱", label: "辅食" },
  { icon: "📦", label: "其他" },
];

function NumberKeyboard({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const handlePress = (key: string) => {
    if (key === "delete") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".")) {
        onChange(value + ".");
      }
    } else {
      const parts = value.split(".");
      if (parts[1] && parts[1].length >= 2) return;
      if (value.length >= 8) return;
      const newValue = value === "0" && key !== "." ? key : value + key;
      if (Number(newValue) > 99999.99) return;
      onChange(newValue);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"];

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-3 gap-px p-px">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handlePress(key)}
              className={`h-[52px] text-xl font-medium border-none cursor-pointer ${
                key === "delete"
                  ? "bg-gray-200 text-gray-600"
                  : "bg-white text-gray-900"
              } active:bg-gray-100`}
            >
              {key === "delete" ? "⌫" : key}
            </button>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; name?: string }>({});
  const [toast, setToast] = useState("");

  const amountNum = Number(amount) || 0;
  const isValid = amountNum > 0 && name.trim().length > 0;

  const handleSubmit = async () => {
    if (!baby) return;

    const newErrors: typeof errors = {};
    if (amountNum <= 0) newErrors.amount = "请输入有效金额";
    if (!name.trim()) newErrors.name = "请输入商品名称";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await createExpense({
        baby_id: baby.id,
        category,
        amount: amountNum,
        name: name.trim(),
        channel: channel.trim() || undefined,
        date,
      });
      setToast(`✓ 已记录 ¥${amountNum}`);
      setTimeout(() => {
        navigate("/expense");
      }, 1200);
    } catch (e) {
      setErrors({ name: e instanceof Error ? e.message : "保存失败" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="添加记账" variant="light" back />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-4 py-2 rounded-pill text-sm font-medium shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <ScrollArea>
        <div className="p-4">
          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">金额</div>
            <div
              onClick={() => setShowKeyboard(true)}
              className={`w-full h-14 bg-gray-100 border-[1.5px] rounded-sm px-3.5 flex items-center justify-center cursor-pointer transition-all ${
                errors.amount ? "border-danger" : "border-border"
              }`}
            >
              <span className="font-serif text-[28px] font-bold text-gray-900">
                {amount ? `¥ ${amount}` : "¥ 0.00"}
              </span>
            </div>
            {errors.amount && <div className="text-xs text-danger mt-1">{errors.amount}</div>}
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">分类</div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.label)}
                  className={`p-2.5 rounded-sm text-center cursor-pointer border-2 transition-all ${
                    category === cat.label
                      ? "bg-[#F0FAF6] border-[#4AB89A]"
                      : "bg-gray-100 border-transparent"
                  }`}
                >
                  <div className="text-xl mb-0.5">{cat.icon}</div>
                  <div className={`text-[10px] font-medium ${category === cat.label ? "text-[#1A5848]" : "text-gray-600"}`}>
                    {cat.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">商品名称</div>
            <input
              className={`w-full h-11 bg-gray-100 border-[1.5px] rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none transition-all ${
                errors.name ? "border-danger" : "border-border focus:border-mint"
              }`}
              placeholder="输入商品名称"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && <div className="text-xs text-danger mt-1">{errors.name}</div>}
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">购买日期</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">购买渠道（选填）</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
              placeholder="如：京东、天猫、线下超市"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t border-border flex-shrink-0">
        <button
          onClick={handleSubmit}
          disabled={loading || !isValid}
          className={`w-full h-12 rounded-pill text-base font-semibold border-none cursor-pointer transition-all ${
            isValid
              ? "text-white bg-gradient-to-br from-indigo to-indigo-dark shadow-[0_4px_14px_rgba(61,79,140,.3)]"
              : "text-gray-400 bg-gray-200"
          } disabled:opacity-50`}
        >
          {loading ? "保存中..." : "保存记账"}
        </button>
      </div>

      {showKeyboard && (
        <NumberKeyboard
          value={amount}
          onChange={(v) => {
            setAmount(v);
            if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
          }}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </Layout>
  );
}
