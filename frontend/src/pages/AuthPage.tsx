import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout, { ScrollArea } from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { useBaby } from "../lib/BabyContext";
import { FAMILY_RELATIONS, RelationChip } from "./familyFlowShared";

type RegisterMode = "create" | "join";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { setBaby } = useBaby();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registerMode, setRegisterMode] = useState<RegisterMode>("create");
  const [inviteCode, setInviteCode] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updatePhone = (value: string) => {
    setPhone(value);
    if (error) setError("");
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    if (error) setError("");
  };

  const updateName = (value: string) => {
    setName(value);
    if (error) setError("");
  };

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
    if (registerMode === "join" && !/^[A-HJ-NP-Z2-9]{6}$/.test(inviteCode)) {
      setError("请输入正确的6位邀请码");
      return;
    }
    if (registerMode === "join" && !relation) {
      setError("请选择你与宝宝的关系");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await register({
        phone,
        password,
        name: name || undefined,
        invite_code: registerMode === "join" ? inviteCode : undefined,
        relation: registerMode === "join" ? relation : undefined,
      });
      if (data.baby) setBaby(data.baby);
      navigate(data.onboarding_required === false ? "/home" : "/onboarding");
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
      <ScrollArea className="px-4 pb-8 pt-5">
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
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => updatePhone(e.target.value)}
            maxLength={11}
          />
        </div>

        {tab === "register" && (
          <>
            <div className="mb-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">昵称（选填）</div>
              <input
                className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
                placeholder="设置你的昵称"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => updateName(e.target.value)}
              />
            </div>

            <div className="mb-4 rounded-[22px] border border-white bg-white/80 p-3 shadow-soft">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">注册后</div>
              <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-[#F4F1E9] p-1">
                {([
                  { value: "create" as const, label: "创建宝宝" },
                  { value: "join" as const, label: "加入家庭" },
                ]).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={registerMode === item.value}
                    onClick={() => {
                      setRegisterMode(item.value);
                      setError("");
                    }}
                    className={`h-10 rounded-[14px] border-none text-sm font-semibold transition-all ${
                      registerMode === item.value
                        ? "bg-white text-[#1A5C3A] shadow-sm"
                        : "bg-transparent text-[#7A8B80]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs leading-5 text-[#7A8B80]">
                {registerMode === "join" ? "使用家人分享的邀请码，直接进入同一个宝宝空间。" : "注册完成后继续填写宝宝资料。"}
              </div>
            </div>

            {registerMode === "join" ? (
              <div className="mb-4 space-y-4 rounded-[22px] border border-[#D8EEE1] bg-[#F6FCF8] p-4">
                <div>
                  <label htmlFor="register-invite-code" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">家庭邀请码</label>
                  <input
                    id="register-invite-code"
                    className="h-12 w-full rounded-[18px] border-[1.5px] border-[#CFE8DA] bg-white px-4 text-center font-tabular text-xl font-bold uppercase tracking-[0.22em] text-[#1A5C3A] outline-none focus:border-mint"
                    placeholder="输入6位邀请码"
                    value={inviteCode}
                    onChange={(event) => {
                      setInviteCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6));
                      if (error) setError("");
                    }}
                    maxLength={6}
                  />
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">你与宝宝的关系</div>
                  <div className="grid grid-cols-4 gap-2">
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
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="mb-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">密码</div>
          <input
            className="w-full h-11 bg-gray-100 border-[1.5px] border-border rounded-sm px-3.5 text-sm font-sans text-gray-900 outline-none focus:border-mint"
            type="password"
            name="password"
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            placeholder={tab === "register" ? "至少8位，含字母和数字" : "请输入密码"}
            value={password}
            onChange={(e) => updatePassword(e.target.value)}
          />
        </div>

        <button
          onClick={tab === "login" ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full h-12 rounded-pill text-base font-semibold text-white bg-gradient-to-br from-mint to-mint-dark shadow-[0_4px_14px_rgba(74,184,154,.3)] border-none cursor-pointer disabled:opacity-50"
        >
          {loading
            ? "处理中..."
            : tab === "login"
              ? "登录"
              : registerMode === "join"
                ? "注册并加入家庭"
                : "注册并继续"}
        </button>

        <div className="text-center mt-3 text-xs text-gray-400">
          {tab === "login" ? "登录即代表同意《用户协议》与《隐私政策》" : "注册即代表同意《用户协议》与《隐私政策》"}
        </div>
      </ScrollArea>
    </Layout>
  );
}
