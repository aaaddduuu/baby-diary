import { useEffect, useState } from "react";
import Picker from "react-mobile-picker";
import useAppScrollLock from "../hooks/useAppScrollLock";

interface TimePickerSheetProps {
  visible: boolean;
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

function generateRange(start: number, end: number): string[] {
  const arr: string[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(String(i).padStart(2, "0"));
  }
  return arr;
}

export default function TimePickerSheet({ visible, value, onConfirm, onCancel }: TimePickerSheetProps) {
  useAppScrollLock(visible);

  const [pickerValue, setPickerValue] = useState(() => {
    const [hour = "09", minute = "00"] = value ? value.split(":") : [];
    return { hour, minute };
  });

  const hours = generateRange(0, 23);
  const minutes = generateRange(0, 59);

  useEffect(() => {
    if (!visible || !value) return;
    const [nextHour = "09", nextMinute = "00"] = value.split(":");
    setPickerValue({ hour: nextHour, minute: nextMinute });
  }, [value, visible]);

  const handleConfirm = () => {
    onConfirm(`${pickerValue.hour}:${pickerValue.minute}`);
  };

  if (!visible) return null;

  return (
    <div className="picker-sheet-overlay fixed inset-0 z-[100]" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="picker-sheet-panel absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={onCancel}
            className="text-[15px] text-gray-400 bg-transparent border-none cursor-pointer font-sans"
          >
            取消
          </button>
          <div className="text-[17px] font-semibold text-gray-900">选择时间</div>
          <button
            onClick={handleConfirm}
            className="text-[15px] text-mint font-semibold bg-transparent border-none cursor-pointer font-sans"
          >
            确定
          </button>
        </div>

        <div className="picker-sheet-wheel px-4 py-2">
          <Picker
            value={pickerValue}
            onChange={(next) => setPickerValue(next as { hour: string; minute: string })}
            wheelMode="natural"
          >
            <Picker.Column name="hour">
              {hours.map((hour) => (
                <Picker.Item key={hour} value={hour}>
                  {({ selected }) => (
                    <div className={`py-1 text-center ${selected ? "text-lg font-bold text-gray-900" : "text-base text-gray-400"}`}>
                      {hour} 时
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="minute">
              {minutes.map((minute) => (
                <Picker.Item key={minute} value={minute}>
                  {({ selected }) => (
                    <div className={`py-1 text-center ${selected ? "text-lg font-bold text-gray-900" : "text-base text-gray-400"}`}>
                      {minute} 分
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
