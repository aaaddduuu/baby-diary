import type { BabyRecord } from "./api";

export type CareRangeMode = "day" | "week" | "month";

export interface CareStats {
  feedCount: number;
  feedMl: number;
  breastCount: number;
  diaperWet: number;
  diaperDirty: number;
  sleepMinutes: number;
}

export interface CareHeatmapRow {
  key: "feed" | "diaper" | "sleep";
  label: string;
  tone: string;
  hours: number[];
}

export interface CareTrendPoint {
  key: string;
  label: string;
  feedMl: number;
  sleepMinutes: number;
  diaperCount: number;
}

const EMPTY_STATS: CareStats = {
  feedCount: 0,
  feedMl: 0,
  breastCount: 0,
  diaperWet: 0,
  diaperDirty: 0,
  sleepMinutes: 0,
};

function safeJsonParse(value: string): Record<string, any> {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toLocalDateKey(date);
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0分";
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain}分`;
  return remain > 0 ? `${hours}小时${remain}分` : `${hours}小时`;
}

export function formatDelta(value: number, unit = ""): string {
  if (value === 0) return "较昨日持平";
  const sign = value > 0 ? "+" : "-";
  return `较昨日 ${sign}${Math.abs(value)}${unit}`;
}

export function isFeedRecord(record: BabyRecord): boolean {
  return record.type === "breast_milk" || record.type === "breast_milk_bottle" || record.type === "formula";
}

function isDiaperRecord(record: BabyRecord): boolean {
  return record.type === "diaper";
}

function getRecordDate(record: BabyRecord): Date {
  return new Date(record.recorded_at);
}

function getRecordDateKey(record: BabyRecord): string {
  return toLocalDateKey(getRecordDate(record));
}

function calcSleepMinutes(record: BabyRecord, now = new Date()): number {
  if (record.type !== "sleep") return 0;
  const data = safeJsonParse(record.data);
  const start = data.start ? new Date(data.start) : getRecordDate(record);
  const end = data.end ? new Date(data.end) : data.sleeping ? now : null;
  if (!end) return 0;
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 60000);
}

export function getRecordsForDate(records: BabyRecord[], dateKey: string): BabyRecord[] {
  return records.filter((record) => getRecordDateKey(record) === dateKey);
}

export function calcCareStats(records: BabyRecord[], now = new Date()): CareStats {
  return records.reduce<CareStats>((stats, record) => {
    const data = safeJsonParse(record.data);

    if (record.type === "breast_milk") {
      stats.feedCount += 1;
      stats.breastCount += 1;
    } else if (record.type === "breast_milk_bottle" || record.type === "formula") {
      stats.feedCount += 1;
      stats.feedMl += Number(data.ml) || 0;
    } else if (record.type === "diaper") {
      const diaperType = data.diaper_type || "wet";
      if (diaperType === "wet" || diaperType === "both") stats.diaperWet += 1;
      if (diaperType === "dirty" || diaperType === "both") stats.diaperDirty += 1;
    } else if (record.type === "sleep") {
      stats.sleepMinutes += calcSleepMinutes(record, now);
    }

    return stats;
  }, { ...EMPTY_STATS });
}

export function getRangeDateKeys(mode: CareRangeMode, anchorDateKey: string): string[] {
  if (mode === "day") {
    return [anchorDateKey];
  }

  if (mode === "week") {
    const anchor = new Date(`${anchorDateKey}T00:00:00`);
    const day = anchor.getDay();
    const start = toLocalDateKey(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day));
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }

  const anchor = new Date(`${anchorDateKey}T00:00:00`);
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => toLocalDateKey(new Date(anchor.getFullYear(), anchor.getMonth(), index + 1)));
}

export function getCareTrend(records: BabyRecord[], mode: CareRangeMode, anchorDateKey: string): CareTrendPoint[] {
  const trendKeys = mode === "day"
    ? Array.from({ length: 7 }, (_, index) => addDays(anchorDateKey, index - 6))
    : getRangeDateKeys(mode, anchorDateKey);

  return trendKeys.map((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    const stats = calcCareStats(getRecordsForDate(records, dateKey));
    return {
      key: dateKey,
      label: mode === "month" ? String(date.getDate()) : `${date.getMonth() + 1}/${date.getDate()}`,
      feedMl: stats.feedMl,
      sleepMinutes: stats.sleepMinutes,
      diaperCount: stats.diaperWet + stats.diaperDirty,
    };
  });
}

export function getCareHeatmap(records: BabyRecord[], dateKey: string, now = new Date()): CareHeatmapRow[] {
  const rows: CareHeatmapRow[] = [
    { key: "feed", label: "喂奶", tone: "#2F9B73", hours: Array(24).fill(0) },
    { key: "diaper", label: "尿布", tone: "#D59A2B", hours: Array(24).fill(0) },
    { key: "sleep", label: "睡眠", tone: "#7C6AD8", hours: Array(24).fill(0) },
  ];

  for (const record of getRecordsForDate(records, dateKey)) {
    const hour = getRecordDate(record).getHours();
    if (isFeedRecord(record)) rows[0].hours[hour] += 1;
    if (isDiaperRecord(record)) rows[1].hours[hour] += 1;

    if (record.type === "sleep") {
      const data = safeJsonParse(record.data);
      const start = data.start ? new Date(data.start) : getRecordDate(record);
      const end = data.end ? new Date(data.end) : data.sleeping ? now : start;
      const startHour = start.getHours();
      const endHour = Math.max(startHour, end.getHours());
      for (let h = startHour; h <= Math.min(23, endHour); h += 1) rows[2].hours[h] += 1;
    }
  }

  return rows;
}
