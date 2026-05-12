import { useState, useEffect, useMemo } from "react";
import Layout, { ScrollArea, Fab } from "../components/Layout";
import Header from "../components/Header";
import GrowthChart from "../components/GrowthChart";
import { useBaby } from "../lib/BabyContext";
import { getWHOData } from "../lib/who-data";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface GrowthRecord {
  id: number;
  weight: number | null;
  height: number | null;
  head_circumference: number | null;
  measured_at: string;
}

type TabType = "weight" | "height" | "head";

const TABS = [
  { key: "weight" as TabType, label: "体重", unit: "kg" },
  { key: "height" as TabType, label: "身高", unit: "cm" },
  { key: "head" as TabType, label: "头围", unit: "cm" },
];

function calcMonthDiff(birthDate: string, measureDate: string): number {
  const birth = new Date(birthDate);
  const measure = new Date(measureDate);
  const diffMs = measure.getTime() - birth.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

function getField(record: GrowthRecord, type: TabType): number | null {
  if (type === "weight") return record.weight;
  if (type === "height") return record.height;
  return record.head_circumference;
}

function getValidation(months: number, type: TabType, value: number): { status: "low" | "high" | "ok"; message: string } | null {
  if (!value || value <= 0) return null;

  let expected: number;
  let range: number;

  if (type === "weight") {
    expected = months * 0.6 + 3;
    range = 0.5;
  } else if (type === "height") {
    expected = months * 2.5 + 50;
    range = 0.2;
  } else {
    expected = months * 0.5 + 34;
    range = 0.15;
  }

  const low = expected * (1 - range);
  const high = expected * (1 + range);

  if (value < low) {
    return { status: "low", message: "数值偏低，请确认是否输入正确" };
  }
  if (value > high) {
    return { status: "high", message: "数值偏高，请确认是否输入正确" };
  }
  return { status: "ok", message: "" };
}

function getPercentileLabel(value: number, whoData: { p3: number; p50: number; p97: number }[]): string {
  if (!whoData.length) return "";
  const entry = whoData[whoData.length - 1];
  if (value < entry.p3) return "P3 以下";
  if (value < entry.p50) return "P3-P50";
  if (value < entry.p97) return "P50-P97";
  return "P97 以上";
}

export default function GrowthPage() {
  const { baby } = useBaby();
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("weight");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCirc, setHeadCirc] = useState("");
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetch(`${API_BASE}/babies/${baby.id}/growth`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecords(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const whoData = useMemo(() => {
    if (!baby) return [];
    return getWHOData(activeTab, baby.gender);
  }, [baby, activeTab]);

  const userPoints = useMemo(() => {
    if (!baby) return [];
    return records
      .map(r => {
        const value = getField(r, activeTab);
        if (!value) return null;
        const month = calcMonthDiff(baby.birth_date, r.measured_at);
        return { month, value };
      })
      .filter((p): p is { month: number; value: number } => p !== null)
      .sort((a, b) => a.month - b.month);
  }, [records, baby, activeTab]);

  const latestPoint = userPoints[userPoints.length - 1];

  const currentTab = TABS.find(t => t.key === activeTab)!;

  const months = baby ? calcMonthDiff(baby.birth_date, measuredAt) : 0;
  const weightValidation = weight ? getValidation(months, "weight", Number(weight)) : null;
  const heightValidation = height ? getValidation(months, "height", Number(height)) : null;
  const headValidation = headCirc ? getValidation(months, "head", Number(headCirc)) : null;

  const handleEdit = (record: GrowthRecord) => {
    setEditingId(record.id);
    setWeight(record.weight ? String(record.weight) : "");
    setHeight(record.height ? String(record.height) : "");
    setHeadCirc(record.head_circumference ? String(record.head_circumference) : "");
    setMeasuredAt(record.measured_at);
    setShowAdd(true);
    setActionId(null);
  };

  const handleDelete = async (id: number) => {
    if (!baby) return;
    try {
      const res = await fetch(`${API_BASE}/babies/${baby.id}/growth/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(records.filter(r => r.id !== id));
      }
    } catch {}
    setActionId(null);
  };

  const handleSave = async () => {
    if (!baby) return;
    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `${API_BASE}/babies/${baby.id}/growth/${editingId}`
        : `${API_BASE}/babies/${baby.id}/growth`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
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
        if (editingId) {
          setRecords(records.map(r => r.id === editingId ? data.data : r));
        } else {
          setRecords([data.data, ...records]);
        }
        setShowAdd(false);
        setEditingId(null);
        setWeight("");
        setHeight("");
        setHeadCirc("");
      } else {
        setError(data.message || "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingId(null);
    setWeight("");
    setHeight("");
    setHeadCirc("");
    setError("");
  };

  const inputClass = (validation: { status: string } | null) => {
    const base = "w-full h-11 bg-gray-100 border-[1.5px] rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint";
    if (validation?.status === "low" || validation?.status === "high") {
      return `${base} border-amber`;
    }
    return `${base} border-border`;
  };

  return (
    <Layout>
      <Header title="成长曲线" variant="light" back />

      <div className="flex border-b border-border bg-white">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium border-none cursor-pointer transition-all ${
              activeTab === tab.key
                ? "text-mint border-b-2 border-mint bg-transparent"
                : "text-gray-400 bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showAdd ? (
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
                className={inputClass(weightValidation)}
                type="number"
                step="0.1"
                placeholder="如：7.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              {weightValidation && weightValidation.status !== "ok" && (
                <div className="text-xs text-amber mt-1">{weightValidation.message}</div>
              )}
            </div>
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">身高（cm）</div>
              <input
                className={inputClass(heightValidation)}
                type="number"
                step="0.1"
                placeholder="如：65"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              {heightValidation && heightValidation.status !== "ok" && (
                <div className="text-xs text-amber mt-1">{heightValidation.message}</div>
              )}
            </div>
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">头围（cm）</div>
              <input
                className={inputClass(headValidation)}
                type="number"
                step="0.1"
                placeholder="如：42"
                value={headCirc}
                onChange={(e) => setHeadCirc(e.target.value)}
              />
              {headValidation && headValidation.status !== "ok" && (
                <div className="text-xs text-amber mt-1">{headValidation.message}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 h-12 rounded-pill text-base font-semibold text-gray-600 bg-gray-100 border-none cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-green to-green-dark border-none cursor-pointer disabled:opacity-50"
              >
                {saving ? "保存中..." : editingId ? "更新" : "保存"}
              </button>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
          ) : (
            <div className="p-3.5">
              <div className="bg-white rounded-card shadow-card p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-900">{currentTab.label}曲线</div>
                  <div className="text-xs text-gray-400">WHO 参考</div>
                </div>
                <div className="flex justify-center">
                  <GrowthChart
                    whoData={whoData}
                    userPoints={userPoints}
                    unit={currentTab.unit}
                  />
                </div>
                {userPoints.length === 1 && (
                  <div className="text-xs text-gray-400 text-center mt-2">记录更多数据后将显示成长曲线</div>
                )}
                <div className="flex items-center gap-4 mt-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-indigo" />
                    <span className="text-gray-400">P50 中位数</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-rose opacity-50" />
                    <span className="text-gray-400">P3/P97</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-mint" />
                    <span className="text-gray-400">宝宝数据</span>
                  </div>
                </div>
              </div>

              {latestPoint && whoData.length > 0 && (
                <div className="bg-white rounded-card shadow-card p-3 mb-3">
                  {(() => {
                    const percentile = getPercentileLabel(latestPoint.value, whoData);
                    return (
                      <div className="text-sm text-gray-900">
                        当前{currentTab.label} <span className="font-bold">{latestPoint.value}{currentTab.unit}</span>
                        ，处于同月龄 <span className="font-bold text-amber">{percentile}</span>。
                        {percentile === "P3 以下" && (
                          <span className="text-amber"> 建议在下次儿保检查时告知医生。</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="bg-white rounded-card shadow-card overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-border">
                  <div className="text-sm font-semibold text-gray-900">测量记录</div>
                </div>
                {records.length > 0 ? (
                  records.map(r => (
                    <div
                      key={r.id}
                      className="relative"
                      onClick={() => setActionId(actionId === r.id ? null : r.id)}
                    >
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border last:border-b-0">
                        <div>
                          <div className="text-xs text-gray-400">{r.measured_at}</div>
                          <div className="text-sm text-gray-900 mt-0.5 flex gap-3">
                            {r.weight && <span>体重 {r.weight}kg</span>}
                            {r.height && <span>身高 {r.height}cm</span>}
                            {r.head_circumference && <span>头围 {r.head_circumference}cm</span>}
                          </div>
                        </div>
                        {actionId === r.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                              className="px-3 py-1.5 text-xs font-medium text-mint bg-mint-light rounded-pill border-none cursor-pointer"
                            >
                              编辑
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                              className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-pill border-none cursor-pointer"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">暂无记录</div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      )}

      <Fab variant="mint" onClick={() => { setEditingId(null); setShowAdd(true); }} />
    </Layout>
  );
}
