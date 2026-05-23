export type RecordDateTimeValue = {
  date: string;
  hour: number;
  minute: number;
};

export const RECORD_TYPES = [
  { type: "breast_milk", icon: "🥛", label: "母乳" },
  { type: "formula", icon: "🥛", label: "配方奶" },
  { type: "sleep", icon: "😴", label: "睡眠" },
  { type: "diaper", icon: "🧷", label: "尿布" },
] as const;

export const FEEDING_SIDES = [
  { value: "left", label: "左侧", icon: "←" },
  { value: "right", label: "右侧", icon: "→" },
  { value: "both", label: "双侧", icon: "↔" },
] as const;

export const DIAPER_TYPES = [
  { value: "wet", label: "小便", icon: "💧" },
  { value: "dirty", label: "大便", icon: "🟤" },
  { value: "both", label: "都有", icon: "✨" },
] as const;

export const DIAPER_COLORS = [
  { value: "yellow", label: "黄色", dot: "#E8A030", badge: "正常" },
  { value: "green", label: "绿色", dot: "#5AA870", badge: "留意" },
  { value: "brown", label: "棕色", dot: "#8B6914", badge: "正常" },
  { value: "other", label: "其他", dot: "#B7B0A5", badge: undefined },
] as const;

export const FORMULA_PRESETS = [60, 90, 120, 150, 180, 210];

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
