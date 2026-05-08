import { useState, useEffect } from "react";
import Picker from "react-mobile-picker";

interface DatePickerSheetProps {
  visible: boolean;
  value: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

function generateRange(start: number, end: number): string[] {
  const arr: string[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(String(i));
  }
  return arr;
}

export default function DatePickerSheet({ visible, value, onConfirm, onCancel }: DatePickerSheetProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const years = generateRange(currentYear - 10, currentYear);
  const months = generateRange(1, 12);

  const [pickerValue, setPickerValue] = useState(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      return { year: y, month: m, day: d };
    }
    return {
      year: String(currentYear),
      month: String(currentMonth),
      day: String(currentDay),
    };
  });

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      setPickerValue({ year: y, month: m, day: d });
    }
  }, [value]);

  const daysInMonth = new Date(
    Number(pickerValue.year),
    Number(pickerValue.month),
    0
  ).getDate();
  const days = generateRange(1, daysInMonth);

  useEffect(() => {
    if (Number(pickerValue.day) > daysInMonth) {
      setPickerValue((prev) => ({ ...prev, day: String(daysInMonth) }));
    }
  }, [pickerValue.year, pickerValue.month, daysInMonth]);

  const handleConfirm = () => {
    const dateStr = `${pickerValue.year}-${pickerValue.month.padStart(2, "0")}-${pickerValue.day.padStart(2, "0")}`;
    onConfirm(dateStr);
  };

  if (!visible) return null;

  const pickerOptions = {
    year: years,
    month: months,
    day: days,
  };

  return (
    <div className="fixed inset-0 z-[100]" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={onCancel}
            className="text-[15px] text-gray-400 bg-transparent border-none cursor-pointer font-sans"
          >
            取消
          </button>
          <div className="text-[17px] font-semibold text-gray-900">选择日期</div>
          <button
            onClick={handleConfirm}
            className="text-[15px] text-mint font-semibold bg-transparent border-none cursor-pointer font-sans"
          >
            确定
          </button>
        </div>

        <div className="px-4 py-2">
          <Picker
            value={pickerValue}
            onChange={setPickerValue}
            wheelMode="natural"
          >
            {Object.keys(pickerOptions).map((name) => (
              <Picker.Column key={name} name={name}>
                {pickerOptions[name as keyof typeof pickerOptions].map((option) => (
                  <Picker.Item key={option} value={option}>
                    {({ selected }) => (
                      <div
                        className={`text-center py-1 ${
                          selected
                            ? "font-bold text-gray-900 text-lg"
                            : "text-gray-400 text-base"
                        }`}
                      >
                        {option}
                        {name === "year" ? "年" : name === "month" ? "月" : "日"}
                      </div>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            ))}
          </Picker>
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
