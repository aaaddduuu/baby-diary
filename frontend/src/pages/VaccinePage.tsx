import { useState, useEffect } from "react";
import Layout, { Hero, ScrollArea, Fab } from "../components/Layout";
import Header from "../components/Header";
import { useBaby } from "../lib/BabyContext";

interface Vaccine {
  id: number;
  name: string;
  status: "planned" | "completed";
  date: string | null;
  hospital: string | null;
  is_custom: number;
}

const DEFAULT_VACCINES = [
  { name: "乙肝疫苗 第1针", age: "出生后24h" },
  { name: "卡介苗", age: "出生后" },
  { name: "脊灰减毒活疫苗", age: "2月龄" },
  { name: "百白破 第1针", age: "3月龄" },
  { name: "脊灰减毒活疫苗", age: "3月龄" },
  { name: "百白破 第2针", age: "4月龄" },
  { name: "脊灰减毒活疫苗", age: "4月龄" },
  { name: "百白破 第3针", age: "5月龄" },
  { name: "乙肝疫苗 第2针", age: "6月龄" },
  { name: "A群流脑疫苗 第1针", age: "6月龄" },
  { name: "麻腮风疫苗", age: "8月龄" },
  { name: "乙脑减毒活疫苗", age: "8月龄" },
];

export default function VaccinePage() {
  const { baby } = useBaby();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newHospital, setNewHospital] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetch(`/api/babies/${baby.id}/vaccines`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setVaccines(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const toggleStatus = async (vaccine: Vaccine) => {
    if (!baby) return;
    const newStatus = vaccine.status === "completed" ? "planned" : "completed";
    await fetch(`/api/babies/${baby.id}/vaccines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name: vaccine.name,
        status: newStatus,
        date: newStatus === "completed" ? new Date().toISOString().slice(0, 10) : vaccine.date,
      }),
    });
    setVaccines(vaccines.map(v => v.id === vaccine.id ? { ...v, status: newStatus } : v));
  };

  const handleAdd = async () => {
    if (!baby || !newName.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/babies/${baby.id}/vaccines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          status: newDate ? "completed" : "planned",
          date: newDate || null,
          hospital: newHospital.trim() || null,
          is_custom: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVaccines([...vaccines, data.data]);
        setShowAdd(false);
        setNewName("");
        setNewDate("");
        setNewHospital("");
      } else {
        setError(data.message || "保存失败");
      }
    } catch (e) {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = vaccines.filter(v => v.status === "completed").length;

  return (
    <Layout>
      <Header title="疫苗记录" variant="light" back />
      {showAdd ? (
        <ScrollArea>
          <div className="p-4">
            {error && (
              <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">{error}</div>
            )}
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">疫苗名称</div>
              <input
                className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                placeholder="如：13价肺炎球菌疫苗"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">接种日期（选填）</div>
              <input
                className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">接种医院（选填）</div>
              <input
                className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                placeholder="接种地点"
                value={newHospital}
                onChange={(e) => setNewHospital(e.target.value)}
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
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <>
          <Hero variant="mint">
            <div className="flex items-center relative z-10">
              <div className="font-serif text-base font-semibold text-white flex-1">疫苗记录</div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-[11px] text-white/72 tracking-wider mb-1">接种进度</div>
              <div className="flex items-center gap-3">
                <div className="font-serif text-3xl font-bold text-white">{completedCount}<span className="text-lg font-normal text-white/70">/{vaccines.length}</span></div>
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${vaccines.length > 0 ? (completedCount / vaccines.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Hero>
          <ScrollArea className="pb-20">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
            ) : (
              <div className="p-3.5">
                {vaccines.length > 0 ? (
                  <>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">疫苗清单</div>
                    {vaccines.map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-3 p-3 mb-2 rounded-sm cursor-pointer transition-all ${
                          v.status === "completed" ? "bg-green-light" : "bg-white shadow-card"
                        }`}
                        onClick={() => toggleStatus(v)}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                          v.status === "completed"
                            ? "bg-green border-green text-white"
                            : "border-gray-300 text-transparent"
                        }`}>
                          {v.status === "completed" && "✓"}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${v.status === "completed" ? "text-green-dark line-through" : "text-gray-900"}`}>
                            {v.name}
                          </div>
                          {v.date && (
                            <div className="text-[10px] text-gray-400 mt-0.5">{v.date}</div>
                          )}
                        </div>
                        {v.is_custom > 0 && (
                          <div className="text-[10px] text-mint bg-mint-light px-2 py-0.5 rounded-pill">自定义</div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">推荐疫苗计划</div>
                    {DEFAULT_VACCINES.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 mb-2 bg-white rounded-sm shadow-card">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{v.name}</div>
                          <div className="text-[10px] text-gray-400">{v.age}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
          <Fab variant="mint" onClick={() => setShowAdd(true)} />
        </>
      )}
    </Layout>
  );
}
