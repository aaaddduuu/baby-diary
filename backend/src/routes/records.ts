import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

const records = new Hono<{ Bindings: Bindings; Variables: Variables }>();

records.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, data: null, message: "未登录" }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    if (payload && payload.sub) c.set("userId", Number(payload.sub));
    await next();
  } catch {
    return c.json({ success: false, data: null, message: "登录已过期" }, 401);
  }
});

async function checkBabyAccess(db: D1Database, userId: number, babyId: number): Promise<boolean> {
  const baby = await db.prepare("SELECT id FROM babies WHERE id = ? AND user_id = ?").bind(babyId, userId).first();
  if (baby) return true;
  const member = await db.prepare(
    "SELECT fm.id FROM family_members fm JOIN babies b ON b.family_id = fm.family_id WHERE fm.user_id = ? AND b.id = ?"
  ).bind(userId, babyId).first();
  return !!member;
}

function normalizeRecordedAt(value: unknown): string | null {
  const date = value === undefined ? new Date() : new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000) return null;
  return date.toISOString();
}

records.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { baby_id, type, data, recorded_at } = body;

    if (!baby_id || !type || !data) {
      return c.json({ success: false, data: null, message: "缺少必填字段" }, 400);
    }

    const validTypes = ["breast_milk", "formula", "sleep", "diaper", "growth", "medicine", "temperature", "jaundice", "cord_care", "bath_touch"];
    if (!validTypes.includes(type)) {
      return c.json({ success: false, data: null, message: "无效的记录类型" }, 400);
    }

    if (type === "medicine" && (typeof data.medicine_name !== "string" || !data.medicine_name.trim())) {
      return c.json({ success: false, data: null, message: "请填写药品名称" }, 400);
    }
    if (type === "temperature" && (typeof data.value !== "number" || data.value < 30 || data.value > 43)) {
      return c.json({ success: false, data: null, message: "请填写有效体温" }, 400);
    }
    if (type === "jaundice" && (typeof data.value !== "number" || data.value < 0)) {
      return c.json({ success: false, data: null, message: "请填写有效黄疸数值" }, 400);
    }

    const normalizedRecordedAt = normalizeRecordedAt(recorded_at);
    if (!normalizedRecordedAt) {
      return c.json({ success: false, data: null, message: "记录时间无效" }, 400);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, baby_id))) {
      return c.json({ success: false, data: null, message: "无权限访问该宝宝" }, 403);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO records (baby_id, user_id, type, data, recorded_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(baby_id, userId, type, JSON.stringify(data), normalizedRecordedAt).run();

    const record = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

records.get("/", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.query("baby_id");
    const date = c.req.query("date");
    const type = c.req.query("type");

    if (!babyId) {
      return c.json({ success: false, data: null, message: "缺少 baby_id" }, 400);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, Number(babyId)))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    let query = `SELECT r.*, u.name as user_name, fm.nickname as member_nickname, fm.avatar_emoji
      FROM records r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN family_members fm ON fm.user_id = r.user_id AND fm.family_id = (SELECT family_id FROM babies WHERE id = r.baby_id)
      WHERE r.baby_id = ?`;
    const params: (string | number)[] = [Number(babyId)];

    if (date) {
      query += " AND DATE(recorded_at, '+8 hours') = ?";
      params.push(date);
    }
    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY recorded_at DESC";
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

records.get("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const record = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();

    if (!record) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, record.baby_id as number))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

records.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, existing.baby_id as number))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const { type, data, recorded_at } = body;
    const nextType = type || existing.type;
    const nextData = data || JSON.parse(String(existing.data));
    const validTypes = ["breast_milk", "formula", "sleep", "diaper", "growth", "medicine", "temperature", "jaundice", "cord_care", "bath_touch"];
    if (!validTypes.includes(String(nextType))) {
      return c.json({ success: false, data: null, message: "无效的记录类型" }, 400);
    }
    if (nextType === "medicine" && (typeof nextData.medicine_name !== "string" || !nextData.medicine_name.trim())) {
      return c.json({ success: false, data: null, message: "请填写药品名称" }, 400);
    }
    if (nextType === "temperature" && (typeof nextData.value !== "number" || nextData.value < 30 || nextData.value > 43)) {
      return c.json({ success: false, data: null, message: "请填写有效体温" }, 400);
    }
    if (nextType === "jaundice" && (typeof nextData.value !== "number" || nextData.value < 0)) {
      return c.json({ success: false, data: null, message: "请填写有效黄疸数值" }, 400);
    }
    const normalizedRecordedAt = recorded_at === undefined ? String(existing.recorded_at) : normalizeRecordedAt(recorded_at);
    if (!normalizedRecordedAt) {
      return c.json({ success: false, data: null, message: "记录时间无效" }, 400);
    }
    await c.env.DB.prepare(
      "UPDATE records SET type = ?, data = ?, recorded_at = ? WHERE id = ?"
    ).bind(nextType, JSON.stringify(nextData), normalizedRecordedAt, id).run();

    const record = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

records.delete("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const existing = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, existing.baby_id as number))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    await c.env.DB.prepare("DELETE FROM records WHERE id = ?").bind(id).run();
    return c.json({ success: true, data: { id: Number(id) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

export default records;
