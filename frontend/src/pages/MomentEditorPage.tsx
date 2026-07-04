import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import DateFieldButton from "../components/DateFieldButton";
import DatePickerSheet from "../components/DatePickerSheet";
import PrivatePhoto from "../components/PrivatePhoto";
import { useBaby } from "../lib/BabyContext";
import {
  createMoment,
  deleteMomentPhoto,
  fetchMoment,
  fetchMoments,
  updateMoment,
  uploadMomentLivePhoto,
  uploadMomentPhoto,
} from "../lib/api";
import type { MomentPhoto } from "../lib/api";

type PendingPhoto = {
  id: string;
  file: File;
  preview: string;
  kind: "image" | "video" | "live_photo";
  cover?: Blob;
};

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

function mediaBadgeForPhoto(photo: MomentPhoto): string {
  if (photo.media_kind === "live_photo") return "实况";
  if (photo.media_kind === "video" || (!photo.media_kind && photo.content_type.startsWith("video/"))) return "视频";
  return "";
}

function mediaBadgeForPending(photo: PendingPhoto): string {
  if (photo.kind === "live_photo") return "实况";
  if (photo.kind === "video") return "视频";
  return "";
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSelectableDate(value: string, maxDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > maxDate) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

async function compressPhoto(file: File): Promise<Blob> {
  const needsFormatConversion = file.type === "image/heic" || file.type === "image/heif";
  if (file.type === "image/gif" || (file.size <= 900_000 && !needsFormatConversion)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    return blob || file;
  } catch {
    if (needsFormatConversion) {
      throw new Error("这张 HEIC 照片暂时无法转换，请先在相册中转成 JPEG 后再上传");
    }
    return file;
  }
}

async function createVideoPoster(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("实况短片读取失败"));
    });
    if (Number.isFinite(video.duration) && video.duration > 0.2) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("实况封面生成失败"));
        video.currentTime = 0.1;
      });
    } else if (video.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("实况封面生成失败"));
      });
    } else {
      await Promise.resolve();
    }
    if (!video.videoWidth || !video.videoHeight) throw new Error("实况封面生成失败");
    const canvas = document.createElement("canvas");
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("实况封面生成失败");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) throw new Error("实况封面生成失败");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MomentEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { baby } = useBaby();
  const editing = Boolean(id);
  const today = localDateString();
  const locationStateDate = typeof location.state === "object"
    && location.state !== null
    && "entryDate" in location.state
    && typeof location.state.entryDate === "string"
    ? location.state.entryDate
    : "";
  const requestedDate = searchParams.get("date") || locationStateDate;
  const newMomentDate = isSelectableDate(requestedDate, today) ? requestedDate : today;

  const [entryDate, setEntryDate] = useState(newMomentDate);
  const [note, setNote] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<MomentPhoto[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<Set<number>>(new Set());
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);
  const initialNoteRef = useRef("");
  const [fetchLoading, setFetchLoading] = useState(editing);
  const [switchingDate, setSwitchingDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setPhotosToDelete(new Set());
    setPendingPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.preview));
      return [];
    });

    if (!id) {
      setEntryDate(newMomentDate);
      setNote("");
      initialNoteRef.current = "";
      setExistingPhotos([]);
      setFetchLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setFetchLoading(true);
    fetchMoment(Number(id))
      .then((moment) => {
        if (cancelled) return;
        setEntryDate(moment.entry_date);
        setNote(moment.note);
        initialNoteRef.current = moment.note;
        setExistingPhotos(moment.photos);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "时光记录加载失败");
      })
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, newMomentDate]);

  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);

  useEffect(() => () => {
    pendingPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
  }, []);

  const visibleExistingPhotos = existingPhotos.filter((photo) => !photosToDelete.has(photo.id));
  const totalPhotos = visibleExistingPhotos.length + pendingPhotos.length;
  const canSave = useMemo(() => note.trim().length > 0 || totalPhotos > 0, [note, totalPhotos]);
  const hasUnsavedChanges = note !== initialNoteRef.current || pendingPhotos.length > 0 || photosToDelete.size > 0;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError("");
    const slots = 9 - totalPhotos;
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    const selected = accepted
      .slice(0, slots);
    if (selected.length < files.length) {
      if (slots <= 0) {
        setError("每天最多上传 9 个图片、实况或视频");
      } else if (accepted.length < files.length) {
        setError(`已忽略不支持的文件，只保留前 ${selected.length} 个图片或视频`);
      } else {
        setError(`已保留前 ${selected.length} 个图片或视频，每天最多 9 个`);
      }
    }
    setPendingPhotos((current) => [
      ...current,
      ...selected.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), kind: isVideoFile(file) ? "video" as const : "image" as const })),
    ]);
  };

  const handleLiveFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    const slots = 9 - totalPhotos;
    if (slots <= 0) {
      setError("每天最多上传 9 个图片、实况或视频");
      return;
    }
    const picked = Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    const videos = picked.filter(isVideoFile);
    const selected = videos.slice(0, slots);
    if (selected.length === 0) {
      const hasStaticPhotos = picked.some((file) => file.type.startsWith("image/"));
      setError(hasStaticPhotos
        ? "浏览器只拿到了静态照片，拿不到实况动态片段。请在 iOS 相册中打开这张实况照片，先选择“存储为视频”，再回到这里添加实况照片。"
        : "请选择从实况照片存储出来的视频");
      return;
    }
    try {
      const livePhotos = await Promise.all(selected.map(async (file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        kind: "live_photo" as const,
        cover: await createVideoPoster(file),
      })));
      setPendingPhotos((current) => [...current, ...livePhotos]);
      const ignoredStaticCount = picked.length - videos.length;
      if (ignoredStaticCount > 0) {
        setError(`已添加 ${selected.length} 个实况视频；另有 ${ignoredStaticCount} 张静态照片没有动态片段，未上传。`);
      } else if (selected.length < videos.length) {
        setError(`已保留前 ${selected.length} 个实况照片，每天最多 9 个`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "实况封面生成失败，请换一段视频再试");
    }
  };

  const removePendingPhoto = (photoId: string) => {
    setPendingPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((photo) => photo.id !== photoId);
    });
  };

  const toggleExistingPhoto = (photoId: number) => {
    setPhotosToDelete((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleDateChange = async (date: string) => {
    setShowDatePicker(false);
    if (!baby || date === entryDate) return;
    if (hasUnsavedChanges && !window.confirm("切换日期后，当前未保存的文字和照片修改会丢失，是否继续？")) {
      return;
    }

    const previousDate = entryDate;
    setEntryDate(date);
    setFetchLoading(true);
    setSwitchingDate(true);
    setError("");
    try {
      const targetMoments = await fetchMoments(baby.id, date.slice(0, 7));
      const target = targetMoments.find((moment) => moment.entry_date === date);
      if (target) {
        navigate(`/moments/${target.id}/edit`, { replace: true });
      } else {
        navigate(`/moments/new?date=${date}`, {
          replace: true,
          state: { entryDate: date },
        });
      }
    } catch (err) {
      setEntryDate(previousDate);
      setFetchLoading(false);
      setError(err instanceof Error ? err.message : "切换日期失败，请稍后重试");
    } finally {
      setSwitchingDate(false);
    }
  };

  const handleSubmit = async () => {
    if (!baby || !canSave) {
      setError("请至少添加一张照片或写下一段备注");
      return;
    }
    setSaving(true);
    setError("");
    setProgress("正在保存文字…");
    const uploadedIds = new Set<string>();

    try {
      const moment = editing && id
        ? await updateMoment(Number(id), { entry_date: entryDate, note: note.trim() })
        : await createMoment({ baby_id: baby.id, entry_date: entryDate, note: note.trim() });

      for (const photoId of photosToDelete) {
        setProgress("正在整理照片…");
        await deleteMomentPhoto(photoId);
      }
      setPhotosToDelete(new Set());

      for (let index = 0; index < pendingPhotos.length; index += 1) {
        const photo = pendingPhotos[index];
        setProgress(`正在上传第 ${index + 1} / ${pendingPhotos.length} 个媒体…`);
        if (photo.kind === "live_photo") {
          if (!photo.cover) throw new Error("实况封面缺失，请重新选择");
          await uploadMomentLivePhoto(moment.id, photo.cover, photo.file);
        } else {
          const compressed = photo.kind === "video" ? photo.file : await compressPhoto(photo.file);
          await uploadMomentPhoto(moment.id, compressed);
        }
        uploadedIds.add(photo.id);
      }

      navigate("/moments", { replace: true });
    } catch (err) {
      setPendingPhotos((current) => current.filter((photo) => !uploadedIds.has(photo.id)));
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  if (fetchLoading) {
    return (
      <Layout className="secondary-page">
        <Header title="编辑成长时光" variant="hero" back />
        <div className="flex flex-1 items-center justify-center text-sm font-semibold text-gray-400">正在打开这一天…</div>
      </Layout>
    );
  }

  return (
    <Layout className="secondary-page">
        <Header
          title={editing ? "编辑成长时光" : "记录成长时光"}
          subtitle="图片、实况和视频，分开珍藏这一天"
          variant="hero"
          back
        />

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-8 pt-4">
          {error ? <div className="rounded-[18px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm leading-5 text-danger">{error}</div> : null}

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title">这是哪一天</div>
              <div className="panel-note mt-1">{switchingDate ? "正在打开这一天的记录…" : "可以补记过去的成长片段"}</div>
            </div>
            <DateFieldButton
              value={entryDate}
              ariaLabel="选择成长时光日期"
              onClick={() => setShowDatePicker(true)}
              disabled={switchingDate || saving}
            />
          </SectionCard>

          <SectionCard className="p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="panel-title">{entryDate === today ? "今天的图片、实况和视频" : "这一天的图片、实况和视频"}</div>
                <div className="panel-note mt-1">支持多选，最多 9 个</div>
              </div>
              <div className="font-tabular text-xs font-bold text-[#6C8275]">{totalPhotos} / 9</div>
            </div>

            {visibleExistingPhotos.length || pendingPhotos.length ? (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {visibleExistingPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square overflow-hidden rounded-[16px] bg-[#EEF2ED]">
                    <PrivatePhoto
                      path={photo.path}
                      alt="已保存的宝宝媒体"
                      contentType={photo.content_type}
                      mediaKind={photo.media_kind}
                      motionPath={photo.motion_path}
                      motionContentType={photo.motion_content_type}
                      className="h-full w-full"
                    />
                    {mediaBadgeForPhoto(photo) ? (
                      <div className="absolute left-1.5 top-1.5 rounded-pill bg-black/55 px-2 py-1 text-[10px] font-bold text-white">{mediaBadgeForPhoto(photo)}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleExistingPhoto(photo.id)}
                      className="absolute right-1.5 top-1.5 rounded-pill border border-white/60 bg-black/55 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      移除
                    </button>
                  </div>
                ))}
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square overflow-hidden rounded-[16px] bg-[#EEF2ED]">
                    {photo.kind === "video" || photo.kind === "live_photo" ? (
                      <video src={photo.preview} className="h-full w-full object-cover" muted playsInline autoPlay loop preload="auto" aria-label={photo.kind === "live_photo" ? "待上传的宝宝实况照片" : "待上传的宝宝视频"} />
                    ) : (
                      <img src={photo.preview} alt="待上传的宝宝照片" className="h-full w-full object-cover" />
                    )}
                    {mediaBadgeForPending(photo) ? (
                      <div className="absolute left-1.5 top-1.5 rounded-pill bg-black/55 px-2 py-1 text-[10px] font-bold text-white">{mediaBadgeForPending(photo)}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removePendingPhoto(photo.id)}
                      className="absolute right-1.5 top-1.5 rounded-pill border border-white/60 bg-black/55 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {photosToDelete.size > 0 ? (
              <button type="button" onClick={() => setPhotosToDelete(new Set())} className="mb-3 text-xs font-bold text-[#2D805E]">
                撤销移除 {photosToDelete.size} 个媒体
              </button>
            ) : null}

            <label className={`flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-4 text-center ${totalPhotos >= 9 ? "border-[#D8DED9] bg-[#F5F6F4] opacity-55" : "border-[#A9D9C5] bg-[#F1FAF6]"}`}>
              <span className="text-sm font-black text-[#2D805E]">从相册选择图片或视频</span>
              <span className="mt-1 text-xs leading-5 text-[#6C8275]">普通视频会显示为视频，不会标成实况</span>
              <input
                type="file"
                multiple
                disabled={totalPhotos >= 9}
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
                className="hidden"
              />
            </label>
            <label className={`mt-2 flex min-h-[78px] cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-4 text-center ${totalPhotos >= 9 ? "border-[#D8DED9] bg-[#F5F6F4] opacity-55" : "border-[#D7C89A] bg-[#FFF9E8]"}`}>
              <span className="text-sm font-black text-[#8A6D18]">添加实况照片</span>
              <span className="mt-1 text-xs leading-5 text-[#7A6840]">网页无法直接读取实况原片，请先在相册“存储为视频”后选择</span>
              <input
                type="file"
                multiple
                disabled={totalPhotos >= 9}
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={(event) => {
                  void handleLiveFiles(event.target.files);
                  event.target.value = "";
                }}
                className="hidden"
              />
            </label>
          </SectionCard>

          <SectionCard className="p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="panel-title">写给未来的一句话</div>
                <div className="panel-note mt-1">记下第一次、一个表情，或这一天的小故事</div>
              </div>
              <div className="font-tabular text-xs font-bold text-[#8A968F]">{note.length} / 500</div>
            </div>
            <textarea
              value={note}
              maxLength={500}
              rows={6}
              onChange={(event) => setNote(event.target.value)}
              placeholder="这一天你第一次自己翻身，努力了好几次，成功后笑得特别开心……"
              className="w-full resize-none rounded-[18px] border border-[#DCE5DD] bg-[#F9FBF8] px-4 py-3 text-sm leading-6 text-[#34483E] outline-none placeholder:text-[#AAB5AE] focus:border-[#65B997]"
            />
          </SectionCard>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/70 bg-white/92 px-4 pb-5 pt-3 backdrop-blur-xl">
        <button
          type="button"
          disabled={saving || switchingDate || !canSave}
          onClick={handleSubmit}
          className="w-full rounded-[19px] border-none bg-[#2D9B6A] py-3.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(45,155,106,.22)] disabled:bg-[#B9C8C0] disabled:shadow-none"
        >
          {saving ? progress || "正在保存…" : editing ? "保存这一天" : "珍藏这一天"}
        </button>
      </div>

      <DatePickerSheet
        visible={showDatePicker}
        value={entryDate}
        maxDate={today}
        onConfirm={(date) => void handleDateChange(date)}
        onCancel={() => setShowDatePicker(false)}
      />
    </Layout>
  );
}
