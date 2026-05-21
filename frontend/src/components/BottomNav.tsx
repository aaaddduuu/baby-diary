import { Link, useLocation } from "react-router-dom";

type IconName = "home" | "record" | "wallet" | "user";

const tabs: Array<{ label: string; path: string; icon: IconName; featured?: boolean }> = [
  { label: "首页", path: "/home", icon: "home" },
  { label: "记录", path: "/record", icon: "record", featured: true },
  { label: "记账", path: "/expense", icon: "wallet" },
  { label: "我的", path: "/my", icon: "user" },
];

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const stroke = active ? "#5BC4A0" : "#7E8781";
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...common}>
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H7" />
        <path d="M16 14h.01" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h4" />
    </svg>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="relative flex flex-shrink-0 items-end border-t border-border bg-white/94 px-2 pb-3 pt-2 backdrop-blur-[18px] shadow-[0_-8px_26px_rgba(49,92,75,.07)]">
      {tabs.map((tab) => {
        const active = pathname === tab.path || pathname.startsWith(tab.path + "/");

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="relative flex flex-1 flex-col items-center justify-end gap-1 border-none bg-transparent py-1 font-sans no-underline"
            aria-label={tab.label}
          >
            {tab.featured ? (
              <div className="-mt-8 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-white bg-gradient-to-br from-[#A8EDCD] to-mint text-[30px] font-light leading-none text-white shadow-[0_8px_24px_rgba(91,196,160,.36)]">
                  +
                </div>
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center">
                <NavIcon name={tab.icon} active={active} />
              </div>
            )}

            <div className={`text-[11px] font-semibold ${active ? "text-mint" : "text-[#7E8781]"}`}>
              {tab.label}
            </div>
            <div className={`h-0.5 w-5 rounded-pill transition-opacity ${active ? "bg-mint opacity-100" : "opacity-0"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
