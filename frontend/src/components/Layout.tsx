import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}

export default function Layout({ children, className = "" }: LayoutProps) {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-y-auto bg-cream text-ink ${className}`}>
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
    <div className={`min-h-0 flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return <section className={`panel-card rounded-[24px] ${className}`}>{children}</section>;
}

interface HeroProps {
  children: ReactNode;
  className?: string;
}

export function Hero({ children, className = "" }: HeroProps) {
  return (
    <div className={`hero-shell hero-shell-banner px-[18px] pb-6 pt-12 ${className}`}>
      <div className="header-readable-overlay absolute inset-0" />
      <div className="hero-shell-glow absolute inset-0" />
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
    <div className={`flex-1 rounded-2xl border border-white/60 bg-white/90 p-3 text-center shadow-[0_10px_26px_rgba(26,92,58,.12)] backdrop-blur-md ${className}`}>
      <div className="font-tabular text-2xl font-bold leading-none text-[#1A5C3A]">
        {value}
        {suffix && <span className="ml-0.5 text-sm font-normal text-[#1A5C3A]">{suffix}</span>}
      </div>
      <div className="mt-1 text-[11px] font-semibold text-[#3A7A5A]">{label}</div>
    </div>
  );
}

interface FabProps {
  onClick?: () => void;
  children?: ReactNode;
}

export function Fab({ onClick, children = "+" }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-5 bottom-[90px] z-50 flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full border-none bg-[#2D9B6A] text-[26px] text-white shadow-[0_8px_20px_rgba(45,155,106,.28)]"
    >
      {children}
    </button>
  );
}
