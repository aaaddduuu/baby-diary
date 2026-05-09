import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  variant?: "light" | "dark" | "transparent";
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}

export default function Header({ title, variant = "light", back = false, right, onBack }: HeaderProps) {
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
      <div className="flex items-center gap-2.5 px-[18px] py-3 relative z-10">
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
    );
  }

  if (variant === "dark") {
    return (
      <div className="flex items-center gap-2.5 px-[18px] py-3 bg-white border-b border-border flex-shrink-0">
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
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-[18px] py-3 bg-white border-b border-border flex-shrink-0">
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
  );
}
