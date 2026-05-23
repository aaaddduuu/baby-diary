import { useEffect, useMemo, useState } from "react";
import Picker from "react-mobile-picker";

interface DatePickerSheetProps {
  visible: boolean;
  value: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

interface PickerValue {
  [key: string]: string;
  year: string;
  month: string;
  day: string;
}

function generateRange(start: number, end: number, pad = false): string[] {
  const values: string[] = [];
  for (let i = start; i <= end; i += 1) {
    values.push(pad ? String(i).padStart(2, "0") : String(i));
  }
  return values;
}

function getInitialValue(value: string): PickerValue {
  const now = new Date();

  if (value) {
    const [year, month, day] = value.split("-");
    return {
      year,
      month: month.padStart(2, "0"),
      day: day.padStart(2, "0"),
    };
  }

  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
  };
}

export default function DatePickerSheet({ visible, value, onConfirm, onCancel }: DatePickerSheetProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => generateRange(currentYear - 10, currentYear), [currentYear]);
  const months = useMemo(() => generateRange(1, 12, true), []);

  const [pickerValue, setPickerValue] = useState<PickerValue>(() => getInitialValue(value));

  useEffect(() => {
    if (visible) {
      setPickerValue(getInitialValue(value));
    }
  }, [visible, value]);

  const daysInMonth = new Date(Number(pickerValue.year), Number(pickerValue.month), 0).getDate();
  const days = useMemo(() => generateRange(1, daysInMonth, true), [daysInMonth]);

  useEffect(() => {
    if (Number(pickerValue.day) > daysInMonth) {
      setPickerValue((prev) => ({
        ...prev,
        day: String(daysInMonth).padStart(2, "0"),
      }));
    }
  }, [daysInMonth, pickerValue.day]);

  const handleConfirm = () => {
    onConfirm(`${pickerValue.year}-${pickerValue.month}-${pickerValue.day}`);
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
        className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-transparent text-[15px] text-gray-400"
          >
            取消
          </button>
          <div className="text-[17px] font-semibold text-gray-900">选择日期</div>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-transparent text-[15px] font-semibold text-mint"
          >
            确定
          </button>
        </div>

        <div className="px-4 py-2">
          <Picker
            value={pickerValue}
            onChange={(next) => setPickerValue(next as unknown as PickerValue)}
            wheelMode="natural"
          >
            {Object.entries(pickerOptions).map(([name, options]) => (
              <Picker.Column key={name} name={name}>
                {options.map((option) => (
                  <Picker.Item key={option} value={option}>
                    {({ selected }) => (
                      <div
                        className={`py-1 text-center ${
                          selected ? "text-lg font-bold text-gray-900" : "text-base text-gray-400"
                        }`}
                      >
                        {name === "year" ? String(Number(option)) : String(Number(option))}
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
