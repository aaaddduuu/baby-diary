import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import Header from "../components/Header";
import { useAuth } from "../lib/AuthContext";
import { useBaby } from "../lib/BabyContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { baby } = useBaby();
  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入昵称");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ name: name.trim() });
        setSuccess(true);
        setTimeout(() => navigate("/my"), 1000);
      } else {
        setError(data.message || "保存失败");
      }
    } catch (e) {
      setError("保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="编辑资料" variant="light" back />
      <ScrollArea>
        <div className="p-4">
          {error && (
            <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-light rounded-sm p-3 text-sm text-green-dark mb-3.5">
              保存成功！
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mb-2">
              {baby?.gender === "male" ? "👦" : "👧"}
            </div>
            <div className="text-sm text-gray-400">宝宝: {baby?.name}</div>
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">昵称</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
              placeholder="设置你的昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="text-[11px] text-gray-400 mt-1">昵称将显示在记录中，如"妈妈"、"爸爸"等</div>
          </div>

          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">手机号</div>
            <div className="w-full h-11 bg-gray-50 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-400 flex items-center">
              {user?.phone}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">手机号不可修改</div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? "保存中..." : "保存"}
          </button>
        </div>
      </ScrollArea>
    </Layout>
  );
}
