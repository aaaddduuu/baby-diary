import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea, Fab } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { fetchExpenses } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import type { Expense } from "../lib/api";

const CATEGORY_META: Record<string, { icon: string; color: string; barColor: string }> = {
  "奶粉": { icon: "🍼", color: "bg-sky-light", barColor: "bg-sky" },
  "纸尿裤": { icon: "🧷", color: "bg-amber-light", barColor: "bg-amber" },
  "衣物": { icon: "👗", color: "bg-lavender-light", barColor: "bg-lavender" },
  "玩具": { icon: "🧸", color: "bg-green-light", barColor: "bg-green" },
  "医疗": { icon: "💊", color: "bg-rose-light", barColor: "bg-rose" },
  "洗护": { icon: "🛁", color: "bg-sky-light", barColor: "bg-sky" },
  "辅食": { icon: "🍱", color: "bg-amber-light", barColor: "bg-amber" },
  "其他": { icon: "📦", color: "bg-gray-100", barColor: "bg-gray-400" },
};

export default function ExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const displayMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchExpenses(baby.id, currentMonth)
      .then(setExpenses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby, currentMonth]);

  const totalAmount = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const prev = map.get(e.category) || { amount: 0, count: 0 };
      map.set(e.category, { amount: prev.amount + e.amount, count: prev.count + 1 });
    }
    const sorted = [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
    return sorted.map(([name, stat]) => ({
      name,
      ...stat,
      pct: totalAmount > 0 ? Math.round((stat.amount / totalAmount) * 100) : 0,
      ...(CATEGORY_META[name] || CATEGORY_META["其他"]),
    }));
  }, [expenses, totalAmount]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of expenses) {
      const list = groups.get(e.date) || [];
      list.push(e);
      groups.set(e.date, list);
    }
    return [...groups.entries()];
  }, [expenses]);

  if (!baby) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">请先添加宝宝</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero variant="indigo">
        <div className="flex items-center relative z-10">
          <div className="font-serif text-base font-semibold text-white flex-1">宝宝账本</div>
        </div>
        <div className="relative z-10">
          <div className="text-[11px] text-white/72 tracking-wider mb-0.5">{displayMonth} · 月度支出</div>
          <div className="font-serif text-[40px] font-bold text-white leading-none">
            ¥ {totalAmount.toLocaleString()}
          </div>
          <div className="text-xs text-white/82 mt-0.5">
            {expenses.length}笔
          </div>
        </div>
      </Hero>
      <ScrollArea className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
        ) : (
          <>
            {categoryStats.length > 0 && (
              <div className="mt-2.5 mx-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-serif text-sm font-semibold text-gray-900">分类支出</div>
                </div>
                <div className="bg-white rounded-card shadow-card overflow-hidden">
                  {categoryStats.map((cat) => (
                    <div key={cat.name} className="flex items-center py-3 px-3.5 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-0.5">{cat.name}</div>
                        <div className="h-[5px] bg-gray-200 rounded-[2.5px] overflow-hidden">
                          <div
                            className={`h-full rounded-[2.5px] ${cat.barColor}`}
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2.5">
                        <div className="text-base font-bold text-gray-900">¥{cat.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400 mt-px">{cat.count}笔 · {cat.pct}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedByDate.length > 0 && (
              <div className="mt-2.5 mx-3.5 mb-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-serif text-sm font-semibold text-gray-900">本月明细</div>
                </div>
                <div className="bg-white rounded-card shadow-card overflow-hidden">
                  {groupedByDate.map(([date, items]) => (
                    <div key={date}>
                      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {date}
                      </div>
                      {items.map((item) => {
                        const meta = CATEGORY_META[item.category] || CATEGORY_META["其他"];
                        return (
                          <div key={item.id} className="flex items-center py-2.5 px-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-gray-50">
                            <div className={`w-9 h-9 rounded-[10px] ${meta.color} flex items-center justify-center text-base flex-shrink-0 mr-[11px]`}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-px flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded-pill text-[10px] font-semibold ${meta.color}`}>
                                  {item.category}
                                </span>
                                {item.channel}
                              </div>
                            </div>
                            <div className="text-base font-bold text-gray-900 flex-shrink-0">
                              ¥{item.amount}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expenses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-5xl mb-4 opacity-40">💰</div>
                <div className="text-sm font-medium text-gray-600 mb-1">暂无记账记录</div>
                <div className="text-xs text-gray-400">点击右下角 + 开始记账</div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
      <Fab variant="indigo" onClick={() => navigate("/expense/add")} />
      <BottomNav />
    </Layout>
  );
}
