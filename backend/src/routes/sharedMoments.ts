import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  MOMENT_PHOTOS: R2Bucket;
};

type ShareRow = {
  id: number;
  baby_id: number;
  share_month: string;
  expires_on: string;
  revoked_at: string | null;
  baby_name: string;
  birth_date: string;
};

type PublicMomentRow = {
  id: number;
  entry_date: string;
  note: string;
};

type PhotoRow = {
  id: number;
  moment_id: number;
  r2_key: string;
  content_type: string;
  size_bytes: number;
  sort_order: number;
  created_at: string;
};

const sharedMoments = new Hono<{ Bindings: Bindings }>();

sharedMoments.use("*", async (c, next) => {
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  c.header("Cache-Control", "private, no-store");
  await next();
});

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

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadShare(db: D1Database, token: string): Promise<ShareRow | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await hashToken(token);
  return db.prepare(
    `SELECT s.id, s.baby_id, s.share_month, s.expires_on, s.revoked_at,
            b.name AS baby_name, b.birth_date
     FROM moment_share_links s
     JOIN babies b ON b.id = s.baby_id
     WHERE s.token_hash = ?`,
  ).bind(tokenHash).first<ShareRow>();
}

function calcBabyDay(birthDate: string, entryDate: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [entryYear, entryMonth, entryDay] = entryDate.split("-").map(Number);
  const birth = Date.UTC(birthYear, birthMonth - 1, birthDay);
  const entry = Date.UTC(entryYear, entryMonth - 1, entryDay);
  return Math.max(1, Math.floor((entry - birth) / 86_400_000) + 1);
}

function shareUnavailableReason(share: ShareRow): string | null {
  if (share.revoked_at) return "分享链接已关闭";
  if (share.expires_on < todayInShanghai()) return "分享链接已过期";
  return null;
}

sharedMoments.get("/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const share = await loadShare(c.env.DB, token);
    if (!share) {
      return c.json({ success: false, data: null, message: "分享链接不存在" }, 404);
    }
    const unavailableReason = shareUnavailableReason(share);
    if (unavailableReason) {
      return c.json({ success: false, data: null, message: unavailableReason }, 410);
    }

    const { results: momentRows } = await c.env.DB.prepare(
      `SELECT id, entry_date, note
       FROM daily_moments
       WHERE baby_id = ?
       ORDER BY entry_date DESC, id DESC`,
    ).bind(share.baby_id).all<PublicMomentRow>();

    const photosByMoment = new Map<number, PhotoRow[]>();
    if (momentRows.length > 0) {
      const placeholders = momentRows.map(() => "?").join(",");
      const { results: photoRows } = await c.env.DB.prepare(
        `SELECT * FROM daily_moment_photos
         WHERE moment_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
      ).bind(...momentRows.map((moment) => moment.id)).all<PhotoRow>();
      for (const photo of photoRows) {
        const entries = photosByMoment.get(photo.moment_id) || [];
        entries.push(photo);
        photosByMoment.set(photo.moment_id, entries);
      }
    }

    return c.json({
      success: true,
      data: {
        baby_name: share.baby_name,
        share_month: share.share_month,
        expires_on: share.expires_on,
        moments: momentRows.map((moment) => ({
          id: moment.id,
          entry_date: moment.entry_date,
          note: moment.note,
          baby_day: calcBabyDay(share.birth_date, moment.entry_date),
          photos: (photosByMoment.get(moment.id) || []).map((photo) => ({
            id: photo.id,
            moment_id: photo.moment_id,
            content_type: photo.content_type,
            size_bytes: photo.size_bytes,
            sort_order: photo.sort_order,
            created_at: photo.created_at,
            path: `/shared-moments/${token}/photos/${photo.id}`,
          })),
        })),
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "read shared moments failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "分享内容加载失败" }, 500);
  }
});

sharedMoments.get("/:token/photos/:photoId", async (c) => {
  try {
    const token = c.req.param("token");
    const share = await loadShare(c.env.DB, token);
    if (!share) {
      return c.json({ success: false, data: null, message: "分享链接不存在" }, 404);
    }
    const unavailableReason = shareUnavailableReason(share);
    if (unavailableReason) {
      return c.json({ success: false, data: null, message: unavailableReason }, 410);
    }

    const photoId = Number(c.req.param("photoId"));
    const photo = await c.env.DB.prepare(
      `SELECT p.*
       FROM daily_moment_photos p
       JOIN daily_moments m ON m.id = p.moment_id
       WHERE p.id = ? AND m.baby_id = ?`,
    ).bind(photoId, share.baby_id).first<PhotoRow>();
    if (!photo) {
      return c.json({ success: false, data: null, message: "照片不存在" }, 404);
    }

    const object = await c.env.MOMENT_PHOTOS.get(photo.r2_key);
    if (!object) {
      return c.json({ success: false, data: null, message: "照片不存在" }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", photo.content_type);
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    headers.set("ETag", object.httpEtag);
    return new Response(object.body, { headers });
  } catch (error) {
    console.error(JSON.stringify({ message: "read shared moment photo failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "照片读取失败" }, 500);
  }
});

export default sharedMoments;
