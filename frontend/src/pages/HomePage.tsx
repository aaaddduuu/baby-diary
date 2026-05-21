import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { fetchRecords, fetchExpenses } from "../lib/api";
import type { BabyRecord } from "../lib/api";

type IconName = "milk" | "bottle" | "moon" | "drop" | "poop" | "thermo" | "scale" | "note" | "chart" | "syringe" | "wallet" | "user" | "calendar";

const TYPE_META: Record<string, { icon: IconName; label: string; color: string; bg: string }> = {
  breast_milk: { icon: "milk", label: "母乳", color: "#D97891", bg: "#FFF0F4" },
  formula: { icon: "bottle", label: "配方奶", color: "#5C9FE8", bg: "#EEF7FF" },
  sleep: { icon: "moon", label: "睡眠", color: "#8D7BE7", bg: "#F2EFFF" },
  diaper: { icon: "drop", label: "尿布", color: "#3CA8E6", bg: "#ECF8FF" },
  growth: { icon: "scale", label: "成长", color: "#5BC4A0", bg: "#EAF8F2" },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const pageVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

function Icon({ name, className = "", stroke = "currentColor" }: { name: IconName; className?: string; stroke?: string }) {
  const common = {
    className,
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    milk: (
      <>
        <path d="M9 3h6" />
        <path d="M10 3v3.5L7.5 9.5A6 6 0 0 0 6 13.4V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.6a6 6 0 0 0-1.5-3.9L14 6.5V3" />
        <path d="M8 14h8" />
      </>
    ),
    bottle: (
      <>
        <path d="M10 2h4" />
        <path d="M11 2v4l-3 3v10a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V9l-3-3V2" />
        <path d="M9 13h4" />
        <path d="M9 17h4" />
      </>
    ),
    moon: <path d="M20 14.2A7.8 7.8 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z" />,
    drop: <path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z" />,
    poop: (
      <>
        <path d="M8 10c.6-2.7 2.4-4.2 5-5" />
        <path d="M7 10h9a4 4 0 0 1 0 8H8a4 4 0 0 1-1-7.9" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
        <path d="M10 17c1.2.7 2.8.7 4 0" />
      </>
    ),
    thermo: (
      <>
        <path d="M14 14.76V5a4 4 0 0 0-8 0v9.76a6 6 0 1 0 8 0Z" />
        <path d="M10 8v8" />
      </>
    ),
    scale: (
      <>
        <path d="M12 3v18" />
        <path d="M7 7h10" />
        <path d="m5 10-3 5h6l-3-5Z" />
        <path d="m19 10-3 5h6l-3-5Z" />
      </>
    ),
    note: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 14 4-4 3 3 5-7" />
      </>
    ),
    syringe: (
      <>
        <path d="m18 2 4 4" />
        <path d="m17 7 2-2" />
        <path d="M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5" />
        <path d="m9 15-3-3" />
      </>
    ),
    wallet: (
      <>
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H7" />
        <path d="M16 14h.01" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 10h18" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDetail(record: BabyRecord): string {
  const data = JSON.parse(record.data);
  if (record.type === "breast_milk") {
    if (data.side === "left") return `左侧 ${data.leftMin} 分钟`;
    if (data.side === "right") return `右侧 ${data.rightMin} 分钟`;
    return `双侧 ${(data.leftMin || 0) + (data.rightMin || 0)} 分钟`;
  }
  if (record.type === "formula") return `${data.ml} ml`;
  if (record.type === "sleep") return data.end ? `${formatTime(data.start)} - ${formatTime(data.end)}` : "睡眠中";
  if (record.type === "diaper") {
    const types: Record<string, string> = { wet: "小便", dirty: "大便", both: "都有" };
    return types[data.diaper_type] || "尿布";
  }
  return data.note || "";
}

function calcAge(birthDate: string): string {
  const days = calcDays(birthDate);
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  return months > 0 ? `${months}个月${remainDays}天` : `${days}天`;
}

function calcDays(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

function getLatestRecordByType(records: BabyRecord[], type: string): BabyRecord | undefined {
  return records
    .filter((record) => record.type === type)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
}

function formatTimeAgo(recordedAt: string): string | null {
  const now = new Date();
  const recordTime = new Date(recordedAt);
  const diffMinutes = Math.floor((now.getTime() - recordTime.getTime()) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes < 0) return null;
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return "昨天";
  return `${diffDays}天前`;
}

function MoonEmpty() {
  return (
    <svg width="112" height="86" viewBox="0 0 112 86" fill="none" aria-hidden="true">
      <path d="M75.6 46.8c-4.4 20.5-27 29.8-44.1 18.4 15.1-1.2 28.4-12.1 31.9-28.1 2-9.4.3-18.7-4.1-26.2 12.8 5.8 19.4 21.5 16.3 35.9Z" fill="#FFD98A" />
      <path d="M75.6 46.8c-4.4 20.5-27 29.8-44.1 18.4 12.7.9 31.9-6.2 39.4-28.1" stroke="#F2B75B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="82" cy="18" r="3" fill="#FFE7A8" />
      <circle cx="28" cy="24" r="2.5" fill="#CFEFE4" />
      <path d="m93 35 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="#B9EBD9" />
      <path d="m44 8 1.6 3.2L49 13l-3.4 1.8L44 18l-1.6-3.2L39 13l3.4-1.8L44 8Z" fill="#fff" opacity=".9" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [todayCount, setTodayCount] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [hasRecords, setHasRecords] = useState(false);
  const [allRecords, setAllRecords] = useState<BabyRecord[]>([]);
  const [upcomingVaccineCount, setUpcomingVaccineCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = useMemo(
    () =>
      allRecords
        .filter((record) => record.recorded_at.startsWith(today))
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()),
    [allRecords, today],
  );

  useEffect(() => {
    if (!baby) return;

    setPageLoading(true);
    Promise.all([
      fetchRecords(baby.id).then((records) => {
        setAllRecords(records);
        if (records.length > 0) setHasRecords(true);
        setTodayCount(records.filter((record) => record.recorded_at.startsWith(today)).length);
      }),
      fetchExpenses(baby.id, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`).then((expenses) => {
        setMonthExpense(expenses.reduce((sum, expense) => sum + expense.amount, 0));
        if (expenses.length > 0) setHasRecords(true);
      }),
      fetch(`/api/babies/${baby.id}/vaccines`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) return;
          const now = new Date();
          const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const upcoming = data.data.filter((v: { status: string; date: string | null }) => {
            if (v.status !== "planned" || !v.date) return false;
            const vaccineDate = new Date(v.date);
            return vaccineDate >= now && vaccineDate <= thirtyDaysLater;
          });
          setUpcomingVaccineCount(upcoming.length);
        }),
    ])
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [baby, today]);

  const quickRecordItems = useMemo(() => {
    const items = [
      { icon: "milk" as const, label: "母乳", type: "breast_milk", color: "#D97891", bg: "#FFF0F4", path: "/record/add?type=breast_milk" },
      { icon: "bottle" as const, label: "配方奶", type: "formula", color: "#5C9FE8", bg: "#EEF7FF", path: "/record/add?type=formula" },
      { icon: "moon" as const, label: "睡眠", type: "sleep", color: "#8D7BE7", bg: "#F2EFFF", path: "/record/add?type=sleep" },
      { icon: "drop" as const, label: "小便", type: "diaper", color: "#3CA8E6", bg: "#ECF8FF", path: "/record/add?type=diaper" },
      { icon: "poop" as const, label: "大便", type: "diaper", color: "#B57965", bg: "#F7F1EC", path: "/record/add?type=diaper" },
      { icon: "thermo" as const, label: "体温", type: "growth", color: "#FF8C69", bg: "#FFF0EA", path: "/record/add" },
      { icon: "scale" as const, label: "体重", type: "growth", color: "#73B95B", bg: "#EFF9EA", path: "/growth" },
      { icon: "note" as const, label: "备注", type: "note", color: "#8F98A8", bg: "#F2F4F7", path: "/record/add" },
    ];

    return items.map((item) => {
      const latest = item.type === "note" ? undefined : getLatestRecordByType(allRecords, item.type);
      return { ...item, timeAgo: latest ? formatTimeAgo(latest.recorded_at) : null };
    });
  }, [allRecords]);

  if (!baby || pageLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-gray-400">加载中...</div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { icon: "calendar" as const, value: `${calcDays(baby.birth_date)}`, suffix: "天", label: "出生天数" },
    { icon: "note" as const, value: `${todayCount}`, suffix: "次", label: "今日记录" },
    { icon: "wallet" as const, value: `¥${monthExpense.toLocaleString()}`, label: "本月花费" },
  ];

  const featureCards = [
    { icon: "chart" as const, label: "成长曲线", path: "/growth", gradient: "from-[#DDF7EA] to-[#BDEBD8]", color: "#2FA47E" },
    { icon: "syringe" as const, label: "疫苗记录", path: "/vaccine", gradient: "from-[#E4F3FF] to-[#CFE8FF]", color: "#3B8EDB", badge: upcomingVaccineCount },
    { icon: "wallet" as const, label: "记账", path: "/expense", gradient: "from-[#FFEBD9] to-[#FFD9BA]", color: "#E98232" },
    { icon: "user" as const, label: "我的", path: "/my", gradient: "from-[#EFE8FF] to-[#DDD1FF]", color: "#7F64DD" },
  ];

  return (
    <Layout>
      <motion.div initial="hidden" animate="show" variants={pageVariants} className="flex min-h-0 flex-1 flex-col">
        <Hero>
          <motion.div variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }} className="relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/family")} className="flex-1 border-none bg-transparent p-0 text-left">
                <div className="text-2xl font-bold leading-tight text-white drop-shadow-sm">{baby.name}</div>
                <div className="mt-1 text-[13px] font-medium text-white/70">
                  {calcAge(baby.birth_date)} · {baby.birth_date} 出生
                </div>
              </button>
              <button
                onClick={() => navigate("/family")}
                className="flex items-center gap-2 rounded-pill border border-white/35 bg-white/22 py-1.5 pl-2 pr-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.28)] backdrop-blur-md"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE4B6] text-xs font-bold text-[#A66A2B]">
                  {baby.relation?.slice(0, 1) || "家"}
                </span>
                <span className="text-sm font-semibold">{baby.relation || "家人"}</span>
                <span className="text-xs text-white/75">⌄</span>
              </button>
            </div>

            <div className="no-scrollbar -mx-[18px] mt-7 flex gap-3 overflow-x-auto px-[18px] pb-1">
              {statCards.map((card) => (
                <div key={card.label} className="min-w-[148px] rounded-2xl border border-white/30 bg-white/24 p-3.5 text-white shadow-[0_8px_24px_rgba(37,113,85,.12)] backdrop-blur-md">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/24">
                    <Icon name={card.icon} className="h-5 w-5" />
                  </div>
                  <div className="font-tabular text-[28px] font-bold leading-none">
                    {card.value}
                    {card.suffix && <span className="ml-1 text-sm font-semibold text-white/75">{card.suffix}</span>}
                  </div>
                  <div className="mt-1 text-xs font-medium text-white/75">{card.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </Hero>

        <ScrollArea className="pb-4">
          <div className="space-y-6 px-4 pt-5">
            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[19px] font-bold text-gray-900">快速记录</h2>
                <button onClick={() => navigate("/record")} className="border-none bg-transparent text-sm font-semibold text-mint">
                  记录全部 <span className="text-base">›</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {quickRecordItems.map((item) => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    onClick={() => navigate(item.path)}
                    className="min-h-[112px] rounded-xl border border-[#EFF2EF] bg-white px-1.5 py-3 text-center shadow-card"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: item.bg, color: item.color }}>
                      <Icon name={item.icon} className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-xs font-bold text-gray-600">{item.label}</div>
                    {item.timeAgo && <div className="mt-1 text-[10px] font-medium text-gray-400">{item.timeAgo}</div>}
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <h2 className="mb-3 text-[19px] font-bold text-gray-900">常用功能</h2>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {featureCards.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="relative min-w-[100px] rounded-card border border-[#EEF1EE] bg-white p-3 text-left shadow-card"
                  >
                    {item.badge ? (
                      <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-pill bg-coral px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient}`} style={{ color: item.color }}>
                      <Icon name={item.icon} className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-bold text-gray-700">{item.label}</div>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[19px] font-bold text-gray-900">今日记录</h2>
                <button onClick={() => navigate("/record")} className="border-none bg-transparent text-sm font-semibold text-mint">
                  查看全部 <span className="text-base">›</span>
                </button>
              </div>

              {todayRecords.length > 0 ? (
                <div className="space-y-3">
                  {todayRecords.slice(0, 6).map((record) => {
                    const meta = TYPE_META[record.type] || TYPE_META.growth;
                    const detail = formatDetail(record);
                    const note = JSON.parse(record.data).note;

                    return (
                      <div key={record.id} className="grid grid-cols-[46px_1fr] gap-3">
                        <div className="pt-4 text-right font-tabular text-xs font-bold text-gray-400">{formatTime(record.recorded_at)}</div>
                        <div className="relative rounded-card bg-white p-3.5 shadow-card">
                          <span className="absolute -left-[19px] top-5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: meta.color }} />
                          <span className="absolute -left-[14px] top-8 h-[calc(100%+12px)] w-px bg-border last:hidden" />
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg, color: meta.color }}>
                              <Icon name={meta.icon} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-gray-900">{meta.label}</div>
                              <div className="mt-0.5 truncate text-xs text-gray-400">
                                {detail}
                                {note ? ` · ${note}` : ""}
                              </div>
                            </div>
                            <div className="font-tabular text-xs font-semibold text-gray-300">{formatTime(record.recorded_at)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] bg-white px-6 py-10 text-center shadow-card">
                  <div className="mb-4 flex justify-center">
                    <MoonEmpty />
                  </div>
                  <div className="mb-5 text-base font-semibold text-gray-600">今天还没有记录</div>
                  <motion.button
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    onClick={() => navigate("/record/add")}
                    className="rounded-xl border-none bg-mint px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(91,196,160,.28)]"
                  >
                    快速添加 +
                  </motion.button>
                </div>
              )}
            </motion.section>

            {!hasRecords && (
              <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }} className="rounded-[24px] bg-[#EAF8F2] p-4">
                <div className="text-sm font-bold text-gray-900">从第一条记录开始</div>
                <div className="mt-1 text-xs leading-relaxed text-gray-500">记录喂养、睡眠、尿布和花费，慢慢拼出 {baby.name} 的成长节奏。</div>
              </motion.section>
            )}

            <div className="h-20" />
          </div>
        </ScrollArea>
      </motion.div>
      <BottomNav />
    </Layout>
  );
}
