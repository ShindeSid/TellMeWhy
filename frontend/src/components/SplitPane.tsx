import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "tellmewhy.split-ratio";
const DEFAULT_RATIO = 0.6;
const MIN_RATIO = 0.3;
const MAX_RATIO = 0.8;
const STEP = 0.03;

function loadRatio(): number {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, parsed)) : DEFAULT_RATIO;
}

export function SplitPane({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
}) {
  const [ratio, setRatio] = useState(loadRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = (clientX - rect.left) / rect.width;
    setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setIsDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isDragging, updateFromClientX]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setRatio((r) => Math.max(MIN_RATIO, r - STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setRatio((r) => Math.min(MAX_RATIO, r + STEP));
    } else if (e.key === "Home") {
      e.preventDefault();
      setRatio(MIN_RATIO);
    } else if (e.key === "End") {
      e.preventDefault();
      setRatio(MAX_RATIO);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setRatio(DEFAULT_RATIO);
    }
  };

  if (!isDesktop) {
    return (
      <div className="flex h-full flex-col gap-6">
        <section aria-label={leftLabel} className="h-[70vh] min-h-[420px] shrink-0">
          {left}
        </section>
        <section aria-label={rightLabel} className="overflow-y-auto">
          {right}
        </section>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full">
      <section
        aria-label={leftLabel}
        style={{ width: `calc(${ratio * 100}% - 6px)` }}
        className="min-h-0 shrink-0 overflow-hidden pr-2"
      >
        {left}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize panels. ${leftLabel} is ${Math.round(ratio * 100)} percent of the width. Use arrow keys to adjust, Enter to reset.`}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(MIN_RATIO * 100)}
        aria-valuemax={Math.round(MAX_RATIO * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => setRatio(DEFAULT_RATIO)}
        title="Drag to resize - double-click to reset"
        className={`group relative w-3 shrink-0 cursor-col-resize touch-none focus:outline-none ${
          isDragging ? "bg-neutral-300 dark:bg-neutral-600" : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
        }`}
      >
        <div
          className={`absolute left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
            isDragging ? "bg-neutral-500 dark:bg-neutral-400" : "bg-neutral-300 dark:bg-neutral-600 group-hover:bg-neutral-400 dark:group-hover:bg-neutral-500 group-focus-visible:bg-neutral-500 dark:group-focus-visible:bg-neutral-400"
          }`}
        />
      </div>

      <section
        aria-label={rightLabel}
        style={{ width: `calc(${(1 - ratio) * 100}% - 6px)` }}
        className="min-h-0 shrink-0 overflow-y-auto pl-2"
      >
        {right}
      </section>
    </div>
  );
}
