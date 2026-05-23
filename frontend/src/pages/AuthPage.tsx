import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import { useAuth } from "../lib/AuthContext";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (password.length < 6) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(phone, password);
      navigate("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("密码至少8位，需含字母和数字");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register(phone, password, name || undefined);
      navigate("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="pt-12 pb-9 flex flex-col items-center relative overflow-hidden flex-shrink-0" style={{ background: "var(--header-grad)" }}>
        <div className="header-readable-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(255,255,255,.16),transparent_60%)]" />
        <div className="text-5xl mb-2.5 relative z-10">🌱</div>
        <div className="header-title relative z-10">宝宝日记</div>
        <div className="header-subtitle text-sm mt-1 relative z-10">记录每一个珍贵的成长瞬间</div>
      </div>
      <ScrollArea className="px-4 pt-5">
        <div className="flex bg-gray-100 rounded-sm p-0.5 gap-0.5 mb-5">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold cursor-pointer border-none ${tab === "login" ? "bg-white text-gray-900 shadow-sm" : "bg-transparent text-gray-400"}`}
          >
            登录
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold cursor-pointer border-none ${tab === "register" ? "bg-white text-gray-900 shadow-sm" : "bg-transparent text-gray-400"}`}
          >
            注册
          </button>
        </div>

        {error && (
          <div className="bg-danger-light rounded-sm p-3 text-sm text-danger mb-3.5">
            {error}
          </div>
        )}

        <div className="mb-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">手机号</div>
          <input
            className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
          />
        </div>

        {tab === "register" && (
          <div className="mb-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">昵称（选填）</div>
            <input
              className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
              placeholder="给宝宝起个昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="mb-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">密码</div>
          <input
            className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
            type="password"
            placeholder={tab === "register" ? "至少8位，含字母和数字" : "请输入密码"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={tab === "login" ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50"
        >
          {loading ? "处理中..." : tab === "login" ? "登录" : "注册并登录"}
        </button>

        <div className="text-center mt-3 text-xs text-gray-400">
          {tab === "login" ? "登录即代表同意《用户协议》与《隐私政策》" : "注册即代表同意《用户协议》与《隐私政策》"}
        </div>
      </ScrollArea>
    </Layout>
  );
}
