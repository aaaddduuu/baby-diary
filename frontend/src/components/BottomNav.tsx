import { Link, useLocation } from "react-router-dom";

const tabs = [
  { icon: "🏠", label: "首页", path: "/home" },
  { icon: "📋", label: "记录", path: "/record" },
  { icon: "💰", label: "记账", path: "/expense" },
  { icon: "👤", label: "我的", path: "/my" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="bg-cream/97 backdrop-blur-[14px] border-t border-border flex pt-2 pb-4 flex-shrink-0">
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 border-none bg-transparent cursor-pointer font-sans no-underline"
          >
            <div className="text-xl leading-none">{tab.icon}</div>
            <div className={`text-[10px] font-medium ${active ? "text-mint" : "text-gray-400"}`}>
              {tab.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
