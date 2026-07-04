import { useEffect, useState } from "react";
import LivePhotoPlayer from "./LivePhotoPlayer";
import { fetchPrivatePhoto } from "../lib/api";

interface PrivatePhotoProps {
  path: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  contentType?: string;
  mediaKind?: "image" | "video" | "live_photo";
  motionPath?: string | null;
  motionContentType?: string | null;
  videoControls?: boolean;
}

export default function PrivatePhoto({
  path,
  alt,
  className = "",
  onClick,
  contentType,
  mediaKind,
  motionPath,
  videoControls = false,
}: PrivatePhotoProps) {
  const [source, setSource] = useState<string | null>(null);
  const [motionSource, setMotionSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isLivePhoto = mediaKind === "live_photo" && Boolean(motionPath);
  const isVideo = mediaKind === "video" || (!mediaKind && contentType?.startsWith("video/"));

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    let motionObjectUrl = "";
    setSource(null);
    setMotionSource(null);
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

    if (motionPath) {
      fetchPrivatePhoto(motionPath)
        .then((blob) => {
          if (!active) return;
          motionObjectUrl = URL.createObjectURL(blob);
          setMotionSource(motionObjectUrl);
        })
        .catch(() => {
          if (active) setMotionSource(null);
        });
    }

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (motionObjectUrl) URL.revokeObjectURL(motionObjectUrl);
    };
  }, [motionPath, path]);

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
    isLivePhoto && motionSource ? (
      <LivePhotoPlayer
        photoSrc={source}
        videoSrc={motionSource}
        alt={alt}
        className={className}
        controls={videoControls}
        onClick={onClick}
      />
    ) : isVideo ? (
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
