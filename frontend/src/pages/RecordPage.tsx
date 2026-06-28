import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, HeroStatCard, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import DatePickerSheet from "../components/DatePickerSheet";
import RecordTypeIcon, { getDiaperIconName, getDiaperLabel } from "../components/RecordTypeIcon";
import type { RecordIconName } from "../components/RecordTypeIcon";
import { deleteRecord, fetchRecords } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import type { BabyRecord } from "../lib/api";
import { type CarePreferences, useCarePreferences } from "../lib/carePreferences";
import {
  CARE_ACTIONS,
  CORD_STATUSES,
  DIAPER_AMOUNTS,
  getLocalDateString,
  JAUNDICE_SITES,
  STOOL_TEXTURES,
  TEMPERATURE_SITES,
} from "./recordFormShared";

const TYPE_META: Record<string, { iconName: RecordIconName; label: string; tone: string; surface: string }> = {
  breast_milk: { iconName: "breast_milk", label: "母乳", tone: "#C95F7B", surface: "#FFF1F5" },
  formula: { iconName: "formula", label: "配方奶", tone: "#4D92D8", surface: "#EDF7FF" },
  sleep: { iconName: "sleep", label: "睡眠", tone: "#7C6AD8", surface: "#F2EFFF" },
  diaper: { iconName: "diaper_wet", label: "尿布", tone: "#349FD5", surface: "#EAF8FF" },
  medicine: { iconName: "medicine", label: "吃药", tone: "#D06A7A", surface: "#FFF0F2" },
  growth: { iconName: "growth", label: "成长", tone: "#3FA37F", surface: "#EAF8F2" },
  temperature: { iconName: "temperature", label: "体温", tone: "#D66B4D", surface: "#FFF1EA" },
  jaundice: { iconName: "jaundice", label: "黄疸", tone: "#C88A17", surface: "#FFF8D8" },
  cord_care: { iconName: "cord_care", label: "脐护", tone: "#2F9B73", surface: "#EAF8F2" },
  bath_touch: { iconName: "bath_touch", label: "洗护", tone: "#3C8ACD", surface: "#EAF5FF" },
};

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function safeJsonParse(value: string): Record<string, any> {
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return {};
  }
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown, fallback = "未记录"): string {
  return options.find((option) => option.value === value)?.label || fallback;
}

function getRecordMeta(record: BabyRecord) {
  const base = TYPE_META[record.type] || TYPE_META.growth;
  if (record.type !== "diaper") return base;

  const data = safeJsonParse(record.data);
  const diaperType = data.diaper_type;
  if (diaperType === "dirty") {
    return { iconName: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#A66B3D", surface: "#FFF4E8" };
  }
  if (diaperType === "both") {
    return { iconName: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#C58A28", surface: "#FFF7DF" };
  }
  return { iconName: getDiaperIconName(diaperType), label: getDiaperLabel(diaperType), tone: "#349FD5", surface: "#EAF8FF" };
}

function formatDetail(record: BabyRecord): string {
  const data = safeJsonParse(record.data);
  if (record.type === "breast_milk") {
    if (data.side === "left") return `左侧${data.leftMin}分`;
    if (data.side === "right") return `右侧${data.rightMin}分`;
    return `双侧${(data.leftMin || 0) + (data.rightMin || 0)}分`;
  }
  if (record.type === "formula") {
    return `${data.ml}ml`;
  }
  if (record.type === "sleep") {
    const start = new Date(data.start);
    if (!data.end) return `${formatTime(data.start)} - 睡眠中`;
    const end = new Date(data.end);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const duration = hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分钟`;
    return `${formatTime(data.start)} - ${formatTime(data.end)} · ${duration}`;
  }
  if (record.type === "diaper") {
    const amount = data.amount ? ` · ${optionLabel(DIAPER_AMOUNTS, data.amount)}` : "";
    if (data.diaper_type !== "dirty" && data.diaper_type !== "both") return `已记录${amount}`;
    const colors: Record<string, string> = { yellow: "黄色", green: "绿色", brown: "棕色", other: "其他" };
    const texture = data.texture ? ` · ${optionLabel(STOOL_TEXTURES, data.texture)}` : "";
    return `${colors[data.color] || "未记录颜色"}${texture}${amount}`;
  }
  if (record.type === "medicine") {
    const name = String(data.medicine_name || "药品");
    return data.dose ? `${name} · ${data.dose}` : name;
  }
  if (record.type === "temperature") {
    const site = optionLabel(TEMPERATURE_SITES, data.site, "体温");
    return `${data.value ?? "--"}°C · ${site}`;
  }
  if (record.type === "jaundice") {
    const site = optionLabel(JAUNDICE_SITES, data.site, "部位未记");
    return `${data.value ?? "--"} · ${site}`;
  }
  if (record.type === "cord_care") {
    return optionLabel(CORD_STATUSES, data.status, "已护理");
  }
  if (record.type === "bath_touch") {
    return optionLabel(CARE_ACTIONS, data.action, "已洗护");
  }
  return "";
}

function calcSleepMinutes(record: BabyRecord): number {
  const data = safeJsonParse(record.data);
  if (record.type !== "sleep" || !data.start || !data.end) return 0;
  const start = new Date(data.start);
  const end = new Date(data.end);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 60000);
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0分";
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain}分`;
  return remain > 0 ? `${hours}时${remain}分` : `${hours}时`;
}

function calcStats(records: BabyRecord[]) {
  const diaperTypes = records
    .filter((record) => record.type === "diaper")
    .map((record) => safeJsonParse(record.data).diaper_type || "wet");

  return {
    breastCount: records.filter(r => r.type === "breast_milk").length,
    feedMl: records.filter(r => r.type === "formula").reduce((sum, r) => sum + (safeJsonParse(r.data).ml || 0), 0),
    formulaMl: records.filter(r => r.type === "formula").reduce((sum, r) => sum + (safeJsonParse(r.data).ml || 0), 0),
    sleepMinutes: records.reduce((sum, r) => sum + calcSleepMinutes(r), 0),
    medicineCount: records.filter(r => r.type === "medicine").length,
    urineCount: diaperTypes.filter((type) => type === "wet" || type === "both").length,
    stoolCount: diaperTypes.filter((type) => type === "dirty" || type === "both").length,
    latestTemp: records.find(r => r.type === "temperature"),
    latestJaundice: records.find(r => r.type === "jaundice"),
    careCount: records.filter(r => r.type === "cord_care" || r.type === "bath_touch").length,
  };
}

function getCareAlerts(records: BabyRecord[], preferences: CarePreferences): string[] {
  const alerts: string[] = [];
  const latestTemp = records.find((record) => record.type === "temperature");
  if (latestTemp) {
    const value = Number(safeJsonParse(latestTemp.data).value);
    if (Number.isFinite(value) && value >= 37.5) alerts.push(`最近体温 ${value}°C，建议继续观察`);
    if (Number.isFinite(value) && value < 36) alerts.push(`最近体温 ${value}°C，注意保暖并复测`);
  }

  const hasUrine = records.some((record) => {
    if (record.type !== "diaper") return false;
    const type = safeJsonParse(record.data).diaper_type || "wet";
    return type === "wet" || type === "both";
  });
  if (records.length > 0 && !hasUrine) alerts.push("今天还没有小便记录");

  if (preferences.cordCare) {
    const abnormalCord = records.find((record) => {
      if (record.type !== "cord_care") return false;
      return safeJsonParse(record.data).status && safeJsonParse(record.data).status !== "dry";
    });
    if (abnormalCord) alerts.push(`脐部状态：${formatDetail(abnormalCord)}`);
  }

  return alerts.slice(0, 3);
}

function formatDateDisplay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "明天";
  if (diffDays === -1) return "昨天";

  const month = target.getMonth() + 1;
  const day = target.getDate();
  const weekday = WEEKDAYS[target.getDay()];
  return `${month}月${day}日 (${weekday})`;
}

function isFuture(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

interface SwipeableItemProps {
  record: BabyRecord;
  onEdit: (record: BabyRecord) => void;
  onDelete: (id: number) => void;
}

function SwipeableItem({ record, onEdit, onDelete }: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startOffset.current = offset;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isDragging.current = true;
    }

    if (isDragging.current) {
      const newOffset = Math.min(0, Math.max(-120, startOffset.current + deltaX));
      setOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging.current) {
      setOffset(offset < -60 ? -120 : 0);
    }
    isDragging.current = false;
  };

  const closeActions = () => {
    setOffset(0);
  };

  const meta = getRecordMeta(record);

  return (
    <div className="relative overflow-hidden mb-2">
      <div
        className="absolute bottom-0 right-0 top-0 flex"
        aria-hidden={offset === 0}
        style={{ pointerEvents: offset === 0 ? "none" : "auto" }}
      >
        <button
          onClick={() => { onEdit(record); closeActions(); }}
          tabIndex={offset === 0 ? -1 : 0}
          className="w-[60px] bg-mint flex items-center justify-center text-white text-xs font-medium border-none cursor-pointer"
        >
          编辑
        </button>
        <button
          onClick={() => { onDelete(record.id); closeActions(); }}
          tabIndex={offset === 0 ? -1 : 0}
          className="w-[60px] bg-danger flex items-center justify-center text-white text-xs font-medium border-none cursor-pointer"
        >
          删除
        </button>
      </div>
      <div
        className="flex gap-2.5 relative bg-cream transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/80 shadow-[0_6px_16px_rgba(57,87,70,.08)]"
          style={{ backgroundColor: meta.surface, color: meta.tone }}
        >
          <RecordTypeIcon name={meta.iconName} className="h-5 w-5" />
        </div>
        <div className="flex-1 bg-white rounded-sm shadow-card py-[9px] px-[11px] cursor-pointer">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className="text-xs font-bold text-gray-900">{meta.label}</div>
              {record.member_nickname && (
                <span className="text-[10px] text-mint bg-mint-light px-1.5 py-0.5 rounded-pill">
                  {record.avatar_emoji} {record.member_nickname}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400">
              {formatTime(record.recorded_at)}
            </div>
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">
            {formatDetail(record)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecordPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const { preferences } = useCarePreferences(baby);
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; undoFn?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchRecords(baby.id, selectedDate)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby, selectedDate]);

  const stats = useMemo(() => calcStats(records), [records]);
  const alerts = useMemo(() => getCareAlerts(records, preferences), [records, preferences]);
  const visibleCareCount = useMemo(() => records.filter((record) =>
    (preferences.cordCare && record.type === "cord_care") || (preferences.bathTouch && record.type === "bath_touch")
  ).length, [preferences, records]);
  const latestTempValue = stats.latestTemp ? safeJsonParse(stats.latestTemp.data).value : null;
  const latestJaundiceValue = stats.latestJaundice ? safeJsonParse(stats.latestJaundice.data).value : null;

  const showToast = useCallback((message: string, undoFn?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undoFn });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const handleEdit = useCallback((record: BabyRecord) => {
    navigate(`/record/edit/${record.id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("确定要删除这条记录吗？删除后将无法撤销。")) return;

    try {
      await deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast("已删除");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "删除失败，请稍后重试");
    }
  }, [showToast]);

  const handlePrevDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
    if (!isFuture(selectedDate)) {
      setSelectedDate(prev => addDays(prev, 1));
    }
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
      <Hero>
        <div className="flex items-center relative z-10">
          <div className="header-title flex-1">记录</div>
        </div>
        <div className="relative z-10 mt-3 grid grid-cols-6 gap-2">
          <HeroStatCard className="col-span-2" value={loading ? "--" : `${stats.breastCount}`} label="母乳" suffix={loading ? undefined : "次"} />
          <HeroStatCard className="col-span-2" value={loading ? "--" : `${stats.formulaMl}`} label="配方奶" suffix={loading ? undefined : "ml"} />
          <HeroStatCard className="col-span-2" value={loading ? "--" : formatMinutes(stats.sleepMinutes)} label="睡眠" />
          <HeroStatCard className="col-span-2" value={loading ? "--" : `${stats.urineCount}`} label="小便" suffix={loading ? undefined : "次"} />
          <HeroStatCard className="col-span-2" value={loading ? "--" : `${stats.stoolCount}`} label="大便" suffix={loading ? undefined : "次"} />
          {preferences.temperatureShortcut ? (
            <HeroStatCard className="col-span-2" value={loading ? "--" : latestTempValue ? `${latestTempValue}` : "--"} label="体温" suffix={loading || !latestTempValue ? undefined : "°C"} />
          ) : null}
          {preferences.jaundice ? (
            <HeroStatCard className="col-span-2" value={loading ? "--" : latestJaundiceValue ? `${latestJaundiceValue}` : "--"} label="黄疸" />
          ) : null}
          {preferences.cordCare || preferences.bathTouch ? (
            <HeroStatCard className="col-span-2" value={loading ? "--" : `${visibleCareCount}`} label="护理" suffix={loading ? undefined : "次"} />
          ) : null}
          <HeroStatCard className="col-span-2" value={loading ? "--" : `${stats.medicineCount}`} label="用药" suffix={loading ? undefined : "次"} />
        </div>
      </Hero>

      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-border">
        <button
          onClick={handlePrevDay}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border-none cursor-pointer text-sm"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer px-2 py-1"
          >
            <span className="text-sm font-semibold text-gray-900">{formatDateDisplay(selectedDate)}</span>
            <span className="text-[10px] text-gray-400">{selectedDate}</span>
          </button>
          {selectedDate !== getLocalDateString() && (
            <button
              onClick={() => setSelectedDate(getLocalDateString())}
              className="text-[11px] text-mint bg-mint-light px-2 py-0.5 rounded-pill border-none cursor-pointer font-medium"
            >
              今天
            </button>
          )}
        </div>
        <button
          onClick={handleNextDay}
          disabled={isFuture(selectedDate)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border-none text-sm ${
            isFuture(selectedDate) ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-gray-600 cursor-pointer"
          }`}
        >
          ›
        </button>
      </div>

      <ScrollArea className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中…</div>
        ) : (
          <>
            {alerts.length > 0 ? (
              <div className="px-3.5 pt-3.5">
                <div className="rounded-[20px] border border-[#F3E0B5] bg-[#FFF8E8] px-4 py-3 text-sm leading-6 text-[#8A6220] shadow-card">
                  <div className="mb-1 font-bold text-[#7A4D15]">护理提醒</div>
                  {alerts.map((alert) => (
                    <div key={alert}>{alert}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {records.length > 0 ? (
              <div className="p-3.5">
                {records.map((item) => (
                  <SwipeableItem
                    key={item.id}
                    record={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-5xl mb-4 opacity-40">📝</div>
                <div className="text-sm font-medium text-gray-600 mb-1">暂无记录</div>
                <div className="text-xs text-gray-400">点击底部中间的 + 开始记录</div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
      <BottomNav />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-4 py-2.5 rounded-card shadow-lg flex items-center gap-3">
          <span className="text-sm">{toast.message}</span>
          {toast.undoFn && (
            <button
              onClick={() => { toast.undoFn?.(); setToast(null); }}
              className="text-sm font-medium text-mint bg-transparent border-none cursor-pointer"
            >
              撤销
            </button>
          )}
        </div>
      )}

      <DatePickerSheet
        visible={showDatePicker}
        value={selectedDate}
        maxDate={getLocalDateString()}
        onConfirm={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Layout>
  );
}
