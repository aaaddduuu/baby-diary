import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
  variant?: "light" | "dark" | "transparent" | "hero";
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

export default function Header({
  title,
  subtitle,
  variant = "light",
  back = false,
  right,
  onBack,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const historyIndex = typeof window !== "undefined" ? window.history.state?.idx : undefined;

      if (typeof historyIndex === "number" && historyIndex > 0) {
        navigate(-1);
      } else {
        navigate("/home", { replace: true });
      }
    }
  };

  const renderBackButton = (className: string) =>
    back ? (
      <button
        type="button"
        onClick={handleBack}
        className={`${className} flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-[17px]`}
        aria-label="Go back"
      >
        {"←"}
      </button>
    ) : null;

  const renderText = (titleClassName: string, subtitleClassName?: string) => (
    <div className="min-w-0 flex-1">
      <div className={titleClassName}>{title}</div>
      {subtitle ? <div className={subtitleClassName}>{subtitle}</div> : null}
    </div>
  );

  if (variant === "hero") {
    return (
      <div className="hero-shell hero-shell-header px-[18px] pb-5 pt-4">
        <div className="header-readable-overlay absolute inset-0" />
        <div className="hero-shell-glow absolute inset-0" />
        <div className="relative z-10 flex items-start gap-3">
          {renderBackButton("bg-white/18 text-white shadow-[0_6px_18px_rgba(14,59,43,.18)] backdrop-blur-sm")}
          {renderText("header-title", "header-subtitle mt-1 text-sm")}
          {right ? <div className="flex flex-shrink-0 items-center self-start">{right}</div> : null}
        </div>
      </div>
    );
  }

  if (variant === "transparent") {
    return (
      <div className="relative z-10 flex items-start gap-2.5 px-[18px] py-3">
        {renderBackButton("bg-white/22 text-white")}
        {renderText("header-title", "header-subtitle mt-0.5 text-sm")}
        {right ? <div className="flex flex-shrink-0 items-center self-start">{right}</div> : null}
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className="flex flex-shrink-0 items-start gap-2.5 border-b border-border bg-white px-[18px] py-3">
        {renderBackButton("bg-gray-100 text-gray-600")}
        {renderText("font-serif text-base font-semibold text-gray-900", "mt-0.5 text-sm text-gray-500")}
        {right ? <div className="flex flex-shrink-0 items-center self-start">{right}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-shrink-0 items-start gap-2.5 border-b border-border bg-white px-[18px] py-3">
      {renderBackButton("bg-gray-100 text-gray-600")}
      {renderText("font-serif text-base font-semibold text-gray-900", "mt-0.5 text-sm text-gray-500")}
      {right ? <div className="flex flex-shrink-0 items-center self-start">{right}</div> : null}
    </div>
  );
}
