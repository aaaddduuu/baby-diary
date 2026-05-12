import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea, Fab } from "../components/Layout";
import DatePickerSheet from "../components/DatePickerSheet";
import { useBaby } from "../lib/BabyContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

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
  { name: "甲肝减毒活疫苗", age: "18月龄" },
  { name: "百白破 第4针", age: "18月龄" },
  { name: "麻腮风疫苗 第2针", age: "2岁" },
  { name: "乙脑减毒活疫苗 第2针", age: "2岁" },
  { name: "A群C群流脑疫苗", age: "3岁" },
  { name: "脊灰灭活疫苗", age: "4岁" },
  { name: "白破疫苗", age: "6岁" },
];

function calcDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "未设置";
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function VaccinePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Vaccine | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newHospital, setNewHospital] = useState("");
  const [newStatus, setNewStatus] = useState<"planned" | "completed">("planned");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    fetch(`${API_BASE}/babies/${baby.id}/vaccines`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setVaccines(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baby]);

  const { upcoming, others } = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingList: Vaccine[] = [];
    const othersList: Vaccine[] = [];

    vaccines.forEach(v => {
      if (v.status === "planned" && v.date) {
        const vaccineDate = new Date(v.date);
        if (vaccineDate >= now && vaccineDate <= thirtyDaysLater) {
          upcomingList.push(v);
          return;
        }
      }
      othersList.push(v);
    });

    upcomingList.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    return { upcoming: upcomingList, others: othersList };
  }, [vaccines]);

  const handleToggleStatus = async (vaccine: Vaccine) => {
    if (!baby) return;
    const newStatus = vaccine.status === "completed" ? "planned" : "completed";
    
    try {
      const res = await fetch(`${API_BASE}/babies/${baby.id}/vaccines/${vaccine.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          status: newStatus,
          date: newStatus === "completed" ? new Date().toISOString().slice(0, 10) : vaccine.date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVaccines(vaccines.map(v => v.id === vaccine.id ? data.data : v));
        if (showDetail?.id === vaccine.id) {
          setShowDetail(data.data);
        }
      }
    } catch {}
  };

  const handleAdd = async () => {
    if (!baby || !newName.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/babies/${baby.id}/vaccines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          status: newStatus,
          date: newDate || null,
          hospital: newHospital.trim() || null,
          is_custom: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVaccines([...vaccines, data.data]);
        resetForm();
      } else {
        setError(data.message || "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!baby || !showDetail) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/babies/${baby.id}/vaccines/${showDetail.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: newName.trim() || showDetail.name,
          status: newStatus,
          date: newDate || null,
          hospital: newHospital.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVaccines(vaccines.map(v => v.id === showDetail.id ? data.data : v));
        setShowDetail(data.data);
        setEditMode(false);
      } else {
        setError(data.message || "更新失败");
      }
    } catch {
      setError("更新失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vaccineId: number) => {
    if (!baby || !confirm("确定要删除这条疫苗记录吗？")) return;
    
    try {
      await fetch(`${API_BASE}/babies/${baby.id}/vaccines/${vaccineId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setVaccines(vaccines.filter(v => v.id !== vaccineId));
      setShowDetail(null);
    } catch {}
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditMode(false);
    setNewName("");
    setNewDate("");
    setNewHospital("");
    setNewStatus("planned");
    setError("");
  };

  const openEdit = (vaccine: Vaccine) => {
    setNewName(vaccine.name);
    setNewDate(vaccine.date || "");
    setNewHospital(vaccine.hospital || "");
    setNewStatus(vaccine.status);
    setEditMode(true);
  };

  const completedCount = vaccines.filter(v => v.status === "completed").length;

  if (showDetail && !editMode) {
    return (
      <Layout>
        <div className="flex items-center gap-2.5 px-[18px] py-3 bg-white border-b border-border flex-shrink-0">
          <button
            onClick={() => setShowDetail(null)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[17px] text-gray-600 border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          <div className="font-serif text-base font-semibold text-gray-900 flex-1">疫苗详情</div>
          <button
            onClick={() => openEdit(showDetail)}
            className="text-sm text-mint bg-transparent border-none cursor-pointer"
          >
            编辑
          </button>
        </div>
        <ScrollArea>
          <div className="p-4">
            <div className={`rounded-card p-4 mb-4 ${
              showDetail.status === "completed" ? "bg-green-light" : "bg-amber-light"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  showDetail.status === "completed" ? "bg-green text-white" : "bg-amber text-white"
                }`}>
                  {showDetail.status === "completed" ? "✓" : "💉"}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{showDetail.name}</div>
                  <div className={`text-sm ${
                    showDetail.status === "completed" ? "text-green-dark" : "text-amber-dark"
                  }`}>
                    {showDetail.status === "completed" ? "已接种" : "待接种"}
                  </div>
                </div>
              </div>
              {showDetail.is_custom > 0 && (
                <div className="inline-flex items-center px-2 py-1 bg-white/50 rounded-pill text-xs text-gray-600">
                  自定义疫苗
                </div>
              )}
            </div>

            <div className="bg-white rounded-card shadow-card overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-gray-400">接种日期</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(showDetail.date)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-gray-400">接种医院</span>
                <span className="text-sm font-medium text-gray-900">{showDetail.hospital || "未记录"}</span>
              </div>
              {showDetail.status === "planned" && showDetail.date && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">距离接种</span>
                  <span className="text-sm font-bold text-amber">
                    还有 {calcDaysUntil(showDetail.date)} 天
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {showDetail.status === "planned" ? (
                <button
                  onClick={() => handleToggleStatus(showDetail)}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-green to-green-dark border-none cursor-pointer"
                >
                  标记已接种
                </button>
              ) : (
                <button
                  onClick={() => handleToggleStatus(showDetail)}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-gray-600 bg-gray-100 border-none cursor-pointer"
                >
                  标记未接种
                </button>
              )}
            </div>

            {showDetail.is_custom > 0 && (
              <button
                onClick={() => handleDelete(showDetail.id)}
                className="w-full h-12 rounded-pill text-base font-semibold text-danger bg-danger-light border-none cursor-pointer mt-3"
              >
                删除疫苗
              </button>
            )}
          </div>
        </ScrollArea>
      </Layout>
    );
  }

  if (showAdd || editMode) {
    return (
      <Layout>
        <div className="flex items-center gap-2.5 px-[18px] py-3 bg-white border-b border-border flex-shrink-0">
          <button
            onClick={resetForm}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[17px] text-gray-600 border-none cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
          <div className="font-serif text-base font-semibold text-gray-900 flex-1">
            {editMode ? "编辑疫苗" : "添加疫苗"}
          </div>
        </div>
        <ScrollArea>
          <div className="p-4">
            {error && (
              <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">{error}</div>
            )}
            
            {!editMode && (
              <div className="mb-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">常用疫苗</div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_VACCINES.slice(0, 6).map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setNewName(v.name)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium cursor-pointer border transition-all ${
                        newName === v.name
                          ? "bg-mint-light border-mint text-mint-dark"
                          : "bg-gray-100 border-transparent text-gray-600"
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">接种状态</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewStatus("planned")}
                  className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-2 transition-all ${
                    newStatus === "planned"
                      ? "bg-amber-light border-amber text-amber-dark"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  待接种
                </button>
                <button
                  onClick={() => setNewStatus("completed")}
                  className={`flex-1 h-10 rounded-sm text-sm font-semibold cursor-pointer border-2 transition-all ${
                    newStatus === "completed"
                      ? "bg-green-light border-green text-green-dark"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  已接种
                </button>
              </div>
            </div>

            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {newStatus === "completed" ? "接种日期" : "计划接种日期"}
              </div>
              <button
                onClick={() => setShowDatePicker(true)}
                className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 text-left cursor-pointer"
              >
                {newDate || "点击选择日期"}
              </button>
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
                onClick={resetForm}
                className="flex-1 h-12 rounded-pill text-base font-semibold text-gray-600 bg-gray-100 border-none cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={editMode ? handleUpdate : handleAdd}
                disabled={saving || !newName.trim()}
                className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer disabled:opacity-50"
              >
                {saving ? "保存中..." : editMode ? "更新" : "保存"}
              </button>
            </div>
          </div>
        </ScrollArea>

        <DatePickerSheet
          visible={showDatePicker}
          value={newDate || new Date().toISOString().slice(0, 10)}
          onConfirm={(date) => {
            setNewDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero className="!pt-3">
        <div className="flex items-center gap-3 relative z-10 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg text-white border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          <div className="font-serif text-[17px] font-semibold text-white flex-1">疫苗记录</div>
        </div>
        <div className="relative z-10">
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
            {upcoming.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-amber uppercase tracking-wider mb-2">即将到来</div>
                {upcoming.map((v) => {
                  const daysUntil = calcDaysUntil(v.date!);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 p-3 mb-2 rounded-sm cursor-pointer bg-amber-light border border-amber/30"
                      onClick={() => setShowDetail(v)}
                    >
                      <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-white text-sm">
                        💉
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{v.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(v.date)}</div>
                      </div>
                      <div className="text-xs font-semibold text-amber bg-amber/10 px-2 py-1 rounded-pill">
                        还有 {daysUntil} 天
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {others.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                  {upcoming.length > 0 ? "其他疫苗" : "疫苗清单"}
                </div>
                {others.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center gap-3 p-3 mb-2 rounded-sm cursor-pointer transition-all ${
                      v.status === "completed" ? "bg-green-light" : "bg-white shadow-card"
                    }`}
                    onClick={() => setShowDetail(v)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      v.status === "completed"
                        ? "bg-green text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {v.status === "completed" ? "✓" : "💉"}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${v.status === "completed" ? "text-green-dark line-through" : "text-gray-900"}`}>
                        {v.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {v.status === "completed" ? `已接种 · ${formatDate(v.date)}` : v.date ? `计划 · ${formatDate(v.date)}` : "待安排"}
                      </div>
                    </div>
                    {v.is_custom > 0 && (
                      <div className="text-[10px] text-mint bg-mint-light px-2 py-0.5 rounded-pill">自定义</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {vaccines.length === 0 && (
              <>
                <div className="text-center py-6 mb-4">
                  <div className="text-4xl mb-2">💉</div>
                  <div className="text-sm text-gray-400">还没有疫苗记录</div>
                  <div className="text-xs text-gray-400 mt-1">点击下方按钮添加疫苗</div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">推荐疫苗计划</div>
                {DEFAULT_VACCINES.slice(0, 8).map((v, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 mb-2 bg-white rounded-sm shadow-card">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                      💉
                    </div>
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
    </Layout>
  );
}
