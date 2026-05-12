import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, HeroStatCard, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { fetchRecords, fetchExpenses } from "../lib/api";
import type { BabyRecord } from "../lib/api";

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  breast_milk: { icon: "🤱", label: "母乳", color: "#D4607A" },
  formula: { icon: "🍼", label: "配方奶", color: "#5A9ED4" },
  sleep: { icon: "💤", label: "睡眠", color: "#9B7EC8" },
  diaper: { icon: "💧", label: "尿布", color: "#E8A030" },
  growth: { icon: "📏", label: "成长", color: "#5AA870" },
};

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDetail(record: BabyRecord): string {
  const data = JSON.parse(record.data);
  if (record.type === "breast_milk") {
    if (data.side === "left") return `左侧${data.leftMin}分`;
    if (data.side === "right") return `右侧${data.rightMin}分`;
    return `双侧${data.leftMin + data.rightMin}分`;
  }
  if (record.type === "formula") {
    return `${data.ml}ml`;
  }
  if (record.type === "sleep") {
    return `${formatTime(data.start)} - ${formatTime(data.end)}`;
  }
  if (record.type === "diaper") {
    const types: Record<string, string> = { wet: "小便", dirty: "大便", both: "都有" };
    return types[data.diaper_type] || data.diaper_type;
  }
  return "";
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

function formatTimeAgo(recordedAt: string): string {
  const now = new Date();
  const recordTime = new Date(recordedAt);
  const diffMs = now.getTime() - recordTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return "昨天";
  } else {
    return `${diffDays}天前`;
  }
}

function getLatestRecordByType(records: BabyRecord[], type: string): BabyRecord | undefined {
  return records
    .filter(r => r.type === type)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
}

export default function HomePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [todayCount, setTodayCount] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [hasRecords, setHasRecords] = useState(false);
  const [allRecords, setAllRecords] = useState<BabyRecord[]>([]);
  const [upcomingVaccineCount, setUpcomingVaccineCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = useMemo(() =>
    allRecords
      .filter(r => r.recorded_at.startsWith(today))
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()),
    [allRecords, today]
  );

  useEffect(() => {
    if (!baby) return;

    setPageLoading(true);
    Promise.all([
      fetchRecords(baby.id).then(records => {
        setAllRecords(records);
        if (records.length > 0) setHasRecords(true);
        const today = new Date().toISOString().slice(0, 10);
        setTodayCount(records.filter(r => r.recorded_at.startsWith(today)).length);
      }),
      fetchExpenses(baby.id, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`).then(expenses => {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        setMonthExpense(total);
        if (expenses.length > 0) setHasRecords(true);
      }),
      fetch(`/api/babies/${baby.id}/vaccines`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const now = new Date();
            const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const upcoming = data.data.filter((v: { status: string; date: string | null }) => {
              if (v.status !== "planned" || !v.date) return false;
              const vaccineDate = new Date(v.date);
              return vaccineDate >= now && vaccineDate <= thirtyDaysLater;
            });
            setUpcomingVaccineCount(upcoming.length);
          }
        }),
    ]).catch(() => {}).finally(() => setPageLoading(false));
  }, [baby]);

  const quickRecordItems = useMemo(() => {
    const types = [
      { icon: "🤱", label: "母乳", type: "breast_milk" },
      { icon: "🍼", label: "配方奶", type: "formula" },
      { icon: "💤", label: "睡眠", type: "sleep" },
      { icon: "💧", label: "小便", type: "diaper" },
      { icon: "💩", label: "大便", type: "diaper" },
    ];

    return types.map(item => {
      const latest = getLatestRecordByType(allRecords, item.type);
      return {
        ...item,
        timeAgo: latest ? formatTimeAgo(latest.recorded_at) : null,
      };
    });
  }, [allRecords]);

  if (!baby || pageLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero>
        <div className="flex items-center gap-2.5 py-2 relative z-10">
          <button
            onClick={() => navigate("/family")}
            className="flex-1 text-left bg-transparent border-none cursor-pointer p-0"
          >
            <div className="font-serif text-xl font-bold text-white">{baby.name}</div>
            <div className="text-xs text-white/80">
              {hasRecords ? `${calcAge(baby.birth_date)} · ${baby.birth_date}出生` : `今天是第 ${calcDays(baby.birth_date) + 1} 天 · ${baby.birth_date}出生`}
            </div>
          </button>
          <button
            onClick={() => navigate("/family")}
            className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-pill py-1 px-2.5 cursor-pointer"
          >
            <span className="text-base">{baby.relation === "妈妈" || baby.relation === "外婆" ? "👩" : "👨"}</span>
            <span className="text-xs text-white font-medium">{baby.relation}</span>
            <span className="text-[10px] text-white/70">▾</span>
          </button>
        </div>
        {hasRecords && (
          <div className="flex gap-[7px] mt-3 relative z-10">
            <HeroStatCard value={`${calcDays(baby.birth_date)}`} label="出生天数" suffix="天" />
            <HeroStatCard value={`${todayCount}`} label="今日记录" suffix="次" />
            <HeroStatCard value={`¥${monthExpense.toLocaleString()}`} label="本月花费" />
          </div>
        )}
      </Hero>
      <ScrollArea>
        {!hasRecords ? (
          <>
            <div className="px-3.5 pt-5 pb-24">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">✨</div>
                <div className="font-serif text-base font-semibold text-gray-900 mb-1">欢迎使用宝宝日记！</div>
                <div className="text-sm text-gray-400 leading-relaxed">开始记录{baby.name}的每一天<br />点击下方卡片快速开始 👇</div>
              </div>

              {[
                { icon: "📋", label: "开始生活记录", desc: "记录母乳、配方奶、睡眠、尿布\n掌握宝宝每日状态", path: "/record" },
                { icon: "💰", label: "记录宝宝花费", desc: "奶粉、纸尿裤、衣物、玩具\n轻松管理每月账单", path: "/expense" },
                { icon: "📏", label: "记录成长数据", desc: "体重、身高、头围\n与 WHO 标准对比成长曲线", path: "/growth" },
                { icon: "💉", label: "疫苗接种记录", desc: "国家计划疫苗 + 自定义自费疫苗\n接种日前自动提醒", path: "/vaccine" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center bg-white rounded-card shadow-card mb-2 p-3 cursor-pointer border-none text-left"
                >
                  <div className="w-11 h-11 rounded-[10px] bg-[#E8F5F0] flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{item.desc}</div>
                  </div>
                  <div className="text-gray-300 text-lg">›</div>
                </button>
              ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream via-cream to-transparent">
              <button
                onClick={() => navigate("/onboarding")}
                className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer"
              >
                开始创建宝宝档案 →
              </button>
            </div>
          </>
        ) : (
          <div className="px-3.5 pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif text-sm font-semibold text-gray-900">快速记录</div>
              <button onClick={() => navigate("/record")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">记录全部 ›</button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {quickRecordItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(`/record/add?type=${item.type}`)}
                  className="bg-white rounded-[11px] shadow-card py-2.5 px-1 text-center cursor-pointer border-none"
                >
                  <div className="text-[22px] mb-0.5">{item.icon}</div>
                  <div className="text-[9px] font-semibold text-gray-600">{item.label}</div>
                  {item.timeAgo && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.timeAgo}</div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-sm font-semibold text-gray-900">常用功能</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: "📊", label: "成长曲线", path: "/growth" },
                  { icon: "💉", label: "疫苗记录", path: "/vaccine", badge: upcomingVaccineCount },
                  { icon: "💰", label: "记账", path: "/expense" },
                  { icon: "👤", label: "我的", path: "/my" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="bg-white rounded-[11px] shadow-card py-3 px-1 text-center cursor-pointer border-none relative"
                  >
                    {item.badge ? (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                        {item.badge}
                      </div>
                    ) : null}
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-[10px] font-medium text-gray-600">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-sm font-semibold text-gray-900">今日记录</div>
                <button onClick={() => navigate("/record")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">查看全部 ›</button>
              </div>
              <div className="bg-white rounded-card shadow-card overflow-hidden">
                {todayRecords.length > 0 ? (
                  <div className="divide-y divide-border">
                    {todayRecords.slice(0, 5).map((record) => {
                      const meta = TYPE_META[record.type] || TYPE_META.growth;
                      const detail = formatDetail(record);
                      return (
                        <div key={record.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: meta.color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-900">{meta.label}</span>
                            {detail && <span className="text-sm text-gray-400 ml-1">· {detail}</span>}
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">{formatTime(record.recorded_at)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-3xl mb-2">🌙</div>
                    <div className="text-sm text-gray-400 mb-3">今天还没有记录</div>
                    <button
                      onClick={() => navigate("/record/add")}
                      className="text-sm font-medium text-white bg-mint px-4 py-2 rounded-pill border-none cursor-pointer"
                    >
                      快速添加 +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="h-5" />
      </ScrollArea>
      <BottomNav />
    </Layout>
  );
}
