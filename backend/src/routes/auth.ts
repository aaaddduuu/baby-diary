import { Hono } from "hono";
import { sign, verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const FAMILY_RELATIONS = new Set(["妈妈", "爸爸", "奶奶", "爷爷", "外婆", "外公", "保姆", "其他"]);
const RELATION_EMOJI: Record<string, string> = {
  "妈妈": "👩",
  "爸爸": "👨",
  "奶奶": "👵",
  "爷爷": "👴",
  "外婆": "👵",
  "外公": "👴",
  "保姆": "🧑",
  "其他": "🧑",
};

auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password, name, invite_code, relation } = body;
    const inviteCode = typeof invite_code === "string" ? invite_code.trim().toUpperCase() : "";

    if (!phone || !password) {
      return c.json({ success: false, data: null, message: "手机号和密码不能为空" }, 400);
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return c.json({ success: false, data: null, message: "请输入正确的手机号" }, 400);
    }

    if (password.length < 8) {
      return c.json({ success: false, data: null, message: "密码至少8位" }, 400);
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return c.json({ success: false, data: null, message: "密码需包含字母和数字" }, 400);
    }

    if (inviteCode && !/^[A-HJ-NP-Z2-9]{6}$/.test(inviteCode)) {
      return c.json({ success: false, data: null, message: "请输入正确的6位邀请码" }, 400);
    }

    if (inviteCode && (typeof relation !== "string" || !FAMILY_RELATIONS.has(relation))) {
      return c.json({ success: false, data: null, message: "请选择你与宝宝的关系" }, 400);
    }

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(phone).first();
    if (existing) {
      return c.json({ success: false, data: null, message: "该手机号已注册" }, 409);
    }

    const familyRecord = inviteCode
      ? await c.env.DB.prepare("SELECT id, name FROM families WHERE invite_code = ?").bind(inviteCode).first()
      : null;

    if (inviteCode && !familyRecord) {
      return c.json({ success: false, data: null, message: "邀请码无效" }, 404);
    }

    const familyBaby = familyRecord
      ? await c.env.DB.prepare(
        "SELECT * FROM babies WHERE family_id = ? ORDER BY created_at ASC LIMIT 1",
      ).bind(familyRecord.id).first()
      : null;

    if (familyRecord && !familyBaby) {
      return c.json({ success: false, data: null, message: "该家庭暂未创建宝宝" }, 409);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password + phone);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const statements = [
      c.env.DB.prepare(
        "INSERT INTO users (phone, password_hash, name) VALUES (?, ?, ?)",
      ).bind(phone, passwordHash, name || null),
    ];

    if (familyRecord) {
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji)
           SELECT ?, id, 'member', ?, ? FROM users WHERE phone = ?`,
        ).bind(familyRecord.id, relation, RELATION_EMOJI[relation] || "🧑", phone),
      );
    }

    const [userInsert] = await c.env.DB.batch(statements);
    const userId = Number(userInsert.meta.last_row_id);
    const token = await sign({ sub: userId, phone, exp: Math.floor(Date.now() / 1000) + 86400 * 7, alg: "HS256" }, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: {
        token,
        user: { id: userId, phone, name: name || null },
        onboarding_required: !familyRecord,
        baby: familyBaby,
      },
    }, 201);
  } catch (e) {
    console.error(JSON.stringify({ message: "register failed", error: e instanceof Error ? e.message : String(e) }));
    if (String(e).includes("UNIQUE constraint failed: users.phone")) {
      return c.json({ success: false, data: null, message: "该手机号已注册" }, 409);
    }
    return c.json({ success: false, data: null, message: "注册失败，请稍后重试" }, 500);
  }
});

auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return c.json({ success: false, data: null, message: "手机号和密码不能为空" }, 400);
    }

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first();
    if (!user) {
      return c.json({ success: false, data: null, message: "手机号或密码错误" }, 401);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password + phone);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (passwordHash !== user.password_hash) {
      return c.json({ success: false, data: null, message: "手机号或密码错误" }, 401);
    }

    const token = await sign({ sub: user.id, phone, exp: Math.floor(Date.now() / 1000) + 86400 * 7, alg: "HS256" }, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: { token, user: { id: user.id, phone, name: user.name } }
    });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

auth.get("/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, data: null, message: "未登录" }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    const userId = Number(payload.sub);

    const user = await c.env.DB.prepare("SELECT id, phone, name, avatar, created_at FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c.json({ success: false, data: null, message: "用户不存在" }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (e) {
    return c.json({ success: false, data: null, message: "登录已过期，请重新登录" }, 401);
  }
});

auth.put("/profile", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, data: null, message: "未登录" }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    const userId = Number(payload.sub);

    const body = await c.req.json();
    const { name, avatar } = body;

    if (!name && !avatar) {
      return c.json({ success: false, data: null, message: "请提供要更新的信息" }, 400);
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (name) {
      updates.push("name = ?");
      params.push(name);
    }
    if (avatar) {
      updates.push("avatar = ?");
      params.push(avatar);
    }

    params.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();

    const user = await c.env.DB.prepare("SELECT id, phone, name, avatar, created_at FROM users WHERE id = ?").bind(userId).first();

    return c.json({ success: true, data: user });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default auth;
