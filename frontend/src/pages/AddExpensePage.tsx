import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePickerSheet from "../components/DatePickerSheet";
import DateFieldButton from "../components/DateFieldButton";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import { useBaby } from "../lib/BabyContext";
import { createExpense } from "../lib/api";
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

const INCOME_CATEGORIES = [
  { icon: "🧧", label: "红包" },
  { icon: "💝", label: "礼金" },
  { icon: "💸", label: "转账" },
  { icon: "✨", label: "其他收入" },
] as const;

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
      className={`flex flex-col items-center gap-1.5 rounded-[18px] border px-3 py-3 text-center transition-all ${
        active
          ? "border-[#5BC4A0] bg-[#F0FAF6] shadow-[0_10px_24px_rgba(74,184,154,.14)]"
          : "border-white/70 bg-white/80"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl ${
          active ? "bg-[#DDF5EA]" : "bg-[#F6F3EA]"
        }`}
      >
        {icon}
      </span>
      <span className={`text-xs font-semibold ${active ? "text-[#1A5C3A]" : "text-[#526258]"}`}>{label}</span>
    </button>
  );
}

function normalizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const hasDot = cleaned.includes(".");
  const [intRaw = "", ...fractionParts] = cleaned.split(".");
  const intPart = intRaw.replace(/^0+(?=\d)/, "") || (hasDot ? "0" : intRaw);
  const fraction = fractionParts.join("").slice(0, 2);

  return hasDot ? `${intPart || "0"}.${fraction}` : intPart;
}

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].label);
  const [name, setName] = useState<string>(CATEGORIES[0].label);
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(() => getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; name?: string }>({});
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  const amountNum = Number(amount) || 0;
  const isValid = amountNum > 0 && name.trim().length > 0;
  const categoryOptions = direction === "income" ? INCOME_CATEGORIES : CATEGORIES;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 160);

    return () => window.clearTimeout(timer);
  }, []);

  const handleCategorySelect = (label: string) => {
    setCategory(label);
    setName(label);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
    if (saveError) setSaveError("");
  };

  const handleDirectionChange = (next: "expense" | "income") => {
    setDirection(next);
    const nextDefaultCategory = (next === "income" ? INCOME_CATEGORIES : CATEGORIES)[0].label;
    setCategory(nextDefaultCategory);
    setName(nextDefaultCategory);
    if (saveError) setSaveError("");
    requestAnimationFrame(() => amountInputRef.current?.focus());
  };

  const handleAmountChange = (raw: string) => {
    const nextValue = normalizeAmountInput(raw);
    if (nextValue && Number(nextValue) > 99999.99) return;

    setAmount(nextValue);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
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
      if (nextErrors.name) setDetailsExpanded(true);
      return;
    }

    setSaveError("");
    setLoading(true);

    try {
      await createExpense({
        baby_id: baby.id,
        direction,
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
      <Header title="添加记账" subtitle={direction === "income" ? "先记金额，再补充是谁给的" : "先记金额，再顺手补充明细"} variant="hero" back />

      {toast ? (
        <div className="fixed left-1/2 top-4 z-[200] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <ScrollArea className="pb-28">
        <div className="space-y-3 px-4 pb-6 pt-4">
          {saveError ? (
            <div className="rounded-[20px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
              {saveError}
            </div>
          ) : null}

          <SectionCard className="p-4">
            <div className="flex rounded-full bg-[#EAF5EF] p-1">
              <button
                type="button"
                onClick={() => handleDirectionChange("expense")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  direction === "expense"
                    ? "bg-white text-[#1A5C3A] shadow-[0_10px_24px_rgba(74,184,154,.12)]"
                    : "text-[#526258]"
                }`}
              >
                宝宝支出
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange("income")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  direction === "income"
                    ? "bg-white text-[#9D6A1A] shadow-[0_10px_24px_rgba(231,193,120,.14)]"
                    : "text-[#526258]"
                }`}
              >
                红包收入
              </button>
            </div>

            <div className="mt-4 mb-2 flex items-center justify-between">
              <div>
                <div className="panel-title text-[17px]">金额</div>
                <div className="panel-note mt-1">
                  {direction === "income" ? "默认打开金额输入，收红包时更快" : "默认打开金额输入，记一笔花销只要几秒"}
                </div>
              </div>
              <div className="rounded-full bg-[#F0FAF6] px-3 py-1.5 text-xs font-semibold text-[#2F9B73]">
                ¥
              </div>
            </div>

            <div
              className={`rounded-[26px] border px-5 py-4 transition-all ${
                errors.amount
                  ? "border-[#E19B9B] bg-[#FFF4F4]"
                  : "border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] shadow-[0_14px_32px_rgba(47,155,115,.14)]"
              }`}
            >
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A8B80]">总金额</div>
              <div className="flex items-end gap-2">
                <span className="pb-1 font-tabular text-[28px] font-bold text-[#1A5C3A]">¥</span>
                <input
                  ref={amountInputRef}
                  autoFocus
                  inputMode="decimal"
                  enterKeyHint="done"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-tabular text-[40px] font-bold leading-none text-[#1A5C3A] outline-none placeholder:text-[#A7B8AE]"
                />
              </div>
              <div className="mt-2 text-sm text-[#5F7368]">输入后可直接点底部保存</div>
            </div>
            {errors.amount ? <div className="mt-2 text-sm text-danger">{errors.amount}</div> : null}
          </SectionCard>

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">分类选择</div>
              <div className="panel-note mt-1">{direction === "income" ? "选择这笔收入来自哪里" : "8宫格常用分类，减少查找和滚动"}</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {categoryOptions.map((item) => (
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

          <SectionCard className="p-4">
            <button
              type="button"
              onClick={() => setDetailsExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-[20px] border border-[#E8E1D5] bg-[#FBF9F3] px-4 py-3 text-left transition-all active:scale-[0.99]"
            >
              <div>
                <div className="panel-title text-[16px]">详情</div>
                <div className="panel-note mt-1">
                  {detailsExpanded
                    ? "可补充名称、日期和渠道"
                    : `${name || category} · ${date}${channel ? ` · ${channel}` : ""}`}
                </div>
              </div>
              <div className="text-sm font-semibold text-[#2F9B73]">{detailsExpanded ? "收起详情" : "展开详情"}</div>
            </button>

            {detailsExpanded ? (
              <div className="mt-3 space-y-3 rounded-[22px] bg-white p-4 shadow-soft">
                <div className="space-y-2">
                  <SectionLabel>{direction === "income" ? "红包备注" : "商品名称"}</SectionLabel>
                  <input
                    className={`h-12 w-full rounded-2xl border bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none transition-all ${
                      errors.name ? "border-[#E19B9B]" : "border-[#E8E1D5] focus:border-[#5BC4A0]"
                    }`}
                    placeholder={direction === "income" ? "如：奶奶满月红包" : "输入商品名称"}
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
                  <SectionLabel>{direction === "income" ? "收到日期" : "购买日期"}</SectionLabel>
                  <DateFieldButton
                    value={date}
                    ariaLabel={direction === "income" ? "选择收到日期" : "选择购买日期"}
                    onClick={() => setShowDatePicker(true)}
                  />
                </div>

                <div className="space-y-2">
                  <SectionLabel>{direction === "income" ? "收款方式" : "购买渠道"}</SectionLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none placeholder:text-[#9A9388] focus:border-[#5BC4A0]"
                    placeholder={direction === "income" ? "如：现金、微信转账、支付宝" : "如：京东、淘宝、线下超市"}
                    value={channel}
                    onChange={(event) => {
                      setChannel(event.target.value);
                      if (saveError) setSaveError("");
                    }}
                  />
                </div>
              </div>
            ) : null}
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
          {loading ? "保存中…" : direction === "income" ? "保存红包收入" : "保存记账"}
        </button>
      </div>

      <DatePickerSheet
        visible={showDatePicker}
        value={date}
        maxDate={getLocalDateString()}
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
