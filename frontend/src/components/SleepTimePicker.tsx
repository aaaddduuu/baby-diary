import { useState, useEffect, useRef } from "react";

interface SleepTimePickerProps {
  visible: boolean;
  title: string;
  value: { date: string; hour: number; minute: number };
  onConfirm: (value: { date: string; hour: number; minute: number }) => void;
  onCancel: () => void;
}

const ITEM_H = 40;
const VISIBLE_COUNT = 5;
const PAD_COUNT = 2;

function generateDateOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    let label: string;
    if (i === 0) label = "今天";
    else if (i === 1) label = "昨天";
    else label = `${d.getMonth() + 1}月${d.getDate()}日`;
    options.push({ label, value: ds });
  }
  return options;
}

function generateHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

function generateMinutes(): number[] {
  return Array.from({ length: 12 }, (_, i) => i * 5);
}

function WheelColumn({
  items,
  selected,
  onSelect,
  format,
}: {
  items: (string | number)[];
  selected: string | number;
  onSelect: (val: string | number) => void;
  format?: (val: string | number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  useEffect(() => {
    if (ref.current) {
      const idx = items.indexOf(selected);
      if (idx >= 0) {
        ref.current.scrollTop = idx * ITEM_H;
      }
    }
  }, []);

  const handleScroll = () => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        if (!ref.current) return;
        const idx = Math.round(ref.current.scrollTop / ITEM_H);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        if (items[clamped] !== selected) {
          onSelect(items[clamped]);
        }
        ticking.current = false;
      });
      ticking.current = true;
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={ref}
        className="h-48 overflow-y-auto snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
      >
        <style>{`.wheel-col::-webkit-scrollbar { display: none; }`}</style>
        <div className="wheel-col" style={{ height: PAD_COUNT * ITEM_H }} />
        {items.map((val) => (
          <div
            key={val}
            className="snap-center flex items-center justify-center cursor-pointer"
            style={{ height: ITEM_H }}
            onClick={() => {
              if (!ref.current) return;
              const idx = items.indexOf(val);
              ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
              onSelect(val);
            }}
          >
            <span
              className={`transition-all ${
                val === selected ? "text-gray-900 font-bold text-lg" : "text-gray-400 text-base"
              }`}
            >
              {format ? format(val) : String(val)}
            </span>
          </div>
        ))}
        <div style={{ height: PAD_COUNT * ITEM_H }} />
      </div>
    </div>
  );
}

export default function SleepTimePicker({ visible, title, value, onConfirm, onCancel }: SleepTimePickerProps) {
  const dateOptions = generateDateOptions();
  const hours = generateHours();
  const minutes = generateMinutes();

  const [selectedDate, setSelectedDate] = useState(value.date);
  const [selectedHour, setSelectedHour] = useState(value.hour);
  const [selectedMinute, setSelectedMinute] = useState(value.minute);

  useEffect(() => {
    setSelectedDate(value.date);
    setSelectedHour(value.hour);
    setSelectedMinute(value.minute);
  }, [value]);

  const handleConfirm = () => {
    onConfirm({ date: selectedDate, hour: selectedHour, minute: selectedMinute });
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
          <div className="text-[17px] font-semibold text-gray-900">{title}</div>
          <button
            onClick={handleConfirm}
            className="text-[15px] text-mint font-semibold bg-transparent border-none cursor-pointer font-sans"
          >
            确定
          </button>
        </div>

        <div className="relative px-2" style={{ height: ITEM_H * VISIBLE_COUNT }}>
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex">
            <div className="flex-1 border-t-2 border-b-2 border-mint/30 bg-mint/5 rounded-sm" style={{ height: ITEM_H }} />
          </div>

          <div className="flex h-full">
            <WheelColumn
              items={dateOptions.map(d => d.value)}
              selected={selectedDate}
              onSelect={(val) => setSelectedDate(val as string)}
              format={(val) => dateOptions.find(d => d.value === val)?.label || String(val)}
            />
            <WheelColumn
              items={hours}
              selected={selectedHour}
              onSelect={(val) => setSelectedHour(val as number)}
              format={(val) => `${String(val).padStart(2, "0")}时`}
            />
            <WheelColumn
              items={minutes}
              selected={selectedMinute}
              onSelect={(val) => setSelectedMinute(val as number)}
              format={(val) => `${String(val).padStart(2, "0")}分`}
            />
          </div>
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
