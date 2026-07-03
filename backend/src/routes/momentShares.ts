import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

type ShareRow = {
  id: number;
  baby_id: number;
  created_by: number;
  share_month: string;
  expires_on: string;
  revoked_at: string | null;
  created_at: string;
};

const momentShares = new Hono<{ Bindings: Bindings; Variables: Variables }>();

momentShares.use("*", async (c, next) => {
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

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function serializeShare(share: ShareRow, today: string) {
  const status = share.revoked_at ? "revoked" : share.expires_on < today ? "expired" : "active";
  return { ...share, status };
}

momentShares.get("/", async (c) => {
  try {
    const babyId = Number(c.req.query("baby_id"));
    if (!Number.isInteger(babyId) || babyId <= 0) {
      return c.json({ success: false, data: null, message: "缺少 baby_id" }, 400);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), babyId))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const { results } = await c.env.DB.prepare(
      `SELECT id, baby_id, created_by, share_month, expires_on, revoked_at, created_at
       FROM moment_share_links
       WHERE baby_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
    ).bind(babyId).all<ShareRow>();
    const today = todayInShanghai();
    return c.json({ success: true, data: results.map((share) => serializeShare(share, today)) });
  } catch (error) {
    console.error(JSON.stringify({ message: "list moment shares failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "分享记录加载失败" }, 500);
  }
});

momentShares.post("/", async (c) => {
  try {
    const body: unknown = await c.req.json();
    if (!isPlainObject(body)) {
      return c.json({ success: false, data: null, message: "请求格式无效" }, 400);
    }

    const babyId = Number(body.baby_id);
    const shareMonth = body.share_month;
    const expiresOn = body.expires_on;
    const today = todayInShanghai();
    const normalizedShareMonth = isValidMonth(shareMonth) ? shareMonth : today.slice(0, 7);
    if (!Number.isInteger(babyId) || babyId <= 0 || !isValidDate(expiresOn)) {
      return c.json({ success: false, data: null, message: "请检查有效期" }, 400);
    }
    if (expiresOn < today) {
      return c.json({ success: false, data: null, message: "有效期不能早于今天" }, 400);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), babyId))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const moment = await c.env.DB.prepare(
      "SELECT id FROM daily_moments WHERE baby_id = ? LIMIT 1",
    ).bind(babyId).first();
    if (!moment) {
      return c.json({ success: false, data: null, message: "还没有可分享的成长时光" }, 409);
    }

    const token = generateShareToken();
    const tokenHash = await hashToken(token);
    const result = await c.env.DB.prepare(
      `INSERT INTO moment_share_links (baby_id, created_by, token_hash, share_month, expires_on)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(babyId, c.get("userId"), tokenHash, normalizedShareMonth, expiresOn).run();

    return c.json({
      success: true,
      data: {
        id: Number(result.meta.last_row_id),
        baby_id: babyId,
        created_by: c.get("userId"),
        share_month: normalizedShareMonth,
        expires_on: expiresOn,
        revoked_at: null,
        created_at: new Date().toISOString(),
        status: "active",
        token,
      },
    }, 201);
  } catch (error) {
    console.error(JSON.stringify({ message: "create moment share failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "分享链接生成失败" }, 500);
  }
});

momentShares.delete("/:id", async (c) => {
  try {
    const shareId = Number(c.req.param("id"));
    const share = await c.env.DB.prepare(
      "SELECT id, baby_id FROM moment_share_links WHERE id = ?",
    ).bind(shareId).first<{ id: number; baby_id: number }>();
    if (!share) {
      return c.json({ success: false, data: null, message: "分享链接不存在" }, 404);
    }
    if (!(await checkBabyAccess(c.env.DB, c.get("userId"), share.baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    await c.env.DB.prepare(
      "UPDATE moment_share_links SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE id = ?",
    ).bind(shareId).run();
    return c.json({ success: true, data: { id: shareId } });
  } catch (error) {
    console.error(JSON.stringify({ message: "revoke moment share failed", error: error instanceof Error ? error.message : String(error) }));
    return c.json({ success: false, data: null, message: "关闭分享失败" }, 500);
  }
});

export default momentShares;
