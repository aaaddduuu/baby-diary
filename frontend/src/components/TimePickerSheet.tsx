import { useState } from "react";

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

function WheelColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-[180px] overflow-y-auto scrollbar-none">
        <div className="h-[70px]" />
        {items.map((val) => (
          <div
            key={val}
            className={`h-[40px] flex items-center justify-center cursor-pointer transition-all ${
              val === selected ? "font-bold text-gray-900 text-xl" : "text-gray-400 text-base"
            }`}
            onClick={() => onSelect(val)}
          >
            {val}
          </div>
        ))}
        <div className="h-[70px]" />
      </div>
    </div>
  );
}

export default function TimePickerSheet({ visible, value, onConfirm, onCancel }: TimePickerSheetProps) {
  const [hour, setHour] = useState(() => value ? value.split(":")[0] : "09");
  const [minute, setMinute] = useState(() => value ? value.split(":")[1] : "00");

  const hours = generateRange(0, 23);
  const minutes = generateRange(0, 59);

  const handleConfirm = () => {
    onConfirm(`${hour}:${minute}`);
  };

  if (!visible) return null;

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
          <div className="text-[17px] font-semibold text-gray-900">选择时间</div>
          <button
            onClick={handleConfirm}
            className="text-[15px] text-mint font-semibold bg-transparent border-none cursor-pointer font-sans"
          >
            确定
          </button>
        </div>

        <div className="flex items-center justify-center px-4" style={{ height: 180 }}>
          <WheelColumn items={hours} selected={hour} onSelect={setHour} />
          <div className="text-2xl font-bold text-gray-900 mx-2">:</div>
          <WheelColumn items={minutes} selected={minute} onSelect={setMinute} />
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
