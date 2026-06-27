import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea } from "../components/Layout";
import MomentShareSheet from "../components/MomentShareSheet";
import PrivatePhoto from "../components/PrivatePhoto";
import { useBaby } from "../lib/BabyContext";
import { deleteMoment, fetchMoments } from "../lib/api";
import type { DailyMoment, MomentPhoto } from "../lib/api";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEntryDate(value: string): { day: string; month: string; weekday: string } {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: `${date.getMonth() + 1}月`,
    weekday: WEEKDAYS[date.getDay()],
  };
}

function calcBabyDay(birthDate: string, entryDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  const entry = new Date(`${entryDate}T00:00:00`);
  return Math.max(1, Math.floor((entry.getTime() - birth.getTime()) / 86_400_000) + 1);
}

function PhotoMosaic({ photos, onOpen }: { photos: MomentPhoto[]; onOpen: (index: number) => void }) {
  const visible = photos.slice(0, 4);
  if (visible.length === 0) return null;

  if (visible.length === 1) {
    return (
      <PrivatePhoto
        path={visible[0].path}
        alt="宝宝当天的照片"
        onClick={() => onOpen(0)}
        className="aspect-[4/3] w-full rounded-[20px]"
      />
    );
  }

  return (
    <div className={`grid h-[246px] gap-1.5 overflow-hidden rounded-[20px] ${visible.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"}`}>
      {visible.map((photo, index) => (
        <div key={photo.id} className={`relative overflow-hidden ${visible.length === 3 && index === 0 ? "row-span-2" : ""}`}>
          <PrivatePhoto
            path={photo.path}
            alt={`宝宝当天的第 ${index + 1} 张照片`}
            onClick={() => onOpen(index)}
            className="h-full w-full"
          />
          {index === 3 && photos.length > 4 ? (
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="absolute inset-0 flex items-center justify-center border-none bg-black/45 text-xl font-bold text-white"
            >
              还有 {photos.length - 4} 张
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PhotoViewer({ photos, index, onChange, onClose }: {
  photos: MomentPhoto[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#101713] text-white" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <div className="font-tabular text-sm font-semibold text-white/75">{index + 1} / {photos.length}</div>
        <button type="button" onClick={onClose} className="rounded-pill border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
          关闭
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <PrivatePhoto path={photo.path} alt={`宝宝照片 ${index + 1}`} className="max-h-full w-full rounded-[12px] object-contain" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-7 pt-4">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onChange(index - 1)}
          className="rounded-[18px] border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          上一张
        </button>
        <button
          type="button"
          disabled={index === photos.length - 1}
          onClick={() => onChange(index + 1)}
          className="rounded-[18px] border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          下一张
        </button>
      </div>
    </div>
  );
}

export default function MomentsPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const today = localDateString();
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [moments, setMoments] = useState<DailyMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [viewer, setViewer] = useState<{ photos: MomentPhoto[]; index: number } | null>(null);

  const loadMoments = useCallback(() => {
    if (!baby) return;
    setLoading(true);
    setError("");
    fetchMoments(baby.id, selectedMonth)
      .then(setMoments)
      .catch((err) => setError(err instanceof Error ? err.message : "时光记录加载失败"))
      .finally(() => setLoading(false));
  }, [baby, selectedMonth]);

  useEffect(() => loadMoments(), [loadMoments]);

  const photoCount = useMemo(() => moments.reduce((total, moment) => total + moment.photos.length, 0), [moments]);
  const hasToday = moments.some((moment) => moment.entry_date === today);

  const handleDelete = async (moment: DailyMoment) => {
    if (!window.confirm(`确定删除 ${moment.entry_date} 的时光记录和全部照片吗？`)) return;
    try {
      await deleteMoment(moment.id);
      setMoments((current) => current.filter((item) => item.id !== moment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <Layout className="secondary-page">
      <Header
        title="成长时光"
        subtitle={`${baby?.name || "宝宝"} 的每一天，都值得被记住`}
        variant="hero"
        back
        right={(
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="rounded-pill border border-white/55 bg-white/16 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"
            >
              分享
            </button>
            <button
              type="button"
              onClick={() => navigate(hasToday ? `/moments/${moments.find((item) => item.entry_date === today)?.id}/edit` : "/moments/new")}
              className="rounded-pill border border-white/55 bg-white/20 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"
            >
              {hasToday ? "编辑今天" : "记录今天"}
            </button>
          </div>
        )}
      />

      <div className="mx-4 -mt-2 grid grid-cols-2 gap-3 rounded-[24px] border border-white bg-white/94 p-3 shadow-soft">
        <div className="rounded-[18px] bg-[#F0FAF6] px-4 py-3">
          <div className="font-tabular text-2xl font-black text-[#1A5C3A]">{moments.length}</div>
          <div className="mt-1 text-[11px] font-semibold text-[#5B7768]">本月记录天数</div>
        </div>
        <div className="rounded-[18px] bg-[#FFF3EA] px-4 py-3">
          <div className="font-tabular text-2xl font-black text-[#A85837]">{photoCount}</div>
          <div className="mt-1 text-[11px] font-semibold text-[#856554]">本月珍藏照片</div>
        </div>
      </div>

      <div className="mx-4 mt-4 flex items-center justify-between rounded-[20px] border border-white bg-white/80 px-4 py-3 shadow-soft">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A8B80]">浏览月份</div>
          <div className="mt-0.5 text-sm font-bold text-[#21382E]">按月份回看成长</div>
        </div>
        <input
          type="month"
          value={selectedMonth}
          max={today.slice(0, 7)}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="rounded-[14px] border border-[#D9E3DB] bg-white px-3 py-2 text-sm font-semibold text-[#315244] outline-none"
        />
      </div>

      <ScrollArea>
        <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          {error ? <div className="mb-4 rounded-[18px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">{error}</div> : null}

          {loading ? (
            <div className="py-20 text-center text-sm font-semibold text-gray-400">正在翻开时光册…</div>
          ) : moments.length === 0 ? (
            <div className="rounded-[28px] border border-white bg-white/90 px-6 py-10 text-center shadow-soft">
              <div className="text-xl font-black text-[#21382E]">这个月还没有留下照片</div>
              <div className="mx-auto mt-2 max-w-[250px] text-sm leading-6 text-[#6B7C72]">选几张今天喜欢的照片，写下一句当时最想记住的话。</div>
              <button
                type="button"
                onClick={() => navigate("/moments/new")}
                className="mt-6 rounded-[18px] border-none bg-[#2D9B6A] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(45,155,106,.2)]"
              >
                写第一篇时光
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {moments.map((moment) => {
                const date = formatEntryDate(moment.entry_date);
                const author = moment.member_nickname || moment.user_name || "家人";
                return (
                  <article key={moment.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
                    <div className="pt-2 text-center">
                      <div className="font-tabular text-[24px] font-black leading-none text-[#2D6E54]">{date.day}</div>
                      <div className="mt-1 text-[11px] font-bold text-[#7A8B80]">{date.month}</div>
                      <div className="mx-auto mt-3 h-full min-h-10 w-px bg-gradient-to-b from-[#9ED8C0] to-transparent" />
                    </div>
                    <div className="rounded-[26px] border border-white bg-white/92 p-3 shadow-soft">
                      <PhotoMosaic photos={moment.photos} onOpen={(index) => setViewer({ photos: moment.photos, index })} />
                      <div className={moment.photos.length ? "px-1 pb-1 pt-4" : "px-1 py-2"}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-[#21382E]">出生第 {baby ? calcBabyDay(baby.birth_date, moment.entry_date) : 1} 天</div>
                            <div className="mt-1 text-[11px] font-semibold text-[#8A968F]">{date.weekday} · {author} 记录</div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" onClick={() => navigate(`/moments/${moment.id}/edit`)} className="rounded-pill border-none bg-[#EDF8F2] px-2.5 py-1.5 text-[11px] font-bold text-[#2D805E]">编辑</button>
                            <button type="button" onClick={() => handleDelete(moment)} className="rounded-pill border-none bg-[#FFF1EE] px-2.5 py-1.5 text-[11px] font-bold text-[#C9664D]">删除</button>
                          </div>
                        </div>
                        {moment.note ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4E6056]">{moment.note}</p> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {viewer ? (
        <PhotoViewer
          photos={viewer.photos}
          index={viewer.index}
          onChange={(index) => setViewer((current) => current ? { ...current, index } : null)}
          onClose={() => setViewer(null)}
        />
      ) : null}
      {baby ? (
        <MomentShareSheet
          visible={showShare}
          babyId={baby.id}
          babyName={baby.name}
          selectedMonth={selectedMonth}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </Layout>
  );
}
