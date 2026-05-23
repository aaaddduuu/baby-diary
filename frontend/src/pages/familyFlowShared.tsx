export const FAMILY_RELATIONS = [
  { value: "妈妈", emoji: "👩" },
  { value: "爸爸", emoji: "👨" },
  { value: "奶奶", emoji: "👵" },
  { value: "爷爷", emoji: "👴" },
  { value: "外婆", emoji: "👵" },
  { value: "外公", emoji: "👴" },
  { value: "保姆", emoji: "🧑" },
  { value: "其他", emoji: "✨" },
] as const;

export function SectionLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor?: string;
}) {
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">
        {children}
      </label>
    );
  }

  return <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</div>;
}

export function RelationChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-[20px] border px-3 py-3 text-center transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] shadow-[0_10px_24px_rgba(74,184,154,.14)]"
          : "border-white/70 bg-white/80"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
          active ? "bg-[#DDF5EA]" : "bg-[#F6F3EA]"
        }`}
      >
        {icon}
      </span>
      <span className={`text-sm font-semibold ${active ? "text-[#1A5C3A]" : "text-[#526258]"}`}>{label}</span>
    </button>
  );
}
