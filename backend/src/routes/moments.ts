import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  MOMENT_PHOTOS: R2Bucket;
};

type Variables = {
  userId: number;
};

type MomentRow = {
  id: number;
  baby_id: number;
  user_id: number;
  entry_date: string;
  note: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  member_nickname: string | null;
  avatar_emoji: string | null;
};

type PhotoRow = {
  id: number;
  moment_id: number;
  r2_key: string;
  content_type: string;
  media_kind?: "image" | "video" | "live_photo" | null;
  motion_r2_key?: string | null;
  motion_content_type?: string | null;
  motion_size_bytes?: number | null;
  size_bytes: number;
  sort_order: number;
  created_at: string;
};

const moments = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const MAX_PHOTOS_PER_MOMENT = 9;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

moments.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, data: null, message: "未登录" }, 401);
  }

  try {
    const payload = await verify(authHeader.slice(7), c.env.JWT_SECRET, "HS256");
    if (!payload?.sub) {
      return c.json({ success: false, data: null, message: "登录已过期" }, 401);
    }
    c.set("userId", Number(payload.sub));
    await next();
  } catch {
    return c.json({ success: false, data: null, message: "登录已过期" }, 401);
  }
});

async function checkBabyAccess(db: D1Database, userId: number, babyId: number): Promise<boolean> {
  const baby = await db.prepare("SELECT id FROM babies WHERE id = ? AND user_id = ?").bind(babyId, userId).first();
  if (baby) return true;

  const member = await db.prepare(
    "SELECT fm.id FROM family_members fm JOIN babies b ON b.family_id = fm.family_id WHERE fm.user_id = ? AND b.id = ?",
  ).bind(userId, babyId).first();
  return Boolean(member);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function todayInShanghai(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUploadedFile(value: unknown): value is File {
  return typeof value === "object"
    && value !== null
    && "type" in value
    && "size" in value
    && "stream" in value
    && typeof value.type === "string"
    && typeof value.size === "number"
    && typeof value.stream === "function";
}

function normalizeNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length <= 500 ? note : null;
}

function photoPath(photoId: number): string {
  return `/moments/photos/${photoId}`;
}

function photoMotionPath(photoId: number): string {
  return `/moments/photos/${photoId}/motion`;
}

function deriveMediaKind(photo: PhotoRow): "image" | "video" | "live_photo" {
  if (photo.media_kind === "live_photo") return "live_photo";
  if (photo.media_kind === "video" || photo.content_type.startsWith("video/")) return "video";
  return "image";
}

function serializeMoment(moment: MomentRow, photos: PhotoRow[]) {
  return {
    ...moment,
    photos: photos.map((photo) => ({
      id: photo.id,
      moment_id: photo.moment_id,
      content_type: photo.content_type,
      media_kind: deriveMediaKind(photo),
      motion_content_type: photo.motion_content_type || null,
      motion_size_bytes: photo.motion_size_bytes || null,
      size_bytes: photo.size_bytes,
      sort_order: photo.sort_order,
      created_at: photo.created_at,
      path: photoPath(photo.id),
      motion_path: photo.motion_r2_key ? photoMotionPath(photo.id) : null,
    })),
  };
}

async function getMoment(db: D1Database, momentId: number): Promise<MomentRow | null> {
  return db.prepare(
    `SELECT m.*, u.name AS user_name, fm.nickname AS member_nickname, fm.avatar_emoji
     FROM daily_moments m
     LEFT JOIN users u ON u.id = m.user_id
     LEFT JOIN family_members fm ON fm.user_id = m.user_id
       AND fm.family_id = (SELECT family_id FROM babies WHERE id = m.baby_id)
     WHERE m.id = ?`,
  ).bind(momentId).first<MomentRow>();
}

async function getMomentPhotos(db: D1Database, momentId: number): Promise<PhotoRow[]> {
  const { results } = await db.prepare(
    "SELECT * FROM daily_moment_photos WHERE moment_id = ? ORDER BY sort_order ASC, id ASC",
  ).bind(momentId).all<PhotoRow>();
  return results;
}

moments.get("/", async (c) => {
  try {
    const babyId = Number(c.req.query("baby_id"));
    const month = c.req.query("month");
    const requestedLimit = Number(c.req.query("limit") || 60);
    const limit = Math.max(1, Math.min(requestedLimit, 120));

    if (!Number.isInteger(babyId) || babyId <= 0) {
      return c.json({ success: false, data: null, message: "缺少 baby_id" }, 400);
    }
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ success: false, data: null, message: "月份格式无效" }, 400);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), babyId))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    let query = `SELECT m.*, u.name AS user_name, fm.nickname AS member_nickname, fm.avatar_emoji
      FROM daily_moments m
      LEFT JOIN users u ON u.id = m.user_id
      LEFT JOIN family_members fm ON fm.user_id = m.user_id
        AND fm.family_id = (SELECT family_id FROM babies WHERE id = m.baby_id)
      WHERE m.baby_id = ?`;
    const params: Array<string | number> = [babyId];
    if (month) {
      query += " AND substr(m.entry_date, 1, 7) = ?";
      params.push(month);
    }
    query += " ORDER BY m.entry_date DESC, m.id DESC LIMIT ?";
    params.push(limit);

    const { results: momentRows } = await c.env.DB.prepare(query).bind(...params).all<MomentRow>();
    if (momentRows.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const placeholders = momentRows.map(() => "?").join(",");
    const { results: photoRows } = await c.env.DB.prepare(
      `SELECT * FROM daily_moment_photos WHERE moment_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    ).bind(...momentRows.map((row) => row.id)).all<PhotoRow>();
    const photosByMoment = new Map<number, PhotoRow[]>();
    for (const photo of photoRows) {
      const entries = photosByMoment.get(photo.moment_id) || [];
      entries.push(photo);
      photosByMoment.set(photo.moment_id, entries);
    }

    return c.json({
      success: true,
      data: momentRows.map((moment) => serializeMoment(moment, photosByMoment.get(moment.id) || [])),
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "list moments failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

moments.get("/:id", async (c) => {
  try {
    const momentId = Number(c.req.param("id"));
    const moment = await getMoment(c.env.DB, momentId);
    if (!moment) {
      return c.json({ success: false, data: null, message: "时光记录不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), moment.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const photos = await getMomentPhotos(c.env.DB, momentId);
    return c.json({ success: true, data: serializeMoment(moment, photos) });
  } catch (error) {
    console.error(JSON.stringify({ message: "get moment failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

moments.post("/", async (c) => {
  try {
    const body: unknown = await c.req.json();
    if (!isPlainObject(body)) {
      return c.json({ success: false, data: null, message: "请求格式无效" }, 400);
    }

    const babyId = Number(body.baby_id);
    const entryDate = body.entry_date;
    const note = normalizeNote(body.note);
    const today = todayInShanghai();
    if (!Number.isInteger(babyId) || babyId <= 0 || !isValidDate(entryDate) || note === null) {
      return c.json({ success: false, data: null, message: "请检查日期和备注" }, 400);
    }
    if (entryDate > today) {
      return c.json({ success: false, data: null, message: "不能记录未来日期" }, 400);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), babyId))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const existing = await c.env.DB.prepare(
      "SELECT id FROM daily_moments WHERE baby_id = ? AND entry_date = ?",
    ).bind(babyId, entryDate).first<{ id: number }>();

    let momentId: number;
    let status: 200 | 201 = 201;
    if (existing) {
      momentId = existing.id;
      status = 200;
      await c.env.DB.prepare(
        "UPDATE daily_moments SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(note, momentId).run();
    } else {
      const result = await c.env.DB.prepare(
        "INSERT INTO daily_moments (baby_id, user_id, entry_date, note) VALUES (?, ?, ?, ?)",
      ).bind(babyId, c.get("userId"), entryDate, note).run();
      momentId = Number(result.meta.last_row_id);
    }

    const moment = await getMoment(c.env.DB, momentId);
    const photos = await getMomentPhotos(c.env.DB, momentId);
    return c.json({ success: true, data: serializeMoment(moment as MomentRow, photos) }, status);
  } catch (error) {
    console.error(JSON.stringify({ message: "save moment failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "保存失败" }, 500);
  }
});

moments.put("/:id", async (c) => {
  try {
    const momentId = Number(c.req.param("id"));
    const moment = await getMoment(c.env.DB, momentId);
    if (!moment) {
      return c.json({ success: false, data: null, message: "时光记录不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), moment.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const body: unknown = await c.req.json();
    if (!isPlainObject(body)) {
      return c.json({ success: false, data: null, message: "请求格式无效" }, 400);
    }
    const entryDate = body.entry_date;
    const note = normalizeNote(body.note);
    if (!isValidDate(entryDate) || entryDate > todayInShanghai() || note === null) {
      return c.json({ success: false, data: null, message: "请检查日期和备注" }, 400);
    }
    if (entryDate !== moment.entry_date) {
      return c.json({ success: false, data: null, message: "已有时光记录不能直接修改日期，请切换到对应日期后记录" }, 409);
    }

    await c.env.DB.prepare(
      "UPDATE daily_moments SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(note, momentId).run();

    const updated = await getMoment(c.env.DB, momentId);
    const photos = await getMomentPhotos(c.env.DB, momentId);
    return c.json({ success: true, data: serializeMoment(updated as MomentRow, photos) });
  } catch (error) {
    console.error(JSON.stringify({ message: "update moment failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "保存失败" }, 500);
  }
});

moments.delete("/:id", async (c) => {
  try {
    const momentId = Number(c.req.param("id"));
    const moment = await getMoment(c.env.DB, momentId);
    if (!moment) {
      return c.json({ success: false, data: null, message: "时光记录不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), moment.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const photos = await getMomentPhotos(c.env.DB, momentId);
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM daily_moment_photos WHERE moment_id = ?").bind(momentId),
      c.env.DB.prepare("DELETE FROM daily_moments WHERE id = ?").bind(momentId),
    ]);
    if (photos.length > 0) {
      await c.env.MOMENT_PHOTOS.delete(photos.map((photo) => photo.r2_key));
    }
    return c.json({ success: true, data: { id: momentId } });
  } catch (error) {
    console.error(JSON.stringify({ message: "delete moment failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "删除失败" }, 500);
  }
});

moments.post("/:id/photos", async (c) => {
  try {
    const momentId = Number(c.req.param("id"));
    const moment = await getMoment(c.env.DB, momentId);
    if (!moment) {
      return c.json({ success: false, data: null, message: "时光记录不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), moment.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const contentType = (c.req.header("Content-Type") || "").split(";")[0].toLowerCase();
    const contentLength = Number(c.req.header("Content-Length") || 0);
    const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);
    if (!isImage && !isVideo) {
      return c.json({ success: false, data: null, message: "仅支持常见图片或视频格式" }, 415);
    }
    if (!c.req.raw.body) {
      return c.json({ success: false, data: null, message: "请选择图片或视频" }, 400);
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return c.json({ success: false, data: null, message: "无法确认文件大小，请重新选择" }, 411);
    }
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (contentLength > maxBytes) {
      return c.json({ success: false, data: null, message: isVideo ? "单个视频不能超过 80MB" : "单张照片不能超过 10MB" }, 413);
    }

    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total FROM daily_moment_photos WHERE moment_id = ?",
    ).bind(momentId).first<{ total: number }>();
    if (Number(count?.total || 0) >= MAX_PHOTOS_PER_MOMENT) {
      return c.json({ success: false, data: null, message: "每天最多上传 9 个图片或视频" }, 409);
    }

    const mediaKind = isVideo ? "video" : "image";
    const key = `babies/${moment.baby_id}/moments/${momentId}/${crypto.randomUUID()}`;
    const stored = await c.env.MOMENT_PHOTOS.put(key, c.req.raw.body, {
      httpMetadata: { contentType, cacheControl: "private, max-age=86400" },
      customMetadata: { momentId: String(momentId), babyId: String(moment.baby_id) },
    });
    if (!stored) {
      return c.json({ success: false, data: null, message: "媒体上传失败" }, 500);
    }

    const sortOrder = Number(count?.total || 0);
    try {
      const result = await c.env.DB.prepare(
        "INSERT INTO daily_moment_photos (moment_id, r2_key, content_type, media_kind, size_bytes, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(momentId, key, contentType, mediaKind, stored.size, sortOrder).run();
      const photoId = Number(result.meta.last_row_id);
      return c.json({
        success: true,
        data: {
          id: photoId,
          moment_id: momentId,
          content_type: contentType,
          media_kind: mediaKind,
          motion_content_type: null,
          motion_size_bytes: null,
          size_bytes: stored.size,
          sort_order: sortOrder,
          path: photoPath(photoId),
          motion_path: null,
        },
      }, 201);
    } catch (error) {
      await c.env.MOMENT_PHOTOS.delete(key);
      throw error;
    }
  } catch (error) {
    console.error(JSON.stringify({ message: "upload moment photo failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "媒体上传失败" }, 500);
  }
});

moments.post("/:id/live-photos", async (c) => {
  try {
    const momentId = Number(c.req.param("id"));
    const moment = await getMoment(c.env.DB, momentId);
    if (!moment) {
      return c.json({ success: false, data: null, message: "时光记录不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), moment.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total FROM daily_moment_photos WHERE moment_id = ?",
    ).bind(momentId).first<{ total: number }>();
    if (Number(count?.total || 0) >= MAX_PHOTOS_PER_MOMENT) {
      return c.json({ success: false, data: null, message: "每天最多上传 9 个图片或视频" }, 409);
    }

    const form = await c.req.formData();
    const cover = form.get("cover");
    const motion = form.get("motion");
    if (!isUploadedFile(cover) || !isUploadedFile(motion)) {
      return c.json({ success: false, data: null, message: "请选择实况封面和动态片段" }, 400);
    }

    const coverType = (cover.type || "").split(";")[0].toLowerCase();
    const motionType = (motion.type || "").split(";")[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(coverType)) {
      return c.json({ success: false, data: null, message: "实况封面必须是图片" }, 415);
    }
    if (!ALLOWED_VIDEO_TYPES.has(motionType)) {
      return c.json({ success: false, data: null, message: "实况动态片段必须是视频" }, 415);
    }
    if (cover.size <= 0 || cover.size > MAX_PHOTO_BYTES) {
      return c.json({ success: false, data: null, message: "实况封面不能超过 10MB" }, 413);
    }
    if (motion.size <= 0 || motion.size > MAX_VIDEO_BYTES) {
      return c.json({ success: false, data: null, message: "实况动态片段不能超过 80MB" }, 413);
    }

    const baseKey = `babies/${moment.baby_id}/moments/${momentId}/${crypto.randomUUID()}`;
    const coverKey = `${baseKey}/cover`;
    const motionKey = `${baseKey}/motion`;
    const coverStored = await c.env.MOMENT_PHOTOS.put(coverKey, cover.stream(), {
      httpMetadata: { contentType: coverType, cacheControl: "private, max-age=86400" },
      customMetadata: { momentId: String(momentId), babyId: String(moment.baby_id), mediaKind: "live_photo", role: "cover" },
    });
    if (!coverStored) {
      return c.json({ success: false, data: null, message: "实况封面上传失败" }, 500);
    }

    const motionStored = await c.env.MOMENT_PHOTOS.put(motionKey, motion.stream(), {
      httpMetadata: { contentType: motionType, cacheControl: "private, max-age=86400" },
      customMetadata: { momentId: String(momentId), babyId: String(moment.baby_id), mediaKind: "live_photo", role: "motion" },
    });
    if (!motionStored) {
      await c.env.MOMENT_PHOTOS.delete(coverKey);
      return c.json({ success: false, data: null, message: "实况动态片段上传失败" }, 500);
    }

    const sortOrder = Number(count?.total || 0);
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO daily_moment_photos
          (moment_id, r2_key, content_type, media_kind, motion_r2_key, motion_content_type, motion_size_bytes, size_bytes, sort_order)
         VALUES (?, ?, ?, 'live_photo', ?, ?, ?, ?, ?)`,
      ).bind(momentId, coverKey, coverType, motionKey, motionType, motionStored.size, coverStored.size, sortOrder).run();
      const photoId = Number(result.meta.last_row_id);
      return c.json({
        success: true,
        data: {
          id: photoId,
          moment_id: momentId,
          content_type: coverType,
          media_kind: "live_photo",
          motion_content_type: motionType,
          motion_size_bytes: motionStored.size,
          size_bytes: coverStored.size,
          sort_order: sortOrder,
          path: photoPath(photoId),
          motion_path: photoMotionPath(photoId),
        },
      }, 201);
    } catch (error) {
      await c.env.MOMENT_PHOTOS.delete([coverKey, motionKey]);
      throw error;
    }
  } catch (error) {
    console.error(JSON.stringify({ message: "upload live moment photo failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "实况照片上传失败" }, 500);
  }
});

moments.get("/photos/:photoId", async (c) => {
  try {
    const photoId = Number(c.req.param("photoId"));
    const photo = await c.env.DB.prepare(
      `SELECT p.*, m.baby_id
       FROM daily_moment_photos p
       JOIN daily_moments m ON m.id = p.moment_id
       WHERE p.id = ?`,
    ).bind(photoId).first<PhotoRow & { baby_id: number }>();
    if (!photo) {
      return c.json({ success: false, data: null, message: "照片不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), photo.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const object = await c.env.MOMENT_PHOTOS.get(photo.r2_key);
    if (!object) {
      return c.json({ success: false, data: null, message: "照片不存在" }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "private, max-age=86400");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error(JSON.stringify({ message: "read moment photo failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "照片读取失败" }, 500);
  }
});

moments.get("/photos/:photoId/motion", async (c) => {
  try {
    const photoId = Number(c.req.param("photoId"));
    const photo = await c.env.DB.prepare(
      `SELECT p.*, m.baby_id
       FROM daily_moment_photos p
       JOIN daily_moments m ON m.id = p.moment_id
       WHERE p.id = ?`,
    ).bind(photoId).first<PhotoRow & { baby_id: number }>();
    if (!photo || !photo.motion_r2_key || !photo.motion_content_type) {
      return c.json({ success: false, data: null, message: "实况动态不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), photo.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const object = await c.env.MOMENT_PHOTOS.get(photo.motion_r2_key);
    if (!object) {
      return c.json({ success: false, data: null, message: "实况动态不存在" }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", photo.motion_content_type);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "private, max-age=86400");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error(JSON.stringify({ message: "read live moment motion failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "实况动态读取失败" }, 500);
  }
});

moments.delete("/photos/:photoId", async (c) => {
  try {
    const photoId = Number(c.req.param("photoId"));
    const photo = await c.env.DB.prepare(
      `SELECT p.*, m.baby_id
       FROM daily_moment_photos p
       JOIN daily_moments m ON m.id = p.moment_id
       WHERE p.id = ?`,
    ).bind(photoId).first<PhotoRow & { baby_id: number }>();
    if (!photo) {
      return c.json({ success: false, data: null, message: "照片不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), photo.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    await c.env.DB.prepare("DELETE FROM daily_moment_photos WHERE id = ?").bind(photoId).run();
    await c.env.MOMENT_PHOTOS.delete(photo.motion_r2_key ? [photo.r2_key, photo.motion_r2_key] : photo.r2_key);
    return c.json({ success: true, data: { id: photoId } });
  } catch (error) {
    console.error(JSON.stringify({ message: "delete moment photo failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "删除失败" }, 500);
  }
});

export default moments;
