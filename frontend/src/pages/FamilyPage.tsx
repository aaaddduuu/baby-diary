import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import { useBaby } from "../lib/BabyContext";
import { useAuth } from "../lib/AuthContext";
import { fetchFamily, inviteFamilyMember, removeFamilyMember } from "../lib/api";
import type { FamilyMember } from "../lib/api";

function InviteSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      inviteFamilyMember({ relation: "家人" })
        .then(data => setCode(data.invite_code))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "邀请加入宝宝日记",
        text: `我在用「宝宝日记」记录宝宝成长，邀请你一起加入！邀请码：${code}`,
      }).catch(() => {});
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-[17px] font-semibold text-gray-900">邀请家庭成员</div>
          <button onClick={onClose} className="text-gray-400 text-2xl bg-transparent border-none cursor-pointer">×</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center py-8 text-gray-400">生成邀请码中...</div>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="text-sm text-gray-400 mb-3">分享邀请码给家人</div>
                <div className="flex items-center justify-center gap-3">
                  <div className="font-serif text-[36px] font-bold text-gray-900 tracking-[0.2em]">{code}</div>
                  <button
                    onClick={handleCopy}
                    className="text-sm text-mint bg-mint-light px-3 py-1.5 rounded-pill border-none cursor-pointer"
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">7天内有效</div>
              </div>

              <button
                onClick={handleShare}
                className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer"
              >
                分享给家人
              </button>
            </>
          )}
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

export default function FamilyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { baby } = useBaby();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchFamily()
      .then(data => {
        setMembers(data.members);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("确定要移除该成员吗？")) return;
    try {
      await removeFamilyMember(memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch {}
  };

  return (
    <Layout>
      <Hero className="!pt-3">
        <div className="flex items-center gap-3 relative z-10 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg text-white border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          <div className="font-serif text-[17px] font-semibold text-white flex-1">家庭成员</div>
        </div>
        <div className="relative z-10">
          <div className="text-sm text-white/80">{baby?.name || "宝宝"}的家庭</div>
          <div className="font-serif text-[40px] font-bold text-white leading-none mt-1">
            {members.length}<span className="text-lg font-normal text-white/70 ml-1">位成员</span>
          </div>
          <div className="text-xs text-white/70 mt-1">同步记录 · 共同守护宝宝成长</div>
        </div>
      </Hero>
      <ScrollArea>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">加载中...</div>
        ) : (
          <div className="p-3.5">
            <div className="bg-sky-light rounded-card p-3.5 mb-3.5">
              <div className="text-xs text-sky-dark">
                💡 <span className="font-semibold">多人同步记录：</span>家庭成员用各自设备输入邀请码加入，所有人看到同一份记录，每条记录会标注是谁添加的。
              </div>
            </div>

            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">当前成员</div>
              <div className="bg-white rounded-card shadow-card overflow-hidden">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                      member.user_id === user?.id ? "bg-rose-light border-2 border-mint" : "bg-gray-100"
                    }`}>
                      {member.avatar_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{member.nickname}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {member.user_id === user?.id ? "当前用户" : member.phone ? `手机: ${member.phone.slice(0, 3)}****${member.phone.slice(-4)}` : "未绑定账号"}
                      </div>
                    </div>
                    {member.user_id === user?.id ? (
                      <div className="text-xs text-mint bg-mint-light px-2 py-1 rounded-pill">当前</div>
                    ) : (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-xs text-gray-400 bg-transparent border-none cursor-pointer"
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">暂无成员</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowInvite(true)}
                className="w-full flex items-center bg-white rounded-card shadow-card p-3 cursor-pointer border-none text-left"
              >
                <div className="w-11 h-11 rounded-[10px] bg-mint-light flex items-center justify-center text-xl flex-shrink-0">➕</div>
                <div className="flex-1 ml-3">
                  <div className="text-sm font-semibold text-gray-900">添加家庭成员</div>
                  <div className="text-xs text-gray-400 mt-0.5">邀请爷爷、外公外婆等加入</div>
                </div>
                <div className="text-gray-300 text-lg">›</div>
              </button>

              <button
                onClick={() => navigate("/join/new")}
                className="w-full flex items-center bg-white rounded-card shadow-card p-3 cursor-pointer border-none text-left"
              >
                <div className="w-11 h-11 rounded-[10px] bg-sky-light flex items-center justify-center text-xl flex-shrink-0">🔗</div>
                <div className="flex-1 ml-3">
                  <div className="text-sm font-semibold text-gray-900">输入邀请码加入</div>
                  <div className="text-xs text-gray-400 mt-0.5">已有邀请码？点击加入家庭</div>
                </div>
                <div className="text-gray-300 text-lg">›</div>
              </button>
            </div>
          </div>
        )}
      </ScrollArea>

      <InviteSheet visible={showInvite} onClose={() => setShowInvite(false)} />
    </Layout>
  );
}
