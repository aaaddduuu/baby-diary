import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, HeroStatCard, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { useAuth } from "../lib/AuthContext";
import { fetchRecords, fetchExpenses, fetchFamily, fetchGrowthRecords, fetchVaccines } from "../lib/api";
import type { FamilyMember, GrowthRecord } from "../lib/api";

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

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

function getDefaultNickname(relation?: string): string {
  const map: Record<string, string> = {
    "妈妈": "宝宝的妈妈",
    "爸爸": "宝宝的爸爸",
    "奶奶": "宝宝的奶奶",
    "爷爷": "宝宝的爷爷",
    "外婆": "宝宝的外婆",
    "外公": "宝宝的外公",
  };
  return map[relation || ""] || "宝宝的家长";
}

export default function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { baby } = useBaby();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState(0);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!baby) return;

    setStatsLoading(true);
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    Promise.all([
      fetchRecords(baby.id).then(records => setTotalRecords(records.length)),
      fetchExpenses(baby.id).then(expenses => {
        setTotalExpense(expenses.reduce((sum, e) => sum + e.amount, 0));
      }),
      fetchExpenses(baby.id, currentMonth).then(expenses => {
        setMonthExpense(expenses.reduce((sum, e) => sum + e.amount, 0));
      }),
      fetchGrowthRecords(baby.id).then(setGrowthRecords),
      fetchVaccines(baby.id).then(vaccines => {
        setPendingVaccines(vaccines.filter((v) => v.status === "planned").length);
      }),
      fetchFamily().then(data => setFamilyMembers(data.members)),
    ])
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [baby]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const displayName = user?.name || getDefaultNickname(baby?.relation);
  const latestGrowth = growthRecords[0];

  return (
    <Layout>
      <Hero>
        <div className="flex items-center relative z-10">
          <div className="header-title flex-1">我的</div>
        </div>
        <div className="flex items-center gap-3.5 pt-1.5 relative z-10">
          <div className="w-[72px] h-[72px] rounded-full bg-white/25 border-[3px] border-white flex items-center justify-center text-[34px] flex-shrink-0 shadow-[0_2px_10px_rgba(0,0,0,.2)]">
            {baby?.gender === "male" ? "👦" : "👧"}
          </div>
          <div>
            <div className="header-title mb-0.5">{baby?.name || "未添加宝宝"}</div>
            {baby && (
              <button
                onClick={() => navigate("/profile")}
                className="header-subtitle inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-pill py-1 px-2.5 text-[11px] cursor-pointer border-none"
              >
                {baby.feeding_type === "breast" ? "🤱 母乳" : baby.feeding_type === "formula" ? "🍼 配方奶" : "🍼 混合"} · {calcAge(baby.birth_date)}
              </button>
            )}
          </div>
        </div>
        {baby && (
          <div className="flex gap-[7px] mt-3.5 relative z-10">
            <HeroStatCard value={`${calcDays(baby.birth_date)}`} label="出生天数" suffix="天" />
            <HeroStatCard value={statsLoading ? "--" : `${totalRecords}`} label="总记录数" suffix={statsLoading ? undefined : "笔"} />
            <HeroStatCard value={statsLoading ? "--" : `¥${totalExpense.toLocaleString()}`} label="累计花费" />
          </div>
        )}
      </Hero>
      <ScrollArea>
        <div className="mt-2.5 mx-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">账号</div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center w-full py-3 px-3.5 border-b border-border bg-transparent cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">📱</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{maskPhone(user?.phone || "")}</div>
                <div className="text-[10px] text-gray-400">{displayName}</div>
              </div>
              {!user?.name && (
                <div className="flex items-center gap-1 text-[11px] text-amber bg-amber-light px-2 py-1 rounded-pill flex-shrink-0">
                  去设置 <span className="text-[10px]">›</span>
                </div>
              )}
              <div className="text-gray-400 ml-2">›</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-card shadow-card mt-2.5 mx-3.5 overflow-hidden">
          <div className="flex items-center justify-between py-[11px] px-3.5 border-b border-border">
            <span className="text-sm font-semibold text-gray-900">成长数据</span>
            <button onClick={() => navigate("/growth")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">成长曲线 ›</button>
          </div>
          {latestGrowth ? (
            <div className="p-3.5">
              <div className="flex items-center justify-center gap-4">
                {latestGrowth.weight && (
                  <div className="text-sm text-gray-900">⚖️ {latestGrowth.weight}kg</div>
                )}
                {latestGrowth.height && (
                  <div className="text-sm text-gray-900">📏 {latestGrowth.height}cm</div>
                )}
                {latestGrowth.head_circumference && (
                  <div className="text-sm text-gray-900">⭕ {latestGrowth.head_circumference}cm</div>
                )}
              </div>
              <div className="text-xs text-gray-400 text-center mt-1.5">{latestGrowth.measured_at} 测量</div>
            </div>
          ) : (
            <div className="p-3.5 text-center">
              <div className="text-sm text-gray-400 mb-2">还未记录成长数据</div>
              <button
                onClick={() => navigate("/growth")}
                className="text-sm font-medium text-white bg-mint px-4 py-2 rounded-pill border-none cursor-pointer"
              >
                + 立即记录
              </button>
            </div>
          )}
        </div>

        <div className="mt-2.5 mx-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">功能</div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            {[
              { icon: "📏", label: "成长记录", path: "/growth", badge: `共 ${growthRecords.length} 条`, badgeColor: "text-gray-400" },
              { icon: "💉", label: "疫苗记录", path: "/vaccine", badge: pendingVaccines > 0 ? `${pendingVaccines} 项待接种` : null, badgeColor: "text-amber" },
              { icon: "💰", label: "记账", path: "/expense", badge: `本月 ¥${monthExpense.toLocaleString()}`, badgeColor: "text-gray-400" },
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
                {item.badge && (
                  <div className={`text-xs ${item.badgeColor} mr-2`}>{item.badge}</div>
                )}
                <div className="text-gray-400">›</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 mx-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">家庭成员</div>
            <button onClick={() => navigate("/family")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">管理 ›</button>
          </div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            {familyMembers.slice(0, 3).map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border last:border-b-0">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                  {member.avatar_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{member.nickname}</div>
                  <div className="text-[10px] text-gray-400">
                    {member.user_id === user?.id ? "当前用户" : "家庭成员"}
                  </div>
                </div>
                {member.user_id === user?.id && (
                  <div className="text-[10px] text-mint bg-mint-light px-2 py-0.5 rounded-pill">当前</div>
                )}
              </div>
            ))}
            <button
              onClick={() => navigate("/family")}
              className="flex items-center w-full py-3 px-3.5 bg-transparent cursor-pointer border-none text-left"
            >
              <div className="w-9 h-9 rounded-full bg-mint-light flex items-center justify-center text-lg flex-shrink-0">➕</div>
              <div className="flex-1 text-sm font-medium text-mint">添加家庭成员</div>
            </button>
          </div>
        </div>

        <div className="mt-2.5 mx-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">设置</div>
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <button
              onClick={() => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS) {
                  window.location.href = "/baby.mobileconfig";
                } else {
                  alert("请使用 Chrome 菜单 → 添加到主屏幕");
                }
              }}
              className="flex items-center w-full py-3 px-3.5 border-b border-border bg-transparent cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mr-[11px]">📲</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">添加到桌面</div>
                <div className="text-[10px] text-gray-400">iOS 可通过浏览器分享菜单添加到主屏幕</div>
              </div>
              <div className="text-gray-400">›</div>
            </button>
          </div>
        </div>

        <div className="mt-2.5 mx-3.5 mb-3.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-3 bg-white rounded-card shadow-card cursor-pointer border-none"
          >
            <div className="text-sm font-medium text-danger">退出登录</div>
          </button>
        </div>

        <div className="h-3.5" />
      </ScrollArea>
      <BottomNav />
    </Layout>
  );
}
