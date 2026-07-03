import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Fab, Hero, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { fetchExpenses } from "../lib/api";
import type { Expense } from "../lib/api";

const CATEGORY_META: Record<string, { icon: string; hex: string }> = {
  "奶粉": { icon: "🍼", hex: "#5A9ED4" },
  "纸尿裤": { icon: "🧷", hex: "#E8A030" },
  "衣物": { icon: "👗", hex: "#9B7EC8" },
  "玩具": { icon: "🧸", hex: "#5AA870" },
  "医疗": { icon: "💊", hex: "#D4607A" },
  "洗护": { icon: "🛁", hex: "#5A9ED4" },
  "辅食": { icon: "🍱", hex: "#E8A030" },
  "其他": { icon: "📦", hex: "#9C9080" },
  "红包": { icon: "🧧", hex: "#D97706" },
  "礼金": { icon: "💝", hex: "#DB2777" },
  "转账": { icon: "💸", hex: "#059669" },
  "其他收入": { icon: "✨", hex: "#7C3AED" },
};

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type ViewMode = "ledger" | "stats";
type LedgerFilter = "all" | "expense" | "income";

function getTonePalette(tone: "green" | "amber" | "rose") {
  return {
    green: {
      cardClass: "border-[#D8EEE1] bg-[#F4FCF8]",
      valueClass: "text-[#1A5C3A]",
      noteClass: "text-[#648373]",
    },
    amber: {
      cardClass: "border-[#F4E4BA] bg-[#FFF8EC]",
      valueClass: "text-[#8C5B12]",
      noteClass: "text-[#9D7B54]",
    },
    rose: {
      cardClass: "border-[#F0D8D8] bg-[#FFF5F5]",
      valueClass: "text-[#A93F3F]",
      noteClass: "text-[#9B7474]",
    },
  }[tone];
}

function DonutChart({ stats, totalAmount }: { stats: { name: string; pct: number; hex: string }[]; totalAmount: number }) {
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
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 3} textAnchor="middle" className="fill-[#1A5C3A] text-[18px] font-bold">
        ¥{totalAmount.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" className="fill-[#6B7280] text-[12px]">
        本月支出
      </text>
    </svg>
  );
}

function YearBarChart({
  monthlyData,
  currentMonth,
  onMonthClick,
}: {
  monthlyData: { month: number; amount: number }[];
  currentMonth: number;
  onMonthClick: (month: number) => void;
}) {
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 1);
  const visibleCount = Math.max(monthlyData.length, 1);
  const chartWidth = Math.max(120, visibleCount * 42);
  const chartHeight = 140;
  const barWidth = visibleCount <= 6 ? 24 : 18;
  const gap = visibleCount > 1 ? (chartWidth - barWidth * visibleCount) / (visibleCount - 1) : 0;
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
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} fill={isCurrent ? "#4AB89A" : "#D4C9BC"} />
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
            {hasData ? (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className={`text-[9px] ${isCurrent ? "fill-danger font-bold" : "fill-gray-400"}`}>
                {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount}
              </text>
            ) : null}
            <text x={x + barWidth / 2} y={chartHeight + 12} textAnchor="middle" className={`text-[9px] ${isCurrent ? "fill-mint font-bold" : "fill-gray-400"}`}>
              {MONTHS[d.month - 1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

function formatLedgerDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    key: date,
    title: `${parsed.getMonth() + 1}月${parsed.getDate()}日`,
    weekday: WEEKDAYS[parsed.getDay()],
  };
}

function ViewTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-white text-[#1A5C3A] shadow-[0_10px_24px_rgba(26,92,58,.18)]"
          : "bg-white/16 text-white/86"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] text-[#1A5C3A]"
          : "border-white/70 bg-white/80 text-[#526258]"
      }`}
    >
      {label}
    </button>
  );
}

function CompactMetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "amber" | "rose";
}) {
  const palette = getTonePalette(tone);

  return (
    <div className={`min-w-[188px] snap-start rounded-[18px] border px-4 py-3 shadow-card ${palette.cardClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em]">{label}</div>
      <div className={`mt-2 font-tabular text-[24px] font-black ${palette.valueClass}`}>{value}</div>
      <div className={`mt-1 text-xs ${palette.noteClass}`}>{note}</div>
    </div>
  );
}

function HongbaoSummaryCard({
  expanded,
  onToggle,
  monthNetTotal,
  monthIncomeTotal,
  monthIncomeCount,
  allHongbaoTotal,
  yearHongbaoTotal,
  selectedYear,
}: {
  expanded: boolean;
  onToggle: () => void;
  monthNetTotal: number;
  monthIncomeTotal: number;
  monthIncomeCount: number;
  allHongbaoTotal: number;
  yearHongbaoTotal: number;
  selectedYear: number;
}) {
  const netPositive = monthNetTotal >= 0;
  const netLabel = `${netPositive ? "+" : "-"}¥${Math.abs(monthNetTotal).toLocaleString()}`;
  const netNote = netPositive ? "本月红包覆盖了支出" : "本月支出高于红包收入";

  return (
    <div className="mt-2.5 mx-3.5 overflow-hidden rounded-card bg-white shadow-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A8B80]">红包摘要</div>
            <div className="rounded-full bg-[#F0FAF6] px-2 py-0.5 text-[10px] font-semibold text-[#2F9B73]">
              {expanded ? "收起" : "展开"}
            </div>
          </div>
          <div className="mt-1 truncate text-xs text-[#6F7F75]">{netNote}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-[#1A5C3A]">{netLabel}</div>
          <div className="mt-1 text-[11px] text-[#8A968F]">本月净额</div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border px-3 pb-3 pt-3">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            <CompactMetricCard
              label="本月净额"
              value={netLabel}
              note={netPositive ? "红包收入高于支出" : "本月支出更多"}
              tone={netPositive ? "green" : "rose"}
            />
            <CompactMetricCard
              label="本月红包"
              value={`¥${monthIncomeTotal.toLocaleString()}`}
              note={`${monthIncomeCount} 笔收入`}
              tone="amber"
            />
          </div>
          <div className="mt-2 px-1 text-xs text-[#7A8B80]">
            累计收红包 ¥{allHongbaoTotal.toLocaleString()} · {selectedYear} 年已收 ¥{yearHongbaoTotal.toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const now = new Date();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewMode>("ledger");
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const [statsSummaryExpanded, setStatsSummaryExpanded] = useState(false);
  const [showYearChart, setShowYearChart] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const birthDate = baby ? new Date(`${baby.birth_date}T00:00:00`) : null;
  const birthYear = birthDate?.getFullYear() ?? now.getFullYear();
  const birthMonth = (birthDate?.getMonth() ?? now.getMonth()) + 1;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchExpenses(baby.id)
      .then(setAllExpenses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  useEffect(() => {
    if (activeView !== "ledger") return;
    if (selectedYear === birthYear && selectedMonth < birthMonth) {
      setSelectedMonth(birthMonth);
    }
  }, [activeView, birthMonth, birthYear, selectedMonth, selectedYear]);

  const yearExpenses = useMemo(
    () => allExpenses.filter((expense) => expense.date.startsWith(String(selectedYear))),
    [allExpenses, selectedYear],
  );

  const monthExpenses = useMemo(
    () => yearExpenses.filter((expense) => expense.date.startsWith(currentMonthStr)),
    [yearExpenses, currentMonthStr],
  );

  const monthExpenseOnly = useMemo(
    () => monthExpenses.filter((expense) => expense.direction !== "income"),
    [monthExpenses],
  );

  const monthIncomeOnly = useMemo(
    () => monthExpenses.filter((expense) => expense.direction === "income"),
    [monthExpenses],
  );

  const yearExpenseOnly = useMemo(
    () => yearExpenses.filter((expense) => expense.direction !== "income"),
    [yearExpenses],
  );

  const yearIncomeOnly = useMemo(
    () => yearExpenses.filter((expense) => expense.direction === "income"),
    [yearExpenses],
  );

  const monthExpenseTotal = useMemo(
    () => monthExpenseOnly.reduce((sum, expense) => sum + expense.amount, 0),
    [monthExpenseOnly],
  );

  const monthIncomeTotal = useMemo(
    () => monthIncomeOnly.reduce((sum, expense) => sum + expense.amount, 0),
    [monthIncomeOnly],
  );

  const monthNetTotal = monthIncomeTotal - monthExpenseTotal;

  const allHongbaoTotal = useMemo(
    () => allExpenses.filter((expense) => expense.direction === "income").reduce((sum, expense) => sum + expense.amount, 0),
    [allExpenses],
  );

  const yearHongbaoTotal = useMemo(
    () => yearIncomeOnly.reduce((sum, expense) => sum + expense.amount, 0),
    [yearIncomeOnly],
  );

  const ledgerItems = useMemo(() => {
    if (ledgerFilter === "expense") return monthExpenseOnly;
    if (ledgerFilter === "income") return monthIncomeOnly;
    return monthExpenses;
  }, [ledgerFilter, monthExpenseOnly, monthIncomeOnly, monthExpenses]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const expense of ledgerItems) {
      const list = groups.get(expense.date) || [];
      list.push(expense);
      groups.set(expense.date, list);
    }
    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items,
        expenseTotal: items.filter((item) => item.direction !== "income").reduce((sum, item) => sum + item.amount, 0),
        incomeTotal: items.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0),
      }));
  }, [ledgerItems]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const expense of monthExpenseOnly) {
      const prev = map.get(expense.category) || { amount: 0, count: 0 };
      map.set(expense.category, { amount: prev.amount + expense.amount, count: prev.count + 1 });
    }
    return [...map.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, stat]) => ({
        name,
        ...stat,
        pct: monthExpenseTotal > 0 ? Math.round((stat.amount / monthExpenseTotal) * 100) : 0,
        ...(CATEGORY_META[name] || CATEGORY_META["其他"]),
      }));
  }, [monthExpenseOnly, monthExpenseTotal]);

  const monthlyData = useMemo(() => {
    if (!baby) return [];

    const amountByMonth = new Map<number, number>();
    for (let month = 1; month <= 12; month += 1) {
      const monthStr = `${selectedYear}-${String(month).padStart(2, "0")}`;
      const amount = yearExpenseOnly
        .filter((expense) => expense.date.startsWith(monthStr))
        .reduce((sum, expense) => sum + expense.amount, 0);
      if (amount > 0) amountByMonth.set(month, amount);
    }

    const dataMonths = [...amountByMonth.keys()].sort((a, b) => a - b);
    if (dataMonths.length >= 6) {
      return dataMonths.map((month) => ({ month, amount: amountByMonth.get(month) || 0 }));
    }

    const now = new Date();
    const birth = new Date(baby.birth_date);
    const birthYear = birth.getFullYear();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const startMonth = selectedYear > currentYear || selectedYear < birthYear
      ? 13
      : 1;
    const endMonth = selectedYear === currentYear ? currentMonth : selectedYear < currentYear ? 12 : 0;

    if (startMonth > endMonth) {
      return dataMonths.map((month) => ({ month, amount: amountByMonth.get(month) || 0 }));
    }

    const months: { month: number; amount: number }[] = [];
    for (let month = startMonth; month <= endMonth; month += 1) {
      months.push({ month, amount: amountByMonth.get(month) || 0 });
    }
    return months;
  }, [baby, selectedYear, yearExpenseOnly]);

  const yearExpenseTotal = useMemo(
    () => monthlyData.reduce((sum, item) => sum + item.amount, 0),
    [monthlyData],
  );

  const statsMinMonth = 1;
  const ledgerMinMonth = birthYear === selectedYear ? birthMonth : 1;
  const activeMinMonth = activeView === "stats" ? statsMinMonth : ledgerMinMonth;
  const isAtEarliestMonth = selectedYear === birthYear && selectedMonth === activeMinMonth;
  const isAtCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;
  const canGoPrevYear = selectedYear > birthYear;
  const canGoNextYear = selectedYear < currentYear;

  const handlePrevMonth = () => {
    if (isAtEarliestMonth) return;
    if (activeView === "stats") setShowYearChart(true);
    if (selectedMonth === 1) {
      setSelectedYear((year) => year - 1);
      setSelectedMonth(12);
      return;
    }
    setSelectedMonth((month) => month - 1);
  };

  const handleNextMonth = () => {
    if (isAtCurrentMonth) return;
    if (activeView === "stats") setShowYearChart(true);
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((year) => year + 1);
      return;
    }
    setSelectedMonth((month) => month + 1);
  };

  const handlePrevYear = () => {
    if (!canGoPrevYear) return;
    if (activeView === "stats") setShowYearChart(true);
    const nextYear = selectedYear - 1;
    setSelectedYear(nextYear);
    if (nextYear === birthYear && selectedMonth < birthMonth) {
      setSelectedMonth(birthMonth);
    }
  };

  const handleNextYear = () => {
    if (!canGoNextYear) return;
    if (activeView === "stats") setShowYearChart(true);
    const nextYear = selectedYear + 1;
    setSelectedYear(nextYear);
    if (nextYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  };

  if (!baby) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-gray-400">请先添加宝宝</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero>
        <div className="relative z-10 flex items-center">
          <div className="header-title flex-1">📊 宝宝账本</div>
        </div>

        <div className="relative z-10 mt-4 flex gap-2">
          <ViewTab active={activeView === "ledger"} label="流水" onClick={() => setActiveView("ledger")} />
          <ViewTab active={activeView === "stats"} label="统计" onClick={() => setActiveView("stats")} />
        </div>

        <div className="relative z-10 pt-4">
          <div className="mb-1 flex items-center justify-between">
            {activeView === "ledger" ? (
              <>
                <div className="text-[13px] font-medium text-white/90">当前月份</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={isAtEarliestMonth}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ‹
                  </button>
                  <span className="header-subtitle text-[13px]">{formatMonthTitle(selectedYear, selectedMonth)}</span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={isAtCurrentMonth}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ›
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    disabled={!canGoPrevYear}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ‹
                  </button>
                  <span className="text-[13px] font-medium text-white/90">{selectedYear}年</span>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    disabled={!canGoNextYear}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ›
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={isAtEarliestMonth}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ‹
                  </button>
                  <span className="header-subtitle text-[13px]">{selectedMonth}月</span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={isAtCurrentMonth}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 text-xs text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-medium text-white/90">¥</span>
            <span className="header-text-shadow font-serif text-[36px] font-bold leading-none text-white">
              {loading
                ? "--"
                : activeView === "ledger"
                  ? monthExpenseTotal.toLocaleString()
                  : yearExpenseTotal.toLocaleString()}
            </span>
          </div>
          <div className="header-subtitle mt-1 text-[13px]">
            {loading
              ? "加载中"
              : activeView === "ledger"
                ? `${monthExpenseOnly.length}笔支出 · ${monthIncomeOnly.length}笔红包`
                : `${selectedYear}年支出总览 · 红包累计另算`}
          </div>
        </div>
      </Hero>

      <ScrollArea className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">加载中...</div>
        ) : activeView === "ledger" ? (
          <>
            <div className="mt-2.5 mx-3.5 rounded-card bg-white p-3 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-serif text-sm font-semibold text-gray-900">{formatMonthTitle(selectedYear, selectedMonth)}流水</div>
                  <div className="mt-1 text-xs text-gray-400">按每天查看支出和红包收入</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={ledgerFilter === "all"} label="全部" onClick={() => setLedgerFilter("all")} />
                <FilterChip active={ledgerFilter === "expense"} label="支出" onClick={() => setLedgerFilter("expense")} />
                <FilterChip active={ledgerFilter === "income"} label="红包" onClick={() => setLedgerFilter("income")} />
              </div>
            </div>

            {groupedByDate.length > 0 ? (
              <div className="mx-3.5 mb-3.5 mt-2.5 space-y-3">
                {groupedByDate.map((group) => {
                  const meta = formatLedgerDate(group.date);
                  const dayNet = group.incomeTotal - group.expenseTotal;
                  const summaryAmount =
                    ledgerFilter === "income"
                      ? group.incomeTotal
                      : ledgerFilter === "expense"
                        ? group.expenseTotal
                        : Math.abs(dayNet);
                  const summaryPrefix =
                    ledgerFilter === "income"
                      ? "+"
                      : ledgerFilter === "expense"
                        ? "-"
                        : dayNet > 0
                          ? "+"
                          : dayNet < 0
                            ? "-"
                            : "";
                  const summaryTone =
                    ledgerFilter === "income" || (ledgerFilter === "all" && dayNet > 0)
                      ? "text-[#C25555]"
                      : "text-gray-900";

                  return (
                    <div key={group.date} className="overflow-hidden rounded-card bg-white shadow-card">
                      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{meta.title}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-gray-400">{meta.weekday}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${summaryTone}`}>
                            {summaryPrefix}¥{summaryAmount.toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-400">{group.items.length}笔记录</div>
                        </div>
                      </div>

                      {group.items
                        .slice()
                        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                        .map((item) => {
                          const itemMeta = CATEGORY_META[item.category] || CATEGORY_META["其他"];
                          const isIncome = item.direction === "income";
                          return (
                            <div key={item.id} className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F6F3EA] text-base">
                                {itemMeta.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-gray-900">{item.name}</div>
                                <div className="mt-0.5 text-[11px] text-gray-400">
                                  {isIncome ? "红包收入" : item.category}
                                  {item.channel ? ` · ${item.channel}` : ""}
                                </div>
                              </div>
                              <div className={`text-base font-bold ${isIncome ? "text-[#C25555]" : "text-gray-900"}`}>
                                {isIncome ? "+" : "-"}¥{item.amount.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="mb-4 text-5xl opacity-40">💰</div>
                <div className="mb-1 text-sm font-medium text-gray-600">这个月还没有流水记录</div>
                <div className="text-xs text-gray-400">点击右下角 + 记录支出或红包收入</div>
              </div>
            )}
          </>
        ) : (
          <>
            <HongbaoSummaryCard
              expanded={statsSummaryExpanded}
              onToggle={() => setStatsSummaryExpanded((prev) => !prev)}
              monthNetTotal={monthNetTotal}
              monthIncomeTotal={monthIncomeTotal}
              monthIncomeCount={monthIncomeOnly.length}
              allHongbaoTotal={allHongbaoTotal}
              yearHongbaoTotal={yearHongbaoTotal}
              selectedYear={selectedYear}
            />

            <div className="mt-2.5 mx-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-serif text-sm font-semibold text-gray-900">分类支出</div>
                <div className="text-xs text-gray-400">{formatMonthTitle(selectedYear, selectedMonth)}</div>
              </div>
              <div className="overflow-hidden rounded-card bg-white shadow-card">
                <div className="flex items-center justify-center border-b border-border py-4">
                  <DonutChart stats={categoryStats} totalAmount={monthExpenseTotal} />
                </div>
                {categoryStats.length > 0 ? (
                  categoryStats.map((cat) => (
                    <div key={cat.name} className="flex items-center border-b border-border px-3.5 py-3 last:border-b-0">
                      <div className="mr-[11px] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gray-100 text-base">
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <div className="mb-0.5 text-sm font-medium text-gray-900">{cat.name}</div>
                        <div className="h-[5px] overflow-hidden rounded-[2.5px] bg-gray-200">
                          <div className="h-full rounded-[2.5px]" style={{ width: `${cat.pct}%`, backgroundColor: cat.hex }} />
                        </div>
                      </div>
                      <div className="flex-shrink-0 pl-2.5 text-right">
                        <div className="text-base font-bold text-gray-900">¥{cat.amount.toLocaleString()}</div>
                        <div className="mt-px text-[10px] text-gray-400">{cat.count}笔 · {cat.pct}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-14 text-gray-400">
                    <div className="mb-4 text-5xl opacity-40">📈</div>
                    <div className="mb-1 text-sm font-medium text-gray-600">这个月还没有统计数据</div>
                    <div className="text-xs text-gray-400">先记几笔账，再看分析会更有意义</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 mx-3.5 overflow-hidden rounded-card bg-white shadow-card">
              <button
                type="button"
                onClick={() => setShowYearChart((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="font-serif text-sm font-semibold text-gray-900">{selectedYear}年年度统计</div>
                  <div className="mt-1 text-xs text-gray-400">点击展开查看全年每月支出走势</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">¥{yearExpenseTotal.toLocaleString()}</div>
                  <div className="mt-1 text-xs font-semibold text-[#2F9B73]">{showYearChart ? "收起年度图表" : "展开年度图表"}</div>
                </div>
              </button>

              {showYearChart ? (
                <div className="border-t border-border p-3">
                  <div className="overflow-x-auto">
                    <YearBarChart monthlyData={monthlyData} currentMonth={selectedMonth} onMonthClick={setSelectedMonth} />
                  </div>
                </div>
              ) : null}
            </div>

            {categoryStats.length === 0 ? null : (
              <div className="h-1" />
            )}
          </>
        )}
      </ScrollArea>

      <Fab onClick={() => navigate("/expense/add")} />
      <BottomNav />
    </Layout>
  );
}
