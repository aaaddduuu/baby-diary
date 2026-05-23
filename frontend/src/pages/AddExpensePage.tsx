import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePickerSheet from "../components/DatePickerSheet";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import { createExpense } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import { getLocalDateString } from "./recordFormShared";

const CATEGORIES = [
  { icon: "🥛", label: "奶粉" },
  { icon: "🧻", label: "纸尿裤" },
  { icon: "👕", label: "衣物" },
  { icon: "🧸", label: "玩具" },
  { icon: "🩺", label: "医疗" },
  { icon: "🧴", label: "洗护" },
  { icon: "🥣", label: "辅食" },
  { icon: "🧾", label: "其他" },
] as const;

function NumberKeyboard({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const handlePress = (key: string) => {
    if (key === "delete") {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === ".") {
      if (!value.includes(".")) {
        onChange(value + ".");
      }
      return;
    }

    const parts = value.split(".");
    if (parts[1] && parts[1].length >= 2) return;
    if (value.length >= 8) return;

    const nextValue = value === "0" && key !== "." ? key : value + key;
    if (Number(nextValue) > 99999.99) return;
    onChange(nextValue);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"];

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-gray-50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid grid-cols-3 gap-px p-px">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePress(key)}
              className={`h-[52px] text-xl font-medium ${
                key === "delete" ? "bg-gray-200 text-gray-600" : "bg-white text-gray-900"
              } active:bg-gray-100`}
            >
              {key === "delete" ? "⌫" : key}
            </button>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">{children}</div>;
}

function CategoryChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-[20px] border px-3 py-3 text-center transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] shadow-[0_10px_24px_rgba(74,184,154,.14)]"
          : "border-white/70 bg-white/80"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
          active ? "bg-[#DDF5EA]" : "bg-[#F6F3EA]"
        }`}
      >
        {icon}
      </span>
      <span className={`text-xs font-semibold ${active ? "text-[#1A5C3A]" : "text-[#526258]"}`}>{label}</span>
    </button>
  );
}

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].label);
  const [name, setName] = useState<string>(CATEGORIES[0].label);
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(() => getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; name?: string }>({});
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  const amountNum = Number(amount) || 0;
  const isValid = amountNum > 0 && name.trim().length > 0;

  const handleCategorySelect = (label: string) => {
    setCategory(label);
    setName(label);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
    if (saveError) setSaveError("");
  };

  const handleSubmit = async () => {
    if (!baby) return;

    const nextErrors: typeof errors = {};
    if (amountNum <= 0) nextErrors.amount = "请输入有效金额。";
    if (!name.trim()) nextErrors.name = "请输入商品名称。";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaveError("");
    setLoading(true);

    try {
      await createExpense({
        baby_id: baby.id,
        category,
        amount: amountNum,
        name: name.trim(),
        channel: channel.trim() || undefined,
        date,
      });
      setToast(`已记录 ¥${amountNum}`);
      setTimeout(() => {
        navigate("/expense");
      }, 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="secondary-page">
      <Header title="添加记账" subtitle="把今天这笔花销顺手记下来" variant="hero" back />

      {toast ? (
        <div className="fixed left-1/2 top-4 z-[200] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-6 pt-4">
          {saveError ? (
            <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
              {saveError}
            </div>
          ) : null}

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">金额</div>
              <div className="panel-note mt-1">先记金额，再补充其他信息</div>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyboard(true)}
              className={`w-full rounded-[28px] border px-5 py-6 text-left transition-all ${
                errors.amount
                  ? "border-[#E19B9B] bg-[#FFF4F4]"
                  : "border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] shadow-[0_14px_32px_rgba(47,155,115,.14)]"
              }`}
            >
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A8B80]">总金额</div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-tabular text-[40px] font-bold leading-none text-[#1A5C3A]">
                    {`¥${amount || "0.00"}`}
                  </div>
                  <div className="mt-2 text-sm text-[#5F7368]">点击输入金额</div>
                </div>
                <div className="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[#2F9B73]">编辑</div>
              </div>
            </button>
            {errors.amount ? <div className="mt-2 text-sm text-danger">{errors.amount}</div> : null}
          </SectionCard>

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">分类</div>
              <div className="panel-note mt-1">选择最接近这笔支出的分类</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map((item) => (
                <CategoryChip
                  key={item.label}
                  active={category === item.label}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleCategorySelect(item.label)}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4 p-4">
            <div>
              <div className="panel-title text-[17px]">明细</div>
              <div className="panel-note mt-1">补充名称、日期和购买渠道，之后更好回看</div>
            </div>

            <div className="space-y-3 rounded-[22px] bg-white p-4 shadow-soft">
              <div className="space-y-2">
                <SectionLabel>{"商品名称"}</SectionLabel>
                <input
                  className={`h-12 w-full rounded-2xl border bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none transition-all ${
                    errors.name ? "border-[#E19B9B]" : "border-[#E8E1D5] focus:border-[#5BC4A0]"
                  }`}
                  placeholder="输入商品名称"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                    if (saveError) setSaveError("");
                  }}
                />
                {errors.name ? <div className="text-sm text-danger">{errors.name}</div> : null}
              </div>

              <div className="space-y-2">
                <SectionLabel>{"购买日期"}</SectionLabel>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-left text-sm text-[#21382E] outline-none transition-all focus:ring-2 focus:ring-[#5BC4A0]/30"
                >
                  <span>{date}</span>
                  <span className="text-sm font-medium text-[#7A8B80]">选择日期</span>
                </button>
              </div>

              <div className="space-y-2">
                <SectionLabel>{"购买渠道"}</SectionLabel>
                <input
                  className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none placeholder:text-[#9A9388] focus:border-[#5BC4A0]"
                  placeholder="如：京东、淘宝、线下超市"
                  value={channel}
                  onChange={(event) => {
                    setChannel(event.target.value);
                    if (saveError) setSaveError("");
                  }}
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !isValid}
          className={`h-12 w-full rounded-full text-base font-semibold transition-all ${
            isValid
              ? "bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-white shadow-[0_12px_28px_rgba(47,155,115,.28)]"
              : "bg-[#D9D7D2] text-[#8C877F]"
          }`}
        >
          {loading ? "保存中…" : "保存记账"}
        </button>
      </div>

      {showKeyboard ? (
        <NumberKeyboard
          value={amount}
          onChange={(value) => {
            setAmount(value);
            if (errors.amount) {
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }
            if (saveError) setSaveError("");
          }}
          onClose={() => setShowKeyboard(false)}
        />
      ) : null}

      <DatePickerSheet
        visible={showDatePicker}
        value={date}
        onConfirm={(nextDate) => {
          setDate(nextDate);
          setShowDatePicker(false);
          if (saveError) setSaveError("");
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Layout>
  );
}
