interface DateFieldButtonProps {
  value: string;
  onClick: () => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function formatDateFieldValue(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export default function DateFieldButton({
  value,
  onClick,
  placeholder = "点击选择日期",
  ariaLabel = "选择日期",
  disabled = false,
}: DateFieldButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      onClick={onClick}
      disabled={disabled}
      className="group flex min-h-[56px] w-full items-center justify-between gap-4 rounded-[18px] border border-[#DCE5DD] bg-[#F9FBF8] px-4 py-3 text-left outline-none transition-all focus-visible:border-[#65B997] focus-visible:ring-2 focus-visible:ring-[#5BC4A0]/20 active:bg-[#F1F8F4] disabled:cursor-wait disabled:opacity-60"
    >
      <span
        className={`min-w-0 truncate text-[15px] font-bold ${value ? "text-[#21382E]" : "text-[#8A968F]"}`}
      >
        {value ? formatDateFieldValue(value) : placeholder}
      </span>
      <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#2F9B73] shadow-[0_4px_12px_rgba(47,155,115,.10)]">
        {value ? "更改" : "选择"}
      </span>
    </button>
  );
}
