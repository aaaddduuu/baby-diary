import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea, Fab } from "../components/Layout";
import { useBaby } from "../lib/BabyContext";

interface GrowthRecord {
  id: number;
  weight: number | null;
  height: number | null;
  head_circumference: number | null;
  measured_at: string;
}

export default function GrowthPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCirc, setHeadCirc] = useState("");
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetch(`/api/babies/${baby.id}/growth`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecords(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const handleSave = async () => {
    if (!baby) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/babies/${baby.id}/growth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          weight: weight ? Number(weight) : null,
          height: height ? Number(height) : null,
          head_circumference: headCirc ? Number(headCirc) : null,
          measured_at: measuredAt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords([data.data, ...records]);
        setShowAdd(false);
        setWeight("");
        setHeight("");
        setHeadCirc("");
      } else {
        setError(data.message || "保存失败");
      }
    } catch (e) {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const latest = records[0];

  return (
    <Layout>
      {showAdd ? (
        <>
          <div className="flex items-center gap-2.5 px-[18px] py-3 bg-white border-b border-border flex-shrink-0">
            <button
              onClick={() => setShowAdd(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[17px] text-gray-600 border-none cursor-pointer flex-shrink-0"
            >
              ✕
            </button>
            <div className="font-serif text-base font-semibold text-gray-900 flex-1">更新成长数据</div>
          </div>
          <ScrollArea>
            <div className="p-4">
              {error && (
                <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">{error}</div>
              )}
              <div className="mb-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">测量日期</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                />
              </div>
              <div className="mb-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">体重（kg）</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                  type="number"
                  step="0.1"
                  placeholder="如：7.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="mb-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">身高（cm）</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                  type="number"
                  step="0.1"
                  placeholder="如：65"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div className="mb-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">头围（cm）</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                  type="number"
                  step="0.1"
                  placeholder="如：42"
                  value={headCirc}
                  onChange={(e) => setHeadCirc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-gray-600 bg-gray-100 border-none cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-green to-green-dark border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </ScrollArea>
        </>
      ) : (
        <>
          <Hero variant="green" className="!pt-3">
            <div className="flex items-center gap-3 relative z-10 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg text-white border-none cursor-pointer flex-shrink-0"
              >
                ‹
              </button>
              <div className="font-serif text-[17px] font-semibold text-white flex-1">成长记录</div>
            </div>
            {latest && (
              <div className="flex gap-2 mt-2 relative z-10">
                {latest.weight && (
                  <div className="flex-1 bg-white/18 rounded-[10px] py-2.5 px-2 text-center">
                    <div className="font-serif text-lg font-bold text-white leading-none">{latest.weight}<span className="text-xs font-normal">kg</span></div>
                    <div className="text-[9px] text-white/72 mt-0.5">体重</div>
                  </div>
                )}
                {latest.height && (
                  <div className="flex-1 bg-white/18 rounded-[10px] py-2.5 px-2 text-center">
                    <div className="font-serif text-lg font-bold text-white leading-none">{latest.height}<span className="text-xs font-normal">cm</span></div>
                    <div className="text-[9px] text-white/72 mt-0.5">身高</div>
                  </div>
                )}
                {latest.head_circumference && (
                  <div className="flex-1 bg-white/18 rounded-[10px] py-2.5 px-2 text-center">
                    <div className="font-serif text-lg font-bold text-white leading-none">{latest.head_circumference}<span className="text-xs font-normal">cm</span></div>
                    <div className="text-[9px] text-white/72 mt-0.5">头围</div>
                  </div>
                )}
              </div>
            )}
          </Hero>
          <ScrollArea className="pb-20">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
            ) : records.length > 0 ? (
              <div className="p-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">历史记录</div>
                {records.map((r) => (
                  <div key={r.id} className="bg-white rounded-sm shadow-card p-3 mb-2">
                    <div className="text-xs text-gray-400 mb-1">{r.measured_at}</div>
                    <div className="flex gap-4">
                      {r.weight && <div className="text-sm"><span className="text-gray-400">体重</span> <span className="font-bold text-gray-900">{r.weight}kg</span></div>}
                      {r.height && <div className="text-sm"><span className="text-gray-400">身高</span> <span className="font-bold text-gray-900">{r.height}cm</span></div>}
                      {r.head_circumference && <div className="text-sm"><span className="text-gray-400">头围</span> <span className="font-bold text-gray-900">{r.head_circumference}cm</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-5xl mb-4 opacity-40">📏</div>
                <div className="text-sm font-medium text-gray-600 mb-1">暂无成长记录</div>
                <div className="text-xs text-gray-400">点击右下角 + 添加记录</div>
              </div>
            )}
          </ScrollArea>
          <Fab variant="mint" onClick={() => setShowAdd(true)} />
        </>
      )}
    </Layout>
  );
}
