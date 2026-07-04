import { useEffect, useRef, useState } from "react";

type LivePhotosKitPlayer = HTMLElement & {
  photoSrc?: string;
  videoSrc?: string;
  playbackStyle?: unknown;
  showsNativeControls?: boolean;
  proactivelyLoadsVideo?: boolean;
  stop?: () => void;
};

type LivePhotosKitNamespace = {
  Player: (element?: HTMLElement | null) => LivePhotosKitPlayer;
  PlaybackStyle?: {
    HINT?: unknown;
    FULL?: unknown;
  };
};

declare global {
  interface Window {
    LivePhotosKit?: LivePhotosKitNamespace;
  }
}

let livePhotosKitPromise: Promise<void> | null = null;

function loadLivePhotosKit(): Promise<void> {
  if (window.LivePhotosKit) return Promise.resolve();
  if (livePhotosKitPromise) return livePhotosKitPromise;

  livePhotosKitPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-livephotoskit]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("LivePhotosKit 加载失败")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.apple-livephotoskit.com/lpk/1/livephotoskit.js";
    script.async = true;
    script.dataset.livephotoskit = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LivePhotosKit 加载失败"));
    document.head.appendChild(script);
  });

  return livePhotosKitPromise;
}

export default function LivePhotoPlayer({
  photoSrc,
  videoSrc,
  alt,
  className = "",
  controls = false,
  onClick,
}: {
  photoSrc: string;
  videoSrc: string;
  alt: string;
  className?: string;
  controls?: boolean;
  onClick?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player: LivePhotosKitPlayer | null = null;
    setFallback(false);

    loadLivePhotosKit()
      .then(() => {
        if (cancelled || !hostRef.current || !window.LivePhotosKit) return;
        player = window.LivePhotosKit.Player(hostRef.current);
        player.photoSrc = photoSrc;
        player.videoSrc = videoSrc;
        player.proactivelyLoadsVideo = !controls;
        player.showsNativeControls = controls;
        player.playbackStyle = controls
          ? window.LivePhotosKit.PlaybackStyle?.FULL
          : window.LivePhotosKit.PlaybackStyle?.HINT;
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      try {
        player?.stop?.();
      } catch {
        // Ignore cleanup errors from the third-party player.
      }
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [controls, photoSrc, videoSrc]);

  if (fallback) {
    return (
      <video
        src={videoSrc}
        poster={photoSrc}
        onClick={onClick}
        className={`block object-cover ${onClick ? "cursor-pointer" : ""} ${className}`}
        playsInline
        muted={!controls}
        controls={controls}
        autoPlay
        loop={!controls}
        preload="auto"
        aria-label={alt}
      />
    );
  }

  return (
    <div className={`relative block overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={onClick}>
      <img src={photoSrc} alt={alt} className="block h-full w-full object-cover" />
      <div ref={hostRef} className="absolute inset-0 h-full w-full" role="img" aria-label={alt} />
    </div>
  );
}
