"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Droplet,
  Eye,
  EyeOff,
  Layers as LayersIcon,
  Lightbulb,
  Lock,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import type { BlendMode, PixelLayer } from "../_shared/assetLibrary";
import BlendModeDropdown from "./BlendModeDropdown";
import FileThumbnail from "./FileThumbnail";
import OpacitySlider from "./OpacitySlider";
import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MAX_LAYERS,
  MIN_FRAME_DURATION_MS,
} from "./types";

type AdjustmentField =
  | "brightness"
  | "contrast"
  | "saturation"
  | "temperature"
  | "tint";

// 슬라이더 5개를 하나씩 반복해 적지 않고 이 목록을 map으로 그린다 —
// ExportPanel.tsx의 FORMATS/SCALE_OPTIONS와 같은 패턴.
const ADJUSTMENT_ROWS: { field: AdjustmentField; label: string }[] = [
  { field: "brightness", label: "밝기" },
  { field: "contrast", label: "대비" },
  { field: "saturation", label: "채도" },
  { field: "temperature", label: "색온도" },
  { field: "tint", label: "틴트" },
];

// 색보정 슬라이더 한 줄 — 슬라이더는 0 근처에서 살짝 스냅해 영점을 잡기
// 쉽게 하고, 오른쪽 숫자칸에 값을 직접 입력할 수도 있다.
function AdjustmentRow({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commitDraft = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      onChange(Math.max(-100, Math.min(100, Math.round(n))));
      onCommit();
    }
    setDraft(null);
  };
  return (
    <label className="flex items-center gap-2 text-[10px] text-gray-500">
      <span className="w-8 shrink-0">{label}</span>
      <input
        type="range"
        min={-100}
        max={100}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          // 0 근처(±2)는 정확히 0으로 스냅한다.
          onChange(Math.abs(v) <= 2 ? 0 : v);
        }}
        onPointerUp={onCommit}
        onBlur={onCommit}
        className="min-w-0 flex-1 accent-violet-500"
      />
      <input
        type="number"
        min={-100}
        max={100}
        value={draft ?? value}
        onFocus={() => setDraft(String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commitDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        className="w-9 shrink-0 border border-gray-200 px-0.5 text-right text-[10px] text-gray-700 outline-none"
      />
    </label>
  );
}

// 0.10 → "0.1", 1.00 → "1" — 뒤따르는 0을 떼서 보여준다.
function formatFrameSeconds(ms: number): string {
  return String(parseFloat((ms / 1000).toFixed(2)));
}

// 켜고 끄는 상태(반복·어니언 스킨)를 위한 스위치 — ReferenceWindow의
// 참고/트레이싱 토글과 같은 형태.
function Switch({
  checked,
  onClick,
  title,
}: {
  checked: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      title={title}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
        checked ? "bg-violet-500" : "bg-gray-300"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(12px)" : "translateX(0)" }}
      />
    </button>
  );
}

export default function LayerPanel({
  layers,
  activeLayerId,
  width,
  height,
  layerMode,
  onLayerModeChange,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMergeDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onToggleVisible,
  onToggleLocked,
  referenceLayerIds,
  onToggleReference,
  onOpacityChange,
  onOpacityDragEnd,
  onBlendModeChange,
  onBlendModePreview,
  onAdjustmentChange,
  onAdjustmentDragEnd,
  onResetAdjustments,
  onFlatten,
  isPlaying,
  onTogglePlay,
  pingPong,
  onTogglePingPong,
  onionSkin,
  onToggleOnionSkin,
  onionSkinOpacity,
  onOnionSkinOpacityChange,
  onionSkinRange,
  onOnionSkinRangeChange,
  onFrameDurationChange,
}: {
  // 아래→위 순서(가장 아래가 0번)로 저장된 레이어 배열 — 데이터 모델과
  // Editor의 useCanvasHistory가 쓰는 순서를 그대로 따른다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  // 같은 레이어 스택을 레이어(합성)로 볼지 프레임(순차 재생)으로 볼지 — 이
  // 패널이 두 모드의 진입점이다. 프레임 목록 자체(필름스트립)는 이 패널이
  // 아니라 캔버스 아래에 별도로 뜬다.
  layerMode: "layers" | "frames";
  onLayerModeChange: (mode: "layers" | "frames") => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMergeDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  // 클립스튜디오식 "참조 레이어" — 스포이트·마법봉·페인트통의 "참조: 참조 레이어"
  // 모드가 이 레이어들의 합성을 기준으로 판정한다. 활성 레이어와는 무관하다.
  referenceLayerIds: Set<string>;
  onToggleReference: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  // 슬라이더를 드래그하는 동안 onOpacityChange가 연속으로 불려도 실행취소
  // 항목 하나로 묶이도록(Editor가 코얼레싱한다), 포인터를 떼거나 포커스가
  // 빠져나가는 순간 "이 드래그는 끝났다"고 알려준다 — 이게 없으면 같은
  // 레이어를 다시 드래그해도 이전 드래그의 연장으로 오인될 수 있다.
  onOpacityDragEnd: () => void;
  onBlendModeChange: (id: string, mode: BlendMode) => void;
  // 드롭다운에서 항목에 hover했을 때 — 되돌리기 스택 없이 임시 적용(미리보기).
  onBlendModePreview: (id: string, mode: BlendMode) => void;
  onAdjustmentChange: (
    id: string,
    field: AdjustmentField,
    value: number,
  ) => void;
  onAdjustmentDragEnd: () => void;
  onResetAdjustments: (id: string) => void;
  onFlatten: () => void;
  // 프레임 모드 전용 재생 컨트롤.
  isPlaying: boolean;
  onTogglePlay: () => void;
  // 재생은 항상 반복한다 — 이 토글은 "핑퐁"(끝에 닿으면 방향을 뒤집어
  // 앞뒤로 오간다) on/off다.
  pingPong: boolean;
  onTogglePingPong: () => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  onionSkinOpacity: number;
  onOnionSkinOpacityChange: (opacity: number) => void;
  onionSkinRange: number;
  onOnionSkinRangeChange: (range: number) => void;
  // 프레임 모드 "현재 프레임" 섹션에서 지속시간을 고칠 때 — 필름스트립이
  // 아니라 이 패널이 지속시간 편집을 담당한다.
  onFrameDurationChange: (id: string, ms: number) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // 지속시간 입력은 키 입력마다 커밋(→되돌리기 스택)하지 않고, 이 버퍼에
  // 담아 두었다가 blur·Enter에서 한 번만 커밋한다(이름 인라인 편집과 동형).
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
  const activeLayer = layers[activeIndex] ?? layers[layers.length - 1];
  // 트리거 버튼을 보라색으로 강조할지 판정 — 블렌드 모드가 Normal이 아니거나
  // 보정 5개 중 하나라도 0이 아니면 "지금 필터가 걸려 있다"는 뜻이다.
  const hasActiveFilter =
    (activeLayer.blendMode ?? "normal") !== "normal" ||
    !!activeLayer.brightness ||
    !!activeLayer.contrast ||
    !!activeLayer.saturation ||
    !!activeLayer.temperature ||
    !!activeLayer.tint;
  // 화면에는 위에서부터(최상단 먼저) 보여준다 — 배열 자체는 아래→위 순서.
  const topToBottom = [...layers].reverse();

  const commitRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  const commitFrameDuration = () => {
    if (durationDraft === null) return;
    const sec = Number(durationDraft);
    if (Number.isFinite(sec)) {
      const ms = Math.min(
        MAX_FRAME_DURATION_MS,
        Math.max(MIN_FRAME_DURATION_MS, Math.round(sec * 1000)),
      );
      onFrameDurationChange(activeLayer.id, ms);
    }
    setDurationDraft(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white shadow-md">
      <div className="flex shrink-0 items-center justify-between px-2 py-2">
        <div className="flex text-[10px] font-semibold">
          <button
            onClick={() => onLayerModeChange("layers")}
            className={`flex items-center gap-1 px-2 py-1 ${
              layerMode === "layers"
                ? "bg-violet-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <LayersIcon className="h-3 w-3" />
            레이어
          </button>
          <button
            onClick={() => onLayerModeChange("frames")}
            className={`flex items-center gap-1 px-2 py-1 ${
              layerMode === "frames"
                ? "bg-violet-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Play className="h-3 w-3" />
            프레임
          </button>
        </div>
        {layerMode === "layers" && (
          <button
            onClick={onFlatten}
            disabled={layers.length <= 1}
            title="모든 레이어를 하나로 평탄화"
            className="text-[10px] font-normal text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            평탄화
          </button>
        )}
      </div>
      {layerMode === "layers" ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {topToBottom.map((layer) => {
              const isActive = layer.id === activeLayerId;
              return (
                <div
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${
                    isActive ? "bg-violet-50" : "hover:bg-gray-50"
                  } ${layer.visible ? "" : "opacity-40"}`}
                >
                  <FileThumbnail
                    width={width}
                    height={height}
                    pixels={layer.pixels}
                  />
                  {editingId === layer.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => commitRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(layer.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 border border-violet-300 px-1 text-xs text-gray-700 outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(layer.id);
                        setEditingName(layer.name);
                      }}
                      className="min-w-0 flex-1 truncate text-xs text-gray-700"
                      title={layer.name}
                    >
                      {layer.name}
                    </span>
                  )}
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleReference(layer.id);
                      }}
                      title={
                        referenceLayerIds.has(layer.id)
                          ? "참조 레이어 해제"
                          : "참조 레이어로 지정 (스포이트·마법봉·페인트통의 '참조: 참조 레이어' 기준)"
                      }
                      className={`flex h-6 w-5 items-center justify-center ${
                        referenceLayerIds.has(layer.id)
                          ? "text-violet-500"
                          : "text-gray-300 hover:text-gray-600"
                      }`}
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLocked(layer.id);
                      }}
                      title={layer.locked ? "편집 잠금 해제" : "편집 잠금"}
                      className={`flex h-6 w-5 items-center justify-center ${
                        layer.locked
                          ? "text-gray-700"
                          : "text-gray-300 hover:text-gray-600"
                      }`}
                    >
                      {layer.locked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisible(layer.id);
                      }}
                      title={layer.visible ? "숨기기" : "보이기"}
                      className="flex h-6 w-5 items-center justify-center text-gray-500 hover:text-gray-800"
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative shrink-0 border-t border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <OpacitySlider
                value={activeLayer.opacity}
                onChange={(v) => onOpacityChange(activeLayer.id, v)}
                onChangeEnd={onOpacityDragEnd}
              />
              <button
                onClick={() => setShowFilterPanel((v) => !v)}
                title="블렌드 모드·색보정"
                className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                  hasActiveFilter || showFilterPanel
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Droplet className="h-3.5 w-3.5" />
              </button>
            </div>
            {showFilterPanel && (
              // 위로 열어(bottom-full) 사이드바 하단에서 화면 밖으로 잘리지
              // 않게 한다. 안에 커스텀 블렌드 드롭다운이 있어 overflow는 두지
              // 않는다 — 내용이 짧아(블렌드 + 슬라이더 5개 + 초기화) 잘릴 일이
              // 거의 없다.
              <div className="absolute right-0 bottom-full z-30 mb-1 flex w-56 flex-col gap-1 bg-white p-2 shadow-xl">
                <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                  블렌드 모드
                  <BlendModeDropdown
                    value={activeLayer.blendMode ?? "normal"}
                    onPreview={(mode) =>
                      onBlendModePreview(activeLayer.id, mode)
                    }
                    onCommit={(mode) => onBlendModeChange(activeLayer.id, mode)}
                  />
                </div>
                {ADJUSTMENT_ROWS.map(({ field, label }) => (
                  <AdjustmentRow
                    key={field}
                    label={label}
                    value={activeLayer[field] ?? 0}
                    onChange={(v) =>
                      onAdjustmentChange(activeLayer.id, field, v)
                    }
                    onCommit={onAdjustmentDragEnd}
                  />
                ))}
                <button
                  onClick={() => onResetAdjustments(activeLayer.id)}
                  disabled={
                    !activeLayer.brightness &&
                    !activeLayer.contrast &&
                    !activeLayer.saturation &&
                    !activeLayer.temperature &&
                    !activeLayer.tint
                  }
                  className="self-end text-[10px] text-violet-500 hover:text-violet-700 disabled:opacity-30"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-2 py-1.5">
            <button
              onClick={onAdd}
              disabled={layers.length >= MAX_LAYERS}
              title="레이어 추가"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDuplicate(activeLayerId)}
              disabled={layers.length >= MAX_LAYERS}
              title="레이어 복제"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(activeLayerId)}
              disabled={layers.length <= 1}
              title="레이어 삭제"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMergeDown(activeLayerId)}
              disabled={activeIndex <= 0}
              title="아래 레이어와 병합"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <ArrowDownToLine className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMoveUp(activeLayerId)}
              disabled={activeIndex < 0 || activeIndex >= layers.length - 1}
              title="위로 이동"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMoveDown(activeLayerId)}
              disabled={activeIndex <= 0}
              title="아래로 이동"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 재생·표시 컨트롤 — 레이어 패널의 "레이어 목록" 스크롤 영역에 대응 */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2">
            <button
              onClick={onTogglePlay}
              className="flex items-center justify-center gap-1.5 bg-violet-500 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  정지
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  재생
                </>
              )}
            </button>
            <label className="flex items-center justify-between gap-2 py-0.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                핑퐁
              </span>
              <Switch
                checked={pingPong}
                onClick={onTogglePingPong}
                title="끝에 닿으면 방향을 뒤집어 앞뒤로 오가며 재생"
              />
            </label>
            <label className="flex items-center justify-between gap-2 py-0.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                어니언 스킨
              </span>
              <Switch
                checked={onionSkin}
                onClick={onToggleOnionSkin}
                title="앞뒤 프레임을 흐리게 겹쳐 보기"
              />
            </label>
            {onionSkin && (
              // 어니언 스킨 토글의 하위 옵션임이 드러나도록 왼쪽으로 들여쓰고
              // (라벨 텍스트 시작선에 맞춤) 연결선을 둔다.
              <div className="-mt-0.5 ml-5 flex flex-col gap-1.5 border-l-2 border-violet-200 pl-3">
                <label className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="shrink-0">투명도</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(onionSkinOpacity * 100)}
                    onChange={(e) =>
                      onOnionSkinOpacityChange(Number(e.target.value) / 100)
                    }
                    className="min-w-0 flex-1 accent-violet-500"
                  />
                  <span className="w-8 shrink-0 text-right">
                    {Math.round(onionSkinOpacity * 100)}%
                  </span>
                </label>
                <label className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                  <span className="shrink-0">범위(앞뒤)</span>
                  <select
                    value={onionSkinRange}
                    onChange={(e) =>
                      onOnionSkinRangeChange(Number(e.target.value))
                    }
                    className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}장
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* 현재 프레임 지속시간 — 레이어 패널의 "투명도" 섹션에 대응
              (border-t · px-3 py-2 · 같은 라벨 스타일). 이 프레임 숨김
              토글도 여기(프레임 번호 옆)에 둔다. */}
          <div className="shrink-0 border-t border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>
                현재 프레임{" "}
                <span className="tabular-nums text-gray-400">
                  {activeIndex + 1} / {layers.length}
                </span>
              </span>
              <button
                onClick={() => onToggleVisible(activeLayer.id)}
                disabled={isPlaying}
                title={
                  activeLayer.visible ? "이 프레임 숨기기" : "이 프레임 보이기"
                }
                className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                  activeLayer.visible
                    ? "text-gray-400 hover:text-gray-700"
                    : "text-violet-500"
                } disabled:opacity-30`}
              >
                {activeLayer.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <label className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
              <span className="shrink-0">지속시간</span>
              <input
                type="number"
                min={MIN_FRAME_DURATION_MS / 1000}
                max={MAX_FRAME_DURATION_MS / 1000}
                step={0.01}
                disabled={isPlaying}
                value={
                  durationDraft ??
                  formatFrameSeconds(
                    activeLayer.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
                  )
                }
                onFocus={() =>
                  setDurationDraft(
                    formatFrameSeconds(
                      activeLayer.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
                    ),
                  )
                }
                onChange={(e) => setDurationDraft(e.target.value)}
                onBlur={commitFrameDuration}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setDurationDraft(null);
                }}
                className="w-14 border border-gray-200 px-1 py-0.5 text-center text-[10px] text-gray-700 outline-none disabled:opacity-50"
              />
              <span className="shrink-0 text-gray-400">초</span>
            </label>
          </div>

          {/* 프레임 조작 버튼 — 레이어 패널 하단 버튼 행과 같은 스타일
              (border-t · px-2 py-1.5 · 배경 없는 h-7 w-7 아이콘). 맨 앞은
              레이어 패널의 "레이어 추가"에 대응하는 "새 프레임 추가". */}
          <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-2 py-1.5">
            <button
              onClick={onAdd}
              disabled={isPlaying || layers.length >= MAX_LAYERS}
              title="새 프레임 추가"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDuplicate(activeLayerId)}
              disabled={isPlaying || layers.length >= MAX_LAYERS}
              title="이 프레임 복제"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(activeLayerId)}
              disabled={isPlaying || layers.length <= 1}
              title="이 프레임 삭제"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMoveDown(activeLayerId)}
              disabled={isPlaying || activeIndex <= 0}
              title="앞으로 이동"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMoveUp(activeLayerId)}
              disabled={
                isPlaying || activeIndex < 0 || activeIndex >= layers.length - 1
              }
              title="뒤로 이동"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
