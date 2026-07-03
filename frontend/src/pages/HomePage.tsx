import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout, { ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import RecordTypeIcon, { getDiaperIconName, getDiaperLabel } from "../components/RecordTypeIcon";
import type { RecordIconName } from "../components/RecordTypeIcon";
import { useAuth } from "../lib/AuthContext";
import { useBaby } from "../lib/BabyContext";
import { isRecordTypeVisible, useCarePreferences } from "../lib/carePreferences";
import { fetchExpenses, fetchFamily, fetchRecords, fetchVaccines } from "../lib/api";
import type { BabyRecord, FamilyMember } from "../lib/api";
import {
  ADD_RECORD_TYPES,
  CARE_ACTIONS,
  CORD_STATUSES,
  DIAPER_AMOUNTS,
  getDiaperTypeFromRecordType,
  getElapsedCalendarDays,
  getLocalDateString,
  JAUNDICE_SITES,
  STOOL_TEXTURES,
  TEMPERATURE_SITES,
} from "./recordFormShared";

type IconName =
  | "milk"
  | "bottle"
  | "moon"
  | "drop"
  | "poop"
  | "thermo"
  | "scale"
  | "note"
  | "chart"
  | "syringe"
  | "wallet"
  | "user"
  | "calendar"
  | "spark";

type RecordMeta = {
  icon: RecordIconName;
  label: string;
  tone: string;
  surface: string;
};

const TYPE_META: Record<string, RecordMeta> = {
  breast_milk: { icon: "breast_milk", label: "母乳", tone: "#C95F7B", surface: "#FFF1F5" },
  breast_milk_bottle: { icon: "breast_milk_bottle", label: "瓶喂母乳", tone: "#D56B8D", surface: "#FFF2F7" },
  formula: { icon: "formula", label: "配方奶", tone: "#4D92D8", surface: "#EDF7FF" },
  sleep: { icon: "sleep", label: "睡眠", tone: "#7C6AD8", surface: "#F2EFFF" },
  diaper: { icon: "diaper_wet", label: "尿布", tone: "#349FD5", surface: "#EAF8FF" },
  medicine: { icon: "medicine", label: "吃药", tone: "#D06A7A", surface: "#FFF0F2" },
  growth: { icon: "growth", label: "成长", tone: "#3FA37F", surface: "#EAF8F2" },
  temperature: { icon: "temperature", label: "体温", tone: "#D66B4D", surface: "#FFF1EA" },
  jaundice: { icon: "jaundice", label: "黄疸", tone: "#C88A17", surface: "#FFF8D8" },
  cord_care: { icon: "cord_care", label: "脐护", tone: "#2F9B73", surface: "#EAF8F2" },
  bath_touch: { icon: "bath_touch", label: "洗护", tone: "#3C8ACD", surface: "#EAF5FF" },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const pageVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
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

  const paths: Record<IconName, ReactNode> = {
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
    spark: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function safeJsonParse(value: string): Record<string, any> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown, fallback = "未记录"): string {
  return options.find((option) => option.value === value)?.label || fallback;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getRecordLocalDate(recordedAt: string): string {
  return getLocalDateString(new Date(recordedAt));
}

function formatDetail(record: BabyRecord): string {
  const data = safeJsonParse(record.data);

  if (record.type === "breast_milk") {
    if (data.side === "left") return `左侧 ${data.leftMin ?? 0} 分钟`;
    if (data.side === "right") return `右侧 ${data.rightMin ?? 0} 分钟`;
    return `双侧 ${(Number(data.leftMin) || 0) + (Number(data.rightMin) || 0)} 分钟`;
  }

  if (record.type === "formula" || record.type === "breast_milk_bottle") return `${data.ml ?? 0} ml`;
  if (record.type === "sleep") return data.end ? `${formatTime(data.start)} - ${formatTime(data.end)}` : "睡眠中";

  if (record.type === "diaper") {
    const amount = data.amount ? ` · ${optionLabel(DIAPER_AMOUNTS, data.amount)}` : "";
    if (data.diaper_type !== "dirty" && data.diaper_type !== "both") return `已记录${amount}`;
    const colors: Record<string, string> = { yellow: "黄色", green: "绿色", brown: "棕色", other: "其他" };
    const texture = data.texture ? ` · ${optionLabel(STOOL_TEXTURES, data.texture)}` : "";
    return `${colors[String(data.color)] || "未记录颜色"}${texture}${amount}`;
  }

  if (record.type === "medicine") {
    const name = String(data.medicine_name || "药品");
    return data.dose ? `${name} · ${data.dose}` : name;
  }

  if (record.type === "temperature") {
    return `${data.value ?? "--"}°C · ${optionLabel(TEMPERATURE_SITES, data.site, "体温")}`;
  }

  if (record.type === "jaundice") {
    return `${data.value ?? "--"} · ${optionLabel(JAUNDICE_SITES, data.site, "部位未记")}`;
  }

  if (record.type === "cord_care") {
    return optionLabel(CORD_STATUSES, data.status, "已护理");
  }

  if (record.type === "bath_touch") {
    return optionLabel(CARE_ACTIONS, data.action, "已洗护");
  }

  return String(data.note || "");
}

function getRecordVisual(record: BabyRecord): RecordMeta {
  const base = TYPE_META[record.type] || TYPE_META.growth;
  if (record.type !== "diaper") return base;

  const diaperType = safeJsonParse(record.data).diaper_type;
  if (diaperType === "dirty") {
    return { icon: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#A66B3D", surface: "#FFF4E8" };
  }
  if (diaperType === "both") {
    return { icon: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#C58A28", surface: "#FFF7DF" };
  }
  return { icon: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#349FD5", surface: "#EAF8FF" };
}

function calcAge(birthDate: string): string {
  const days = getElapsedCalendarDays(birthDate);
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  return months > 0 ? `${months}个月${remainDays}天` : `${days}天`;
}

function getLatestRecordByType(records: BabyRecord[], type: string): BabyRecord | undefined {
  const diaperType = getDiaperTypeFromRecordType(type);
  return records
    .filter((record) => {
      if (!diaperType) return record.type === type;
      if (record.type !== "diaper") return false;
      return (safeJsonParse(record.data).diaper_type || "wet") === diaperType;
    })
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

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <div className="mb-1 h-1 w-8 rounded-pill bg-coral/70" />
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-gray-900">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="border-none bg-transparent p-0 text-[13px] font-semibold text-[#2D9B6A]">
          {action} ›
        </button>
      )}
    </div>
  );
}

const QUICK_RECORD_META: Record<
  (typeof ADD_RECORD_TYPES)[number]["type"],
  { icon: RecordIconName; tone: string; surface: string }
> = {
  breast_milk: { icon: "breast_milk", tone: "#C95F7B", surface: "#FFF1F5" },
  breast_milk_bottle: { icon: "breast_milk_bottle", tone: "#D56B8D", surface: "#FFF2F7" },
  formula: { icon: "formula", tone: "#4D92D8", surface: "#EDF7FF" },
  sleep: { icon: "sleep", tone: "#7C6AD8", surface: "#F2EFFF" },
  diaper_wet: { icon: "diaper_wet", tone: "#349FD5", surface: "#EAF8FF" },
  diaper_dirty: { icon: "diaper_dirty", tone: "#A66B3D", surface: "#FFF4E8" },
  medicine: { icon: "medicine", tone: "#D06A7A", surface: "#FFF0F2" },
  temperature: { icon: "temperature", tone: "#D66B4D", surface: "#FFF1EA" },
  jaundice: { icon: "jaundice", tone: "#C88A17", surface: "#FFF8D8" },
  cord_care: { icon: "cord_care", tone: "#2F9B73", surface: "#EAF8F2" },
  bath_touch: { icon: "bath_touch", tone: "#3C8ACD", surface: "#EAF5FF" },
};

function EmptyIllustration() {
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" aria-hidden="true">
      <path d="M34 76c-1.7-19.8 12.4-38 32.4-40.8 20-2.9 39 10.4 42.8 30-10.7 18.9-53.8 28.2-75.2 10.8Z" fill="#EAF8F2" />
      <path d="M49 39c4.7-12.2 19-18.2 31.4-13.4 12.4 4.8 18.5 18.7 13.9 31-4.7 12.2-19 18.2-31.4 13.4C50.5 65.2 44.3 51.2 49 39Z" fill="#FFF6DD" />
      <path d="M83.5 55.5c-9.2 7.8-23.1 5.6-29.5-4.8 8.4 1.9 17.5-1.1 23.3-8 3.4-4 4.9-8.9 4.7-13.6 6.1 5.4 8 17.1 1.5 26.4Z" fill="#FFD778" />
      <circle cx="42" cy="31" r="3" fill="#A8E7D2" />
      <circle cx="99" cy="27" r="2.5" fill="#FFB493" />
      <path d="m33 54 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="#BDEBD8" />
      <path d="M39 79c19 9 45 7.7 66-4" stroke="#D3E8DC" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { baby } = useBaby();
  const { preferences } = useCarePreferences(baby);
  const [todayCount, setTodayCount] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [hasRecords, setHasRecords] = useState(false);
  const [allRecords, setAllRecords] = useState<BabyRecord[]>([]);
  const [upcomingVaccineCount, setUpcomingVaccineCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentRelation, setCurrentRelation] = useState("家人");

  const today = getLocalDateString();
  const todayRecords = useMemo(
    () =>
      allRecords
        .filter((record) => getRecordLocalDate(record.recorded_at) === today)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()),
    [allRecords, today],
  );

  useEffect(() => {
    if (!baby) return;

    setPageLoading(true);
    setCurrentRelation(baby.relation || "家人");
    Promise.all([
      fetchRecords(baby.id).then((records) => {
        setAllRecords(records);
        if (records.length > 0) setHasRecords(true);
        setTodayCount(records.filter((record) => getRecordLocalDate(record.recorded_at) === today).length);
      }),
      fetchExpenses(baby.id, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`).then((expenses) => {
        setMonthExpense(expenses.filter((expense) => expense.direction !== "income").reduce((sum, expense) => sum + expense.amount, 0));
        if (expenses.length > 0) setHasRecords(true);
      }),
      fetchVaccines(baby.id)
        .then((vaccines) => {
          const now = new Date();
          const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const upcoming = vaccines.filter((v) => {
            if (v.status !== "planned" || !v.date) return false;
            const vaccineDate = new Date(v.date);
            return vaccineDate >= now && vaccineDate <= thirtyDaysLater;
          });

          setUpcomingVaccineCount(upcoming.length);
        }),
      fetchFamily().then((family) => {
        const currentMember = family.members.find((member: FamilyMember) => member.user_id === user?.id);
        if (currentMember?.nickname) {
          setCurrentRelation(currentMember.nickname);
        }
      }),
    ])
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [baby, today, user?.id]);

  const quickRecordItems = useMemo(() => {
    return ADD_RECORD_TYPES.filter((item) => isRecordTypeVisible(item.type, preferences, "quick")).map((item) => {
      const meta = QUICK_RECORD_META[item.type];
      const latest = getLatestRecordByType(allRecords, item.type);
      return {
        ...item,
        iconName: meta.icon,
        tone: meta.tone,
        surface: meta.surface,
        path: `/record/add?type=${item.type}`,
        timeAgo: latest ? formatTimeAgo(latest.recorded_at) : null,
      };
    });
  }, [allRecords, preferences]);

  if (!baby || pageLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="rounded-pill bg-white/75 px-4 py-2 text-sm font-medium text-gray-400 shadow-card">加载中…</div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { icon: "calendar" as const, value: `${getElapsedCalendarDays(baby.birth_date)}`, suffix: "天", label: "出生天数", tone: "#2FA47E" },
    { icon: "note" as const, value: `${todayCount}`, suffix: "次", label: "今日记录", tone: "#E77751" },
    { icon: "wallet" as const, value: `¥${monthExpense.toLocaleString()}`, label: "本月花费", tone: "#8067D8" },
  ];

  const featureCards = [
    { icon: "chart" as const, label: "成长曲线", desc: "身高体重", path: "/growth", surface: "#D1FAE5", tone: "#059669" },
    { icon: "syringe" as const, label: "疫苗计划", desc: "近期提醒", path: "/vaccine", surface: "#DBEAFE", tone: "#2563EB", badge: upcomingVaccineCount },
    { icon: "wallet" as const, label: "家庭账本", desc: "花费统计", path: "/expense", surface: "#FFEDD5", tone: "#EA580C" },
    { icon: "user" as const, label: "我的空间", desc: "家庭成员", path: "/my", surface: "#EDE9FE", tone: "#7C3AED" },
  ];

  return (
    <Layout className="bg-[radial-gradient(circle_at_18%_0%,#FFF4DF_0,transparent_34%),radial-gradient(circle_at_88%_18%,#DCF5EA_0,transparent_31%),var(--page-bg)]">
      <motion.div initial="hidden" animate="show" variants={pageVariants} className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex-shrink-0 overflow-hidden px-4 pb-5 pt-8">
          <div className="absolute inset-x-0 top-0 h-[250px] rounded-b-[34px]" style={{ background: "var(--header-grad)" }} />
          <div className="header-readable-overlay absolute inset-x-0 top-0 h-[250px] rounded-b-[34px]" />
          <div className="absolute right-[-42px] top-8 h-36 w-36 rounded-full bg-white/18 blur-2xl" />
          <div className="absolute left-[-56px] top-24 h-32 w-32 rounded-full bg-[#1C6F52]/20 blur-2xl" />

          <motion.div variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }} className="relative z-10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button onClick={() => navigate("/moments")} className="min-w-0 flex-1 border-none bg-transparent p-0 text-left">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-pill border border-white/50 bg-white/20 px-3 py-1 text-[11px] font-bold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,.45)] backdrop-blur-md">
                  <Icon name="spark" className="h-3.5 w-3.5" />
                  今日小日记                </div>
                <div className="header-title truncate">{baby.name}</div>
                <div className="header-subtitle mt-2 text-[13px] font-semibold">
                  {calcAge(baby.birth_date)} · {baby.birth_date} 出生
                </div>
              </button>

              <button
                onClick={() => navigate("/family")}
                className="flex shrink-0 items-center gap-2 rounded-[20px] border border-white/55 bg-white/20 py-2 pl-2 pr-3 text-white/90 shadow-[0_12px_28px_rgba(56,111,86,.12),inset_0_1px_0_rgba(255,255,255,.55)] backdrop-blur-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFF2C8] text-sm font-black text-[#9B6529]">
                  {currentRelation.slice(0, 1) || "家"}
                </span>
                <span className="text-sm font-bold">{currentRelation}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {statCards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => (card.label === "本月花费" ? navigate("/expense") : navigate("/record"))}
                  className="rounded-[22px] border border-white/60 bg-white/90 p-3 text-left shadow-[0_10px_26px_rgba(26,92,58,.12)] backdrop-blur-md"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-2xl bg-white/70" style={{ color: card.tone }}>
                    <Icon name={card.icon} className="h-[18px] w-[18px]" />
                  </div>
                  <div className="font-tabular text-[23px] font-black leading-none tracking-[-0.04em] text-[#1A5C3A]">
                    {card.value}
                    {card.suffix && <span className="ml-0.5 text-xs font-bold tracking-normal text-[#1A5C3A]">{card.suffix}</span>}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-[#3A7A5A]">{card.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <ScrollArea className="pb-4">
          <div className="space-y-6 px-4 pt-2">
            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <SectionHeader title="快速记录" action="查看全部" onAction={() => navigate("/record")} />
              <div className="grid grid-cols-6 gap-2.5">
                {quickRecordItems.map((item) => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    onClick={() => navigate(item.path)}
                    className="col-span-2 min-h-[108px] rounded-[22px] border border-white bg-white/86 px-1.5 py-3 text-center shadow-soft"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px]" style={{ backgroundColor: item.surface, color: item.tone }}>
                      <RecordTypeIcon name={item.iconName} className="h-6 w-6" />
                    </div>
                    <div className="mt-2.5 text-xs font-black text-gray-700">{item.label}</div>
                    <div className="mt-1 min-h-[14px] text-[10px] font-semibold text-gray-400">{item.timeAgo || "快速填写"}</div>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <button
                type="button"
                onClick={() => navigate("/moments")}
                className="relative w-full overflow-hidden rounded-[26px] border border-white bg-[linear-gradient(135deg,#E7F7EF_0%,#FFF6E8_100%)] p-5 text-left shadow-soft"
              >
                <div className="absolute -right-6 -top-7 h-24 w-24 rounded-full bg-white/50 blur-sm" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex rounded-pill bg-white/75 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-[#4C7E68]">每日照片与备注</div>
                    <div className="text-lg font-black text-[#21382E]">成长时光</div>
                    <div className="mt-1 max-w-[230px] text-xs font-semibold leading-5 text-[#6B7C72]">把今天喜欢的几张照片，留给未来慢慢看。</div>
                  </div>
                  <div className="shrink-0 rounded-[16px] bg-[#2D9B6A] px-3.5 py-2.5 text-xs font-black text-white shadow-[0_10px_20px_rgba(45,155,106,.2)]">打开时光轴</div>
                </div>
              </button>
            </motion.section>

            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <SectionHeader title="常用功能" />
              <div className="grid grid-cols-2 gap-3">
                {featureCards.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="relative flex min-h-[92px] items-center gap-3 rounded-[22px] border border-white bg-white/88 p-3 text-left shadow-soft"
                  >
                    {item.badge ? (
                      <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-pill bg-coral px-1.5 text-[10px] font-black text-white">
                        {item.badge}
                      </span>
                    ) : null}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: item.surface, color: item.tone }}>
                      <Icon name={item.icon} className="h-[22px] w-[22px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-gray-900">{item.label}</div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-gray-400">{item.desc}</div>
                    </div>
                    <div className="text-lg font-bold text-gray-300">›</div>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }}>
              <SectionHeader title="今日记录" action="查看全部" onAction={() => navigate("/record")} />

              {todayRecords.length > 0 ? (
                <div className="space-y-3">
                  {todayRecords.slice(0, 6).map((record, index) => {
                    const meta = getRecordVisual(record);
                    const detail = formatDetail(record);
                    const note = safeJsonParse(record.data).note;

                    return (
                      <div key={record.id} className="grid grid-cols-[46px_minmax(0,1fr)] gap-5">
                        <div className="pt-4 pr-1 text-right">
                          <div className="font-tabular text-xs font-black text-gray-400">{formatTime(record.recorded_at)}</div>
                          {index === 0 && <div className="mt-1 text-[10px] font-bold text-mint-dark">最新</div>}
                        </div>
                        <div className="relative rounded-[24px] border border-white bg-white/88 p-3.5 shadow-soft">
                          <span className="absolute -left-[18px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-[#F8F7EF]" style={{ backgroundColor: meta.tone }} />
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]" style={{ backgroundColor: meta.surface, color: meta.tone }}>
                              <RecordTypeIcon name={meta.icon} className="h-[22px] w-[22px]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-gray-900">{meta.label}</div>
                              <div className="mt-0.5 truncate text-xs font-medium text-gray-400">
                                {detail}
                                {note ? ` · ${note}` : ""}
                              </div>
                            </div>
                            <div className="rounded-pill bg-gray-50 px-2 py-1 font-tabular text-[11px] font-bold text-gray-300">{formatTime(record.recorded_at)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white bg-white/88 px-6 py-9 text-center shadow-soft">
                  <div className="mb-4 flex justify-center">
                    <EmptyIllustration />
                  </div>
                  <div className="mb-1 text-base font-black text-gray-700">今天还没有记录</div>
                  <div className="mb-5 text-xs font-medium leading-relaxed text-gray-400">从一次喂奶、睡眠、尿布或吃药开始，慢慢拼出 {baby.name} 的一天。</div>
                  <motion.button
                    animate={{ scale: [1, 1.035, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    onClick={() => navigate("/record/add")}
                    className="rounded-[18px] border-none bg-[#24382F] px-6 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(31,56,45,.18)]"
                  >
                    添加第一条
                  </motion.button>
                </div>
              )}
            </motion.section>

            {!hasRecords && (
              <motion.section variants={sectionVariants} transition={{ duration: 0.38, ease: "easeOut" }} className="rounded-[26px] border border-[#F3DFC6] bg-[#FFF8E8] p-4 shadow-soft">
                <div className="text-sm font-black text-gray-900">从第一条记录开始</div>
                <div className="mt-1 text-xs leading-relaxed text-gray-500">记录喂养、睡眠、尿布、吃药和花费，之后首页会自动汇总最近的节奏。</div>
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
