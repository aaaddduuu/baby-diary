import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}

export default function Layout({ children, className = "" }: LayoutProps) {
  return (
    <div className={`flex flex-col h-full bg-cream ${className}`}>
      {children}
    </div>
  );
}

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className = "" }: ScrollAreaProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

interface HeroProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Hero({ children, className = "", style }: HeroProps) {
  return (
    <div
      className={`px-[18px] pt-12 pb-5 flex-shrink-0 relative overflow-hidden ${className}`}
      style={{ background: "var(--header-grad)", ...style }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_76%_8%,rgba(255,255,255,.18)_0%,transparent_55%)]" />
      {children}
    </div>
  );
}

interface HeroStatCardProps {
  value: string;
  label: string;
  suffix?: string;
  className?: string;
}

export function HeroStatCard({ value, label, suffix, className = "" }: HeroStatCardProps) {
  return (
    <div className={`bg-white/20 rounded-xl p-2 text-center flex-1 ${className}`}>
      <div className="font-serif text-lg font-bold text-white leading-none">
        {value}
        {suffix && <span className="text-sm font-normal text-white/70 ml-0.5">{suffix}</span>}
      </div>
      <div className="text-[9px] text-white/80 mt-0.5">{label}</div>
    </div>
  );
}

interface FabProps {
  onClick?: () => void;
  variant?: "mint" | "indigo";
  children?: ReactNode;
}

export function Fab({ onClick, variant = "mint", children = "＋" }: FabProps) {
  const colors = variant === "indigo"
    ? "bg-gradient-to-br from-indigo to-indigo-dark"
    : "bg-gradient-to-br from-mint to-mint-dark";

  return (
    <button
      onClick={onClick}
      className={`absolute right-5 bottom-[90px] w-[54px] h-[54px] rounded-full border-none cursor-pointer flex items-center justify-center text-[26px] text-white shadow-[0_4px_20px_rgba(0,0,0,.22)] z-50 ${colors}`}
    >
      {children}
    </button>
  );
}
