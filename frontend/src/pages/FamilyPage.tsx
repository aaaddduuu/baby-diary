import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea, SectionCard } from "../components/Layout";
import Header from "../components/Header";
import { useBaby } from "../lib/BabyContext";
import { useAuth } from "../lib/AuthContext";
import { fetchFamily, inviteFamilyMember, removeFamilyMember } from "../lib/api";
import type { FamilyMember } from "../lib/api";

function InviteSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setCopied(false);
    setCode("");
    setError("");

    inviteFamilyMember({ relation: "家人" })
      .then((data) => setCode(data.invite_code))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "邀请码生成失败");
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const canUseCode = Boolean(code);

  const handleCopy = () => {
    if (!canUseCode) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (!canUseCode || !navigator.share) return;
    navigator
      .share({
        title: "邀请加入宝宝日记",
        text: `我在用「宝宝日记」记录宝宝成长，邀请你一起加入。邀请码：${code}`,
      })
      .catch(() => {});
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120]" onClick={onClose}>
      <div className="absolute inset-0 bg-[#21382E]/35 backdrop-blur-[2px]" />
      <div
        className="absolute inset-x-3 bottom-3 rounded-[28px] border border-white/70 bg-[rgba(248,247,239,.96)] shadow-[0_24px_48px_rgba(33,56,46,.18)] backdrop-blur-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EFE8DD] px-5 py-4">
          <div>
            <div className="font-serif text-lg font-semibold text-[#21382E]">邀请家庭成员</div>
            <div className="mt-1 text-sm text-[#7A8B80]">把邀请码分享给家人，一起同步照护记录。</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-[#5F7368] shadow-soft"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="rounded-[22px] bg-white px-4 py-10 text-center text-sm text-[#7A8B80] shadow-soft">
              正在生成邀请码…
            </div>
          ) : (
            <>
              <SectionCard className="p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">邀请码</div>
                {error ? (
                  <div className="mt-3 rounded-[18px] border border-[#F3C6C6] bg-[#FFF4F4] px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="font-tabular text-3xl font-bold tracking-[0.24em] text-[#1A5C3A]">{code}</div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!canUseCode}
                        className="rounded-full bg-[#EAF8F2] px-4 py-2 text-sm font-semibold text-[#1A5C3A] disabled:opacity-50"
                      >
                        {copied ? "已复制" : "复制"}
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-[#7A8B80]">邀请码 7 天内有效，输入后即可加入同一个家庭空间。</div>
                  </>
                )}
              </SectionCard>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 flex-1 rounded-full bg-white text-base font-semibold text-[#5F7368] shadow-soft"
                >
                  稍后再说
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!canUseCode}
                  className="h-12 flex-1 rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] disabled:opacity-50"
                >
                  立即分享
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[20px] border border-white/65 bg-white/90 p-4 shadow-[0_12px_24px_rgba(26,92,58,.12)] backdrop-blur-md">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#49735D]">{label}</div>
      <div className="mt-2 font-tabular text-2xl font-bold text-[#1A5C3A]">{value}</div>
      <div className="mt-1 text-sm text-[#5F7368]">{note}</div>
    </div>
  );
}

export default function FamilyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { baby } = useBaby();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    fetchFamily()
      .then((data) => {
        setMembers(data.members);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "家庭成员加载失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm("确定要移除这位成员吗？")) return;
    try {
      await removeFamilyMember(memberId);
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
    } catch {}
  };

  if (!baby) {
    return (
      <Layout className="secondary-page">
        <Header title="家庭成员" subtitle="先创建宝宝档案，再邀请家人一起记录" variant="hero" back />
      </Layout>
    );
  }

  return (
    <Layout className="secondary-page">
      <Hero className="pb-8 pt-4">
        <Header
          title="家庭成员"
          subtitle={`围绕 ${baby.name} 的共享空间，成员、邀请和加入入口都在这里。`}
          variant="transparent"
          back
        />

        <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
          <StatTile label="当前成员" value={String(members.length)} note="正在共同维护记录" />
          <StatTile
            label="本机身份"
            value={members.some((member) => member.user_id === user?.id) ? "已加入" : "未加入"}
            note="当前账号在家庭中的状态"
          />
          <StatTile label="协作方式" value="同步" note="刷新后可查看最新记录" />
        </div>
      </Hero>

      <ScrollArea className="pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">加载中…</div>
        ) : loadError ? (
          <div className="px-4 pb-6 pt-4">
            <SectionCard className="px-6 py-8 text-center">
              <div className="text-base font-black text-gray-700">家庭成员加载失败</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-400">{loadError}</div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6 pt-4">
            <SectionCard className="p-4">
              <div className="mb-2 panel-title text-[17px]">协作说明</div>
              <div className="panel-note">
                家庭成员可在各自设备上输入邀请码加入，加入后会看到同一份记录，并保留是谁新增或修改的上下文。
              </div>
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="border-b border-[#EFE8DD] px-4 py-4">
                <div className="panel-title text-[17px]">成员列表</div>
                <div className="panel-note mt-1">查看正在一起照护宝宝的家人和他们的加入状态。</div>
              </div>

              {members.length > 0 ? (
                members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const phoneLabel = member.phone
                    ? `${member.phone.slice(0, 3)}****${member.phone.slice(-4)}`
                    : "未绑定手机号";

                  return (
                    <div key={member.id} className="border-b border-[#F1ECE3] px-4 py-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                            isCurrentUser ? "bg-[#EAF8F2] ring-2 ring-[#BEE7D4]" : "bg-[#F6F3EA]"
                          }`}
                        >
                          {member.avatar_emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-[#21382E]">{member.nickname}</div>
                            {isCurrentUser ? (
                              <span className="rounded-full bg-[#EAF8F2] px-2.5 py-1 text-[11px] font-semibold text-[#1A5C3A]">
                                当前账号
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-[#7A8B80]">{phoneLabel}</div>
                          <div className="mt-2 text-xs text-[#7A8B80]">
                            {member.user_name ? `用户名称：${member.user_name}` : "尚未设置展示姓名"}
                          </div>
                        </div>
                        {!isCurrentUser ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            className="rounded-full bg-[#FFF4F4] px-3 py-2 text-xs font-semibold text-danger"
                          >
                            移除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[#7A8B80]">还没有成员加入，先发一个邀请码出去。</div>
              )}
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-3">
                <div className="panel-title text-[17px]">操作入口</div>
                <div className="panel-note mt-1">邀请新成员，或使用已有邀请码加入另一个家庭空间。</div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInvite(true)}
                  className="flex w-full items-center gap-3 rounded-[22px] bg-white p-4 text-left shadow-soft"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF8F2] text-xl">↗</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#21382E]">邀请家庭成员</div>
                    <div className="mt-1 text-xs text-[#7A8B80]">生成邀请码，分享给爸妈、长辈或看护人。</div>
                  </div>
                  <div className="text-lg text-[#B4B0A8]">›</div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/join/new")}
                  className="flex w-full items-center gap-3 rounded-[22px] bg-white p-4 text-left shadow-soft"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F3EA] text-xl">⌘</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#21382E]">输入邀请码加入</div>
                    <div className="mt-1 text-xs text-[#7A8B80]">已有邀请码时，从这里加入新的家庭空间。</div>
                  </div>
                  <div className="text-lg text-[#B4B0A8]">›</div>
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </ScrollArea>

      {!loadError ? <InviteSheet visible={showInvite} onClose={() => setShowInvite(false)} /> : null}
    </Layout>
  );
}
