import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import { fetchSharedMoments, getApiAssetUrl } from "../lib/api";
import type { MomentPhoto, SharedMoment, SharedMomentsData } from "../lib/api";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

function formatDate(value: string): { day: string; month: string; weekday: string } {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: `${date.getMonth() + 1}月`,
    weekday: WEEKDAYS[date.getDay()],
  };
}

function SharedPhoto({ photo, alt, className, onClick }: {
  photo: MomentPhoto;
  alt: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`block overflow-hidden border-none bg-[#EEF2ED] p-0 ${className}`}>
      <img
        src={getApiAssetUrl(photo.path)}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
    </button>
  );
}

function PhotoMosaic({ photos, onOpen }: { photos: MomentPhoto[]; onOpen: (index: number) => void }) {
  const visible = photos.slice(0, 4);
  if (visible.length === 0) return null;

  if (visible.length === 1) {
    return <SharedPhoto photo={visible[0]} alt="宝宝当天的照片" className="aspect-[4/3] w-full rounded-[20px]" onClick={() => onOpen(0)} />;
  }

  return (
    <div className={`grid h-[246px] gap-1.5 overflow-hidden rounded-[20px] ${visible.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"}`}>
      {visible.map((photo, index) => (
        <div key={photo.id} className={`relative overflow-hidden ${visible.length === 3 && index === 0 ? "row-span-2" : ""}`}>
          <SharedPhoto photo={photo} alt={`宝宝当天的第 ${index + 1} 张照片`} className="h-full w-full" onClick={() => onOpen(index)} />
          {index === 3 && photos.length > 4 ? (
            <button type="button" onClick={() => onOpen(index)} className="absolute inset-0 flex items-center justify-center border-none bg-black/45 text-xl font-bold text-white">
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
        <button type="button" onClick={onClose} className="rounded-pill border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">关闭</button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <img src={getApiAssetUrl(photo.path)} alt={`宝宝照片 ${index + 1}`} referrerPolicy="no-referrer" className="max-h-full w-full rounded-[12px] object-contain" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-7 pt-4">
        <button type="button" disabled={index === 0} onClick={() => onChange(index - 1)} className="rounded-[18px] border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white disabled:opacity-30">上一张</button>
        <button type="button" disabled={index === photos.length - 1} onClick={() => onChange(index + 1)} className="rounded-[18px] border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white disabled:opacity-30">下一张</button>
      </div>
    </div>
  );
}

export default function SharedMomentsPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedMomentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<{ photos: MomentPhoto[]; index: number } | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "成长时光 · 宝宝日记";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const createdRobots = !robots;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex,nofollow,noarchive";
    return () => {
      document.title = previousTitle;
      if (createdRobots) robots?.remove();
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchSharedMoments(token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "分享内容加载失败"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <Layout className="secondary-page"><div className="flex flex-1 items-center justify-center text-sm font-semibold text-[#7A8B80]">正在翻开成长时光…</div></Layout>;
  }

  if (!data || error) {
    return (
      <Layout className="secondary-page">
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="w-full rounded-[28px] border border-white bg-white/92 px-6 py-10 shadow-soft">
            <div className="text-xl font-black text-[#21382E]">暂时无法查看</div>
            <div className="mt-2 text-sm leading-6 text-[#6B7C72]">{error || "分享链接不存在、已关闭或已经过期。"}</div>
          </div>
        </div>
      </Layout>
    );
  }

  const photoCount = data.moments.reduce((total, moment) => total + moment.photos.length, 0);

  return (
    <Layout className="secondary-page">
      <div className="hero-shell hero-shell-header px-[18px] pb-6 pt-8">
        <div className="header-readable-overlay absolute inset-0" />
        <div className="hero-shell-glow absolute inset-0" />
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/72">家人专属 · 只读分享</div>
          <div className="header-title mt-2">{data.baby_name}的成长时光</div>
          <div className="header-subtitle mt-1 text-sm">{formatMonth(data.share_month)} · {data.moments.length} 天 · {photoCount} 张照片</div>
        </div>
      </div>

      <div className="mx-4 -mt-3 rounded-[20px] border border-white bg-white/94 px-4 py-3 text-center text-xs font-semibold text-[#6B7C72] shadow-soft">
        这是一份仅供浏览的家庭分享，到期日：{data.expires_on}
      </div>

      <ScrollArea>
        <div className="space-y-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          {data.moments.length === 0 ? (
            <div className="rounded-[28px] border border-white bg-white/90 px-6 py-10 text-center shadow-soft">
              <div className="text-lg font-black text-[#21382E]">这个月还没有成长时光</div>
            </div>
          ) : data.moments.map((moment: SharedMoment) => {
            const date = formatDate(moment.entry_date);
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
                    <div className="text-sm font-black text-[#21382E]">出生第 {moment.baby_day} 天</div>
                    <div className="mt-1 text-[11px] font-semibold text-[#8A968F]">{date.weekday}</div>
                    {moment.note ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4E6056]">{moment.note}</p> : null}
                  </div>
                </div>
              </article>
            );
          })}
          <div className="text-center text-[11px] font-semibold text-[#9AA59F]">由宝宝日记安全分享</div>
        </div>
      </ScrollArea>

      {viewer ? <PhotoViewer photos={viewer.photos} index={viewer.index} onChange={(index) => setViewer((current) => current ? { ...current, index } : null)} onClose={() => setViewer(null)} /> : null}
    </Layout>
  );
}
