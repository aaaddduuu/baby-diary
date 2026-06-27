export type RecordDateTimeValue = {
  date: string;
  hour: number;
  minute: number;
};

export const ADD_RECORD_TYPES = [
  { type: "breast_milk", iconName: "breast_milk", label: "母乳", tone: "#C95F7B", surface: "#FFF1F5" },
  { type: "formula", iconName: "formula", label: "配方奶", tone: "#4D92D8", surface: "#EDF7FF" },
  { type: "sleep", iconName: "sleep", label: "睡眠", tone: "#7C6AD8", surface: "#F2EFFF" },
  { type: "diaper_wet", iconName: "diaper_wet", label: "小便", tone: "#349FD5", surface: "#EAF8FF" },
  { type: "diaper_dirty", iconName: "diaper_dirty", label: "大便", tone: "#A66B3D", surface: "#FFF4E8" },
  { type: "medicine", iconName: "medicine", label: "吃药", tone: "#D06A7A", surface: "#FFF0F2" },
  { type: "temperature", iconName: "temperature", label: "体温", tone: "#D66B4D", surface: "#FFF1EA" },
  { type: "jaundice", iconName: "jaundice", label: "黄疸", tone: "#C88A17", surface: "#FFF8D8" },
  { type: "cord_care", iconName: "cord_care", label: "脐护", tone: "#2F9B73", surface: "#EAF8F2" },
  { type: "bath_touch", iconName: "bath_touch", label: "洗护", tone: "#3C8ACD", surface: "#EAF5FF" },
] as const;

export const RECORD_TYPES = [
  ...ADD_RECORD_TYPES,
  { type: "diaper_both", iconName: "diaper_both", label: "都有", tone: "#C58A28", surface: "#FFF7DF" },
] as const;

export const FEEDING_SIDES = [
  { value: "left", label: "左侧", icon: "←" },
  { value: "right", label: "右侧", icon: "→" },
  { value: "both", label: "双侧", icon: "↔" },
] as const;

export const DIAPER_TYPES = [
  { value: "wet", label: "小便", iconName: "diaper_wet", tone: "#349FD5", surface: "#EAF8FF" },
  { value: "dirty", label: "大便", iconName: "diaper_dirty", tone: "#A66B3D", surface: "#FFF4E8" },
  { value: "both", label: "都有", iconName: "diaper_both", tone: "#C58A28", surface: "#FFF7DF" },
] as const;

export type DiaperType = (typeof DIAPER_TYPES)[number]["value"];

export function getDiaperTypeFromRecordType(type: string): DiaperType | null {
  if (type === "diaper_dirty") return "dirty";
  if (type === "diaper_both") return "both";
  if (type === "diaper_wet" || type === "diaper") return "wet";
  return null;
}

export function getApiRecordType(type: string): string {
  return getDiaperTypeFromRecordType(type) ? "diaper" : type;
}

export function getRecordEntryType(apiType: string, diaperType?: unknown): string {
  if (apiType !== "diaper") return apiType;
  if (diaperType === "dirty") return "diaper_dirty";
  if (diaperType === "both") return "diaper_both";
  return "diaper_wet";
}

export const DIAPER_COLORS = [
  { value: "yellow", label: "黄色", dot: "#E8A030", badge: "正常" },
  { value: "green", label: "绿色", dot: "#5AA870", badge: "留意" },
  { value: "brown", label: "棕色", dot: "#8B6914", badge: "正常" },
  { value: "other", label: "其他", dot: "#B7B0A5", badge: undefined },
] as const;

export const DIAPER_AMOUNTS = [
  { value: "small", label: "少量" },
  { value: "medium", label: "中等" },
  { value: "large", label: "较多" },
] as const;

export const STOOL_TEXTURES = [
  { value: "pasty", label: "糊状" },
  { value: "loose", label: "稀便" },
  { value: "grainy", label: "颗粒" },
  { value: "foamy", label: "泡沫" },
  { value: "mucus", label: "黏液" },
  { value: "other", label: "其他" },
] as const;

export const TEMPERATURE_SITES = [
  { value: "armpit", label: "腋温" },
  { value: "forehead", label: "额温" },
  { value: "ear", label: "耳温" },
] as const;

export const JAUNDICE_SITES = [
  { value: "forehead", label: "额头" },
  { value: "chest", label: "胸口" },
  { value: "abdomen", label: "腹部" },
] as const;

export const CORD_STATUSES = [
  { value: "dry", label: "干燥" },
  { value: "red", label: "发红" },
  { value: "bleeding", label: "渗血" },
  { value: "odor", label: "异味" },
] as const;

export const CARE_ACTIONS = [
  { value: "bath", label: "洗澡" },
  { value: "touch", label: "抚触" },
  { value: "bath_touch", label: "洗澡+抚触" },
] as const;

export const FORMULA_PRESETS = [30, 40, 50, 60, 90, 120, 150, 180, 210];

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRelativeLocalDateString(offsetDays: number, baseDate = new Date()): string {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offsetDays);
  return getLocalDateString(next);
}

export function getElapsedCalendarDays(dateValue: string, today = new Date()): number {
  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return 0;

  const startDay = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((currentDay - startDay) / (24 * 60 * 60 * 1000)));
}

export function getDefaultTime(): RecordDateTimeValue {
  const now = new Date();
  let roundedMinute = Math.ceil(now.getMinutes() / 5) * 5;
  let hour = now.getHours();

  if (roundedMinute >= 60) {
    roundedMinute = 0;
    hour = (hour + 1) % 24;
  }

  return {
    date: getLocalDateString(now),
    hour,
    minute: roundedMinute,
  };
}

export function getCurrentRecordTime(date = new Date()): RecordDateTimeValue {
  return {
    date: getLocalDateString(date),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function parseRecordedAt(value: string): RecordDateTimeValue {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getCurrentRecordTime();
  return getCurrentRecordTime(date);
}

export function toRecordedAtISOString(value: RecordDateTimeValue): string {
  return new Date(toLocalDateTimeString(value)).toISOString();
}

export function isRecordTimeInFuture(value: RecordDateTimeValue, now = new Date()): boolean {
  return new Date(toLocalDateTimeString(value)).getTime() > now.getTime();
}

export function formatDateTimeDisplay(dt: RecordDateTimeValue): string {
  const today = getLocalDateString();
  const yesterday = getRelativeLocalDateString(-1);

  let dateLabel = "";
  if (dt.date === today) {
    dateLabel = "今天";
  } else if (dt.date === yesterday) {
    dateLabel = "昨天";
  } else {
    const [, month, day] = dt.date.split("-");
    dateLabel = `${Number(month)}月${Number(day)}日`;
  }

  const timeLabel = `${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`;
  return `${dateLabel}  ${timeLabel}`;
}

export function toLocalDateTimeString(value: RecordDateTimeValue): string {
  return `${value.date}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}:00`;
}

export function parseDateTime(isoLikeValue: string): RecordDateTimeValue {
  const [datePart = "", timePart = "00:00"] = isoLikeValue.split("T");
  const [hourPart = "0", minutePart = "0"] = timePart.split(":");

  return {
    date: datePart || getLocalDateString(),
    hour: Number(hourPart),
    minute: Number(minutePart),
  };
}

export function compareDateTimes(a: RecordDateTimeValue, b: RecordDateTimeValue): number {
  return toLocalDateTimeString(a).localeCompare(toLocalDateTimeString(b));
}

export function isEndBeforeStart(start: RecordDateTimeValue, end: RecordDateTimeValue): boolean {
  return compareDateTimes(end, start) < 0;
}

export function calcDuration(start: RecordDateTimeValue, end: RecordDateTimeValue): string | null {
  const startDate = new Date(toLocalDateTimeString(start));
  const endDate = new Date(toLocalDateTimeString(end));
  const diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `共${hours}小时${minutes}分钟`;
  }

  return `共${minutes}分钟`;
}
