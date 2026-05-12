import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { joinFamily } from "../lib/api";
import { useBaby } from "../lib/BabyContext";

const RELATIONS = [
  { value: "妈妈", emoji: "👩" },
  { value: "爸爸", emoji: "👨" },
  { value: "奶奶", emoji: "👵" },
  { value: "爷爷", emoji: "👴" },
  { value: "外婆", emoji: "👵" },
  { value: "外公", emoji: "👴" },
  { value: "保姆", emoji: "🧑" },
  { value: "其他", emoji: "🧑" },
];

export default function JoinFamilyPage() {
  const navigate = useNavigate();
  const { refresh } = useBaby();
  const [inviteCode, setInviteCode] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      return;
    }
    if (!relation) {
      setError("请选择你与宝宝的关系");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await joinFamily({ invite_code: inviteCode.trim(), relation });
      setSuccess(true);
      await refresh();
      setTimeout(() => navigate("/family"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="加入家庭" variant="light" back />
      <ScrollArea>
        <div className="p-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">{error}</div>
          )}
          {success && (
            <div className="bg-green-light rounded-sm p-3 text-sm text-green-dark mb-3.5">🎉 加入成功！正在跳转...</div>
          )}

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
            <div className="font-serif text-lg font-bold text-gray-900 mb-1">加入宝宝的家庭</div>
            <div className="text-sm text-gray-400">输入家庭邀请码，与家人一起记录宝宝成长</div>
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">邀请码</div>
            <input
              className="w-full h-14 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 font-serif text-2xl font-bold text-gray-900 text-center tracking-[0.3em] outline-none focus:border-mint uppercase"
              placeholder="输入6位邀请码"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <div className="text-xs text-gray-400 mt-1 text-center">向家庭创建者获取邀请码</div>
          </div>

          <div className="mb-5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">你与宝宝的关系</div>
            <div className="grid grid-cols-4 gap-2">
              {RELATIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRelation(r.value)}
                  className={`py-2.5 rounded-sm text-center cursor-pointer border-2 transition-all ${
                    relation === r.value
                      ? "border-lavender bg-lavender-light"
                      : "border-border bg-gray-100"
                  }`}
                >
                  <div className="text-xl mb-0.5">{r.emoji}</div>
                  <div className={`text-[10px] font-semibold ${relation === r.value ? "text-lavender-dark" : "text-gray-600"}`}>{r.value}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || success}
            className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50"
          >
            {loading ? "加入中..." : success ? "已加入 ✓" : "加入家庭"}
          </button>
        </div>
      </ScrollArea>
    </Layout>
  );
}
