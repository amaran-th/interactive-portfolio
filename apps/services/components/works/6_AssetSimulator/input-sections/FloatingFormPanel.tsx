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
      const panelWidth = el.getBoundingClientRect().width;
      if (panelWidth === 0) return;
      // 카드(offsetParent) 기준 left:0으로 붙었을 때의 "자연 위치"로 넘침을
      // 판단한다. 팝업 자신의 현재 rect로 판단하면, 이미 right:0으로 보정된
      // 상태를 다시 측정해 "안 넘치네"라고 오判단하고 스스로 보정을
      // 되돌려버린다 — 되돌린 뒤에는 크기 변화가 없어 ResizeObserver가
      // 재실행되지 않으므로 잘못된 left:0 상태로 고정돼 버린다.
      const anchor = (el.offsetParent as HTMLElement | null) ?? el.parentElement;
      if (!anchor) return;
      const anchorLeft = anchor.getBoundingClientRect().left;
      const overflowsRight = anchorLeft + panelWidth > window.innerWidth - margin;
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
