import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

const babies = new Hono<{ Bindings: Bindings; Variables: Variables }>();

babies.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, data: null, message: "未登录" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    if (payload && payload.sub) {
      c.set("userId", Number(payload.sub));
    }
    await next();
  } catch (e) {
    return c.json({ success: false, data: null, message: "登录已过期，请重新登录" }, 401);
  }
});

babies.get("/", async (c) => {
  try {
    const userId = c.get("userId");
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(userId).all();
    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { name, birth_date, gender, feeding_type, hospital, relation } = body;

    if (!name || !birth_date || !gender) {
      return c.json({ success: false, data: null, message: "缺少必填字段：name, birth_date, gender" }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO babies (user_id, name, birth_date, gender, feeding_type, hospital, relation) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(userId, name, birth_date, gender, feeding_type || "mixed", hospital || null, relation || "妈妈").run();

    const record = await c.env.DB.prepare("SELECT * FROM babies WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.get("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const record = await c.env.DB.prepare(
      "SELECT * FROM babies WHERE id = ? AND user_id = ?"
    ).bind(id, userId).first();

    if (!record) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, birth_date, gender, feeding_type, hospital, relation } = body;

    const existing = await c.env.DB.prepare(
      "SELECT * FROM babies WHERE id = ? AND user_id = ?"
    ).bind(id, userId).first();

    if (!existing) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE babies SET name = ?, birth_date = ?, gender = ?, feeding_type = ?, hospital = ?, relation = ? WHERE id = ?"
    ).bind(
      name || existing.name,
      birth_date || existing.birth_date,
      gender || existing.gender,
      feeding_type || existing.feeding_type,
      hospital !== undefined ? hospital : existing.hospital,
      relation || existing.relation,
      id
    ).run();

    const record = await c.env.DB.prepare("SELECT * FROM babies WHERE id = ?").bind(id).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default babies;
