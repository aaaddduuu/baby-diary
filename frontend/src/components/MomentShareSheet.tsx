import { useEffect, useMemo, useState } from "react";
import DateFieldButton, { formatDateFieldValue } from "./DateFieldButton";
import DatePickerSheet from "./DatePickerSheet";
import useAppScrollLock from "../hooks/useAppScrollLock";
import { createMomentShare, fetchMomentShares, revokeMomentShare } from "../lib/api";
import type { MomentShare } from "../lib/api";

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultExpirationDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return localDateString(date);
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

export default function MomentShareSheet({
  visible,
  babyId,
  babyName,
  selectedMonth,
  onClose,
}: {
  visible: boolean;
  babyId: number;
  babyName: string;
  selectedMonth: string;
  onClose: () => void;
}) {
  useAppScrollLock(visible);
  const today = localDateString();
  const [expiresOn, setExpiresOn] = useState(defaultExpirationDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shares, setShares] = useState<MomentShare[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!visible) return;
    setExpiresOn(defaultExpirationDate());
    setShareUrl("");
    setError("");
    setNotice("");
    setLoading(true);
    fetchMomentShares(babyId)
      .then(setShares)
      .catch((err) => setError(err instanceof Error ? err.message : "分享记录加载失败"))
      .finally(() => setLoading(false));
  }, [babyId, visible]);

  const activeShares = useMemo(
    () => shares.filter((share) => share.share_month === selectedMonth && share.status === "active"),
    [selectedMonth, shares],
  );

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const share = await createMomentShare({
        baby_id: babyId,
        share_month: selectedMonth,
        expires_on: expiresOn,
      });
      setShares((current) => [share, ...current]);
      setShareUrl(`${window.location.origin}/share/moments/${share.token}`);
      setNotice("分享链接已生成");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享链接生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("链接已复制");
    } catch {
      setError("复制失败，请长按链接复制");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `${babyName}的成长时光`,
        text: `邀请你看看${babyName}在${formatMonth(selectedMonth)}的成长时光，有效期至${formatDateFieldValue(expiresOn)}。`,
        url: shareUrl,
      });
    } catch {
      // The native share sheet may be dismissed without an error state in the UI.
    }
  };

  const handleRevoke = async (shareId: number) => {
    if (!window.confirm("关闭后，已经发出的链接会立即失效。确定关闭吗？")) return;
    try {
      await revokeMomentShare(shareId);
      setShares((current) => current.map((share) => (
        share.id === shareId ? { ...share, status: "revoked", revoked_at: new Date().toISOString() } : share
      )));
      setNotice("分享链接已关闭");
    } catch (err) {
      setError(err instanceof Error ? err.message : "关闭分享失败");
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label="分享成长时光">
        <button type="button" aria-label="关闭分享设置" className="absolute inset-0 w-full border-none bg-[#21382E]/38 backdrop-blur-[2px]" onClick={onClose} />
        <div className="absolute inset-x-3 bottom-3 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[28px] border border-white/70 bg-[rgba(248,247,239,.98)] shadow-[0_24px_48px_rgba(33,56,46,.22)] backdrop-blur-md">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#EFE8DD] bg-[rgba(248,247,239,.96)] px-5 py-4 backdrop-blur-md">
            <div>
              <div className="font-serif text-lg font-semibold text-[#21382E]">分享成长时光</div>
              <div className="mt-1 text-sm leading-5 text-[#7A8B80]">家人无需注册，只能浏览这个月份的照片和备注。</div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#5F7368] shadow-soft">
              关闭
            </button>
          </div>

          <div className="space-y-4 p-5">
            {error ? <div className="rounded-[18px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">{error}</div> : null}
            {notice ? <div className="rounded-[18px] border border-[#CDE8DA] bg-[#F0FAF6] px-4 py-3 text-sm font-semibold text-[#2D805E]">{notice}</div> : null}

            <section className="rounded-[24px] border border-white bg-white/90 p-4 shadow-soft">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-[#F0FAF6] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C8879]">分享范围</div>
                  <div className="mt-1 text-sm font-black text-[#1A5C3A]">{formatMonth(selectedMonth)}</div>
                </div>
                <div className="rounded-[18px] bg-[#FFF3EA] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98715E]">浏览权限</div>
                  <div className="mt-1 text-sm font-black text-[#A85837]">仅查看</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A8B80]">有效期至</div>
                <DateFieldButton value={expiresOn} onClick={() => setShowDatePicker(true)} ariaLabel="选择分享有效期" />
                <div className="mt-2 text-xs leading-5 text-[#7A8B80]">到期当天仍可浏览，第二天自动失效；也可以提前手动关闭。</div>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={loading || expiresOn < today}
                className="mt-4 h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.24)] disabled:opacity-50"
              >
                {loading ? "处理中…" : "生成分享链接"}
              </button>
            </section>

            {shareUrl ? (
              <section className="rounded-[24px] border border-[#CDE8DA] bg-[#F4FCF7] p-4 shadow-soft">
                <div className="text-sm font-black text-[#21382E]">链接已经准备好</div>
                <div className="mt-2 break-all rounded-[16px] bg-white px-3 py-2 text-xs leading-5 text-[#5F7368]">{shareUrl}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" onClick={handleCopy} className="h-11 rounded-full bg-white text-sm font-bold text-[#2D805E] shadow-soft">复制链接</button>
                  <button type="button" onClick={handleShare} className="h-11 rounded-full bg-[#2D9B6A] text-sm font-bold text-white shadow-soft">分享给家人</button>
                </div>
              </section>
            ) : null}

            {activeShares.length > 0 ? (
              <section className="rounded-[24px] border border-white bg-white/90 p-4 shadow-soft">
                <div className="text-sm font-black text-[#21382E]">当前有效的分享</div>
                <div className="mt-3 space-y-2">
                  {activeShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#F8F7EF] px-3 py-3">
                      <div>
                        <div className="text-sm font-bold text-[#315244]">有效至 {formatDateFieldValue(share.expires_on)}</div>
                        <div className="mt-1 text-[11px] text-[#8A968F]">已发出的链接仍可继续浏览</div>
                      </div>
                      <button type="button" onClick={() => handleRevoke(share.id)} className="shrink-0 rounded-full bg-[#FFF1EE] px-3 py-2 text-xs font-bold text-[#C9664D]">关闭链接</button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="rounded-[18px] border border-[#F0E0C8] bg-[#FFF9EC] px-4 py-3 text-xs leading-5 text-[#876B3D]">
              分享链接可以被转发或截图，请只发给可信任的家人。历史链接不会在系统中保存明文。
            </div>
          </div>
        </div>
      </div>

      <DatePickerSheet
        visible={showDatePicker}
        value={expiresOn}
        minDate={today}
        onConfirm={(date) => {
          setExpiresOn(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </>
  );
}
