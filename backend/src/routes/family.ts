import { Hono } from "hono";
import { verify } from "hono/jwt";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  userId: number;
};

const family = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

family.use("*", async (c, next) => {
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

family.get("/", async (c) => {
  try {
    const userId = c.get("userId");

    let baby = await c.env.DB.prepare(
      "SELECT id, family_id, name, relation FROM babies WHERE user_id = ? LIMIT 1"
    ).bind(userId).first();

    let familyId = baby?.family_id;

    if (!familyId && baby) {
      const inviteCode = generateInviteCode();
      const familyResult = await c.env.DB.prepare(
        "INSERT INTO families (name, invite_code) VALUES (?, ?)"
      ).bind(`${baby.name}的家庭`, inviteCode).run();
      familyId = familyResult.meta.last_row_id;

      await c.env.DB.prepare(
        "UPDATE babies SET family_id = ? WHERE id = ?"
      ).bind(familyId, baby.id).run();

      const emojiMap: Record<string, string> = {
        "妈妈": "👩", "爸爸": "👨", "奶奶": "👵", "爷爷": "👴",
        "外婆": "👵", "外公": "👴", "保姆": "🧑", "其他": "🧑",
      };

      const relation = typeof baby.relation === "string" ? baby.relation : "";

      await c.env.DB.prepare(
        "INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
      ).bind(familyId, userId, "admin", relation || "家长", emojiMap[relation] || "🧑").run();
    }

    if (!familyId) {
      return c.json({ success: true, data: { family: null, members: [] } });
    }

    const familyRecord = await c.env.DB.prepare(
      "SELECT * FROM families WHERE id = ?"
    ).bind(familyId).first();

    const { results: members } = await c.env.DB.prepare(
      `SELECT fm.*, u.phone, u.name as user_name 
       FROM family_members fm 
       LEFT JOIN users u ON fm.user_id = u.id 
       WHERE fm.family_id = ? 
       ORDER BY fm.created_at ASC`
    ).bind(familyId).all();

    return c.json({ success: true, data: { family: familyRecord, members } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

family.post("/create", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { baby_id, relation } = body;

    if (!baby_id || !relation) {
      return c.json({ success: false, data: null, message: "缺少必填字段" }, 400);
    }

    const baby = await c.env.DB.prepare(
      "SELECT * FROM babies WHERE id = ? AND user_id = ?"
    ).bind(baby_id, userId).first();

    if (!baby) {
      return c.json({ success: false, data: null, message: "宝宝不存在" }, 404);
    }

    let familyId = baby.family_id;

    if (!familyId) {
      const inviteCode = generateInviteCode();
      const familyResult = await c.env.DB.prepare(
        "INSERT INTO families (name, invite_code) VALUES (?, ?)"
      ).bind(`${baby.name}的家庭`, inviteCode).run();
      familyId = familyResult.meta.last_row_id;

      await c.env.DB.prepare(
        "UPDATE babies SET family_id = ? WHERE id = ?"
      ).bind(familyId, baby_id).run();
    }

    const existingMember = await c.env.DB.prepare(
      "SELECT id FROM family_members WHERE family_id = ? AND user_id = ?"
    ).bind(familyId, userId).first();

    if (!existingMember) {
      const emojiMap: Record<string, string> = {
        "妈妈": "👩", "爸爸": "👨", "奶奶": "👵", "爷爷": "👴",
        "外婆": "👵", "外公": "👴", "保姆": "🧑", "其他": "🧑",
      };

      await c.env.DB.prepare(
        "INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
      ).bind(familyId, userId, "admin", relation, emojiMap[relation] || "🧑").run();
    }

    const familyRecord = await c.env.DB.prepare(
      "SELECT * FROM families WHERE id = ?"
    ).bind(familyId).first();

    return c.json({ success: true, data: familyRecord });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

family.post("/invite", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { relation, name } = body;

    let baby = await c.env.DB.prepare(
      "SELECT id, family_id, name FROM babies WHERE user_id = ? LIMIT 1"
    ).bind(userId).first();

    let familyId = baby?.family_id;

    if (!familyId && baby) {
      const inviteCode = generateInviteCode();
      const familyResult = await c.env.DB.prepare(
        "INSERT INTO families (name, invite_code) VALUES (?, ?)"
      ).bind(`${baby.name}的家庭`, inviteCode).run();
      familyId = familyResult.meta.last_row_id;

      await c.env.DB.prepare(
        "UPDATE babies SET family_id = ? WHERE id = ?"
      ).bind(familyId, baby.id).run();

      const existingMember = await c.env.DB.prepare(
        "SELECT id FROM family_members WHERE family_id = ? AND user_id = ?"
      ).bind(familyId, userId).first();

      if (!existingMember) {
        await c.env.DB.prepare(
          "INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
        ).bind(familyId, userId, "admin", "家长", "🧑").run();
      }
    }

    if (!familyId) {
      return c.json({ success: false, data: null, message: "请先创建宝宝" }, 400);
    }

    const familyRecord = await c.env.DB.prepare(
      "SELECT * FROM families WHERE id = ?"
    ).bind(familyId).first();

    let inviteCode = familyRecord?.invite_code;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await c.env.DB.prepare(
        "UPDATE families SET invite_code = ? WHERE id = ?"
      ).bind(inviteCode, familyId).run();
    }

    return c.json({ success: true, data: { invite_code: inviteCode, relation, name } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

family.post("/join", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { invite_code, relation } = body;

    if (!invite_code) {
      return c.json({ success: false, data: null, message: "请输入邀请码" }, 400);
    }

    const familyRecord = await c.env.DB.prepare(
      "SELECT * FROM families WHERE invite_code = ?"
    ).bind(invite_code).first();

    if (!familyRecord) {
      return c.json({ success: false, data: null, message: "邀请码无效" }, 404);
    }

    const existingMember = await c.env.DB.prepare(
      "SELECT id FROM family_members WHERE family_id = ? AND user_id = ?"
    ).bind(familyRecord.id, userId).first();

    if (existingMember) {
      return c.json({ success: false, data: null, message: "你已经是该家庭成员" }, 400);
    }

    const emojiMap: Record<string, string> = {
      "妈妈": "👩", "爸爸": "👨", "奶奶": "👵", "爷爷": "👴",
      "外婆": "👵", "外公": "👴", "保姆": "🧑", "其他": "🧑",
    };

    await c.env.DB.prepare(
      "INSERT INTO family_members (family_id, user_id, role, nickname, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
    ).bind(familyRecord.id, userId, "member", relation || "家人", emojiMap[relation || "其他"] || "🧑").run();

    const userBabies = await c.env.DB.prepare(
      "SELECT id, family_id FROM babies WHERE user_id = ?"
    ).bind(userId).all();

    for (const baby of userBabies.results) {
      if (baby.family_id && baby.family_id !== familyRecord.id) {
        const oldFamilyMembers = await c.env.DB.prepare(
          "SELECT COUNT(*) as count FROM family_members WHERE family_id = ?"
        ).bind(baby.family_id).first();

        await c.env.DB.prepare(
          "UPDATE babies SET family_id = ? WHERE id = ?"
        ).bind(familyRecord.id, baby.id).run();

        if (oldFamilyMembers && Number(oldFamilyMembers.count) <= 1) {
          await c.env.DB.prepare(
            "DELETE FROM family_members WHERE family_id = ?"
          ).bind(baby.family_id).run();
          await c.env.DB.prepare(
            "DELETE FROM families WHERE id = ?"
          ).bind(baby.family_id).run();
        }
      } else if (!baby.family_id) {
        await c.env.DB.prepare(
          "UPDATE babies SET family_id = ? WHERE id = ?"
        ).bind(familyRecord.id, baby.id).run();
      }
    }

    const familyBaby = await c.env.DB.prepare(
      "SELECT * FROM babies WHERE family_id = ? ORDER BY created_at ASC LIMIT 1"
    ).bind(familyRecord.id).first();

    return c.json({ success: true, data: { family: familyRecord, baby: familyBaby } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

family.delete("/members/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const memberId = c.req.param("id");

    const member = await c.env.DB.prepare(
      "SELECT * FROM family_members WHERE id = ?"
    ).bind(memberId).first();

    if (!member) {
      return c.json({ success: false, data: null, message: "成员不存在" }, 404);
    }

    const adminCheck = await c.env.DB.prepare(
      "SELECT id FROM family_members WHERE family_id = ? AND user_id = ? AND role = 'admin'"
    ).bind(member.family_id, userId).first();

    if (!adminCheck && member.user_id !== userId) {
      return c.json({ success: false, data: null, message: "无权限操作" }, 403);
    }

    await c.env.DB.prepare(
      "DELETE FROM family_members WHERE id = ?"
    ).bind(memberId).run();

    return c.json({ success: true, data: { id: Number(memberId) } });
  } catch (e) {
    return c.json({ success: false, data: null, message: String(e) }, 500);
  }
});

export default family;
