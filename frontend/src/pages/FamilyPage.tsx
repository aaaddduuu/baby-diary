import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
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

export default function FamilyPage() {
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

  const navigate = useNavigate();

  return (
    <Layout>
      <Hero variant="mint">
        <div className="flex items-center gap-2.5 py-2 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/22 flex items-center justify-center text-[17px] text-white border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          <div className="font-serif text-base font-semibold text-white flex-1">宝宝详情</div>
        </div>
        <div className="flex items-center gap-4 relative z-10 mt-2">
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
              <div className="text-sm font-semibold text-gray-900">当前成员</div>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-full bg-rose-light flex items-center justify-center text-2xl border-2 border-mint">
                  {relationEmoji[baby.relation] || "🧑"}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{baby.relation}</div>
                  <div className="text-xs text-gray-400">主要记录人 · 今天 6条记录</div>
                </div>
                <div className="text-xs text-mint bg-mint-light px-2 py-1 rounded-pill">当前</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-card overflow-hidden mb-3.5">
            <button className="flex items-center gap-3 px-4 py-3 w-full border-none bg-transparent cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-mint-light flex items-center justify-center text-2xl">
                ➕
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">添加家庭成员</div>
                <div className="text-xs text-gray-400">邀请爷爷、外公外婆等加入</div>
              </div>
              <div className="text-gray-300 text-lg">›</div>
            </button>
            <button className="flex items-center gap-3 px-4 py-3 w-full border-none bg-transparent cursor-pointer border-t border-border">
              <div className="w-12 h-12 rounded-full bg-indigo-light flex items-center justify-center text-2xl">
                🔗
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">分享家庭邀请码</div>
                <div className="text-xs text-gray-400">扫码或链接即可加入</div>
              </div>
              <div className="text-gray-300 text-lg">›</div>
            </button>
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
