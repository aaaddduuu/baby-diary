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
  variant: "mint" | "indigo" | "lavender" | "rose" | "amber" | "green" | "warm";
  children: ReactNode;
  className?: string;
}

const heroGradients: Record<string, string> = {
  mint: "from-[#1A5848] via-mint to-[#88D8C0]",
  indigo: "from-[#263070] via-indigo to-[#7888CC]",
  lavender: "from-[#5A3888] via-lavender to-[#C8B0E8]",
  rose: "from-[#882040] via-rose to-[#F0A8B8]",
  amber: "from-[#805010] via-amber to-[#F8D080]",
  green: "from-[#1A5028] via-green to-[#A0D0A8]",
  warm: "from-[#4A3828] via-[#8C6848] to-[#C0A080]",
};

export function Hero({ variant, children, className = "" }: HeroProps) {
  return (
    <div className={`bg-gradient-to-br ${heroGradients[variant]} px-[18px] pt-12 pb-5 flex-shrink-0 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_76%_8%,rgba(255,255,255,.18)_0%,transparent_55%)]" />
      {children}
    </div>
  );
}

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="bg-white/18 rounded-[10px] py-[9px] px-2.5 text-center flex-1">
      <div className="font-serif text-lg font-bold text-white leading-none">{value}</div>
      <div className="text-[9px] text-white/72 mt-0.5">{label}</div>
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
