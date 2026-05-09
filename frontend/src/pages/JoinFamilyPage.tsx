import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout, { Hero, ScrollArea } from "../components/Layout";
import { useAuth } from "../lib/AuthContext";

export default function JoinFamilyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        setJoined(true);
        setTimeout(() => navigate("/home"), 2000);
      } else {
        setError(data.message || "加入失败");
      }
    } catch (e) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="font-serif text-[17px] font-semibold text-white flex-1">加入家庭</div>
        </div>
      </Hero>
      <ScrollArea>
        <div className="p-4">
          {joined ? (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">🎉</div>
              <div className="font-serif text-xl font-semibold text-gray-900 mb-2">加入成功！</div>
              <div className="text-sm text-gray-400">正在跳转到首页...</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-white rounded-card shadow-card p-6 mb-6">
                <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
                <div className="font-serif text-lg font-semibold text-gray-900 mb-2">邀请你加入家庭</div>
                <div className="text-sm text-gray-400 mb-4">
                  你的家人邀请你一起记录宝宝的成长
                </div>
                
                <div className="bg-gray-50 rounded-card p-4 mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">邀请码</div>
                  <div className="font-serif text-2xl font-bold text-mint tracking-wider">{code}</div>
                </div>

                <div className="text-xs text-gray-400">
                  加入后，你可以查看和记录宝宝的日常
                </div>
              </div>

              {error && (
                <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-4">
                  {error}
                </div>
              )}

              {!user ? (
                <div>
                  <div className="text-sm text-gray-500 mb-4">请先登录或注册</div>
                  <button
                    onClick={() => navigate("/auth")}
                    className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer"
                  >
                    去登录
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark border-none cursor-pointer disabled:opacity-50"
                >
                  {loading ? "加入中..." : "加入家庭"}
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </Layout>
  );
}
