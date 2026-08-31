"use client";

import { EyeOff, Plus } from "lucide-react";
import type { PixelLayer } from "../_shared/assetLibrary";
import FileThumbnail from "./FileThumbnail";
import { MAX_LAYERS } from "./types";

// 하단 필름스트립은 "타임라인"만 담당한다 — 프레임 선택·순서 파악·추가만
// 여기서 하고, 지속시간·표시여부·복제·삭제·순서이동 같은 편집은 오른쪽
// "프레임" 탭의 "현재 프레임" 섹션에서 한다. 그래야 이 띠가 캔버스 세로를
// 적게 차지한다.
export default function FrameFilmstrip({
  layers,
  activeLayerId,
  width,
  height,
  isPlaying,
  onSelect,
  onAdd,
}: {
  // 아래→위(= 필름스트립 왼쪽→오른쪽) 순서 — 레이어 패널이 쓰는 배열과 동일하다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  // 재생 중엔 프레임 선택·추가를 막는다 — 정지해야 편집할 수 있다.
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-stretch gap-1 border-t border-gray-200 bg-white px-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          return (
            <button
              key={layer.id}
              onClick={() => !isPlaying && onSelect(layer.id)}
              disabled={isPlaying}
              title={`프레임 ${index + 1}`}
              className={`relative shrink-0 p-0.5 ${
                isActive
                  ? "bg-violet-500"
                  : "bg-transparent hover:bg-gray-200"
              } ${isPlaying ? "cursor-default" : "cursor-pointer"}`}
            >
              <FileThumbnail width={width} height={height} pixels={layer.pixels} />
              <span
                className={`absolute left-0.5 top-0.5 px-1 text-[9px] leading-tight tabular-nums text-white ${
                  isActive ? "bg-violet-700" : "bg-black/55"
                }`}
              >
                {index + 1}
              </span>
              {!layer.visible && (
                <span className="absolute inset-0.5 flex items-center justify-center bg-white/65">
                  <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={onAdd}
          disabled={isPlaying || layers.length >= MAX_LAYERS}
          title="프레임 추가"
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
