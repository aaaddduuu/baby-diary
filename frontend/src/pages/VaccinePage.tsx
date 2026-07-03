import { useEffect, useMemo, useState } from "react";
import Layout, { Fab, Hero, ScrollArea, SectionCard } from "../components/Layout";
import Header from "../components/Header";
import DatePickerSheet from "../components/DatePickerSheet";
import DateFieldButton from "../components/DateFieldButton";
import { useBaby } from "../lib/BabyContext";
import { createVaccine, deleteVaccine, fetchVaccines, updateVaccine } from "../lib/api";
import type { VaccineRecord as Vaccine } from "../lib/api";
import { getLocalDateString } from "./recordFormShared";

type VaccineFamilyKey = "bcg" | "hepb" | "polio" | "dtap" | "measles";

type VaccinePlanEntry = {
  label: string;
  key: VaccineFamilyKey;
  aliases: string[];
};

type VaccinePlanItem = {
  age: string;
  months?: number;
  years?: number;
  withinDays?: number;
  entries: VaccinePlanEntry[];
};

const DEFAULT_VACCINES = [
  { name: "卡介苗", age: "出生" },
  { name: "乙肝疫苗", age: "出生" },
  { name: "脊髓灰质炎三价混合疫苗", age: "2个月" },
  { name: "百白破混合制剂", age: "3个月" },
  { name: "麻疹疫苗", age: "8个月" },
  { name: "百白破混合制剂复种", age: "1.5-2岁" },
  { name: "脊髓灰质炎三价混合疫苗复种", age: "4岁" },
  { name: "麻疹疫苗复种", age: "6岁" },
];

const REFERENCE_VACCINE_PLAN: VaccinePlanItem[] = [
  {
    age: "出生",
    withinDays: 28,
    entries: [
      { label: "卡介苗", key: "bcg", aliases: ["卡介苗"] },
      { label: "乙肝疫苗", key: "hepb", aliases: ["乙肝疫苗"] },
    ],
  },
  {
    age: "1个月",
    months: 1,
    entries: [{ label: "乙肝疫苗", key: "hepb", aliases: ["乙肝疫苗"] }],
  },
  {
    age: "2个月",
    months: 2,
    entries: [
      { label: "脊髓灰质炎三价混合疫苗", key: "polio", aliases: ["脊髓灰质炎三价混合疫苗", "脊灰减毒活疫苗", "脊灰灭活疫苗"] },
    ],
  },
  {
    age: "3个月",
    months: 3,
    entries: [
      { label: "脊髓灰质炎三价混合疫苗", key: "polio", aliases: ["脊髓灰质炎三价混合疫苗", "脊灰减毒活疫苗", "脊灰灭活疫苗"] },
      { label: "百白破混合制剂", key: "dtap", aliases: ["百白破混合制剂", "百白破", "白破疫苗"] },
    ],
  },
  {
    age: "4个月",
    months: 4,
    entries: [
      { label: "脊髓灰质炎三价混合疫苗", key: "polio", aliases: ["脊髓灰质炎三价混合疫苗", "脊灰减毒活疫苗", "脊灰灭活疫苗"] },
      { label: "百白破混合制剂", key: "dtap", aliases: ["百白破混合制剂", "百白破", "白破疫苗"] },
    ],
  },
  {
    age: "5个月",
    months: 5,
    entries: [{ label: "百白破混合制剂", key: "dtap", aliases: ["百白破混合制剂", "百白破", "白破疫苗"] }],
  },
  {
    age: "6个月",
    months: 6,
    entries: [{ label: "乙肝疫苗", key: "hepb", aliases: ["乙肝疫苗"] }],
  },
  {
    age: "8个月",
    months: 8,
    entries: [{ label: "麻疹疫苗", key: "measles", aliases: ["麻疹疫苗", "麻腮风疫苗"] }],
  },
  {
    age: "1.5-2岁",
    months: 18,
    entries: [{ label: "百白破混合制剂复种", key: "dtap", aliases: ["百白破混合制剂", "百白破", "白破疫苗"] }],
  },
  {
    age: "4岁",
    years: 4,
    entries: [
      { label: "脊髓灰质炎三价混合疫苗复种", key: "polio", aliases: ["脊髓灰质炎三价混合疫苗", "脊灰减毒活疫苗", "脊灰灭活疫苗"] },
    ],
  },
  {
    age: "6岁",
    years: 6,
    entries: [{ label: "麻疹疫苗复种", key: "measles", aliases: ["麻疹疫苗", "麻腮风疫苗"] }],
  },
];

const VACCINE_FAMILY_ALIASES: Record<VaccineFamilyKey, string[]> = {
  bcg: ["卡介苗"],
  hepb: ["乙肝疫苗"],
  polio: ["脊髓灰质炎三价混合疫苗", "脊灰减毒活疫苗", "脊灰灭活疫苗"],
  dtap: ["百白破混合制剂", "百白破", "白破疫苗"],
  measles: ["麻疹疫苗", "麻腮风疫苗"],
};

type VaccineFocus = {
  item: VaccinePlanItem;
  dueDate: Date;
  isOverdue: boolean;
};

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

function normalizeVaccineName(name: string): string {
  return name.replace(/\s+/g, "").replace(/[（）()]/g, "");
}

function isSameOrIncludedName(source: string, candidate: string): boolean {
  return source.includes(candidate) || candidate.includes(source);
}

function formatReferenceDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatBabyAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const today = new Date();
  birth.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years > 0) return `${years}岁${months}个月`;
  if (months > 0) return `${months}个月${days}天`;
  return `出生${Math.max(1, Math.floor((today.getTime() - birth.getTime()) / 86400000) + 1)}天`;
}

function addScheduleOffset(birthDate: string, item: VaccinePlanItem): Date {
  const birth = new Date(birthDate);
  birth.setHours(0, 0, 0, 0);
  const due = new Date(birth);

  if (typeof item.withinDays === "number") due.setDate(due.getDate() + item.withinDays);
  if (typeof item.months === "number") due.setMonth(due.getMonth() + item.months);
  if (typeof item.years === "number") due.setFullYear(due.getFullYear() + item.years);

  return due;
}

function countCompletedVaccines(vaccines: Vaccine[]) {
  const counts: Record<VaccineFamilyKey, number> = {
    bcg: 0,
    hepb: 0,
    polio: 0,
    dtap: 0,
    measles: 0,
  };

  vaccines
    .filter((vaccine) => vaccine.status === "completed")
    .forEach((vaccine) => {
      const normalized = normalizeVaccineName(vaccine.name);
      (Object.entries(VACCINE_FAMILY_ALIASES) as [VaccineFamilyKey, string[]][]).forEach(([key, aliases]) => {
        const matched = aliases.some((alias) => isSameOrIncludedName(normalized, normalizeVaccineName(alias)));
        if (matched) counts[key] += 1;
      });
    });

  return counts;
}

function getRequiredCount(targetIndex: number, key: VaccineFamilyKey): number {
  return REFERENCE_VACCINE_PLAN.slice(0, targetIndex + 1).reduce((total, item) => {
    return total + item.entries.filter((entry) => entry.key === key).length;
  }, 0);
}

function isPlanItemCompleted(targetIndex: number, completedCounts: Record<VaccineFamilyKey, number>): boolean {
  const item = REFERENCE_VACCINE_PLAN[targetIndex];
  const requiredKeys = Array.from(new Set(item.entries.map((entry) => entry.key)));
  return requiredKeys.every((key) => completedCounts[key] >= getRequiredCount(targetIndex, key));
}

function getCurrentFocus(birthDate: string, vaccines: Vaccine[]): VaccineFocus | null {
  const completedCounts = countCompletedVaccines(vaccines);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstIncompleteIndex = REFERENCE_VACCINE_PLAN.findIndex((_, index) => !isPlanItemCompleted(index, completedCounts));
  if (firstIncompleteIndex === -1) return null;

  const item = REFERENCE_VACCINE_PLAN[firstIncompleteIndex];
  const dueDate = addScheduleOffset(birthDate, item);
  return {
    item,
    dueDate,
    isOverdue: dueDate.getTime() < today.getTime(),
  };
}

function StatusChip({
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

function VaccineStatusChip({
  status,
  selected = true,
  label,
  interactive = false,
  size = "md",
  className = "",
  onClick,
}: {
  status: "planned" | "completed";
  selected?: boolean;
  label: string;
  interactive?: boolean;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
}) {
  const selectedClass =
    status === "completed"
      ? "border-[#5BC4A0] bg-[#EAF8F2] text-[#1A5C3A] shadow-[0_10px_24px_rgba(74,184,154,.16)]"
      : "border-[#E7C178] bg-[#FFF7E9] text-[#9D6A1A] shadow-[0_10px_24px_rgba(231,193,120,.16)]";
  const inactiveClass = "border-white/70 bg-white/88 text-[#5F7368]";
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm";
  const classes = `rounded-full border font-semibold transition-all ${
    selected ? selectedClass : inactiveClass
  } ${sizeClass} ${className}`.trim();

  if (!interactive) {
    return <span className={classes}>{label}</span>;
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {label}
    </button>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[20px] border border-white/65 bg-white/90 p-4 shadow-[0_12px_24px_rgba(26,92,58,.12)] backdrop-blur-md">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#49735D]">{label}</div>
      <div className="mt-2 font-tabular text-2xl font-bold text-[#1A5C3A]">{value}</div>
      <div className="mt-1 text-sm text-[#5F7368]">{note}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</label>;
}

export default function VaccinePage() {
  const { baby } = useBaby();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
  const [listFilter, setListFilter] = useState<"all" | "upcoming" | "completed">("all");

  useEffect(() => {
    if (!baby) return;
    setLoading(true);
    setLoadError("");
    fetchVaccines(baby.id)
      .then((data) => {
        setVaccines(data);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "疫苗记录加载失败");
      })
      .finally(() => setLoading(false));
  }, [baby]);

  const { upcoming, others } = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingList: Vaccine[] = [];
    const othersList: Vaccine[] = [];

    vaccines.forEach((vaccine) => {
      if (vaccine.status === "planned" && vaccine.date) {
        const vaccineDate = new Date(vaccine.date);
        if (vaccineDate >= now && vaccineDate <= thirtyDaysLater) {
          upcomingList.push(vaccine);
          return;
        }
      }
      othersList.push(vaccine);
    });

    upcomingList.sort((a, b) => new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime());
    othersList.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });

    return { upcoming: upcomingList, others: othersList };
  }, [vaccines]);

  const completedCount = vaccines.filter((vaccine) => vaccine.status === "completed").length;
  const plannedCount = vaccines.filter((vaccine) => vaccine.status === "planned").length;
  const completionRate = vaccines.length > 0 ? Math.round((completedCount / vaccines.length) * 100) : 0;

  const filteredOthers = useMemo(() => {
    if (listFilter === "upcoming") return others.filter((vaccine) => vaccine.status === "planned");
    if (listFilter === "completed") return others.filter((vaccine) => vaccine.status === "completed");
    return others;
  }, [listFilter, others]);

  const vaccineFocus = useMemo(() => {
    if (!baby?.birth_date) return null;
    return getCurrentFocus(baby.birth_date, vaccines);
  }, [baby?.birth_date, vaccines]);

  const babyAgeText = useMemo(() => {
    if (!baby?.birth_date) return "";
    return formatBabyAge(baby.birth_date);
  }, [baby?.birth_date]);

  const handleToggleStatus = async (vaccine: Vaccine) => {
    if (!baby) return;
    const status = vaccine.status === "completed" ? "planned" : "completed";

    try {
      const updated = await updateVaccine(baby.id, vaccine.id, {
        status,
        date: status === "completed" ? new Date().toISOString().slice(0, 10) : vaccine.date,
      });
      setVaccines((prev) => prev.map((item) => (item.id === vaccine.id ? updated : item)));
      if (showDetail?.id === vaccine.id) {
        setShowDetail(updated);
      }
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
    setShowDatePicker(false);
  };

  const handleAdd = async () => {
    if (!baby || !newName.trim()) return;
    setSaving(true);
    setError("");

    try {
      const created = await createVaccine(baby.id, {
        name: newName.trim(),
        status: newStatus,
        date: newDate || null,
        hospital: newHospital.trim() || null,
        is_custom: true,
      });
      setVaccines((prev) => [...prev, created]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!baby || !showDetail) return;
    setSaving(true);
    setError("");

    try {
      const updated = await updateVaccine(baby.id, showDetail.id, {
        name: newName.trim() || showDetail.name,
        status: newStatus,
        date: newDate || null,
        hospital: newHospital.trim() || null,
      });
      setVaccines((prev) => prev.map((item) => (item.id === showDetail.id ? updated : item)));
      setShowDetail(updated);
      setEditMode(false);
      setShowDatePicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vaccineId: number) => {
    if (!baby || !window.confirm("确定要删除这条疫苗记录吗？")) return;

    try {
      await deleteVaccine(baby.id, vaccineId);
      setVaccines((prev) => prev.filter((vaccine) => vaccine.id !== vaccineId));
      setShowDetail(null);
    } catch {}
  };

  const openCreate = () => {
    resetForm();
    setShowAdd(true);
  };

  const openEdit = (vaccine: Vaccine) => {
    setNewName(vaccine.name);
    setNewDate(vaccine.date || "");
    setNewHospital(vaccine.hospital || "");
    setNewStatus(vaccine.status);
    setError("");
    setShowDatePicker(false);
    setEditMode(true);
  };

  if (!baby) {
    return (
      <Layout className="secondary-page">
        <Header title="疫苗记录" subtitle="先创建宝宝档案，再开始整理接种计划" variant="hero" back />
      </Layout>
    );
  }

  if (showDetail && !editMode) {
    return (
      <Layout className="secondary-page">
        <Header
          title="疫苗详情"
          subtitle={showDetail.status === "completed" ? "这针已经完成接种" : "查看计划时间和接种提醒"}
          variant="hero"
          back
          onBack={() => setShowDetail(null)}
          right={
            <button
              type="button"
              onClick={() => openEdit(showDetail)}
              className="rounded-full border border-white/45 bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm"
            >
              编辑
            </button>
          }
        />

        <ScrollArea className="pb-28">
          <div className="space-y-4 px-4 pb-6 pt-4">
            <SectionCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="panel-title text-[17px]">{showDetail.name}</div>
                  <div className="panel-note mt-1">
                    {showDetail.status === "completed" ? "已接种，可回看日期与医院。" : "待接种，可继续安排或直接标记完成。"}
                  </div>
                </div>
                <div className="shrink-0">
                  <VaccineStatusChip
                    status={showDetail.status}
                    label={showDetail.status === "completed" ? "已接种" : "待接种"}
                    size="sm"
                  />
                </div>
              </div>

              {showDetail.is_custom > 0 ? (
                <div className="mt-4 inline-flex rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-semibold text-[#6E6254]">
                  自定义疫苗
                </div>
              ) : null}
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">接种信息</div>
                <div className="panel-note mt-1">记录接种日期、医院和当前状态，方便之后回看。</div>
              </div>

              <div className="space-y-3 rounded-[22px] bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-[#7A8B80]">接种日期</div>
                  <div className="text-sm font-semibold text-[#21382E]">{formatDate(showDetail.date)}</div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-[#7A8B80]">接种医院</div>
                  <div className="text-right text-sm font-semibold text-[#21382E]">{showDetail.hospital || "未记录"}</div>
                </div>
                {showDetail.status === "planned" && showDetail.date ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-[#7A8B80]">距离接种</div>
                    <div className="text-sm font-semibold text-[#9D6A1A]">{calcDaysUntil(showDetail.date)} 天</div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </ScrollArea>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleToggleStatus(showDetail)}
              className={`h-12 flex-1 rounded-full text-base font-semibold ${
                showDetail.status === "planned"
                  ? "bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-white shadow-[0_12px_28px_rgba(47,155,115,.28)]"
                  : "bg-white text-[#5F7368] shadow-soft"
              }`}
            >
              {showDetail.status === "planned" ? "标记为已接种" : "改回待接种"}
            </button>
            {showDetail.is_custom > 0 ? (
              <button
                type="button"
                onClick={() => handleDelete(showDetail.id)}
                className="h-12 rounded-full bg-[#FFF4F4] px-5 text-base font-semibold text-danger"
              >
                删除
              </button>
            ) : null}
          </div>
        </div>
      </Layout>
    );
  }

  if (showAdd || editMode) {
    return (
      <Layout className="secondary-page">
        <Header
          title={editMode ? "编辑疫苗" : "新增疫苗"}
          subtitle={editMode ? "调整状态、日期和接种医院" : "记录计划针次或自定义疫苗"}
          variant="hero"
          back
          onBack={resetForm}
        />

        <ScrollArea className="pb-28">
          <div className="space-y-4 px-4 pb-6 pt-4">
            {error ? (
              <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {!editMode ? (
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">快捷选择</div>
                  <div className="panel-note mt-1">常用疫苗先给几个快捷入口，也可以直接手动输入。</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_VACCINES.slice(0, 8).map((item) => (
                    <StatusChip
                      key={item.name}
                      active={newName === item.name}
                      label={item.name}
                      onClick={() => setNewName(item.name)}
                    />
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">疫苗信息</div>
                <div className="panel-note mt-1">填写名称、接种状态、日期和医院。</div>
              </div>

              <div className="space-y-4 rounded-[22px] bg-white p-4 shadow-soft">
                <div className="space-y-2">
                  <FieldLabel>疫苗名称</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                    placeholder="如：13价肺炎球菌疫苗"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>接种状态</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <VaccineStatusChip
                      status="planned"
                      selected={newStatus === "planned"}
                      label="待接种"
                      interactive
                      onClick={() => setNewStatus("planned")}
                    />
                    <VaccineStatusChip
                      status="completed"
                      selected={newStatus === "completed"}
                      label="已接种"
                      interactive
                      onClick={() => setNewStatus("completed")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{newStatus === "completed" ? "接种日期" : "计划接种日期"}</FieldLabel>
                  <DateFieldButton
                    value={newDate}
                    ariaLabel={newStatus === "completed" ? "选择接种日期" : "选择计划接种日期"}
                    onClick={() => setShowDatePicker(true)}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>接种医院</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none focus:border-[#5BC4A0]"
                    placeholder="选填：如社区卫生服务中心"
                    value={newHospital}
                    onChange={(event) => setNewHospital(event.target.value)}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        </ScrollArea>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="h-12 flex-1 rounded-full bg-white text-base font-semibold text-[#5F7368] shadow-soft"
            >
              取消
            </button>
            <button
              type="button"
              onClick={editMode ? handleUpdate : handleAdd}
              disabled={saving || !newName.trim()}
              className="h-12 flex-1 rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] disabled:opacity-60"
            >
              {saving ? "保存中…" : editMode ? "更新疫苗" : "保存疫苗"}
            </button>
          </div>
        </div>

        <DatePickerSheet
          visible={showDatePicker}
          value={newDate || getLocalDateString()}
          maxDate={newStatus === "completed" ? getLocalDateString() : undefined}
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
    <Layout className="secondary-page">
      <Hero className="pb-8 pt-4">
        <Header
          title="疫苗记录"
          subtitle="查看待接种和已完成的疫苗记录。"
          variant="transparent"
          back
        />

        <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
          <StatTile label="完成进度" value={`${completedCount}/${vaccines.length || 0}`} note={`${completionRate}% 已完成`} />
          <StatTile label="待接种" value={String(plannedCount)} note="仍需跟进的针次" />
          <StatTile label="30天内" value={String(upcoming.length)} note="即将到来的提醒" />
        </div>
      </Hero>

      <ScrollArea className="pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">加载中…</div>
        ) : loadError ? (
          <div className="px-4 pb-6 pt-4">
            <SectionCard className="px-6 py-8 text-center">
              <div className="text-base font-black text-gray-700">疫苗记录加载失败</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-400">{loadError}</div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6 pt-4">
            <SectionCard className="overflow-hidden">
              <div className="border-b border-[#EFE8DD] px-4 py-4">
                <div className="panel-title text-[17px]">接种时间表参考</div>
                <div className="panel-note mt-1">按你提供的接种单整理，并结合宝宝出生日期自动定位当前该关注的针次。</div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="rounded-[20px] bg-[#F7FAF8] px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6A8575]">当前年龄</div>
                    <div className="mt-1 text-base font-bold text-[#1A5C3A]">{babyAgeText}</div>
                  </div>
                  {vaccineFocus ? (
                    <div className={`rounded-[20px] px-4 py-3 ${vaccineFocus.isOverdue ? "bg-[#FFF4F4]" : "bg-[#FFF8EC]"}`}>
                      <div className={`text-xs font-bold uppercase tracking-[0.18em] ${vaccineFocus.isOverdue ? "text-[#B65454]" : "text-[#9D6A1A]"}`}>
                        {vaccineFocus.isOverdue ? "当前漏打" : "当前关注"}
                      </div>
                      <div className="mt-1 text-sm font-bold text-[#21382E]">
                        {vaccineFocus.item.age} · {vaccineFocus.item.entries.map((entry) => entry.label).join("、")}
                      </div>
                      <div className="mt-1 text-xs text-[#7A8B80]">参考节点：{formatReferenceDate(vaccineFocus.dueDate)}</div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] bg-[#EAF8F2] px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#49735D]">当前状态</div>
                      <div className="mt-1 text-sm font-bold text-[#1A5C3A]">这份参考时间表里的针次都已完成</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {REFERENCE_VACCINE_PLAN.map((item) => {
                    const isFocused = vaccineFocus?.item.age === item.age;
                    return (
                      <div
                        key={item.age}
                        className={`rounded-[22px] border px-4 py-4 transition-all ${
                          isFocused
                            ? vaccineFocus?.isOverdue
                              ? "border-[#F2C9C9] bg-[#FFF7F7] shadow-[0_10px_24px_rgba(182,84,84,.08)]"
                              : "border-[#F2DFC0] bg-[#FFF8EC] shadow-[0_10px_24px_rgba(231,193,120,.12)]"
                            : "border-[#F1ECE3] bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isFocused
                                ? vaccineFocus?.isOverdue
                                  ? "bg-[#FDE2E2] text-[#B65454]"
                                  : "bg-white text-[#9D6A1A]"
                                : "bg-[#F6F3EA] text-[#6E6254]"
                            }`}
                          >
                            {item.age}
                          </div>
                          <div className="min-w-0 flex-1">
                            {isFocused ? (
                              <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                vaccineFocus?.isOverdue ? "bg-[#FDE2E2] text-[#B65454]" : "bg-[#FFF1CF] text-[#9D6A1A]"
                              }`}>
                                {vaccineFocus?.isOverdue ? "需要补种关注" : "当前建议关注"}
                              </div>
                            ) : null}
                            <div className="text-sm font-semibold text-[#21382E]">
                              {item.entries.map((entry) => entry.label).join("、")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[18px] bg-[#F7F4EE] px-4 py-3 text-xs leading-6 text-[#7A8B80]">
                  说明：不同地区联合疫苗方案可能略有差异，实际接种请以当地接种门诊和医生建议为准。
                </div>
              </div>
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">列表筛选</div>
                <div className="panel-note mt-1">按接种状态筛选，快速查看待接种和已完成记录。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusChip active={listFilter === "all"} label="全部" onClick={() => setListFilter("all")} />
                <StatusChip active={listFilter === "upcoming"} label="待接种" onClick={() => setListFilter("upcoming")} />
                <StatusChip active={listFilter === "completed"} label="已接种" onClick={() => setListFilter("completed")} />
              </div>
            </SectionCard>

            {upcoming.length > 0 ? (
              <SectionCard className="overflow-hidden">
                <div className="border-b border-[#EFE8DD] px-4 py-4">
                  <div className="panel-title text-[17px]">即将到来</div>
                  <div className="panel-note mt-1">未来 30 天内的计划优先露出，方便快速安排。</div>
                </div>
                <div className="space-y-3 p-4">
                  {upcoming.map((vaccine) => (
                    <button
                      key={vaccine.id}
                      type="button"
                      onClick={() => setShowDetail(vaccine)}
                      className="flex w-full items-center gap-3 rounded-[22px] border border-[#F2DFC0] bg-[#FFF8EC] p-4 text-left"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4D59A] text-xl">💉</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[#21382E]">{vaccine.name}</div>
                        <div className="mt-1 text-xs text-[#7A8B80]">{formatDate(vaccine.date)}</div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#9D6A1A]">
                        {calcDaysUntil(vaccine.date ?? "")} 天后
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard className="overflow-hidden">
              <div className="border-b border-[#EFE8DD] px-4 py-4">
                <div className="panel-title text-[17px]">{upcoming.length > 0 ? "其他疫苗" : "疫苗清单"}</div>
                <div className="panel-note mt-1">查看疫苗名称、状态和计划日期。</div>
              </div>

              {filteredOthers.length > 0 ? (
                filteredOthers.map((vaccine) => (
                  <button
                    key={vaccine.id}
                    type="button"
                    onClick={() => setShowDetail(vaccine)}
                    className="flex w-full items-center gap-3 border-b border-[#F1ECE3] px-4 py-4 text-left last:border-b-0"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${
                        vaccine.status === "completed" ? "bg-[#EAF8F2]" : "bg-[#FBF4E5]"
                      }`}
                    >
                      {vaccine.status === "completed" ? "✓" : "💉"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[#21382E]">{vaccine.name}</div>
                        <VaccineStatusChip
                          status={vaccine.status}
                          label={vaccine.status === "completed" ? "已接种" : "待接种"}
                          size="sm"
                        />
                        {vaccine.is_custom > 0 ? (
                          <span className="rounded-full bg-[#F6F3EA] px-2.5 py-1 text-[11px] font-semibold text-[#6E6254]">
                            自定义
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-[#7A8B80]">
                        {vaccine.status === "completed"
                          ? `已接种 · ${formatDate(vaccine.date)}`
                          : vaccine.date
                            ? `计划 · ${formatDate(vaccine.date)}`
                            : "待安排日期"}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[#7A8B80]">当前筛选下还没有疫苗记录。</div>
              )}
            </SectionCard>

            {vaccines.length === 0 ? (
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">推荐计划</div>
                  <div className="panel-note mt-1">还没开始记录时，先给一个可参考的基础清单。</div>
                </div>
                <div className="space-y-3">
                  {DEFAULT_VACCINES.slice(0, 8).map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-soft">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FBF4E5] text-lg">💉</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[#21382E]">{item.name}</div>
                        <div className="mt-1 text-xs text-[#7A8B80]">{item.age}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </div>
        )}
      </ScrollArea>

      {!loadError ? <Fab onClick={openCreate} /> : null}
    </Layout>
  );
}
