import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const expenses = new Hono<{ Bindings: Bindings }>();

expenses.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { baby_id, member_id, category, amount, name, channel, date } = body;

    if (!baby_id || !category || amount === undefined || !name || !date) {
      return c.json({ success: false, data: null, message: "缺少必填字段：baby_id, category, amount, name, date" }, 400);
    }

    if (typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, data: null, message: "金额必须为正数" }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO expenses (baby_id, member_id, category, amount, name, channel, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(baby_id, member_id || null, category, amount, name, channel || null, date).run();

    const record = await c.env.DB.prepare(
      "SELECT * FROM expenses WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

expenses.get("/", async (c) => {
  try {
    const babyId = c.req.query("baby_id");
    const month = c.req.query("month");

    if (!babyId) {
      return c.json({ success: false, data: null, message: "缺少 baby_id 参数" }, 400);
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
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

expenses.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const record = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();

    if (!record) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

expenses.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { category, amount, name, channel, date } = body;

    const existing = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

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
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

expenses.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existing = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    await c.env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
    return c.json({ success: true, data: { id: Number(id) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default expenses;
