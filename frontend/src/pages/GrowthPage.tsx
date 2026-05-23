import { useEffect, useMemo, useState } from "react";
import Layout, { Fab, Hero, ScrollArea, SectionCard } from "../components/Layout";
import Header from "../components/Header";
import GrowthChart from "../components/GrowthChart";
import { useBaby } from "../lib/BabyContext";
import {
  createGrowthRecord,
  deleteGrowthRecord,
  fetchGrowthRecords,
  updateGrowthRecord,
} from "../lib/api";
import type { GrowthRecord } from "../lib/api";
import { getWHOData } from "../lib/who-data";

type TabType = "weight" | "height" | "head";

const TABS: { key: TabType; label: string; unit: string; headline: string }[] = [
  { key: "weight", label: "体重", unit: "kg", headline: "关注最近的体重变化" },
  { key: "height", label: "身高", unit: "cm", headline: "看看身高曲线是否平稳" },
  { key: "head", label: "头围", unit: "cm", headline: "记录头围发展趋势" },
];

function calcMonthDiff(birthDate: string, measureDate: string): number {
  const birth = new Date(birthDate);
  const measure = new Date(measureDate);
  const diffMs = measure.getTime() - birth.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
}

function getField(record: GrowthRecord, type: TabType): number | null {
  if (type === "weight") return record.weight;
  if (type === "height") return record.height;
  return record.head_circumference;
}

function getValidation(
  months: number,
  type: TabType,
  value: number,
): { status: "low" | "high" | "ok"; message: string } | null {
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
    return { status: "low", message: "数值偏低，请确认输入是否正确。" };
  }
  if (value > high) {
    return { status: "high", message: "数值偏高，请确认输入是否正确。" };
  }
  return { status: "ok", message: "" };
}

function getPercentileLabel(value: number, whoData: { p3: number; p50: number; p97: number }[]): string {
  if (!whoData.length) return "";
  const entry = whoData[whoData.length - 1];
  if (value < entry.p3) return "P3 以下";
  if (value < entry.p50) return "P3 - P50";
  if (value < entry.p97) return "P50 - P97";
  return "P97 以上";
}

function formatMetric(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return "--";
  return `${value}${unit}`;
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#EAF8F2] text-[#1A5C3A] shadow-[0_10px_24px_rgba(74,184,154,.16)]"
          : "border-white/70 bg-white/88 text-[#5F7368]"
      }`}
    >
      {label}
    </button>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/65 bg-white/90 px-4 py-3 shadow-[0_12px_24px_rgba(26,92,58,.12)] backdrop-blur-md">
      <div className="font-tabular text-xl font-bold text-[#1A5C3A]">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-[#49735D]">{label}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</label>;
}

function renderValueState(validation: { status: "low" | "high" | "ok"; message: string } | null) {
  if (!validation || validation.status === "ok") return "";
  return validation.message;
}

export default function GrowthPage() {
  const { baby } = useBaby();
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
    setLoadError("");
    fetchGrowthRecords(baby.id)
      .then((data) => {
        setRecords(data);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "成长记录加载失败");
      })
      .finally(() => setLoading(false));
  }, [baby]);

  const whoData = useMemo(() => {
    if (!baby) return [];
    return getWHOData(activeTab, baby.gender);
  }, [baby, activeTab]);

  const userPoints = useMemo(() => {
    if (!baby) return [];
    return records
      .map((record) => {
        const value = getField(record, activeTab);
        if (value === null || value === undefined) return null;
        return {
          month: calcMonthDiff(baby.birth_date, record.measured_at),
          value,
        };
      })
      .filter((point): point is { month: number; value: number } => point !== null)
      .sort((a, b) => a.month - b.month);
  }, [records, baby, activeTab]);

  const currentTab = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];
  const latestTabRecord = useMemo(() => {
    return (
      [...records]
        .filter((record) => getField(record, activeTab) !== null)
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0] ?? null
    );
  }, [activeTab, records]);
  const latestTabValue = latestTabRecord ? getField(latestTabRecord, activeTab) : null;
  const latestMetricValue = formatMetric(latestTabValue, currentTab.unit);

  const months = baby ? calcMonthDiff(baby.birth_date, measuredAt) : 0;
  const weightValidation = weight ? getValidation(months, "weight", Number(weight)) : null;
  const heightValidation = height ? getValidation(months, "height", Number(height)) : null;
  const headValidation = headCirc ? getValidation(months, "head", Number(headCirc)) : null;

  const totalMeasurements = useMemo(() => {
    return records.filter((record) => getField(record, activeTab) !== null).length;
  }, [records, activeTab]);

  const hasMeasurementInput = Boolean(weight.trim() || height.trim() || headCirc.trim());

  const openCreate = () => {
    setEditingId(null);
    setWeight("");
    setHeight("");
    setHeadCirc("");
    setMeasuredAt(new Date().toISOString().slice(0, 10));
    setError("");
    setActionId(null);
    setShowAdd(true);
  };

  const handleEdit = (record: GrowthRecord) => {
    setEditingId(record.id);
    setWeight(record.weight ? String(record.weight) : "");
    setHeight(record.height ? String(record.height) : "");
    setHeadCirc(record.head_circumference ? String(record.head_circumference) : "");
    setMeasuredAt(record.measured_at);
    setShowAdd(true);
    setActionId(null);
    setError("");
  };

  const handleDelete = async (id: number) => {
    if (!baby) return;
    try {
      await deleteGrowthRecord(baby.id, id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
    } catch {}
    setActionId(null);
  };

  const handleSave = async () => {
    if (!baby) return;

    if (!hasMeasurementInput) {
      setError("请至少填写一项测量数据");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        head_circumference: headCirc ? Number(headCirc) : null,
        measured_at: measuredAt,
      };

      const savedRecord = editingId
        ? await updateGrowthRecord(baby.id, editingId, payload)
        : await createGrowthRecord(baby.id, payload);

      if (editingId) {
        setRecords((prev) => prev.map((record) => (record.id === editingId ? savedRecord : record)));
      } else {
        setRecords((prev) => [savedRecord, ...prev]);
      }
      setShowAdd(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
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

  const inputClass = (validation: { status: string } | null) =>
    `h-12 w-full rounded-2xl border bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none transition-all ${
      validation?.status === "low" || validation?.status === "high"
        ? "border-[#E2B669] bg-[#FFF9ED]"
        : "border-[#E8E1D5] focus:border-[#5BC4A0]"
    }`;

  if (!baby) {
    return (
      <Layout className="secondary-page">
        <Header title="成长记录" subtitle="先创建宝宝档案，再开始记录曲线" variant="hero" back />
      </Layout>
    );
  }

  if (showAdd) {
    return (
      <Layout className="secondary-page">
        <Header
          title={editingId ? "编辑测量记录" : "新增测量记录"}
          subtitle="把一次测量整理成统一卡片，后续曲线会自动更新"
          variant="hero"
          back
          onBack={handleCancel}
        />

        <ScrollArea className="pb-28">
          <div className="space-y-4 px-4 pb-6 pt-4">
            {error ? (
              <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <SectionCard className="p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="panel-title text-[17px]">{editingId ? "更新这次测量" : "记录新的成长数据"}</div>
                  <div className="panel-note mt-1">支持一次填写体重、身高和头围，也可以只记录其中一项。</div>
                </div>
                <div className="rounded-full bg-[#F0FAF6] px-3 py-1 text-xs font-semibold text-[#2F9B73]">
                  {baby.name}
                </div>
              </div>

              <div className="space-y-4 rounded-[22px] bg-white p-4 shadow-soft">
                <div className="space-y-2">
                  <FieldLabel>测量日期</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                    type="date"
                    value={measuredAt}
                    onChange={(event) => setMeasuredAt(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel>体重 (kg)</FieldLabel>
                    <input
                      className={inputClass(weightValidation)}
                      type="number"
                      step="0.1"
                      placeholder="如：7.5"
                      value={weight}
                      onChange={(event) => setWeight(event.target.value)}
                    />
                    {renderValueState(weightValidation) ? (
                      <div className="text-sm text-[#9D6A1A]">{renderValueState(weightValidation)}</div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>身高 (cm)</FieldLabel>
                    <input
                      className={inputClass(heightValidation)}
                      type="number"
                      step="0.1"
                      placeholder="如：65"
                      value={height}
                      onChange={(event) => setHeight(event.target.value)}
                    />
                    {renderValueState(heightValidation) ? (
                      <div className="text-sm text-[#9D6A1A]">{renderValueState(heightValidation)}</div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>头围 (cm)</FieldLabel>
                    <input
                      className={inputClass(headValidation)}
                      type="number"
                      step="0.1"
                      placeholder="如：42"
                      value={headCirc}
                      onChange={(event) => setHeadCirc(event.target.value)}
                    />
                    {renderValueState(headValidation) ? (
                      <div className="text-sm text-[#9D6A1A]">{renderValueState(headValidation)}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </ScrollArea>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="h-12 flex-1 rounded-full bg-white text-base font-semibold text-[#5F7368] shadow-soft"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasMeasurementInput}
              className="h-12 flex-1 rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] disabled:opacity-60"
            >
              {saving ? "保存中…" : editingId ? "更新记录" : "保存记录"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="secondary-page">
      <Hero className="pb-8 pt-4">
        <Header title="成长曲线" subtitle={currentTab.headline} variant="transparent" back />

        <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
          <StatBadge label={`最新${currentTab.label}`} value={latestMetricValue} />
          <StatBadge label="记录次数" value={String(records.length)} />
          <StatBadge
            label="当前月龄"
            value={baby ? `${calcMonthDiff(baby.birth_date, new Date().toISOString().slice(0, 10))}月` : "--"}
          />
        </div>
      </Hero>

      <ScrollArea className="pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">加载中…</div>
        ) : loadError ? (
          <div className="px-4 pb-6 pt-4">
            <SectionCard className="px-6 py-8 text-center">
              <div className="text-base font-black text-gray-700">成长记录加载失败</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-400">{loadError}</div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6 pt-4">
            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">指标切换</div>
                <div className="panel-note mt-1">统一使用同一套 tabs / chips 查看体重、身高和头围。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <Chip
                    key={tab.key}
                    active={activeTab === tab.key}
                    label={tab.label}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="panel-title text-[17px]">{currentTab.label}曲线</div>
                  <div className="panel-note mt-1">参考 WHO 百分位曲线，对照宝宝自己的测量点。</div>
                </div>
                <div className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-semibold text-[#6E6254]">WHO</div>
              </div>

              <div className="overflow-x-auto rounded-[22px] bg-white p-3 shadow-soft">
                <div className="flex min-w-[340px] justify-center">
                  <GrowthChart whoData={whoData} userPoints={userPoints} unit={currentTab.unit} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6D7C73]">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-[#3D4F8C]" />
                  <span>P50 中位线</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 border-t border-dashed border-[#D4607A]" />
                  <span>P3 / P97</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#4AB89A]" />
                  <span>宝宝数据</span>
                </div>
              </div>

              {userPoints.length <= 1 ? (
                <div className="mt-3 rounded-[18px] bg-[#FBF9F3] px-4 py-3 text-sm text-[#7A8B80]">
                  再记录几次测量，曲线走势会更清晰。
                </div>
              ) : null}
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">阶段摘要</div>
                <div className="panel-note mt-1">把当前指标、月龄位置和最近一次测量放在同一个浅色信息区里。</div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">最近一次</div>
                  <div className="mt-2 text-2xl font-bold text-[#1A5C3A]">{latestMetricValue}</div>
                  <div className="mt-1 text-sm text-[#5F7368]">{latestTabRecord?.measured_at ?? "暂无记录"}</div>
                </div>

                <div className="rounded-[22px] bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">百分位区间</div>
                  <div className="mt-2 text-xl font-bold text-[#1A5C3A]">
                    {latestTabValue !== null ? getPercentileLabel(latestTabValue, whoData) : "--"}
                  </div>
                  <div className="mt-1 text-sm text-[#5F7368]">
                    {latestTabValue !== null ? "帮助快速判断目前大致位置" : "记录后会自动生成"}
                  </div>
                </div>

                <div className="rounded-[22px] bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">有效记录</div>
                  <div className="mt-2 text-2xl font-bold text-[#1A5C3A]">{totalMeasurements}</div>
                  <div className="mt-1 text-sm text-[#5F7368]">当前指标下已纳入曲线的测量次数</div>
                </div>
              </div>

              {latestTabValue !== null && whoData.length > 0 ? (
                <div className="mt-4 rounded-[20px] bg-[#F7FBF8] px-4 py-3 text-sm text-[#375645]">
                  当前{currentTab.label}为 <span className="font-semibold">{latestTabValue}{currentTab.unit}</span>，位于同月龄
                  <span className="font-semibold text-[#2F9B73]"> {getPercentileLabel(latestTabValue, whoData)} </span>
                  区间。
                </div>
              ) : null}
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="border-b border-[#EFE8DD] px-4 py-4">
                <div className="panel-title text-[17px]">测量历史</div>
                <div className="panel-note mt-1">所有状态信息和操作都收在同一张历史卡片里。</div>
              </div>

              {records.length > 0 ? (
                records.map((record) => {
                  const expanded = actionId === record.id;
                  return (
                    <div key={record.id} className="border-b border-[#F1ECE3] px-4 py-4 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setActionId(expanded ? null : record.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[#21382E]">{record.measured_at}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {record.weight !== null ? (
                                <span className="rounded-full bg-[#F0FAF6] px-3 py-1 text-xs font-semibold text-[#2F9B73]">
                                  体重 {record.weight}kg
                                </span>
                              ) : null}
                              {record.height !== null ? (
                                <span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-semibold text-[#6E6254]">
                                  身高 {record.height}cm
                                </span>
                              ) : null}
                              {record.head_circumference !== null ? (
                                <span className="rounded-full bg-[#FFF3EA] px-3 py-1 text-xs font-semibold text-[#B46D2E]">
                                  头围 {record.head_circumference}cm
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-full bg-[#FBF9F3] px-3 py-1 text-xs font-semibold text-[#6D7C73]">
                            {expanded ? "收起" : "操作"}
                          </div>
                        </div>
                      </button>

                      {expanded ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-full bg-[#EAF8F2] px-4 py-2 text-sm font-semibold text-[#1A5C3A]"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className="rounded-full bg-[#FFF4F4] px-4 py-2 text-sm font-semibold text-danger"
                          >
                            删除
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[#7A8B80]">还没有测量记录，先从右下角新增一次吧。</div>
              )}
            </SectionCard>
          </div>
        )}
      </ScrollArea>

      {!loadError ? <Fab onClick={openCreate} /> : null}
    </Layout>
  );
}
