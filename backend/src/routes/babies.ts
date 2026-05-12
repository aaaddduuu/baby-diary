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

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let inviteCode = "";
    for (let i = 0; i < 6; i++) {
      inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const familyResult = await c.env.DB.prepare(
      "INSERT INTO families (name, invite_code) VALUES (?, ?)"
    ).bind(`${name}的家庭`, inviteCode).run();
    const familyId = familyResult.meta.last_row_id;

    const result = await c.env.DB.prepare(
      "INSERT INTO babies (user_id, family_id, name, birth_date, gender, feeding_type, hospital, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(userId, familyId, name, birth_date, gender, feeding_type || "mixed", hospital || null, relation || "妈妈").run();

    const babyId = result.meta.last_row_id;

    const emojiMap: Record<string, string> = {
      "妈妈": "👩", "爸爸": "👨", "奶奶": "👵", "爷爷": "👴",
      "外婆": "👵", "外公": "👴", "保姆": "🧑", "其他": "🧑",
    };

    await c.env.DB.prepare(
      "INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
    ).bind(familyId, userId, "admin", relation || "妈妈", emojiMap[relation || "妈妈"] || "🧑").run();

    const record = await c.env.DB.prepare("SELECT * FROM babies WHERE id = ?").bind(babyId).first();
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

babies.get("/:id/growth", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const { results } = await c.env.DB.prepare(
      "SELECT * FROM growth_records WHERE baby_id = ? ORDER BY measured_at DESC"
    ).bind(babyId).all();

    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.post("/:id/growth", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const body = await c.req.json();

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const { weight, height, head_circumference, photo_url, measured_at } = body;

    if (!measured_at) {
      return c.json({ success: false, data: null, message: "缺少必填字段：measured_at" }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO growth_records (baby_id, weight, height, head_circumference, photo_url, measured_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(babyId, weight || null, height || null, head_circumference || null, photo_url || null, measured_at).run();

    const record = await c.env.DB.prepare("SELECT * FROM growth_records WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.put("/:id/growth/:growthId", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const growthId = c.req.param("growthId");
    const body = await c.req.json();

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const existing = await c.env.DB.prepare(
      "SELECT * FROM growth_records WHERE id = ? AND baby_id = ?"
    ).bind(growthId, babyId).first();

    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    const { weight, height, head_circumference, measured_at } = body;

    await c.env.DB.prepare(
      "UPDATE growth_records SET weight = ?, height = ?, head_circumference = ?, measured_at = ? WHERE id = ?"
    ).bind(
      weight !== undefined ? weight : existing.weight,
      height !== undefined ? height : existing.height,
      head_circumference !== undefined ? head_circumference : existing.head_circumference,
      measured_at || existing.measured_at,
      growthId
    ).run();

    const record = await c.env.DB.prepare("SELECT * FROM growth_records WHERE id = ?").bind(growthId).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.delete("/:id/growth/:growthId", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const growthId = c.req.param("growthId");

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const existing = await c.env.DB.prepare(
      "SELECT * FROM growth_records WHERE id = ? AND baby_id = ?"
    ).bind(growthId, babyId).first();

    if (!existing) {
      return c.json({ success: false, data: null, message: "记录不存在" }, 404);
    }

    await c.env.DB.prepare("DELETE FROM growth_records WHERE id = ?").bind(growthId).run();
    return c.json({ success: true, data: { id: Number(growthId) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.get("/:id/vaccines", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const { results } = await c.env.DB.prepare(
      "SELECT * FROM vaccines WHERE baby_id = ? ORDER BY date ASC"
    ).bind(babyId).all();

    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.post("/:id/vaccines", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const body = await c.req.json();

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const { name, status, date, hospital, is_custom } = body;

    if (!name) {
      return c.json({ success: false, data: null, message: "缺少必填字段：name" }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO vaccines (baby_id, name, status, date, hospital, is_custom) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(babyId, name, status || "planned", date || null, hospital || null, is_custom ? 1 : 0).run();

    const record = await c.env.DB.prepare("SELECT * FROM vaccines WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json({ success: true, data: record }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.put("/:id/vaccines/:vaccineId", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const vaccineId = c.req.param("vaccineId");
    const body = await c.req.json();

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const existing = await c.env.DB.prepare(
      "SELECT * FROM vaccines WHERE id = ? AND baby_id = ?"
    ).bind(vaccineId, babyId).first();

    if (!existing) {
      return c.json({ success: false, data: null, message: "疫苗记录不存在" }, 404);
    }

    const { name, status, date, hospital } = body;

    await c.env.DB.prepare(
      "UPDATE vaccines SET name = ?, status = ?, date = ?, hospital = ? WHERE id = ?"
    ).bind(
      name || existing.name,
      status || existing.status,
      date !== undefined ? date : existing.date,
      hospital !== undefined ? hospital : existing.hospital,
      vaccineId
    ).run();

    const record = await c.env.DB.prepare("SELECT * FROM vaccines WHERE id = ?").bind(vaccineId).first();
    return c.json({ success: true, data: record });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

babies.delete("/:id/vaccines/:vaccineId", async (c) => {
  try {
    const userId = c.get("userId");
    const babyId = c.req.param("id");
    const vaccineId = c.req.param("vaccineId");

    const baby = await c.env.DB.prepare(
      "SELECT id FROM babies WHERE id = ? AND user_id = ?"
    ).bind(babyId, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    const existing = await c.env.DB.prepare(
      "SELECT * FROM vaccines WHERE id = ? AND baby_id = ?"
    ).bind(vaccineId, babyId).first();

    if (!existing) {
      return c.json({ success: false, data: null, message: "疫苗记录不存在" }, 404);
    }

    await c.env.DB.prepare("DELETE FROM vaccines WHERE id = ?").bind(vaccineId).run();
    return c.json({ success: true, data: { id: Number(vaccineId) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default babies;
