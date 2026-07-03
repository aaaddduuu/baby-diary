import { useState } from "react";
import DatePickerSheet from "./DatePickerSheet";
import TimePickerSheet from "./TimePickerSheet";
import { SectionCard } from "./Layout";
import type { RecordDateTimeValue } from "../pages/recordFormShared";
import { getLocalDateString, getRelativeLocalDateString } from "../pages/recordFormShared";

interface RecordTimeFieldProps {
  value: RecordDateTimeValue;
  onChange: (value: RecordDateTimeValue) => void;
  invalid?: boolean;
}

function formatDate(value: string): string {
  if (value === getLocalDateString()) return "今天";
  if (value === getRelativeLocalDateString(-1)) return "昨天";
  if (value === getRelativeLocalDateString(-2)) return "前天";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatTime(value: RecordDateTimeValue): string {
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

export default function RecordTimeField({ value, onChange, invalid = false }: RecordTimeFieldProps) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const quickDates = [
    { label: "今天", value: getLocalDateString() },
    { label: "昨天", value: getRelativeLocalDateString(-1) },
    { label: "前天", value: getRelativeLocalDateString(-2) },
  ];

  return (
    <>
      <SectionCard className="p-4">
        <div className="mb-3">
          <div className="panel-title text-[17px]">记录时间</div>
          <div className="panel-note mt-1">默认当前时间，补记时可以选前几天</div>
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickDates.map((date) => (
            <button
              key={date.value}
              type="button"
              onClick={() => onChange({ ...value, date: date.value })}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                value.date === date.value
                  ? "border-[#5BC4A0] bg-[#5BC4A0] text-white"
                  : "border-[#CBE8DA] bg-white text-[#1A5C3A]"
              }`}
            >
              {date.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPicker("date")}
            className="rounded-[18px] border border-[#DCE5DD] bg-[#F9FBF8] px-4 py-3 text-left"
          >
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#7A8B80]">日期</div>
            <div className="mt-1.5 truncate text-sm font-bold text-[#21382E]">{formatDate(value.date)}</div>
          </button>
          <button
            type="button"
            onClick={() => setPicker("time")}
            className="rounded-[18px] border border-[#DCE5DD] bg-[#F9FBF8] px-4 py-3 text-left"
          >
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#7A8B80]">时间</div>
            <div className="font-tabular mt-1.5 text-sm font-bold text-[#21382E]">{formatTime(value)}</div>
          </button>
        </div>
        {invalid ? (
          <div className="mt-3 rounded-[16px] border border-[#F3C6C6] bg-[#FFF4F4] px-3 py-2 text-xs font-medium text-danger">
            记录时间不能晚于当前时间
          </div>
        ) : null}
      </SectionCard>

      <DatePickerSheet
        visible={picker === "date"}
        value={value.date}
        maxDate={getLocalDateString()}
        onConfirm={(date) => {
          onChange({ ...value, date });
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
      <TimePickerSheet
        visible={picker === "time"}
        value={formatTime(value)}
        onConfirm={(time) => {
          const [hour, minute] = time.split(":").map(Number);
          onChange({ ...value, hour, minute });
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
    </>
  );
}
