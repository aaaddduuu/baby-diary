import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import { joinFamily } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import { FAMILY_RELATIONS, RelationChip, SectionLabel } from "./familyFlowShared";

export default function JoinFamilyPage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();
  const { refresh } = useBaby();
  const [inviteCode, setInviteCode] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (code && code !== "new") {
      setInviteCode(code.toUpperCase());
    }
  }, [code]);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      setSuccess(false);
      return;
    }
    if (!relation) {
      setError("请选择你与宝宝的关系");
      setSuccess(false);
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
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="secondary-page">
      <Header
        title="加入家庭"
        subtitle="用邀请码进入同一个成长空间"
        variant="hero"
        back
      />

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-6 pt-4">
          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">加入状态</div>
              <div className="panel-note mt-1">
                {success
                  ? "加入成功，正在为你切换到家庭页面。"
                  : error
                    ? error
                    : "向家庭创建者获取 6 位邀请码，再确认你的身份关系"}
              </div>
            </div>

            <div
              className={`rounded-[22px] border px-4 py-4 ${
                success
                  ? "border-[#CBE8DA] bg-[#EEF8F3]"
                  : error
                    ? "border-[#F3C6C6] bg-[#FFF4F4]"
                    : "border-[#E7E0D2] bg-[linear-gradient(135deg,#FFFDF7_0%,#F6F3EA_100%)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-xl shadow-soft">
                  {success ? "🎉" : error ? "!" : "🔐"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#21382E]">
                    {success ? "已发送加入请求" : "准备加入宝宝的家庭"}
                  </div>
                  <div
                    className={`mt-1 text-sm leading-6 ${
                      success ? "text-[#2F9B73]" : error ? "text-danger" : "text-[#5F7368]"
                    }`}
                  >
                    {success
                      ? `身份已设置为${relation}，页面即将跳转。`
                      : inviteCode
                        ? `当前邀请码：${inviteCode.toUpperCase()}`
                        : "邀请码会在确认后提交，关系会按你当前选择提交。"}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4 p-4">
            <div>
              <div className="panel-title text-[17px]">邀请码</div>
              <div className="panel-note mt-1">先输入邀请码，再继续确认加入身份</div>
            </div>

            <div className="space-y-2 rounded-[22px] bg-white p-4 shadow-soft">
              <SectionLabel htmlFor="join-invite-code">{"邀请码"}</SectionLabel>
              <input
                id="join-invite-code"
                className="h-16 w-full rounded-[24px] border border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] px-4 text-center font-tabular text-[28px] font-bold uppercase tracking-[0.24em] text-[#1A5C3A] outline-none placeholder:text-[#A6B8AE] focus:border-[#5BC4A0]"
                placeholder="输入6位邀请码"
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase());
                  if (error) setError("");
                }}
                maxLength={6}
              />
              <div className="text-xs text-[#7A8B80]">邀请码由家庭创建者提供</div>
            </div>
          </SectionCard>

          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">你的关系</div>
              <div className="panel-note mt-1">
                使用和主流程一致的关系卡片，让家庭角色更直观
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FAMILY_RELATIONS.map((item) => (
                <RelationChip
                  key={item.value}
                  active={relation === item.value}
                  icon={item.emoji}
                  label={item.value}
                  onClick={() => {
                    setRelation(item.value);
                    if (error) setError("");
                  }}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={handleJoin}
          disabled={loading || success}
          className="h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] transition-all disabled:opacity-50"
        >
          {loading ? "加入中…" : success ? "已加入家庭" : "加入家庭"}
        </button>
      </div>
    </Layout>
  );
}
