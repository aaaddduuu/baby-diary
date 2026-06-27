import { useMemo, useState } from "react";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import { inviteFamilyMember } from "../lib/api";
import { useBaby } from "../lib/BabyContext";
import { FAMILY_RELATIONS, RelationChip, SectionLabel } from "./familyFlowShared";

export default function AddMemberPage() {
  const { baby } = useBaby();
  const [selectedRelation, setSelectedRelation] = useState("");
  const [customName, setCustomName] = useState("");
  const [generated, setGenerated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const relations = useMemo(() => {
    if (!baby?.relation) return FAMILY_RELATIONS;
    return FAMILY_RELATIONS.filter((item) => item.value !== baby.relation);
  }, [baby?.relation]);

  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";

  const handleGenerate = async () => {
    if (!selectedRelation) return;

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const data = await inviteFamilyMember({
        relation: selectedRelation,
        name: customName.trim() || undefined,
      });
      setInviteCode(data.invite_code);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成邀请失败");
      setGenerated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/join/${inviteCode}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert(`复制失败，请手动复制链接：${link}`);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `邀请加入${baby?.name || "宝宝"}的家庭`,
          text: `邀请你加入${baby?.name || "宝宝"}的家庭，一起记录宝宝的成长`,
          url: link,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!baby) return null;

  return (
    <Layout className="secondary-page">
      <Header
        title="添加家庭成员"
        subtitle="生成邀请信息，把成长记录分享给家人"
        variant="hero"
        back
      />

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-6 pt-4">
          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">邀请状态</div>
              <div className="panel-note mt-1">
                {error
                  ? error
                  : generated
                  ? "邀请码已生成，可以直接分享给家人。"
                  : "先选择关系，再生成一份新的邀请信息。"}
              </div>
            </div>

            <div
              className={`rounded-[22px] border px-4 py-4 ${
                error
                  ? "border-[#F3C6C6] bg-[#FFF4F4]"
                  : generated
                  ? "border-[#CBE8DA] bg-[#EEF8F3]"
                  : "border-[#E7E0D2] bg-[linear-gradient(135deg,#FFFDF7_0%,#F6F3EA_100%)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-xl shadow-soft">
                  {error ? "!" : generated ? "🎟️" : "👨‍👩‍👧"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#21382E]">
                    {error
                      ? "还没有生成邀请"
                      : generated
                      ? "邀请已准备好"
                      : `为 ${baby.name} 添加新的家庭成员`}
                  </div>
                  <div className={`mt-1 text-sm leading-6 ${error ? "text-danger" : "text-[#5F7368]"}`}>
                    {error
                      ? "请检查网络或稍后重试。"
                      : generated
                      ? `正在邀请${selectedRelation}${customName ? `（${customName}）` : ""}加入家庭。`
                      : selectedRelation
                        ? `当前选择：${selectedRelation}${customName ? `（${customName}）` : ""}`
                        : "选择关系后会生成邀请码和专属链接。"}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {!generated ? (
            <>
              <SectionCard className="p-4">
                <div className="mb-3">
                  <div className="panel-title text-[17px]">关系选择</div>
                  <div className="panel-note mt-1">
                    选择这位家人在家庭中的身份。
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {relations.map((item) => (
                    <RelationChip
                      key={item.value}
                      active={selectedRelation === item.value}
                      icon={item.emoji}
                      label={item.value}
                      onClick={() => setSelectedRelation(item.value)}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="space-y-4 p-4">
                <div>
                  <div className="panel-title text-[17px]">补充称呼</div>
                  <div className="panel-note mt-1">
                    可选填写更具体的名字，方便家人收到邀请时识别
                  </div>
                </div>

                <div className="space-y-2 rounded-[22px] bg-white p-4 shadow-soft">
                  <SectionLabel htmlFor="add-member-custom-name">{"姓名（选填）"}</SectionLabel>
                  <input
                    id="add-member-custom-name"
                    className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none placeholder:text-[#9A9388] focus:border-[#5BC4A0]"
                    placeholder="如：王奶奶"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                  />
                </div>
              </SectionCard>
            </>
          ) : (
            <>
              <SectionCard className="space-y-4 p-4">
                <div>
                  <div className="panel-title text-[17px]">邀请码</div>
                  <div className="panel-note mt-1">
                    把这组邀请码发给家人，对方加入时仍需自己确认关系
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#D8EEE1] bg-[linear-gradient(135deg,#F8FFFB_0%,#EEF8F3_100%)] px-4 py-5 text-center shadow-[0_14px_32px_rgba(47,155,115,.14)]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A8B80]">邀请码</div>
                  <div className="mt-3 font-tabular text-[34px] font-bold tracking-[0.24em] text-[#1A5C3A]">{inviteCode}</div>
                </div>
              </SectionCard>

              <SectionCard className="space-y-4 p-4">
                <div>
                  <div className="panel-title text-[17px]">邀请链接</div>
                  <div className="panel-note mt-1">链接有效期 7 天，也可以直接复制给家人</div>
                </div>

                <div className="rounded-[22px] bg-white p-4 shadow-soft">
                  <div className="break-all text-sm leading-6 text-[#526258]">{inviteLink}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="h-11 rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.22)]"
                  >
                    分享邀请
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`h-11 rounded-full text-sm font-semibold transition-all ${
                      copied ? "bg-[#2F9B73] text-white" : "bg-[#F4F1E9] text-[#526258]"
                    }`}
                  >
                    {copied ? "已复制链接" : "复制链接"}
                  </button>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        {generated ? (
          <button
            type="button"
            onClick={() => setGenerated(false)}
            className="h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)]"
          >
            重新生成邀请
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedRelation || loading}
            className="h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] transition-all disabled:opacity-50"
          >
            {loading ? "生成中…" : "生成邀请链接"}
          </button>
        )}
      </div>
    </Layout>
  );
}
