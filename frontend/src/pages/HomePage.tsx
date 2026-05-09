import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { useBaby } from "../lib/BabyContext";
import { fetchRecords, fetchExpenses } from "../lib/api";

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

export default function HomePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [todayCount, setTodayCount] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [hasRecords, setHasRecords] = useState(false);

  useEffect(() => {
    if (!baby) return;

    const today = new Date().toISOString().slice(0, 10);
    fetchRecords(baby.id, today)
      .then(records => {
        setTodayCount(records.length);
        if (records.length > 0) setHasRecords(true);
      })
      .catch(() => {});

    fetchRecords(baby.id)
      .then(records => {
        if (records.length > 0) setHasRecords(true);
      })
      .catch(() => {});

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    fetchExpenses(baby.id, currentMonth)
      .then(expenses => {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        setMonthExpense(total);
        if (expenses.length > 0) setHasRecords(true);
      })
      .catch(() => {});
  }, [baby]);

  if (!baby) {
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
      <Hero variant="mint">
        <div className="h-11 flex items-center justify-between text-xs font-semibold text-white relative z-10">
          <span>9:41</span>
          <div className="flex gap-1 text-[11px]">●●● WiFi 🔋</div>
        </div>
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
            <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
              <div className="font-serif text-lg font-bold text-white leading-none">{calcDays(baby.birth_date)}天</div>
              <div className="text-[9px] text-white/72 mt-0.5">出生天数</div>
            </div>
            <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
              <div className="font-serif text-lg font-bold text-white leading-none">{todayCount}次</div>
              <div className="text-[9px] text-white/72 mt-0.5">今日记录</div>
            </div>
            <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
              <div className="font-serif text-lg font-bold text-white leading-none">¥{monthExpense.toLocaleString()}</div>
              <div className="text-[9px] text-white/72 mt-0.5">本月花费</div>
            </div>
          </div>
        )}
      </Hero>
      <ScrollArea>
        {!hasRecords ? (
          <div className="px-3.5 pt-5">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">✨</div>
              <div className="font-serif text-base font-semibold text-gray-900 mb-1">欢迎使用宝宝日记！</div>
              <div className="text-sm text-gray-400 leading-relaxed">开始记录{baby.name}的每一天<br />点击下方卡片快速开始 👇</div>
            </div>

            {[
              { icon: "📋", label: "开始生活记录", desc: "记录母乳、配方奶、睡眠、尿布\n掌握宝宝每日状态", path: "/record/add", color: "bg-lavender-light" },
              { icon: "💰", label: "记录宝宝花费", desc: "奶粉、纸尿裤、衣物、玩具\n轻松管理每月账单", path: "/expense/add", color: "bg-indigo-light" },
              { icon: "📏", label: "记录成长数据", desc: "体重、身高、头围\n与 WHO 标准对比成长曲线", path: "/growth", color: "bg-green-light" },
              { icon: "💉", label: "疫苗接种记录", desc: "国家计划疫苗 + 自定义自费疫苗\n接种日前自动提醒", path: "/vaccine", color: "bg-mint-light" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center bg-white rounded-card shadow-card mb-2.5 p-3 cursor-pointer border-none text-left"
              >
                <div className={`w-11 h-11 rounded-[10px] ${item.color} flex items-center justify-center text-xl flex-shrink-0`}>
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
        ) : (
          <div className="px-3.5 pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif text-sm font-semibold text-gray-900">快速记录</div>
              <button onClick={() => navigate("/record")} className="text-xs text-mint cursor-pointer border-none bg-transparent font-sans">记录全部 ›</button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { icon: "🤱", label: "母乳", type: "breast_milk" },
                { icon: "🍼", label: "配方奶", type: "formula" },
                { icon: "💤", label: "睡眠", type: "sleep" },
                { icon: "💧", label: "小便", type: "diaper" },
                { icon: "💩", label: "大便", type: "diaper" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(`/record/add?type=${item.type}`)}
                  className="bg-white rounded-[11px] shadow-card py-2.5 px-1 text-center cursor-pointer border-none"
                >
                  <div className="text-[22px] mb-0.5">{item.icon}</div>
                  <div className="text-[9px] font-semibold text-gray-600">{item.label}</div>
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
                  { icon: "💉", label: "疫苗记录", path: "/vaccine" },
                  { icon: "💰", label: "记账", path: "/expense" },
                  { icon: "👤", label: "我的", path: "/my" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="bg-white rounded-[11px] shadow-card py-3 px-1 text-center cursor-pointer border-none"
                  >
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-[10px] font-medium text-gray-600">{item.label}</div>
                  </button>
                ))}
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
