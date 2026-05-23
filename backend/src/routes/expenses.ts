import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

const expenses = new Hono<{ Bindings: Bindings; Variables: Variables }>();

expenses.use("*", async (c, next) => {
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

expenses.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { baby_id, category, amount, name, channel, date } = body;

    if (!baby_id || !category || amount === undefined || !name || !date) {
      return c.json({ success: false, data: null, message: "缺少必填字段" }, 400);
    }

    if (typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, data: null, message: "金额必须为正数" }, 400);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, baby_id))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO expenses (baby_id, category, amount, name, channel, date) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(baby_id, category, amount, name, channel || null, date).run();

    const record = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

expenses.get("/", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.query("baby_id");
    const month = c.req.query("month");

    if (!babyId) {
      return c.json({ success: false, data: null, message: "缺少 baby_id" }, 400);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, Number(babyId)))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    let query = "SELECT * FROM expenses WHERE baby_id = ?";
    const params: (string | number)[] = [Number(babyId)];

    if (month) {
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(month);
    }

    query += " ORDER BY date DESC, created_at DESC";
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

expenses.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, existing.baby_id as number))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    const { category, amount, name, channel, date } = body;
    await c.env.DB.prepare(
      "UPDATE expenses SET category = ?, amount = ?, name = ?, channel = ?, date = ? WHERE id = ?"
    ).bind(
      category || existing.category,
      amount !== undefined ? amount : existing.amount,
      name || existing.name,
      channel !== undefined ? channel : existing.channel,
      date || existing.date,
      id
    ).run();

    const record = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

expenses.delete("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const existing = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    if (!(await checkBabyAccess(c.env.DB, userId, existing.baby_id as number))) {
      return c.json({ success: false, data: null, message: "无权限" }, 403);
    }

    await c.env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
    return c.json({ success: true, data: { id: Number(id) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: "服务器错误" }, 500);
  }
});

export default expenses;
