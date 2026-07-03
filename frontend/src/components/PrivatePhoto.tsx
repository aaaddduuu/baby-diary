import { useEffect, useState } from "react";
import { fetchPrivatePhoto } from "../lib/api";

interface PrivatePhotoProps {
  path: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  contentType?: string;
  videoControls?: boolean;
}

export default function PrivatePhoto({ path, alt, className = "", onClick, contentType, videoControls = false }: PrivatePhotoProps) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isVideo = contentType?.startsWith("video/");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSource(null);
    setFailed(false);

    fetchPrivatePhoto(path)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-[#EEF1EC] text-xs font-semibold text-[#7A8B80] ${className}`}>
        媒体加载失败
      </div>
    );
  }

  if (!source) {
    return <div className={`animate-pulse bg-[#E7ECE7] ${className}`} aria-label={`${alt}加载中`} />;
  }

  return (
    isVideo ? (
      <video
        src={source}
        onClick={onClick}
        className={`block object-cover ${onClick ? "cursor-pointer" : ""} ${className}`}
        playsInline
        muted={!videoControls}
        controls={videoControls}
        autoPlay
        loop={!videoControls}
        preload="auto"
        aria-label={alt}
      />
    ) : (
      <img
        src={source}
        alt={alt}
        onClick={onClick}
        className={`block object-cover ${onClick ? "cursor-pointer" : ""} ${className}`}
      />
    )
  );
}
