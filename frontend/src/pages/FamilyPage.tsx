import { useState, useEffect } from "react";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { useBaby } from "../lib/BabyContext";
import { useAuth } from "../lib/AuthContext";
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

export default function FamilyPage() {
  const { user } = useAuth();
  const { baby } = useBaby();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    if (!baby) return;

    fetchRecords(baby.id)
      .then(records => setTotalRecords(records.length))
      .catch(() => {});

    fetchExpenses(baby.id)
      .then(expenses => {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        setTotalExpense(total);
      })
      .catch(() => {});
  }, [baby]);

  if (!baby) return null;

  const relationEmoji: Record<string, string> = {
    "妈妈": "👩",
    "爸爸": "👨",
    "奶奶": "👵",
    "爷爷": "👴",
    "外婆": "👵",
    "外公": "👴",
    "其他": "🧑",
  };

  const feedingLabel: Record<string, string> = {
    "breast": "母乳喂养",
    "formula": "配方奶喂养",
    "mixed": "混合喂养",
  };

  return (
    <Layout>
      <Header title="宝宝详情" variant="transparent" back />
      <Hero variant="mint" className="!pt-0">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/25 border-[3px] border-white/50 flex items-center justify-center text-4xl flex-shrink-0">
            {baby.gender === "male" ? "👦" : "👧"}
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-white">{baby.name}</div>
            <div className="text-sm text-white/80 mt-0.5">{calcAge(baby.birth_date)} · {baby.birth_date}出生</div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-pill py-1 px-2.5 text-xs text-white/90 mt-1.5">
              {feedingLabel[baby.feeding_type] || "混合喂养"}
            </div>
          </div>
        </div>
      </Hero>
      <ScrollArea>
        <div className="px-3.5 pt-3.5">
          <div className="bg-white rounded-card shadow-card overflow-hidden mb-3.5">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-gray-900">统计概览</div>
            </div>
            <div className="grid grid-cols-3">
              <div className="py-3 px-2 text-center border-r border-border">
                <div className="font-serif text-lg font-bold text-gray-900">{calcDays(baby.birth_date)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">出生天数</div>
              </div>
              <div className="py-3 px-2 text-center border-r border-border">
                <div className="font-serif text-lg font-bold text-gray-900">{totalRecords}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">总记录数</div>
              </div>
              <div className="py-3 px-2 text-center">
                <div className="font-serif text-lg font-bold text-gray-900">¥{totalExpense.toLocaleString()}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">累计花费</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-card overflow-hidden mb-3.5">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-gray-900">家庭成员</div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-lavender-light flex items-center justify-center text-2xl">
                  {relationEmoji[baby.relation] || "🧑"}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{baby.relation}</div>
                  <div className="text-xs text-gray-400">{user?.phone}</div>
                </div>
                <div className="text-xs text-mint bg-mint-light px-2 py-1 rounded-pill">创建者</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-card overflow-hidden mb-3.5">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-gray-900">宝宝信息</div>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">昵称</span>
                <span className="text-sm text-gray-900 font-medium">{baby.name}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">性别</span>
                <span className="text-sm text-gray-900 font-medium">{baby.gender === "male" ? "男宝 👦" : "女宝 👧"}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">出生日期</span>
                <span className="text-sm text-gray-900 font-medium">{baby.birth_date}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">喂养方式</span>
                <span className="text-sm text-gray-900 font-medium">{feedingLabel[baby.feeding_type] || "混合喂养"}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-300 mb-4">宝宝ID: {baby.id}</div>
        </div>
      </ScrollArea>
    </Layout>
  );
}
