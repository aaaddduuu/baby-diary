import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  variant?: "light" | "dark" | "transparent";
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
  showStatusBar?: boolean;
}

export default function Header({ title, variant = "light", back = false, right, onBack, showStatusBar = true }: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (variant === "transparent") {
    return (
      <>
        {showStatusBar && (
          <div className="h-11 flex items-center justify-between px-[18px] text-xs font-semibold text-white relative z-10">
            <span>9:41</span>
            <div className="flex gap-1 text-[11px]">●●● WiFi 🔋</div>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-[18px] py-2 relative z-10">
          {back && (
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-full bg-white/22 flex items-center justify-center text-[17px] text-white border-none cursor-pointer flex-shrink-0"
            >
              ‹
            </button>
          )}
          <div className="font-serif text-base font-semibold text-white flex-1">{title}</div>
          {right}
        </div>
      </>
    );
  }

  if (variant === "dark") {
    return (
      <>
        {showStatusBar && (
          <div className="h-11 flex items-center justify-between px-[18px] text-xs font-semibold text-gray-900 relative z-10">
            <span>9:41</span>
            <div className="flex gap-1 text-[11px]">●●● WiFi 🔋</div>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-[18px] py-2 bg-white border-b border-border flex-shrink-0">
          {back && (
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[17px] text-gray-600 border-none cursor-pointer flex-shrink-0"
            >
              ‹
            </button>
          )}
          <div className="font-serif text-base font-semibold text-gray-900 flex-1">{title}</div>
          {right}
        </div>
      </>
    );
  }

  return (
    <>
      {showStatusBar && (
        <div className="h-11 flex items-center justify-between px-[18px] text-xs font-semibold text-gray-900 relative z-10">
          <span>9:41</span>
          <div className="flex gap-1 text-[11px]">●●● WiFi 🔋</div>
        </div>
      )}
      <div className="flex items-center gap-2.5 px-[18px] py-2 bg-white border-b border-border flex-shrink-0">
        {back && (
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[17px] text-gray-600 border-none cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
        )}
        <div className="font-serif text-base font-semibold text-gray-900 flex-1">{title}</div>
        {right}
      </div>
    </>
  );
}
