import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout, { ScrollArea, SectionCard } from "../components/Layout";
import { updateProfile } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useBaby } from "../lib/BabyContext";
import { SectionLabel } from "./familyFlowShared";

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
      setSuccess(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const data = await updateProfile({ name: name.trim() });
      updateUser({ name: data.name ?? name.trim() });
      setSuccess(true);
      setTimeout(() => navigate("/my"), 1000);
    } catch {
      setError("保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="secondary-page">
      <Header
        title="编辑资料"
        subtitle="把账户信息整理得清爽一点"
        variant="hero"
        back
      />

      <ScrollArea className="pb-28">
        <div className="space-y-4 px-4 pb-6 pt-4">
          <SectionCard className="p-4">
            <div className="mb-3">
              <div className="panel-title text-[17px]">当前状态</div>
              <div className="panel-note mt-1">
                {success
                  ? "资料已更新，稍后会返回我的页面。"
                  : error
                    ? error
                    : baby?.name
                      ? `正在为 ${baby.name} 的家庭维护资料`
                      : "昵称会显示在记录和家庭页面里"}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E8E1D5] bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F3EA] text-2xl">
                  {baby?.gender === "male" ? "👦" : "👧"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#21382E]">
                    {baby?.name || "宝宝档案"}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      error ? "text-danger" : success ? "text-[#2F9B73]" : "text-[#7A8B80]"
                    }`}
                  >
                    {error
                      ? "请先处理上面的提示"
                      : success
                        ? "保存成功"
                        : "信息会同步显示给家人"}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4 p-4">
            <div>
              <div className="panel-title text-[17px]">资料信息</div>
              <div className="panel-note mt-1">
                保留一个安静清晰的表单，把常用信息放在同一张卡片里
              </div>
            </div>

            <div className="space-y-4 rounded-[22px] bg-white p-4 shadow-soft">
              <div className="space-y-2">
                <SectionLabel htmlFor="profile-name">{"昵称"}</SectionLabel>
                <input
                  id="profile-name"
                  className="h-12 w-full rounded-2xl border border-[#E8E1D5] bg-[#FBF9F3] px-4 text-sm text-[#21382E] outline-none placeholder:text-[#9A9388] focus:border-[#5BC4A0]"
                  placeholder="设置你在家庭中的称呼"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError("");
                    if (success) setSuccess(false);
                  }}
                />
                <div className="text-xs text-[#7A8B80]">
                  例如妈妈、爸爸，或家人更熟悉的昵称
                </div>
              </div>

              <div className="space-y-2">
                <SectionLabel htmlFor="profile-phone">{"手机号"}</SectionLabel>
                <div className="flex h-12 items-center rounded-2xl border border-[#EEE8DE] bg-[#F5F2EB] px-4 text-sm text-[#7A8B80]">
                  <span id="profile-phone">{user?.phone || "未绑定"}</span>
                </div>
                <div className="text-xs text-[#9A9388]">手机号暂不支持修改</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/60 bg-[rgba(248,247,239,.96)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="h-12 w-full rounded-full bg-gradient-to-r from-[#4AB89A] to-[#2F9B73] text-base font-semibold text-white shadow-[0_12px_28px_rgba(47,155,115,.28)] transition-all disabled:opacity-50"
        >
          {loading ? "保存中…" : "保存资料"}
        </button>
      </div>
    </Layout>
  );
}
