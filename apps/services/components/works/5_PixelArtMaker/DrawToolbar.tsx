"use client";

import {
  Blend,
  ChevronDown,
  Circle,
  Crosshair,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  Focus,
  Globe,
  Grid3x3,
  Lasso,
  Loader,
  Minus,
  MousePointer2,
  Move,
  Paintbrush,
  PaintBucket,
  Redo2,
  RotateCcw,
  RotateCw,
  Square,
  SquareMinus,
  SquarePlus,
  Type,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import GradientDial from "./GradientDial";
import { LayerScope, SelectMode, Tool, TransformScopeKey } from "./types";

// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다.
const SELECT_TOOLS: {
  tool: Tool;
  icon: typeof MousePointer2;
  label: string;
  key: string;
}[] = [
  { tool: "select", icon: MousePointer2, label: "선택", key: "M" },
  { tool: "lasso", icon: Lasso, label: "올가미", key: "L" },
  { tool: "move", icon: Move, label: "이동", key: "V" },
  { tool: "wand", icon: Wand2, label: "자동 선택", key: "W" },
];

// select·wand뿐 아니라 올가미도 기존 선택 영역에 추가/제외할 수 있다.
const SELECT_LIKE_TOOLS: Tool[] = ["select", "lasso", "wand"];

// 펜슬·지우개·채우기는 가장 자주 쓰는 핵심 도구라 창이 좁아져도 항상 보인다.
const PRIMARY_DRAW_TOOLS: {
  tool: Tool;
  icon: typeof Paintbrush;
  label: string;
  key: string;
}[] = [
  { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
  { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
  { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
];

// 도형·텍스트·그라데이션은 그보다 덜 자주 쓰여, 창이 좁아지면 반전·회전처럼
// "더보기" 뒤로 접힌다.
const COLLAPSIBLE_DRAW_TOOLS: {
  tool: Tool;
  icon: typeof Paintbrush;
  label: string;
  key: string;
}[] = [
  { tool: "line", icon: Minus, label: "직선", key: "U" },
  { tool: "rect", icon: Square, label: "사각형", key: "R" },
  { tool: "circle", icon: Circle, label: "원", key: "O" },
  { tool: "text", icon: Type, label: "텍스트", key: "T" },
  { tool: "gradient", icon: Blend, label: "그라데이션", key: "D" },
];

const BRUSH_SIZES = [1, 2, 3, 4];

// 브러시 크기는 실제로 점을 찍는 도구(plotPoint를 쓰는)에만 의미가 있다 —
// 채우기는 floodFill로 영역 전체를 칠하고, 스포이트·선택·이동·자동 선택은
// 애초에 픽셀을 그리지 않으므로 브러시 크기와 무관하다.
const BRUSH_SIZE_TOOLS: Tool[] = ["pencil", "eraser", "line", "rect", "circle"];

// 채우기 옵션은 사각형·원 도형에만 의미가 있다.
const SHAPE_TOOLS: Tool[] = ["rect", "circle"];

// 그라데이션 채우기는 길이·면적이 있는 도형 도구(직선·사각형·원)에 모두 의미가
// 있다 — 직선은 채우기 개념이 없어도 길이 방향으로 색이 변할 수 있다.
const GRADIENT_SHAPE_TOOLS: Tool[] = ["line", "rect", "circle"];

// 스포이트·마법봉·페인트통만 "판정 기준"(활성 레이어 vs 전체 화면)이 의미가 있다.
const SAMPLE_SCOPE_TOOLS: Tool[] = ["eyedropper", "wand", "bucket"];

// 스포이트·마법봉·페인트통의 "판정 대상" 세그먼트(도구별로 따로 저장). 이동
// 도구의 "이동 대상"도 같은 컨트롤을 쓴다.
const SCOPE_OPTIONS = [
  ["active", "활성"],
  ["reference", "참조"],
  ["all", "전체"],
] as const;
const SCOPE_FULL: Record<LayerScope, string> = {
  active: "활성 레이어",
  reference: "참조 레이어",
  all: "전체 레이어",
};
// 대상 표시용 색 — 활성=회색, 참조=violet(전구 아이콘과 통일), 전체=하늘색.
const SCOPE_DOT: Record<LayerScope, string> = {
  active: "bg-gray-300",
  reference: "bg-violet-400",
  all: "bg-sky-400",
};

function SegmentedControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LayerScope;
  onChange: (v: LayerScope) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
      <span className="shrink-0">{label}</span>
      <div className="flex overflow-hidden rounded-sm border border-gray-200">
        {SCOPE_OPTIONS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-1.5 py-1 ${
              value === v
                ? "bg-violet-500 text-white"
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// 변형 조작 하나 = 실행 아이콘 + 대상 드롭다운(캐럿). 아이콘 클릭 = 지금 대상
// 으로 실행, 캐럿 = 대상(활성/참조/전체) 선택. 아이콘 밑 작은 점이 현재 대상
// 색을 보여준다. 대상="참조"인데 지정된 참조 레이어가 없으면 실행만 비활성.
function ScopedActionButton({
  icon: Icon,
  label,
  scope,
  hasReferenceLayers,
  onScopeChange,
  onRun,
  danger,
}: {
  icon: typeof Paintbrush;
  label: string;
  scope: LayerScope;
  hasReferenceLayers: boolean;
  onScopeChange: (s: LayerScope) => void;
  onRun: () => void;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const disabled = scope === "reference" && !hasReferenceLayers;
  return (
    <div className="relative flex shrink-0">
      <button
        type="button"
        onClick={onRun}
        disabled={disabled}
        title={`${label} · 대상: ${SCOPE_FULL[scope]}${disabled ? " (지정된 참조 레이어 없음)" : ""}`}
        className={`relative flex h-8 w-7 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 ${
          danger ? "hover:bg-red-50 hover:text-red-500" : ""
        }`}
      >
        <Icon className="h-4 w-4" />
        <span
          className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${SCOPE_DOT[scope]}`}
        />
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="대상 레이어 선택"
        className={`flex h-8 w-3 items-center justify-center bg-gray-100 hover:bg-gray-200 ${
          open ? "text-violet-500" : "text-gray-400"
        }`}
      >
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 flex w-24 flex-col bg-white py-1 text-[10px] shadow-xl">
            {(["active", "reference", "all"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onScopeChange(v);
                  setOpen(false);
                }}
                className={`px-2 py-1 text-left hover:bg-violet-50 ${
                  v === scope
                    ? "font-semibold text-violet-700"
                    : "text-gray-600"
                }`}
              >
                {SCOPE_FULL[v]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 지우기·반전·회전·정렬 — 각자 자기 대상을 갖는다. "변형" 카드에 함께 두고,
// 좁을 때만 카드 밑 팝오버로 접는다.
function TransformButtons({
  transformScopes,
  hasReferenceLayers,
  onTransformScopeChange,
  onClearCanvas,
  onFlipHorizontal,
  onFlipVertical,
  onRotate90,
  onAlignContent,
}: {
  transformScopes: Record<TransformScopeKey, LayerScope>;
  hasReferenceLayers: boolean;
  onTransformScopeChange: (key: TransformScopeKey, scope: LayerScope) => void;
  onClearCanvas: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90: (direction: 1 | -1) => void;
  onAlignContent: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <ScopedActionButton
        icon={Loader}
        label="지우기"
        danger
        scope={transformScopes.clear}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("clear", s)}
        onRun={onClearCanvas}
      />
      <div className="mx-0.5 h-6 w-px shrink-0 bg-gray-200" />
      <ScopedActionButton
        icon={FlipHorizontal2}
        label="좌우 반전"
        scope={transformScopes.flipH}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("flipH", s)}
        onRun={onFlipHorizontal}
      />
      <ScopedActionButton
        icon={FlipVertical2}
        label="상하 반전"
        scope={transformScopes.flipV}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("flipV", s)}
        onRun={onFlipVertical}
      />
      <ScopedActionButton
        icon={RotateCcw}
        label="90도 반시계 회전"
        scope={transformScopes.rotateCcw}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("rotateCcw", s)}
        onRun={() => onRotate90(-1)}
      />
      <ScopedActionButton
        icon={RotateCw}
        label="90도 시계 회전"
        scope={transformScopes.rotateCw}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("rotateCw", s)}
        onRun={() => onRotate90(1)}
      />
      <div className="mx-0.5 h-6 w-px shrink-0 bg-gray-200" />
      <ScopedActionButton
        icon={Focus}
        label="정렬"
        scope={transformScopes.align}
        hasReferenceLayers={hasReferenceLayers}
        onScopeChange={(s) => onTransformScopeChange("align", s)}
        onRun={onAlignContent}
      />
    </div>
  );
}

// 카테고리 하나를 흰 카드로 감싼다 — 예전 좌측 사이드바(Toolbar/ColorWheel)와
// 같은 시각 언어를 상단 바에도 그대로 적용해, 캔버스 배경색이 칠해진 회색
// 바탕 위에 각 도구 묶음이 또렷한 카드로 떠 보이게 한다.
// 카드마다 "그리기"/"선택 옵션" 같은 글자 라벨을 눈에 보이게 두지 않는다 —
// 아이콘만으로도 각 묶음의 역할이 충분히 구분되고, 라벨은 스크린 리더 등
// 접근성 도구에서만 필요하다(aria-label로만 제공, 화면에는 그리지 않는다).
function ToolCard({
  title,
  compact,
  children,
}: {
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={`flex flex-col bg-white shadow-md ${compact ? "gap-1 p-1.5" : "gap-1.5 p-2"}`}
    >
      {children}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: typeof Paintbrush;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center transition-colors ${
        active
          ? "bg-violet-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// 그리기 도구를 가장 왼쪽(가장 자주 씀)에 두고, 브러시 크기·채우기 옵션은
// 독립된 카드가 아니라 "그리기" 카드에 속한 하위 설정으로 취급한다 — 같은
// 카드 안에서 도구 아이콘 줄 아래에 두 번째 줄로 붙이고, 지금 고른 도구와
// 무관한 옵션은 아예 숨겨 항상 딸려오지 않게 한다. 선택·조작/선택 옵션이
// 그 다음으로 이어지고, 예전 좌측 사이드바(실행취소·격자·지우기·반전·회전)는
// 맨 끝 카드로 옮겨왔다. 각 도구 아이콘은 글자 라벨 없이 아이콘만 보여주고,
// 단축키는 title 툴팁으로만 안내한다.
export default function DrawToolbar({
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  filledShapes,
  onToggleFilledShapes,
  shapeGradientFill,
  onToggleShapeGradientFill,
  gradientSteps,
  onGradientStepsChange,
  gradientAngleDeg,
  onGradientAngleChange,
  wandGlobal,
  onToggleWandGlobal,
  hasSelection,
  onFillSelection,
  canvasBgColor,
  selectMode,
  onSelectModeChange,
  onClearSelection,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  showCrosshair,
  onToggleCrosshair,
  onClearCanvas,
  onFlipHorizontal,
  onFlipVertical,
  onRotate90,
  onAlignContent,
  hasReferenceLayers,
  sampleScope,
  onSampleScopeChange,
  transformScopes,
  onTransformScopeChange,
  secondaryPortalTarget,
  compact,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  filledShapes: boolean;
  onToggleFilledShapes: () => void;
  shapeGradientFill: boolean;
  onToggleShapeGradientFill: () => void;
  // 그라데이션 도구·도형/텍스트 그라데이션 채우기가 공유하는 단계 수·방향.
  gradientSteps: number;
  onGradientStepsChange: (steps: number) => void;
  gradientAngleDeg: number;
  onGradientAngleChange: (deg: number) => void;
  // true면 마법봉이 이어진 영역이 아니라 캔버스 전체에서 같은 색을 모두 선택한다.
  wandGlobal: boolean;
  onToggleWandGlobal: () => void;
  // 선택 영역이 있어야만 "선택 영역 채우기"가 의미 있다.
  hasSelection: boolean;
  onFillSelection: () => void;
  canvasBgColor: string;
  // select·lasso·wand 도구일 때만 의미가 있다 — Shift/Alt 드래그 대신 버튼으로
  // "추가"/"제외"를 켜 둘 수 있다.
  selectMode: SelectMode;
  onSelectModeChange: (mode: SelectMode) => void;
  onClearSelection: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showCrosshair: boolean;
  onToggleCrosshair: () => void;
  onClearCanvas: () => void;
  // 좌우/상하 반전은 캔버스 크기를 바꾸지 않아 되돌리기가 되지만, 90도 회전은
  // 정사각형이 아닌 캔버스에서 가로세로가 바뀌어 되돌리기 스택이 초기화된다.
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90: (direction: 1 | -1) => void;
  // 대상 레이어들의 그림을 캔버스 정중앙으로 옮긴다.
  onAlignContent: () => void;
  // 참조 레이어로 지정된 게 하나라도 있는지 — 없으면 "참조" 대상 실행 비활성.
  hasReferenceLayers: boolean;
  // 지금 활성 도구(스포이트·마법봉·페인트통)의 판정 대상 — 도구별로 따로다.
  sampleScope: LayerScope;
  onSampleScopeChange: (scope: LayerScope) => void;
  // 지우기·반전H·반전V·회전↺·회전↻·정렬·이동의 대상 — 조작마다 따로 저장한다.
  transformScopes: Record<TransformScopeKey, LayerScope>;
  onTransformScopeChange: (key: TransformScopeKey, scope: LayerScope) => void;
  // 도구별 하위 옵션(브러시 크기·채우기·그라데이션·선택 모드)을 그릴 자리 —
  // 캔버스 영역 하단 중앙에 떠 있는 DOM 노드를 Editor.tsx가 내려준다. 이
  // 컴포넌트 자신은 상단 바에 렌더링되므로 포털로 그 노드에 그린다.
  secondaryPortalTarget: HTMLDivElement | null;
  // 편집기 폭이 TOOLBAR_COMPACT_WIDTH보다 좁은지 — true면 도형·텍스트·
  // 그라데이션 도구와 반전·회전을 "더보기" 뒤로 접어 도구 카드가 한 줄에
  // 유지되게 한다. Editor.tsx가 rootRef.clientWidth로 판정해 내려준다.
  compact: boolean;
}) {
  const showBrushSizeRow = BRUSH_SIZE_TOOLS.includes(tool);
  const showFillOptionsRow =
    SHAPE_TOOLS.includes(tool) || GRADIENT_SHAPE_TOOLS.includes(tool);
  const isSelectLikeTool = SELECT_LIKE_TOOLS.includes(tool);
  // 반전·회전은 캔버스를 열어 둔 내내 계속 쓰는 조작이 아니라 가끔 한 번씩만
  // 쓴다 — 기본은 접어 두고 "더보기"를 눌러야 보이게 해, 매번 보이는 실행취소·
  // 격자·지우기만 항상 눈에 띄게 한다.
  const [showMoreEdit, setShowMoreEdit] = useState(false);
  // 창(편집기)이 좁아지면 도형·텍스트·그라데이션 도구도 같은 방식으로 접는다.
  const [showMoreDrawTools, setShowMoreDrawTools] = useState(false);

  // 그라데이션 단계 수는 그라데이션 도구·도형(직선/사각형/원) 그라데이션
  // 채우기 둘 다에 쓰인다. 방향(각도)은 도형 채우기에만 의미가 있다 —
  // 그라데이션 도구 자체는 드래그 방향을 그대로 쓰므로 이 각도를 따르지 않는다.
  const isGradientTool = tool === "gradient";
  const showShapeGradientControls =
    shapeGradientFill && GRADIENT_SHAPE_TOOLS.includes(tool);
  const showGradientControls = isGradientTool || showShapeGradientControls;

  // 카드마다 따로 뜨던 팝오버를 하나로 모은다 — 전에는 각자 자기 카드 바로
  // 아래에 떴는데, 카드가 가로로 늘어서다 보니 "그리기"는 왼쪽 끝, "선택
  // 옵션"은 그보다 오른쪽에 뜨는 것처럼 보여 일관성이 없어 보였다. 게다가 줄이
  // 길어져 두 번째 줄로 넘어가면 첫 줄 카드의 팝오버가 그 두 번째 줄 카드를
  // 가려버렸다. 지금은 어느 카드에서 열렸든 항상 툴바 전체 맨 아래, 같은
  // 자리 하나에만 뜨게 해 위치를 통일하고, 다른 카드 위를 덮는 일이 없도록
  // 한다 — 툴바 아래 캔버스 일부를 잠깐 덮는 것은 팝오버 방식인 이상 피할 수
  // 없지만, 그 정도는 열려 있는 동안만이라 감수할 만하다.
  const secondarySections: { key: string; node: React.ReactNode }[] = [];
  if (showBrushSizeRow || showFillOptionsRow || showGradientControls) {
    secondarySections.push({
      key: "draw",
      node: (
        <div className="flex items-center gap-2">
          {showBrushSizeRow && (
            <div className="flex gap-1">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => onBrushSizeChange(size)}
                  title={`${size}×${size}px 브러시`}
                  className={`flex h-8 w-8 flex-col items-center justify-center gap-0.5 ${
                    brushSize === size
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {/* 실제로 찍히는 도트 크기(size×size)를 그대로 정사각형으로 보여준다
                      — 숫자만으로는 굵기가 한눈에 안 들어온다는 피드백. 정사각형은
                      가장 큰 크기(16px) 높이의 고정 칸 안에 넣어, 크기가 달라져도
                      아래 숫자의 세로 위치가 네 버튼에서 일정하게 맞도록 한다. */}
                  <span className="flex h-4 items-center justify-center">
                    <span
                      style={{
                        width: size * 4,
                        height: size * 4,
                        backgroundColor: "currentColor",
                      }}
                    />
                  </span>
                  <span className="text-[8px] leading-none tabular-nums opacity-70">
                    {size}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showFillOptionsRow && (
            <div className="flex gap-1">
              {SHAPE_TOOLS.includes(tool) && (
                <button
                  onClick={onToggleFilledShapes}
                  title="도형 채우기 — 사각형·원을 채워서 그리기"
                  className={`flex h-7 w-7 items-center justify-center ${
                    filledShapes
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <PaintBucket className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onToggleShapeGradientFill}
                title="그라데이션 채우기 — 직선·사각형·원을 그라데이션으로 채우기(그리기 시작점이 활성 색상, 끝점이 보조 색상이 되는 방향)"
                className={`flex h-7 w-7 items-center justify-center ${
                  shapeGradientFill
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Blend className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {showGradientControls && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[10px] text-gray-600">
                <span>단계</span>
                <input
                  type="range"
                  min={2}
                  max={32}
                  value={gradientSteps}
                  onChange={(e) =>
                    onGradientStepsChange(Number(e.target.value))
                  }
                />
                <span className="w-5 text-right tabular-nums text-gray-400">
                  {gradientSteps}
                </span>
              </label>
              {!isGradientTool && (
                <div
                  className="flex items-center gap-1.5 text-[10px] text-gray-600"
                  title="도형 그라데이션 채우기가 칠해지는 방향"
                >
                  <span>방향</span>
                  <GradientDial
                    angleDeg={gradientAngleDeg}
                    onAngleChange={onGradientAngleChange}
                  />
                  <span className="w-7 text-right tabular-nums text-gray-400">
                    {gradientAngleDeg}°
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    });
  }
  // 선택 도구를 쓰고 있지 않고 지금 선택된 영역도 없으면 이 카드 자체가
  // 할 일이 없다 — 다른 도구로 그림을 그리는 동안은 접어 둔다. 다만 선택
  // 영역이 남아 있는 채로 펜슬 등으로 바꿔 그 안쪽만 칠하는 흐름도 흔하므로,
  // hasSelection이면 도구가 무엇이든 계속 보여준다(선택 해제·선택 영역
  // 채우기가 갑자기 사라지면 안 된다). 그리기 하위 옵션과 같은 자리(캔버스
  // 하단 중앙)에 뜨도록 여기서도 포털로 보낸다.
  if (isSelectLikeTool || hasSelection) {
    secondarySections.push({
      key: "selectOptions",
      node: (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <button
              disabled={!hasSelection}
              onClick={onClearSelection}
              title="선택 영역 해제 (Esc)"
              className="flex h-8 w-8 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              disabled={!hasSelection}
              onClick={onFillSelection}
              title="선택 영역 채우기 — 선택 영역을 활성 색상으로 한 번에 칠하기(색상 일괄 수정)"
              className="flex h-8 w-8 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <PaintBucket className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* 자주 안 쓰는 옵션이라고 "더보기" 뒤에 숨기지 않는다 — 구분선으로만
              나눠서, 필요할 때 한 번 더 누르지 않고 바로 보이게 한다. */}
          <div className="h-7 w-px bg-gray-200" />
          <div className="flex gap-1">
            {(
              [
                { mode: "new", label: "새 선택", icon: Square },
                {
                  mode: "add",
                  label: "선택 영역에 추가 (Shift)",
                  icon: SquarePlus,
                },
                {
                  mode: "subtract",
                  label: "선택 영역에서 제외 (Alt)",
                  icon: SquareMinus,
                },
              ] as { mode: SelectMode; label: string; icon: typeof Square }[]
            ).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                disabled={!isSelectLikeTool}
                onClick={() => onSelectModeChange(mode)}
                title={label}
                className={`flex h-8 w-8 items-center justify-center disabled:opacity-30 ${
                  selectMode === mode
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            disabled={tool !== "wand"}
            onClick={onToggleWandGlobal}
            title="전역 동일색 — 켜면 마법봉이 이어진 영역이 아니라 캔버스 전체에서 같은 색을 모두 선택한다"
            className={`flex h-8 w-8 items-center justify-center disabled:opacity-30 ${
              wandGlobal
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    });
  }
  // 스포이트·마법봉·페인트통: "무엇을 기준으로 색·영역을 판정할지" (클립스튜디오
  // "다중 참조"). "참조 레이어"인데 지정된 게 없을 때의 경고는 이 패널이 아니라
  // Editor가 캔버스 위쪽에 따로 띄운다 — 여기서 한 줄 늘어나면 옵션 위치가
  // 흔들려 쓰기 불편하다는 피드백.
  if (SAMPLE_SCOPE_TOOLS.includes(tool)) {
    secondarySections.push({
      key: "sampleScope",
      node: (
        <SegmentedControl
          label="판정 대상"
          value={sampleScope}
          onChange={onSampleScopeChange}
        />
      ),
    });
  }
  // 이동 도구는 "변형" 카드가 멀어서(선택 카드에 있음) 여기서도 대상을 바꾼다 —
  // 반전·회전 등과 다른 별개 상태(transformScopes.move)다.
  if (tool === "move") {
    secondarySections.push({
      key: "moveScope",
      node: (
        <SegmentedControl
          label="이동 대상"
          value={transformScopes.move}
          onChange={(s) => onTransformScopeChange("move", s)}
        />
      ),
    });
  }
  return (
    <div className="relative" style={{ backgroundColor: canvasBgColor }}>
      <div
        className={`flex w-full flex-wrap items-start ${
          compact ? "gap-1.5 px-1.5 pt-1.5 pb-1" : "gap-3 px-3 pt-3 pb-1.5"
        }`}
      >
        <div className="relative">
          <ToolCard title="그리기" compact={compact}>
            <div className="flex items-center gap-1">
              {PRIMARY_DRAW_TOOLS.map(({ tool: t, icon, label, key }) => (
                <ToolButton
                  key={t}
                  active={tool === t}
                  onClick={() => onToolChange(t)}
                  title={`${label} (${key})`}
                  icon={icon}
                />
              ))}
              {!compact &&
                COLLAPSIBLE_DRAW_TOOLS.map(({ tool: t, icon, label, key }) => (
                  <ToolButton
                    key={t}
                    active={tool === t}
                    onClick={() => onToolChange(t)}
                    title={`${label} (${key})`}
                    icon={icon}
                  />
                ))}
              {compact && (
                <button
                  onClick={() => setShowMoreDrawTools((v) => !v)}
                  title="도형·텍스트·그라데이션 도구 더보기"
                  className={`flex h-8 items-center gap-0.5 px-1.5 text-[10px] ${
                    COLLAPSIBLE_DRAW_TOOLS.some(({ tool: t }) => tool === t)
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  더보기
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showMoreDrawTools ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          </ToolCard>
          {compact && showMoreDrawTools && (
            <div className="absolute top-full left-0 z-30 mt-1 flex items-center gap-1 bg-white p-2 shadow-xl">
              {COLLAPSIBLE_DRAW_TOOLS.map(({ tool: t, icon, label, key }) => (
                <ToolButton
                  key={t}
                  active={tool === t}
                  onClick={() => {
                    onToolChange(t);
                    setShowMoreDrawTools(false);
                  }}
                  title={`${label} (${key})`}
                  icon={icon}
                />
              ))}
            </div>
          )}
        </div>

        <ToolCard title="선택 · 조작" compact={compact}>
          <div className="flex gap-1">
            {SELECT_TOOLS.map(({ tool: t, icon, label, key }) => (
              <ToolButton
                key={t}
                active={tool === t}
                onClick={() => onToolChange(t)}
                title={`${label} (${key})`}
                icon={icon}
              />
            ))}
          </div>
        </ToolCard>

        <ToolCard title="편집" compact={compact}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="실행취소"
              className="flex h-8 w-8 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="다시실행"
              className="flex h-8 w-8 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleGrid}
              title="격자 표시 (기본 켜짐)"
              className={`flex h-8 w-8 items-center justify-center ${showGrid ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleCrosshair}
              title="중앙 십자 보조선"
              className={`flex h-8 w-8 items-center justify-center ${showCrosshair ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>
        </ToolCard>

        {/* 변형 묶음 — 지우기·반전·회전·정렬을 한곳에 모으고, 조작마다 자기
            대상(활성/참조/전체 레이어)을 아이콘 옆 캐럿으로 고른다. 예전엔
            지우기만 편집 카드, 나머지는 "더보기" 뒤라 어긋나 있었다. */}
        <div className="relative">
          <ToolCard title="변형" compact={compact}>
            {compact ? (
              // 좁을 때는 카드가 "변형" 버튼 하나로 줄고, 버튼들은 팝오버로.
              <button
                onClick={() => setShowMoreEdit((v) => !v)}
                title="지우기·반전·회전·정렬"
                className="flex h-8 items-center justify-center gap-0.5 bg-gray-100 px-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
              >
                변형
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showMoreEdit ? "rotate-180" : ""}`}
                />
              </button>
            ) : (
              <TransformButtons
                transformScopes={transformScopes}
                hasReferenceLayers={hasReferenceLayers}
                onTransformScopeChange={onTransformScopeChange}
                onClearCanvas={onClearCanvas}
                onFlipHorizontal={onFlipHorizontal}
                onFlipVertical={onFlipVertical}
                onRotate90={onRotate90}
                onAlignContent={onAlignContent}
              />
            )}
          </ToolCard>
          {compact && showMoreEdit && (
            <div className="absolute top-full right-0 z-30 mt-1 bg-white p-2 shadow-xl">
              <TransformButtons
                transformScopes={transformScopes}
                hasReferenceLayers={hasReferenceLayers}
                onTransformScopeChange={onTransformScopeChange}
                onClearCanvas={onClearCanvas}
                onFlipHorizontal={onFlipHorizontal}
                onFlipVertical={onFlipVertical}
                onRotate90={onRotate90}
                onAlignContent={onAlignContent}
              />
            </div>
          )}
        </div>
      </div>

      {/* 도구별 하위 옵션은 상단 바가 아니라 캔버스 영역 하단 중앙에 떠 있는
          자리(Editor의 secondaryPortalTarget)에 포털로 그린다 — 상단 바를
          두껍게 만들지 않고, 좌우 사이드바도 안 가린다. 캔버스 일부를 잠깐
          덮지만, 캔버스는 스페이스+드래그로 자유롭게 밀 수 있어(패딩 확보됨)
          가려지면 작업물을 그 밑에서 빼내면 된다. */}
      {secondarySections.length > 0 &&
        secondaryPortalTarget &&
        createPortal(
          <div className="pointer-events-auto flex flex-wrap items-end justify-center gap-3">
            {secondarySections.map(({ key, node }) => (
              <div
                key={key}
                className="flex flex-col gap-1.5 bg-white p-2 shadow-xl"
              >
                {node}
              </div>
            ))}
          </div>,
          secondaryPortalTarget,
        )}
    </div>
  );
}
