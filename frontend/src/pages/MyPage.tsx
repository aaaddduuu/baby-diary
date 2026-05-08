import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { useAuth } from "../lib/AuthContext";

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  if (months > 0) {
    return `${months}个月${remainDays}天`;
  }
  return `${days}天`;
}

function calcDays(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { baby } = useBaby();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <Layout>
      <Hero variant="warm">
        <div className="flex items-center relative z-10">
          <div className="font-serif text-base font-semibold text-white flex-1">我的</div>
        </div>
        <div className="flex items-center gap-3.5 pt-1.5 relative z-10">
          <div className="w-[72px] h-[72px] rounded-full bg-white/25 border-[3px] border-white/50 flex items-center justify-center text-[34px] flex-shrink-0">
            {baby?.gender === "male" ? "👦" : "👧"}
          </div>
          <div>
            <div className="font-serif text-xl font-bold text-white mb-0.5">{baby?.name || "未添加宝宝"}</div>
            {baby && (
              <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-pill py-1 px-2.5 text-[11px] text-white/90">
                {baby.feeding_type === "breast" ? "🤱 母乳" : baby.feeding_type === "formula" ? "🍼 配方奶" : "🍼 混合"} · {calcAge(baby.birth_date)}
              </div>
            )}
          </div>
        </div>
        {baby && (
          <div className="flex gap-2 mt-3.5 relative z-10">
            <div className="flex-1 bg-white/16 rounded-[10px] py-2.5 px-2 text-center">
              <div className="font-serif text-lg font-bold text-white leading-none">{calcDays(baby.birth_date)}天</div>
              <div className="text-[9px] text-white/72 mt-0.5">出生天数</div>
            </div>
            <div className="flex-1 bg-white/16 rounded-[10px] py-2.5 px-2 text-center">
              <div className="font-serif text-lg font-bold text-white leading-none">{baby.birth_date}</div>
              <div className="text-[9px] text-white/72 mt-0.5">出生日期</div>
            </div>
          </div>
        )}
      </Hero>
      <ScrollArea>
        <div className="bg-white rounded-card shadow-card mt-2.5 mx-3.5 overflow-hidden">
          <div className="flex items-center justify-between py-[11px] px-3.5 border-b border-border">
            <span className="text-sm font-semibold text-gray-900">成长数据</span>
            <button onClick={() => navigate("/growth")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">成长曲线 ›</button>
          </div>
          <div className="p-3.5 text-center text-gray-400 text-sm">
            点击查看成长曲线
          </div>
        </div>

        <div className="mt-2.5 mx-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">功能</div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            {[
              { icon: "📏", label: "成长记录", path: "/growth" },
              { icon: "💉", label: "疫苗记录", path: "/vaccine" },
              { icon: "💰", label: "记账", path: "/expense" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center w-full py-3 px-3.5 border-b border-border last:border-b-0 bg-transparent cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">
                  {item.icon}
                </div>
                <div className="flex-1 text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-gray-400">›</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 mx-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">账号</div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="flex items-center py-3 px-3.5 border-b border-border">
              <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">📱</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{user?.phone}</div>
                <div className="text-[10px] text-gray-400">{user?.name || "未设置昵称"}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full py-3 bg-transparent cursor-pointer border-none"
            >
              <div className="text-sm font-medium text-danger">退出登录</div>
            </button>
          </div>
        </div>

        <div className="h-3.5" />
      </ScrollArea>
      <BottomNav />
    </Layout>
  );
}
