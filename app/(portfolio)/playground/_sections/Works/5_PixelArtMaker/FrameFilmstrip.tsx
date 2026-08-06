"use client";

import { ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import FileThumbnail from "./FileThumbnail";
import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MAX_LAYERS,
  MIN_FRAME_DURATION_MS,
} from "./types";

export default function FrameFilmstrip({
  layers,
  activeLayerId,
  width,
  height,
  isPlaying,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onToggleVisible,
  onDurationChange,
}: {
  // 아래→위(= 필름스트립 왼쪽→오른쪽) 순서 — 레이어 패널이 쓰는 배열과 동일하다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  // 재생 중엔 프레임 편집(추가·복제·삭제·이동·지속시간·전환)을 막는다 —
  // 정지해야 편집할 수 있다.
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDurationChange: (id: string, ms: number) => void;
}) {
  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);

  // 지속시간 입력은 키 입력마다 onDurationChange(→되돌리기 스택 커밋)를
  // 부르지 않고, 이 로컬 버퍼에 타이핑 중인 값을 담아 두었다가 blur·Enter에서
  // 한 번만 커밋한다 — LayerPanel의 이름 인라인 편집(editingId/editingName)과
  // 같은 "버퍼 후 커밋" 형태다. 그러지 않으면 렌더마다 durationSec으로 값이
  // 강제로 되돌아가 커서 위치가 튀고, 50개로 제한된 되돌리기 스택이 키 입력
  // 하나하나로 순식간에 채워진다.
  const [editingDurationId, setEditingDurationId] = useState<string | null>(
    null,
  );
  const [editingDurationValue, setEditingDurationValue] = useState("");

  const commitDuration = (id: string) => {
    const sec = Number(editingDurationValue);
    if (Number.isFinite(sec)) {
      const ms = Math.min(
        MAX_FRAME_DURATION_MS,
        Math.max(MIN_FRAME_DURATION_MS, Math.round(sec * 1000)),
      );
      onDurationChange(id, ms);
    }
    setEditingDurationId(null);
  };

  return (
    <div className="flex h-24 shrink-0 items-stretch gap-2 border-t border-gray-200 bg-white px-2 py-2">
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          const durationSec = (
            (layer.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS) / 1000
          ).toFixed(2);
          return (
            <div
              key={layer.id}
              onClick={() => !isPlaying && onSelect(layer.id)}
              className={`flex w-16 shrink-0 flex-col items-center gap-0.5 px-1 py-1 ${
                isActive ? "bg-violet-50" : "hover:bg-gray-50"
              } ${isPlaying ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex w-full items-center justify-between text-[9px] text-gray-400">
                <span>{index + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPlaying) onToggleVisible(layer.id);
                  }}
                  disabled={isPlaying}
                  title={layer.visible ? "숨기기" : "보이기"}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  {layer.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </button>
              </div>
              <FileThumbnail width={width} height={height} pixels={layer.pixels} />
              <input
                type="number"
                min={MIN_FRAME_DURATION_MS / 1000}
                max={MAX_FRAME_DURATION_MS / 1000}
                step={0.01}
                value={
                  editingDurationId === layer.id
                    ? editingDurationValue
                    : durationSec
                }
                disabled={isPlaying}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => {
                  setEditingDurationId(layer.id);
                  setEditingDurationValue(durationSec);
                }}
                onChange={(e) => setEditingDurationValue(e.target.value)}
                onBlur={() => commitDuration(layer.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingDurationId(null);
                }}
                className="w-full border border-gray-200 px-0.5 text-center text-[9px] text-gray-600 outline-none disabled:opacity-50"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPlaying) onDelete(layer.id);
                }}
                disabled={isPlaying || layers.length <= 1}
                title="프레임 삭제"
                className="text-gray-300 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 flex-col gap-1 border-l border-gray-100 pl-2">
        <button
          onClick={onAdd}
          disabled={isPlaying || layers.length >= MAX_LAYERS}
          title="프레임 추가"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDuplicate(activeLayerId)}
          disabled={isPlaying || layers.length >= MAX_LAYERS}
          title="프레임 복제"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMoveLeft(activeLayerId)}
          disabled={isPlaying || activeIndex <= 0}
          title="왼쪽으로 이동"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMoveRight(activeLayerId)}
          disabled={isPlaying || activeIndex < 0 || activeIndex >= layers.length - 1}
          title="오른쪽으로 이동"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
