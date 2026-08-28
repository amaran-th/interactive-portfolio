"use client";

import { X } from "lucide-react";
import { useCallback } from "react";

type FloatingFormPanelProps = {
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  children: React.ReactNode;
};

export default function FloatingFormPanel({
  className = "",
  onKeyDown,
  onClose,
  children,
}: FloatingFormPanelProps) {
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const margin = 16;
    const align = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const overflowsRight = rect.right > window.innerWidth - margin;
      el.style.left = overflowsRight ? "auto" : "";
      el.style.right = overflowsRight ? "0px" : "";
    };
    const observer = new ResizeObserver(align);
    observer.observe(el);
    window.addEventListener("resize", align);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
    };
  }, []);

  return (
    <div
      ref={measureRef}
      onKeyDown={onKeyDown}
      className={`absolute top-full left-0 z-30 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-2xl border bg-white p-4 shadow-xl ${className}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="-mt-1 -mr-1 self-end rounded-full p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
