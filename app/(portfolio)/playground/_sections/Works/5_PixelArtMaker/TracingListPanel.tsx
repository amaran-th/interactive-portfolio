"use client";

import { Pencil, Plus, X } from "lucide-react";
import { CURSOR_POINTING } from "./cursors";
import { TracingImage } from "./types";
import { useImageFileLoader } from "./useImageFileLoader";

// narrow 레이아웃에서 트레이싱 이미지 목록을 보여주는 패널 — LayerPanel과
// 같은 세로 목록 스타일이다. Editor.tsx가 openFloatingPanel === "tracing"일
// 때 기존 아이콘→플로팅 팝업 패턴 안에 그대로 끼워 넣는다. wide 전용인
// TracingControlWindow(자유 드래그 미니 창)와 달리 창 위치·zIndex 상태가
// 없다 — tracingImages 배열만 그대로 순회해서 그린다.
export default function TracingListPanel({
  tracingImages,
  activeTracingId,
  onAdd,
  onOpacityChange,
  onToggleAdjust,
  onDelete,
}: {
  tracingImages: TracingImage[];
  activeTracingId: string | null;
  onAdd: (image: HTMLImageElement) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onToggleAdjust: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { loadFile, handlePasteFromClipboard } = useImageFileLoader(onAdd);

  return (
    <div className="flex flex-col gap-2">
      {tracingImages.map((t) => (
        <div key={t.id} className="flex items-center gap-2 bg-gray-50 p-2">
          <img
            src={t.image.src}
            alt=""
            className="h-10 w-10 shrink-0 bg-white object-contain"
          />
          <div className="flex flex-1 flex-col gap-1">
            <label className="flex items-center gap-2 text-[10px] text-gray-500">
              투명도
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(t.opacity * 100)}
                onChange={(e) =>
                  onOpacityChange(t.id, Number(e.target.value) / 100)
                }
                className="flex-1"
              />
              <span className="w-7 shrink-0 text-right">
                {Math.round(t.opacity * 100)}%
              </span>
            </label>
            <button
              onClick={() => onToggleAdjust(t.id)}
              className={`flex w-fit items-center gap-1 px-2 py-0.5 text-[10px] ${
                activeTracingId === t.id
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Pencil className="h-3 w-3" />
              {activeTracingId === t.id ? "조정 중" : "조정"}
            </button>
          </div>
          <button
            onClick={() => onDelete(t.id)}
            title="삭제"
            className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <label
        className="flex items-center justify-center gap-1 bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200"
        style={{ cursor: CURSOR_POINTING }}
      >
        <Plus className="h-3.5 w-3.5" />
        이미지 추가
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          className="hidden"
        />
      </label>
      <button
        onClick={handlePasteFromClipboard}
        className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
      >
        클립보드에서 붙여넣기
      </button>
    </div>
  );
}
