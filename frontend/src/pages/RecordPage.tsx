import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, StatCard, ScrollArea, Fab } from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { fetchRecords } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import type { BabyRecord } from "../lib/api";

const TYPE_META: Record<string, { icon: string; label: string; bg: string }> = {
  breast_milk: { icon: "🤱", label: "母乳", bg: "bg-rose-light" },
  formula: { icon: "🍼", label: "配方奶", bg: "bg-sky-light" },
  sleep: { icon: "💤", label: "睡眠", bg: "bg-indigo-light" },
  diaper: { icon: "💧", label: "尿布", bg: "bg-amber-light" },
  growth: { icon: "📏", label: "成长", bg: "bg-green-light" },
};

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDetail(record: BabyRecord): string {
  const data = JSON.parse(record.data);
  if (record.type === "breast_milk") {
    return `左${data.left_minutes}分 右${data.right_minutes}分`;
  }
  if (record.type === "formula") {
    return `${data.ml}ml`;
  }
  if (record.type === "sleep") {
    return `${formatTime(data.start)} - ${formatTime(data.end)}`;
  }
  if (record.type === "diaper") {
    const types: Record<string, string> = { wet: "小便", dirty: "大便", both: "都有" };
    return `${types[data.diaper_type] || data.diaper_type} · ${data.color}`;
  }
  return "";
}

export default function RecordPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetchRecords(baby.id)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = records.filter(r => r.recorded_at.startsWith(today));
    return {
      breast: todayRecords.filter(r => r.type === "breast_milk").length,
      formula: todayRecords.filter(r => r.type === "formula").reduce((sum, r) => sum + (JSON.parse(r.data).ml || 0), 0),
      sleep: todayRecords.filter(r => r.type === "sleep").length,
      diaper: todayRecords.filter(r => r.type === "diaper").length,
    };
  }, [records]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, BabyRecord[]>();
    for (const r of records) {
      const date = r.recorded_at.slice(0, 10);
      const list = groups.get(date) || [];
      list.push(r);
      groups.set(date, list);
    }
    return [...groups.entries()].slice(0, 7);
  }, [records]);

  if (!baby) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">请先添加宝宝</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero variant="lavender">
        <div className="flex items-center relative z-10">
          <div className="font-serif text-base font-semibold text-white flex-1">记录</div>
        </div>
        <div className="flex gap-[7px] mt-0 relative z-10">
          <StatCard value={`${todayStats.breast}次`} label="今日哺喂" />
          <StatCard value={`${todayStats.formula}ml`} label="配方奶" />
          <StatCard value={`${todayStats.sleep}次`} label="睡眠" />
          <StatCard value={`${todayStats.diaper}次`} label="尿布" />
        </div>
      </Hero>
      <ScrollArea className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
        ) : (
          <>
            {groupedByDate.length > 0 ? (
              <div className="p-3.5">
                {groupedByDate.map(([date, items]) => (
                  <div key={date} className="mb-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{date}</div>
                    {items.map((item) => {
                      const meta = TYPE_META[item.type] || TYPE_META.growth;
                      return (
                        <div key={item.id} className="flex gap-2.5 mb-2">
                          <div className={`w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center text-sm flex-shrink-0 z-10`}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 bg-white rounded-sm shadow-card py-[9px] px-[11px] cursor-pointer">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="text-xs font-bold text-gray-900">{meta.label}</div>
                              <div className="text-[10px] text-gray-400">
                                {formatTime(item.recorded_at)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 leading-relaxed">
                              {formatDetail(item)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-5xl mb-4 opacity-40">📋</div>
                <div className="text-sm font-medium text-gray-600 mb-1">暂无记录</div>
                <div className="text-xs text-gray-400">点击右下角 + 开始记录</div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
      <Fab onClick={() => navigate("/record/add")} />
      <BottomNav />
    </Layout>
  );
}
