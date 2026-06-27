import { useEffect, useMemo, useState } from "react";
import Picker from "react-mobile-picker";
import useAppScrollLock from "../hooks/useAppScrollLock";

interface DatePickerSheetProps {
  visible: boolean;
  value: string;
  minDate?: string;
  maxDate?: string;
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

function getInitialValue(value: string, minDate?: string, maxDate?: string): PickerValue {
  const now = new Date();
  let initialDate = value || minDate || maxDate;
  if (minDate && initialDate && initialDate < minDate) initialDate = minDate;
  if (maxDate && initialDate && initialDate > maxDate) initialDate = maxDate;

  if (initialDate) {
    const [year, month, day] = initialDate.split("-");
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

export default function DatePickerSheet({ visible, value, minDate, maxDate, onConfirm, onCancel }: DatePickerSheetProps) {
  useAppScrollLock(visible);

  const currentYear = new Date().getFullYear();
  const selectedYear = Number(value.slice(0, 4)) || currentYear;
  const minYear = minDate ? Number(minDate.slice(0, 4)) : Math.min(currentYear - 10, selectedYear);
  const maxYear = maxDate ? Number(maxDate.slice(0, 4)) : Math.max(currentYear + 5, selectedYear);
  const years = useMemo(
    () => generateRange(minYear, Math.max(minYear, maxYear)),
    [maxYear, minYear],
  );
  const months = useMemo(() => generateRange(1, 12, true), []);

  const [pickerValue, setPickerValue] = useState<PickerValue>(() => getInitialValue(value, minDate, maxDate));

  useEffect(() => {
    if (visible) {
      setPickerValue(getInitialValue(value, minDate, maxDate));
    }
  }, [visible, value, minDate, maxDate]);

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

  const selectedDate = `${pickerValue.year}-${pickerValue.month}-${pickerValue.day}`;
  const precedesMinDate = Boolean(minDate && selectedDate < minDate);
  const exceedsMaxDate = Boolean(maxDate && selectedDate > maxDate);
  const dateOutOfRange = precedesMinDate || exceedsMaxDate;

  const handleConfirm = () => {
    if (dateOutOfRange) return;
    onConfirm(selectedDate);
  };

  if (!visible) return null;

  const pickerOptions = {
    year: years,
    month: months,
    day: days,
  };

  return (
    <div className="picker-sheet-overlay fixed inset-0 z-[220]" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="picker-sheet-panel absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white"
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
            disabled={dateOutOfRange}
            className="bg-transparent text-[15px] font-semibold text-mint disabled:text-gray-300"
          >
            确定
          </button>
        </div>

        <div className="picker-sheet-wheel px-4 py-2">
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

        {dateOutOfRange ? (
          <div className="px-5 pb-3 text-center text-xs font-medium text-danger">
            {precedesMinDate ? "不能选择早于允许范围的日期" : "不能选择晚于允许范围的日期"}
          </div>
        ) : null}

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
