import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const records = new Hono<{ Bindings: Bindings }>();

records.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { baby_id, member_id, type, data, recorded_at } = body;

    if (!baby_id || !type || !data) {
      return c.json({ success: false, data: null, message: "缺少必填字段：baby_id, type, data" }, 400);
    }

    const validTypes = ["breast_milk", "formula", "sleep", "diaper", "growth"];
    if (!validTypes.includes(type)) {
      return c.json({ success: false, data: null, message: `type 必须为以下之一: ${validTypes.join(", ")}` }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO records (baby_id, member_id, type, data, recorded_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(baby_id, member_id || null, type, JSON.stringify(data), recorded_at || new Date().toISOString()).run();

    const record = await c.env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

records.get("/", async (c) => {
  try {
    const babyId = c.req.query("baby_id");
    const date = c.req.query("date");
    const type = c.req.query("type");

    if (!babyId) {
      return c.json({ success: false, data: null, message: "缺少 baby_id 参数" }, 400);
    }

    let query = "SELECT * FROM records WHERE baby_id = ?";
    const params: (string | number)[] = [Number(babyId)];

    if (date) {
      query += " AND DATE(recorded_at) = ?";
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
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

records.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const record = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();

    if (!record) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

records.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { type, data, recorded_at, member_id } = body;

    const existing = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE records SET type = ?, data = ?, recorded_at = ?, member_id = ? WHERE id = ?"
    ).bind(
      type || existing.type,
      data ? JSON.stringify(data) : existing.data,
      recorded_at || existing.recorded_at,
      member_id !== undefined ? member_id : existing.member_id,
      id
    ).run();

    const record = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

records.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existing = await c.env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    await c.env.DB.prepare("DELETE FROM records WHERE id = ?").bind(id).run();
    return c.json({ success: true, data: { id: Number(id) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default records;
