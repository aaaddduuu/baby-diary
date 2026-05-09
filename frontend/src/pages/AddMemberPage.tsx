import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import { useBaby } from "../lib/BabyContext";

const ALL_RELATIONS = [
  { label: "爸爸", emoji: "👨" },
  { label: "妈妈", emoji: "👩" },
  { label: "爷爷", emoji: "👴" },
  { label: "奶奶", emoji: "👵" },
  { label: "外公", emoji: "👴" },
  { label: "外婆", emoji: "👵" },
  { label: "保姆", emoji: "🧑" },
  { label: "其他", emoji: "👤" },
];

export default function AddMemberPage() {
  const navigate = useNavigate();
  const { baby } = useBaby();
  const [selectedRelation, setSelectedRelation] = useState("");
  const [customName, setCustomName] = useState("");
  const [generated, setGenerated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const relations = useMemo(() => {
    if (!baby?.relation) return ALL_RELATIONS;
    return ALL_RELATIONS.filter(r => r.label !== baby.relation);
  }, [baby?.relation]);

  const handleGenerate = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteCode(code);
    setGenerated(true);
    setCopied(false);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
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
      } catch (err) {
        alert("复制失败，请手动复制链接：" + link);
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
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!baby) return null;

  return (
    <Layout>
      <Hero variant="mint" className="!pt-3">
        <div className="flex items-center gap-3 relative z-10 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg text-white border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          <div className="font-serif text-[17px] font-semibold text-white flex-1">添加家庭成员</div>
        </div>
      </Hero>
      <ScrollArea>
        <div className="p-4">
          {!generated ? (
            <>
              <div className="mb-6">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">选择称呼</div>
                <div className="grid grid-cols-4 gap-2">
                  {relations.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setSelectedRelation(r.label)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-card border-2 cursor-pointer transition-all ${
                        selectedRelation === r.label
                          ? "border-mint bg-mint-light"
                          : "border-transparent bg-white shadow-card"
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className={`text-xs font-medium ${selectedRelation === r.label ? "text-mint-dark" : "text-gray-900"}`}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">姓名（选填）</div>
                <input
                  className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm text-gray-900 outline-none focus:border-mint"
                  placeholder="如：王奶奶"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedRelation}
                className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer disabled:opacity-50"
              >
                生成邀请链接
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="bg-white rounded-card shadow-card p-6 mb-4">
                <div className="text-6xl mb-4">🎉</div>
                <div className="font-serif text-lg font-semibold text-gray-900 mb-2">邀请已生成</div>
                <div className="text-sm text-gray-400 mb-4">
                  邀请 {selectedRelation} {customName ? `(${customName})` : ""} 加入{baby.name}的家庭
                </div>
                
                <div className="bg-gray-50 rounded-card p-4 mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">邀请码</div>
                  <div className="font-serif text-3xl font-bold text-mint tracking-wider">{inviteCode}</div>
                </div>

                <div className="bg-gray-50 rounded-card p-4 mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">邀请链接</div>
                  <div className="text-sm text-gray-600 break-all bg-white p-3 rounded-sm border border-border">
                    {`${window.location.origin}/join/${inviteCode}`}
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  链接有效期：7天
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer"
                >
                  分享邀请
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 h-12 rounded-pill text-base font-semibold border-none cursor-pointer transition-all ${
                    copied
                      ? "bg-green text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {copied ? "已复制 ✓" : "复制链接"}
                </button>
              </div>
              
              <button
                onClick={() => setGenerated(false)}
                className="w-full h-10 mt-3 rounded-pill text-sm font-medium text-gray-500 bg-transparent border-none cursor-pointer"
              >
                重新生成
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </Layout>
  );
}
