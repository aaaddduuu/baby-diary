import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import Layout, { Fab, Hero, ScrollArea } from "../components/Layout";
import RecordTypeIcon from "../components/RecordTypeIcon";
import type { RecordIconName } from "../components/RecordTypeIcon";
import { fetchRecords } from "../lib/api";
import type { BabyRecord } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import {
  addDays,
  calcCareStats,
  formatMinutes,
  getCareHeatmap,
  getCareTrend,
  getRangeDateKeys,
  getRecordsForDate,
  toLocalDateKey,
  type CareRangeMode,
} from "../lib/careInsights";

const MODES: Array<{ key: CareRangeMode; label: string }> = [
  { key: "day", label: "日" },
  { key: "week", label: "周" },
  { key: "month", label: "月" },
];

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 flex-1 rounded-full text-sm font-black transition-all ${
        active
          ? "bg-[#CFEBDD] text-[#1A5C3A] shadow-[0_10px_24px_rgba(26,92,58,.12)]"
          : "bg-transparent text-[#21382E]"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, note }: { icon: RecordIconName; label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-white bg-white/92 p-3 shadow-soft">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[15px] bg-[#F0FAF6] text-[#2F9B73]">
        <RecordTypeIcon name={icon} className="h-5 w-5" />
      </div>
      <div className="font-tabular text-[22px] font-black leading-none text-[#1A5C3A]">{value}</div>
      <div className="mt-1 text-xs font-bold text-gray-700">{label}</div>
      <div className="mt-1 text-[10px] font-semibold text-gray-400">{note}</div>
    </div>
  );
}

function TrendBars({ points, mode }: { points: ReturnType<typeof getCareTrend>; mode: CareRangeMode }) {
  const maxFeed = Math.max(...points.map((point) => point.feedMl), 1);
  const visiblePoints = mode === "month" ? points : points.slice(-7);

  return (
    <div className="overflow-x-auto rounded-[24px] bg-white p-4 shadow-soft">
      <div className="flex min-w-[320px] items-end gap-3">
        {visiblePoints.map((point) => {
          const height = Math.max(10, Math.round((point.feedMl / maxFeed) * 132));
          return (
            <div key={point.key} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-36 items-end">
                <div
                  className="w-4 rounded-full bg-[#2F8F72]"
                  style={{ height }}
                  aria-label={`${point.label} 奶量 ${point.feedMl}ml`}
                />
              </div>
              <div className="font-tabular text-[10px] font-bold text-gray-400">{point.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heatmap({ rows }: { rows: ReturnType<typeof getCareHeatmap> }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-soft">
      <div className="space-y-3">
        {rows.map((row) => {
          const max = Math.max(...row.hours, 1);
          return (
            <div key={row.key} className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3">
              <div className="text-xs font-black text-[#526258]">{row.label}</div>
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {row.hours.map((count, hour) => (
                  <div
                    key={hour}
                    className="h-6 rounded-full bg-[#F1F0E8]"
                    style={{ backgroundColor: count > 0 ? row.tone : "#F1F0E8", opacity: count > 0 ? 0.35 + (count / max) * 0.65 : 1 }}
                    aria-label={`${hour}点 ${row.label}${count}次`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-5 pl-[54px] font-tabular text-[10px] font-bold text-gray-400">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span className="text-right">24</span>
      </div>
    </div>
  );
}

function formatRangeTitle(mode: CareRangeMode, anchorDateKey: string) {
  const date = new Date(`${anchorDateKey}T00:00:00`);
  if (mode === "day") return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  if (mode === "week") {
    const keys = getRangeDateKeys(mode, anchorDateKey);
    const start = new Date(`${keys[0]}T00:00:00`);
    const end = new Date(`${keys[keys.length - 1]}T00:00:00`);
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export default function CareStatsPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CareRangeMode>("day");
  const [anchorDate, setAnchorDate] = useState(toLocalDateKey());

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchRecords(baby.id)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const rangeKeys = useMemo(() => getRangeDateKeys(mode, anchorDate), [anchorDate, mode]);
  const rangeRecords = useMemo(
    () => records.filter((record) => rangeKeys.includes(toLocalDateKey(new Date(record.recorded_at)))),
    [rangeKeys, records],
  );
  const stats = useMemo(() => calcCareStats(rangeRecords), [rangeRecords]);
  const selectedDayRecords = useMemo(() => getRecordsForDate(records, anchorDate), [anchorDate, records]);
  const dayStats = useMemo(() => calcCareStats(selectedDayRecords), [selectedDayRecords]);
  const trend = useMemo(() => getCareTrend(records, mode, anchorDate), [anchorDate, mode, records]);
  const heatmap = useMemo(() => getCareHeatmap(records, anchorDate), [anchorDate, records]);
  const rangeTitle = formatRangeTitle(mode, anchorDate);

  const moveRange = (direction: -1 | 1) => {
    if (mode === "day") {
      setAnchorDate((current) => addDays(current, direction));
      return;
    }

    const date = new Date(`${anchorDate}T00:00:00`);
    if (mode === "week") date.setDate(date.getDate() + 7 * direction);
    else date.setMonth(date.getMonth() + direction);
    setAnchorDate(toLocalDateKey(date));
  };

  if (!baby) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center text-sm text-gray-400">请先添加宝宝</div>
      </Layout>
    );
  }

  return (
    <Layout className="secondary-page">
      <Hero className="pb-7 pt-8">
        <div className="relative z-10">
          <div className="header-title">照护统计</div>
          <div className="header-subtitle mt-2 text-sm">按日、周、月查看喂奶、睡眠和尿布节奏。</div>
          <div className="mt-5 rounded-full border border-white/70 bg-white/72 p-1">
            <div className="flex gap-1">
              {MODES.map((item) => (
                <ModeButton key={item.key} active={mode === item.key} label={item.label} onClick={() => setMode(item.key)} />
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveRange(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white">
              ‹
            </button>
            <div className="text-center">
              <div className="text-sm font-black text-white">{rangeTitle}</div>
              <div className="mt-1 text-xs font-semibold text-white/75">{loading ? "加载中" : `${rangeRecords.length} 条记录`}</div>
            </div>
            <button type="button" onClick={() => moveRange(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white">
              ›
            </button>
          </div>
        </div>
      </Hero>

      <ScrollArea className="pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">加载中…</div>
        ) : (
          <div className="space-y-5 px-4 pb-6 pt-4">
            <section>
              <div className="mb-3 text-lg font-black text-[#21382E]">照护概览</div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon="breast_milk_bottle" label="奶量" value={`${stats.feedMl} ml`} note={`${stats.feedCount} 次喂奶`} />
                <StatCard icon="sleep" label="睡眠" value={formatMinutes(stats.sleepMinutes)} note={mode === "day" ? "当天累计" : "范围累计"} />
                <StatCard icon="diaper_wet" label="尿布" value={`${stats.diaperWet + stats.diaperDirty} 次`} note={`尿 ${stats.diaperWet} · 便 ${stats.diaperDirty}`} />
                <StatCard icon="breast_milk" label="亲喂" value={`${stats.breastCount} 次`} note="不计入毫升奶量" />
              </div>
            </section>

            <section>
              <div className="mb-3">
                <div className="text-lg font-black text-[#21382E]">奶量趋势</div>
                <div className="mt-1 text-xs font-semibold text-[#7A8B80]">按天查看瓶喂母乳和配方奶总量。</div>
              </div>
              <TrendBars points={trend} mode={mode} />
            </section>

            <section>
              <div className="mb-3">
                <div className="text-lg font-black text-[#21382E]">24 小时照护热力图</div>
                <div className="mt-1 text-xs font-semibold text-[#7A8B80]">
                  当前选中日：喂奶 {dayStats.feedCount} 次，尿布 {dayStats.diaperWet + dayStats.diaperDirty} 次，睡眠 {formatMinutes(dayStats.sleepMinutes)}。
                </div>
              </div>
              <Heatmap rows={heatmap} />
            </section>
          </div>
        )}
      </ScrollArea>

      <Fab onClick={() => navigate("/record/add")} />
      <BottomNav />
    </Layout>
  );
}
