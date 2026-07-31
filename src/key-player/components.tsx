import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SortMode, TrackSource } from "./types";

type IconName =
  | "apps"
  | "download"
  | "folder"
  | "name"
  | "newest"
  | "next"
  | "pause"
  | "play"
  | "previous"
  | "random"
  | "stop"
  | "volumeDown"
  | "volumeUp";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    apps: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v11" />
        <path d="m7.5 10 4.5 4.5 4.5-4.5" />
        <path d="M5 20h14" />
      </>
    ),
    folder: <path d="M3 6.5h7l2-2h9v15H3z" />,
    name: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M3.5 6h.1M3.5 12h.1M3.5 18h.1" />
      </>
    ),
    newest: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    next: (
      <>
        <path d="m5 5 8 7-8 7zM13 5l8 7-8 7z" />
      </>
    ),
    pause: (
      <>
        <path d="M7 5v14M17 5v14" />
      </>
    ),
    play: <path d="m7 4 13 8-13 8z" />,
    previous: (
      <>
        <path d="m19 5-8 7 8 7zM11 5l-8 7 8 7z" />
      </>
    ),
    random: (
      <>
        <path d="M4 7h3c5 0 5 10 10 10h3" />
        <path d="m17 14 3 3-3 3" />
        <path d="M4 17h3c2.5 0 3.8-2.5 5-5" />
        <path d="M14 7c1-1 2-1 3-1h3" />
        <path d="m17 3 3 3-3 3" />
      </>
    ),
    stop: <rect x="5" y="5" width="14" height="14" />,
    volumeDown: (
      <>
        <path d="M5 10v4h4l5 4V6L9 10z" />
        <path d="M18 10.5a3 3 0 0 1 0 3" />
      </>
    ),
    volumeUp: (
      <>
        <path d="M4 10v4h4l5 4V6l-5 4z" />
        <path d="M17 9a5 5 0 0 1 0 6M20 6a9 9 0 0 1 0 12" />
      </>
    ),
  };

  return (
    <svg
      className="kp-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function SortControls({
  mode,
  disabled,
  onChange,
}: {
  mode: SortMode;
  disabled: boolean;
  onChange: (mode: SortMode) => void;
}) {
  const controls: Array<{ mode: SortMode; label: string; icon: IconName }> = [
    { mode: "name", label: "名前順", icon: "name" },
    { mode: "newest", label: "新着順", icon: "newest" },
    { mode: "random", label: "ランダム", icon: "random" },
  ];

  return (
    <div className="kp-sort-controls" aria-label="曲順">
      {controls.map((control) => (
        <button
          key={control.mode}
          className={mode === control.mode ? "is-active" : ""}
          type="button"
          disabled={disabled}
          aria-pressed={mode === control.mode}
          onClick={() => onChange(control.mode)}
        >
          <Icon name={control.icon} size={18} />
          <span>{control.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MobileTrackWindow({
  tracks,
  currentIndex,
  onSelect,
}: {
  tracks: TrackSource[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  if (tracks.length === 0) {
    return <div className="kp-empty-list kp-mobile-empty">フォルダを選択してください</div>;
  }

  const rows = [-1, 0, 1, 2].map((offset) => {
    const index = wrapIndex(currentIndex + offset, tracks.length);
    return { offset, index, track: tracks[index] };
  });

  return (
    <div className="kp-mobile-tracks" aria-label="現在曲周辺">
      {rows.map(({ offset, index, track }) => (
        <button
          key={`${offset}-${track.id}`}
          className={offset === 0 ? "kp-track-row is-current" : "kp-track-row"}
          type="button"
          onClick={() => onSelect(index)}
        >
          <span className="kp-track-position" aria-hidden="true">
            {offset === -1 ? "前" : offset === 0 ? "再生" : offset === 1 ? "次" : "+2"}
          </span>
          <span className="kp-track-name">{track.name}</span>
        </button>
      ))}
    </div>
  );
}

const ROW_HEIGHT = 54;
const OVERSCAN = 6;

export function VirtualTrackList({
  tracks,
  currentIndex,
  onSelect,
}: {
  tracks: TrackSource[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => setViewportHeight(entry.contentRect.height));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || tracks.length === 0) return;
    const target = Math.max(0, currentIndex * ROW_HEIGHT - viewport.clientHeight / 2 + ROW_HEIGHT / 2);
    viewport.scrollTo({ top: target, behavior: "smooth" });
  }, [currentIndex, tracks.length]);

  const range = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
    return { start, end: Math.min(tracks.length, start + visible) };
  }, [scrollTop, tracks.length, viewportHeight]);

  if (tracks.length === 0) {
    return <div className="kp-empty-list kp-desktop-empty">フォルダを選択してください</div>;
  }

  const translateStyle = {
    transform: `translateY(${range.start * ROW_HEIGHT}px)`,
  } satisfies CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="kp-track-viewport"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      aria-label="曲リスト"
    >
      <div className="kp-track-spacer" style={{ height: tracks.length * ROW_HEIGHT }}>
        <div className="kp-track-window" style={translateStyle}>
          {tracks.slice(range.start, range.end).map((track, offset) => {
            const index = range.start + offset;
            return (
              <button
                key={track.id}
                className={index === currentIndex ? "kp-library-row is-current" : "kp-library-row"}
                type="button"
                onClick={() => onSelect(index)}
                style={{ height: ROW_HEIGHT }}
              >
                <span className="kp-row-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="kp-row-name">{track.name}</span>
                <span className="kp-row-size">{formatFileSize(track.size)}</span>
                <span className="kp-row-date">{formatDate(track.modifiedAt)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TransportButton({
  icon,
  label,
  className = "",
  disabled,
  active = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  className?: string;
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`kp-transport-button ${active ? "is-active" : ""} ${className}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <Icon name={icon} size={24} />
      <span>{label}</span>
    </button>
  );
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}
