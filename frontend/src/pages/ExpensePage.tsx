import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea, Fab } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { fetchExpenses } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import type { Expense } from "../lib/api";

const CATEGORY_META: Record<string, { icon: string; color: string; hex: string }> = {
  "奶粉": { icon: "🍼", color: "bg-sky-light", hex: "#5A9ED4" },
  "纸尿裤": { icon: "🧷", color: "bg-amber-light", hex: "#E8A030" },
  "衣物": { icon: "👗", color: "bg-lavender-light", hex: "#9B7EC8" },
  "玩具": { icon: "🧸", color: "bg-green-light", hex: "#5AA870" },
  "医疗": { icon: "💊", color: "bg-rose-light", hex: "#D4607A" },
  "洗护": { icon: "🛁", color: "bg-sky-light", hex: "#5A9ED4" },
  "辅食": { icon: "🍱", color: "bg-amber-light", hex: "#E8A030" },
  "其他": { icon: "📦", color: "bg-gray-100", hex: "#9C9080" },
};

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function DonutChart({ stats }: { stats: { name: string; pct: number; hex: string }[] }) {
  const size = 120;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {stats.map((stat, index) => {
        const strokeDasharray = `${(stat.pct / 100) * circumference} ${circumference}`;
        const rotation = (cumulativePercent / 100) * 360 - 90;
        cumulativePercent += stat.pct;

        return (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stat.hex}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={0}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" className="fill-gray-400 text-[11px]">
        共{stats.length}类
      </text>
      <text x={size / 2} y={size / 2 + 10} textAnchor="middle" className="fill-gray-900 text-[14px] font-bold">
        100%
      </text>
    </svg>
  );
}

function YearBarChart({ monthlyData, currentMonth, onMonthClick }: {
  monthlyData: { month: number; amount: number }[];
  currentMonth: number;
  onMonthClick: (month: number) => void;
}) {
  const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1);
  const chartWidth = 320;
  const chartHeight = 140;
  const barWidth = 18;
  const gap = (chartWidth - barWidth * 12) / 11;
  const leftPad = 30;
  const bottomPad = 25;

  return (
    <svg width={chartWidth + leftPad} height={chartHeight + bottomPad} viewBox={`0 0 ${chartWidth + leftPad} ${chartHeight + bottomPad}`}>
      {monthlyData.map((d, i) => {
        const x = leftPad + i * (barWidth + gap);
        const barHeight = d.amount > 0 ? (d.amount / maxAmount) * (chartHeight - 20) : 0;
        const y = chartHeight - barHeight;
        const isCurrent = d.month === currentMonth;
        const hasData = d.amount > 0;

        return (
          <g key={d.month} onClick={() => onMonthClick(d.month)} style={{ cursor: "pointer" }}>
            {hasData ? (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={isCurrent ? "#4AB89A" : "#D4C9BC"}
              />
            ) : (
              <rect
                x={x}
                y={20}
                width={barWidth}
                height={chartHeight - 20}
                rx={3}
                fill="none"
                stroke="#D4C9BC"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            {hasData && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className={`text-[9px] ${isCurrent ? "fill-danger font-bold" : "fill-gray-400"}`}
              >
                {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={chartHeight + 12}
              textAnchor="middle"
              className={`text-[9px] ${isCurrent ? "fill-mint font-bold" : "fill-gray-400"}`}
            >
              {MONTHS[d.month - 1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchExpenses(baby.id)
      .then(setAllExpenses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const yearExpenses = useMemo(() =>
    allExpenses.filter(e => e.date.startsWith(String(selectedYear))),
    [allExpenses, selectedYear]
  );

  const monthlyData = useMemo(() => {
    const data: { month: number; amount: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${selectedYear}-${String(m).padStart(2, "0")}`;
      const amount = yearExpenses
        .filter(e => e.date.startsWith(monthStr))
        .reduce((sum, e) => sum + e.amount, 0);
      data.push({ month: m, amount });
    }
    return data;
  }, [yearExpenses, selectedYear]);

  const yearTotal = useMemo(() =>
    monthlyData.reduce((sum, d) => sum + d.amount, 0),
    [monthlyData]
  );

  const monthExpenses = useMemo(() =>
    yearExpenses.filter(e => e.date.startsWith(currentMonthStr)),
    [yearExpenses, currentMonthStr]
  );

  const totalAmount = useMemo(() =>
    monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of monthExpenses) {
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
  }, [monthExpenses, totalAmount]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of monthExpenses) {
      const list = groups.get(e.date) || [];
      list.push(e);
      groups.set(e.date, list);
    }
    return [...groups.entries()];
  }, [monthExpenses]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth() + 1) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
  };

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
      <Hero style={{ background: "linear-gradient(160deg, #0F3D2E 0%, #1A5848 50%, #2D7A5E 100%)" }}>
        <div className="flex items-center relative z-10">
          <div className="font-serif text-xl font-bold text-white flex-1">📊 宝宝账本</div>
        </div>
        <div className="relative z-10 pt-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs border-none cursor-pointer"
              >
                ‹
              </button>
              <span className="text-[13px] text-white/90 font-medium">{selectedYear}年</span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs border-none cursor-pointer"
              >
                ›
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs border-none cursor-pointer"
              >
                ‹
              </button>
              <span className="text-[13px] text-white/70">{selectedMonth}月</span>
              <button
                onClick={handleNextMonth}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs border-none cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] text-white/90 font-medium">¥</span>
            <span className="font-serif text-[36px] font-bold text-white leading-none">{totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-[13px] text-white/70 mt-1">{monthExpenses.length}笔</div>
        </div>
      </Hero>
      <ScrollArea className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
        ) : (
          <>
            <div className="mt-2.5 mx-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-sm font-semibold text-gray-900">{selectedYear}年月度支出</div>
                <div className="text-xs text-gray-400">年合计 ¥{yearTotal.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-card shadow-card p-3 overflow-x-auto">
                <YearBarChart
                  monthlyData={monthlyData}
                  currentMonth={selectedMonth}
                  onMonthClick={handleMonthClick}
                />
              </div>
            </div>

            {categoryStats.length > 0 && (
              <div className="mt-2.5 mx-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-serif text-sm font-semibold text-gray-900">分类支出</div>
                </div>
                <div className="bg-white rounded-card shadow-card overflow-hidden">
                  <div className="flex items-center justify-center py-4 border-b border-border">
                    <DonutChart stats={categoryStats} />
                  </div>
                  {categoryStats.map((cat) => (
                    <div key={cat.name} className="flex items-center py-3 px-3.5 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-0.5">{cat.name}</div>
                        <div className="h-[5px] bg-gray-200 rounded-[2.5px] overflow-hidden">
                          <div
                            className="h-full rounded-[2.5px]"
                            style={{ width: `${cat.pct}%`, backgroundColor: cat.hex }}
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
                  <div className="font-serif text-sm font-semibold text-gray-900">{selectedMonth}月明细</div>
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
                            <div className="w-3 h-3 rounded-full flex-shrink-0 mr-3" style={{ backgroundColor: meta.hex }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-px">
                                {item.category}{item.channel ? ` · ${item.channel}` : ""}
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

            {monthExpenses.length === 0 && (
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
