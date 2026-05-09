import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import { useBaby } from "../lib/BabyContext";

const RELATIONS = [
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
  const [inviteMethod, setInviteMethod] = useState<"link" | "qrcode">("link");
  const [generated, setGenerated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleGenerate = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteCode(code);
    setGenerated(true);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("链接已复制到剪贴板");
    });
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
                <div className="grid grid-cols-3 gap-2">
                  {RELATIONS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setSelectedRelation(r.label)}
                      className={`flex items-center gap-2 p-3 rounded-card border-2 cursor-pointer transition-all ${
                        selectedRelation === r.label
                          ? "border-mint bg-mint-light"
                          : "border-transparent bg-white shadow-card"
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className={`text-sm font-medium ${selectedRelation === r.label ? "text-mint-dark" : "text-gray-900"}`}>
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

              <div className="bg-indigo-light rounded-card p-4 mb-6">
                <div className="text-sm font-semibold text-indigo-dark mb-2">邀请方式</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteMethod("link")}
                    className={`flex-1 h-11 rounded-sm text-sm font-medium border-2 cursor-pointer transition-all ${
                      inviteMethod === "link"
                        ? "border-indigo bg-white text-indigo"
                        : "border-transparent bg-white/50 text-gray-600"
                    }`}
                  >
                    发送链接
                  </button>
                  <button
                    onClick={() => setInviteMethod("qrcode")}
                    className={`flex-1 h-11 rounded-sm text-sm font-medium border-2 cursor-pointer transition-all ${
                      inviteMethod === "qrcode"
                        ? "border-indigo bg-white text-indigo"
                        : "border-transparent bg-white/50 text-gray-600"
                    }`}
                  >
                    二维码
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedRelation}
                className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer disabled:opacity-50"
              >
                生成邀请
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

                {inviteMethod === "qrcode" && (
                  <div className="bg-white border-2 border-gray-200 rounded-card p-6 mb-4 inline-block">
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📱</div>
                        <div className="text-xs text-gray-400">二维码示例</div>
                        <div className="font-mono text-sm font-bold text-gray-600 mt-1">{inviteCode}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 mb-4">
                  链接有效期：7天
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer"
                >
                  {inviteMethod === "link" ? "复制链接" : "分享二维码"}
                </button>
                <button
                  onClick={() => setGenerated(false)}
                  className="flex-1 h-12 rounded-pill text-base font-semibold text-gray-600 bg-gray-100 border-none cursor-pointer"
                >
                  重新生成
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Layout>
  );
}
