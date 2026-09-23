"use client";

import { X } from "lucide-react";

// 모바일 셸 전용 바텀시트 — 하단 독(도구/색상/레이어/더보기)과 탭 목록이
// 전부 이 하나를 재사용한다. peek는 캔버스를 계속 보여주는 부분 높이,
// full은 리스트·긴 패널을 위한 거의 전체 높이다. 열림/닫힘 애니메이션은
// CSS transition만 쓴다(별도 라이브러리 없이 이 프로젝트의 다른 패널들과
// 같은 방식).
export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  heightMode: "peek" | "full";
  children: React.ReactNode;
};

export default function BottomSheet({
  open,
  onClose,
  title,
  heightMode,
  children,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 배경 — 누르면 닫힌다. peek는 캔버스가 보여야 하므로 반투명 없이
          투명하게 둔다(탭 감지만). full은 리스트류라 살짝 어둡게 깔아
          뒤 캔버스와 시각적으로 분리한다. */}
      <div
        className={`absolute inset-0 ${heightMode === "full" ? "bg-black/30" : ""}`}
        onClick={onClose}
      />
      <div
        className={`relative flex flex-col bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.15)] ${
          heightMode === "peek" ? "max-h-[55vh]" : "max-h-[90vh]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-gray-300" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-1">
            <span className="text-sm font-semibold text-gray-900">
              {title}
            </span>
            <button
              onClick={onClose}
              title="닫기"
              className="flex h-7 w-7 items-center justify-center text-gray-400 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
