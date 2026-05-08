import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { createExpense } from "../lib/api";
import { useBaby } from "../lib/BabyContext";

const CATEGORIES = [
  { icon: "🍼", label: "奶粉", color: "bg-sky-light border-sky text-sky-dark" },
  { icon: "🧷", label: "纸尿裤", color: "bg-amber-light border-amber text-amber-dark" },
  { icon: "👗", label: "衣物", color: "bg-lavender-light border-lavender text-lavender-dark" },
  { icon: "🧸", label: "玩具", color: "bg-green-light border-green text-green-dark" },
  { icon: "💊", label: "医疗", color: "bg-rose-light border-rose text-rose-dark" },
  { icon: "🛁", label: "洗护", color: "bg-sky-light border-sky text-sky-dark" },
  { icon: "🍱", label: "辅食", color: "bg-amber-light border-amber text-amber-dark" },
  { icon: "📦", label: "其他", color: "bg-gray-100 border-gray-300 text-gray-600" },
];

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!baby) {
      setError("请先添加宝宝");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("请输入有效金额");
      return;
    }
    if (!name.trim()) {
      setError("请输入商品名称");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createExpense({
        baby_id: baby.id,
        category,
        amount: Number(amount),
        name: name.trim(),
        channel: channel.trim() || undefined,
        date,
      });
      navigate("/expense");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="添加记账" variant="light" back />
      <ScrollArea>
        <div className="p-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">
              {error}
            </div>
          )}
          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">金额</div>
            <input
              className="w-full h-14 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 font-serif text-[28px] font-bold text-gray-900 text-center outline-none focus:border-mint"
              placeholder="¥ 0.00"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">分类</div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.label)}
                  className={`p-2.5 rounded-sm text-center cursor-pointer border-2 transition-all ${
                    category === cat.label ? cat.color + " border-current" : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  <div className="text-xl mb-0.5">{cat.icon}</div>
                  <div className="text-[10px] font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">商品名称</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
              placeholder="输入商品名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
          disabled={loading}
          className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-indigo to-indigo-dark shadow-[0_4px_14px_rgba(61,79,140,.3)] border-none cursor-pointer disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存记账"}
        </button>
      </div>
    </Layout>
  );
}
