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

auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password, name } = body;

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

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(phone).first();
    if (existing) {
      return c.json({ success: false, data: null, message: "该手机号已注册" }, 409);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password + phone);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const result = await c.env.DB.prepare(
      "INSERT INTO users (phone, password_hash, name) VALUES (?, ?, ?)"
    ).bind(phone, passwordHash, name || null).run();

    const userId = result.meta.last_row_id;
    const token = await sign({ sub: userId, phone, exp: Math.floor(Date.now() / 1000) + 86400 * 7, alg: "HS256" }, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: { token, user: { id: userId, phone, name: name || null } }
    }, 201);
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
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
    const userId = payload.sub;

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
    const userId = payload.sub;

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
