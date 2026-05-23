import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, HeroStatCard, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import DatePickerSheet from "../components/DatePickerSheet";
import { fetchRecords } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import type { BabyRecord } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const TYPE_META: Record<string, { icon: string; label: string; bg: string }> = {
  breast_milk: { icon: "🥛", label: "母乳", bg: "bg-rose-light" },
  formula: { icon: "🍼", label: "配方奶", bg: "bg-sky-light" },
  sleep: { icon: "😴", label: "睡眠", bg: "bg-indigo-light" },
  diaper: { icon: "🧷", label: "尿布", bg: "bg-amber-light" },
  growth: { icon: "📏", label: "成长", bg: "bg-green-light" },
};

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDetail(record: BabyRecord): string {
  const data = JSON.parse(record.data);
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
    const types: Record<string, string> = { wet: "小便", dirty: "大便", both: "都有" };
    const colors: Record<string, string> = { yellow: "黄色", green: "绿色", brown: "棕色", other: "其他" };
    return `${types[data.diaper_type] || data.diaper_type} · ${colors[data.color] || data.color}`;
  }
  return "";
}

function calcStats(records: BabyRecord[]) {
  return {
    breastCount: records.filter(r => r.type === "breast_milk").length,
    formulaMl: records.filter(r => r.type === "formula").reduce((sum, r) => sum + (JSON.parse(r.data).ml || 0), 0),
    sleepCount: records.filter(r => r.type === "sleep").length,
    diaperCount: records.filter(r => r.type === "diaper").length,
  };
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
  const [showActions, setShowActions] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartTime = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
    touchStartTime.current = Date.now();

    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        setShowActions(true);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isDragging.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    if (isDragging.current) {
      const newOffset = Math.min(0, Math.max(-120, deltaX));
      setOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging.current) {
      if (offset < -60) {
        setOffset(-120);
        setShowActions(true);
      } else {
        setOffset(0);
        setShowActions(false);
      }
    }
  };

  const closeActions = () => {
    setOffset(0);
    setShowActions(false);
  };

  const meta = TYPE_META[record.type] || TYPE_META.growth;

  return (
    <div className="relative overflow-hidden mb-2">
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          onClick={() => { onEdit(record); closeActions(); }}
          className="w-[60px] bg-mint flex items-center justify-center text-white text-xs font-medium border-none cursor-pointer"
        >
          编辑
        </button>
        <button
          onClick={() => { onDelete(record.id); closeActions(); }}
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
      >
        <div className={`w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center text-sm flex-shrink-0 z-10`}>
          {meta.icon}
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
      {showActions && offset === 0 && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-end gap-2 pr-2 rounded-sm" onClick={closeActions}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(record); closeActions(); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-mint rounded-pill border-none cursor-pointer"
          >
            编辑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(record.id); closeActions(); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-danger rounded-pill border-none cursor-pointer"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecordPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    const deletedRecord = records.find(r => r.id === id);
    if (!deletedRecord) return;

    setRecords(prev => prev.filter(r => r.id !== id));

    try {
      await fetch(`${API_BASE}/records/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    } catch {}

    showToast("已删除", () => {
      setRecords(prev => [...prev, deletedRecord].sort((a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      ));
    });
  }, [records, showToast]);

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
        <div className="grid grid-cols-2 gap-2 mt-3 relative z-10">
          <HeroStatCard value={`${stats.breastCount}`} label="母乳" suffix="次" />
          <HeroStatCard value={`${stats.sleepCount}`} label="睡眠" suffix="次" />
          <HeroStatCard value={`${stats.formulaMl}`} label="配方奶" suffix="ml" />
          <HeroStatCard value={`${stats.diaperCount}`} label="尿布" suffix="次" />
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
          {selectedDate !== new Date().toISOString().slice(0, 10) && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
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
        onConfirm={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Layout>
  );
}

