import { useState } from "react";

interface NumberKeyboardProps {
  visible: boolean;
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  maxLength?: number;
}

export default function NumberKeyboard({ visible, value, onConfirm, onCancel, maxLength = 6 }: NumberKeyboardProps) {
  const [input, setInput] = useState(value);

  const handlePress = (key: string) => {
    if (key === "delete") {
      setInput(input.slice(0, -1));
    } else if (key === "confirm") {
      onConfirm(input);
    } else {
      if (input.length >= maxLength) return;
      setInput(input === "0" ? key : input + key);
    }
  };

  if (!visible) return null;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "delete"];

  return (
    <div className="fixed inset-0 z-[100]" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
          <div className="text-2xl font-bold text-gray-900">{input || "0"} ml</div>
          <button
            onClick={() => onConfirm(input)}
            className="text-sm font-semibold text-white bg-[#4AB89A] px-4 py-2 rounded-pill border-none cursor-pointer"
          >
            确定
          </button>
        </div>
        <div className="grid grid-cols-3 gap-px p-px">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handlePress(key)}
              className={`h-[52px] text-xl font-medium border-none cursor-pointer active:bg-gray-100 ${
                key === "delete" ? "bg-gray-200 text-gray-600" : "bg-white text-gray-900"
              }`}
            >
              {key === "delete" ? "⌫" : key}
            </button>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
