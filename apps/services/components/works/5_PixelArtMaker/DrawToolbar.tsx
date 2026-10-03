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
  Layers,
  Lightbulb,
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
import HelpTip from "./HelpTip";
import { HELP } from "./helpTexts";
import MobileToolRail from "./MobileToolRail";
import { FLOATING_PANEL } from "./panelStyles";
import Switch from "./Switch";
import { LayerScope, SelectMode, Tool, TransformScopeKey } from "./types";

// 세 배열이 공유하는 모양 — 모바일 ibisPaint 레이아웃(MobileEditorShell.tsx,
// Editor.tsx)의 모드 도구 줄·그리기 도구 그리드에서도 그대로 재사용한다.
export type ToolMeta = {
  tool: Tool;
  icon: typeof MousePointer2;
  label: string;
  key: string;
};

// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다.
export const SELECT_TOOLS: ToolMeta[] = [
  { tool: "select", icon: MousePointer2, label: "선택", key: "M" },
  { tool: "lasso", icon: Lasso, label: "올가미", key: "L" },
  { tool: "move", icon: Move, label: "이동", key: "V" },
  { tool: "wand", icon: Wand2, label: "자동 선택", key: "W" },
];

// select·wand뿐 아니라 올가미도 기존 선택 영역에 추가/제외할 수 있다.
const SELECT_LIKE_TOOLS: Tool[] = ["select", "lasso", "wand"];

// 펜슬·지우개·채우기는 가장 자주 쓰는 핵심 도구라 창이 좁아져도 항상 보인다.
export const PRIMARY_DRAW_TOOLS: ToolMeta[] = [
  { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
  { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
  { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
];

// 도형·텍스트·그라데이션은 그보다 덜 자주 쓰여, 창이 좁아지면 반전·회전처럼
// "더보기" 뒤로 접힌다.
export const COLLAPSIBLE_DRAW_TOOLS: ToolMeta[] = [
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

// 도구·조작이 대상으로 삼는 레이어("대상 레이어"). 스포이트·마법봉·페인트통
// 은 판정 기준, 이동·반전·회전·지우기·정렬은 적용 대상 — 저장은 각자 따로.
const SCOPE_OPTIONS = [
  ["active", "현재"],
  ["reference", "참조"],
  ["all", "전체"],
] as const;
const SCOPE_FULL: Record<LayerScope, string> = {
  active: "현재 레이어",
  reference: "참조 레이어",
  all: "전체 레이어",
};
// 대상 표시 — 실행 아이콘 우하단에 작은 서브 아이콘을 겹친다. 활성(기본)은
// 없음, 참조는 전구(레이어 행 토글과 통일), 전체는 레이어 스택.
const SCOPE_BADGE: Partial<Record<LayerScope, { icon: typeof Paintbrush; color: string }>> = {
  reference: { icon: Lightbulb, color: "text-violet-500" },
  all: { icon: Layers, color: "text-sky-600" },
};

export function SegmentedControl({
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
      {label && (
        <span className="flex shrink-0 items-center gap-1">
          {label}
          <HelpTip text={HELP.layerScope} />
        </span>
      )}
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
// 으로 실행, 캐럿 = 대상(활성/참조/전체) 선택. 참조·전체면 아이콘 우하단에
// 작은 서브 아이콘(전구·레이어 스택)을 겹쳐 대상을 나타낸다. 대상="참조"인데
// 지정된 참조 레이어가 없으면 실행만 비활성.
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
        title={`${label} · 대상 레이어: ${SCOPE_FULL[scope]}${disabled ? " (지정된 참조 레이어 없음)" : ""}`}
        className={`relative flex h-8 w-7 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 ${
          danger ? "hover:bg-red-50 hover:text-red-500" : ""
        }`}
      >
        <Icon className="h-4 w-4" />
        {SCOPE_BADGE[scope] &&
          (() => {
            const { icon: Badge, color } = SCOPE_BADGE[scope]!;
            return (
              <Badge
                className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-gray-100 ${color}`}
              />
            );
          })()}
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
          <div
            className={`absolute left-0 top-full z-40 mt-1 flex w-24 flex-col py-1 text-[10px] ${FLOATING_PANEL}`}
          >
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

// 반전·회전·정렬 — 편집 카드의 "더보기" 뒤에 접어 둔다(가끔 한 번 쓰는
// 조작). 지우기는 자주 써서 편집 카드에 바로 보인다. 각 버튼은 자기 대상을
// 캐럿으로 고른다.
function TransformMoreButtons({
  transformScopes,
  hasReferenceLayers,
  onTransformScopeChange,
  onFlipHorizontal,
  onFlipVertical,
  onRotate90,
  onAlignContent,
}: {
  transformScopes: Record<TransformScopeKey, LayerScope>;
  hasReferenceLayers: boolean;
  onTransformScopeChange: (key: TransformScopeKey, scope: LayerScope) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90: (direction: 1 | -1) => void;
  onAlignContent: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
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

export type SecondarySectionsParams = {
  tool: Tool;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  filledShapes: boolean;
  onToggleFilledShapes: () => void;
  shapeGradientFill: boolean;
  onToggleShapeGradientFill: () => void;
  gradientSteps: number;
  onGradientStepsChange: (steps: number) => void;
  gradientAngleDeg: number;
  onGradientAngleChange: (deg: number) => void;
  wandGlobal: boolean;
  onToggleWandGlobal: () => void;
  hasSelection: boolean;
  onFillSelection: () => void;
  selectMode: SelectMode;
  onSelectModeChange: (mode: SelectMode) => void;
  onClearSelection: () => void;
  sampleScope: LayerScope;
  onSampleScopeChange: (scope: LayerScope) => void;
  transformScopes: Record<TransformScopeKey, LayerScope>;
  onTransformScopeChange: (key: TransformScopeKey, scope: LayerScope) => void;
};

// 도구별 하위 옵션 섹션 계산 — desktop(카드마다 흰 패널, DrawToolbar 본문)과
// 모바일(strip 하나에 세로로 모음, MobileEditorShell 경유 Editor.tsx)이
// "어떤 도구가 어떤 옵션을 갖는지"를 100% 똑같이 공유해야 해서 뺐다.
// 감싸는 모양(패널을 몇 개로 나눌지)은 호출하는 쪽이 각자 정한다.
export function buildSecondarySections(
  params: SecondarySectionsParams,
): { key: string; node: React.ReactNode }[] {
  const {
    tool,
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
    selectMode,
    onSelectModeChange,
    onClearSelection,
    sampleScope,
    onSampleScopeChange,
    transformScopes,
    onTransformScopeChange,
  } = params;

  const showBrushSizeRow = BRUSH_SIZE_TOOLS.includes(tool);
  const showFillOptionsRow =
    SHAPE_TOOLS.includes(tool) || GRADIENT_SHAPE_TOOLS.includes(tool);
  const isSelectLikeTool = SELECT_LIKE_TOOLS.includes(tool);
  const isGradientTool = tool === "gradient";
  const showShapeGradientControls =
    shapeGradientFill && GRADIENT_SHAPE_TOOLS.includes(tool);
  const showGradientControls = isGradientTool || showShapeGradientControls;

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
                <span className="flex items-center gap-1">
                  단계
                  <HelpTip text={HELP.gradientSteps} />
                </span>
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
          <label
            className={`flex items-center gap-1.5 text-[10px] ${
              tool === "wand" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0" />
            전역 동일색
            <HelpTip text={HELP.wandGlobal} />
            <Switch
              checked={wandGlobal}
              onClick={onToggleWandGlobal}
              disabled={tool !== "wand"}
            />
          </label>
        </div>
      ),
    });
  }
  if (SAMPLE_SCOPE_TOOLS.includes(tool)) {
    secondarySections.push({
      key: "sampleScope",
      node: (
        <SegmentedControl
          label="대상 레이어"
          value={sampleScope}
          onChange={onSampleScopeChange}
        />
      ),
    });
  }
  if (tool === "move") {
    secondarySections.push({
      key: "moveScope",
      node: (
        <SegmentedControl
          label="대상 레이어"
          value={transformScopes.move}
          onChange={(s) => onTransformScopeChange("move", s)}
        />
      ),
    });
  }
  return secondarySections;
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
  mobileLayout,
  railSlot,
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
  // 모바일 셸(캔버스 왼쪽 세로 도구 열) 전용 — true면 이 함수는 desktop
  // JSX를 렌더링하지 않고 MobileToolRail로 위임한다(아래 이른 return 참고).
  // drawCardTools·secondarySections 계산은 desktop과 동일하게 이 함수
  // 안에서 이뤄지고, MobileToolRail은 그 결과물만 받아 그린다. desktop은
  // 이 prop이 없으니(undefined) 지금과 완전히 동일하게 동작한다.
  mobileLayout?: boolean;
  // mobileLayout 전용 — MobileToolRail이 도구 열 자체를 포털로 그려 넣을
  // 레이아웃 칸의 DOM 노드. Editor.tsx가 MobileEditorShell로부터 콜백 ref로
  // 받아 내려준다(마운트되기 전엔 null). desktop은 안 쓰지만 항상 받는다
  // (secondaryPortalTarget과 같은 방식).
  railSlot: HTMLDivElement | null;
}) {
  // 반전·회전은 캔버스를 열어 둔 내내 계속 쓰는 조작이 아니라 가끔 한 번씩만
  // 쓴다 — 기본은 접어 두고 "더보기"를 눌러야 보이게 해, 매번 보이는 실행취소·
  // 격자·지우기만 항상 눈에 띄게 한다.
  const [showMoreEdit, setShowMoreEdit] = useState(false);
  // 창(편집기)이 좁아지면 도형·텍스트·그라데이션 도구도 같은 방식으로 접는다.
  const [showMoreDrawTools, setShowMoreDrawTools] = useState(false);

  // mobileLayout이면 "선택·조작" 카드(SELECT_TOOLS)를 별도로 렌더링하지
  // 않고 그리기 카드의 같은 줄에 합류시킨다 — desktop은 지금처럼 분리된
  // 카드를 유지한다.
  const drawCardTools = mobileLayout
    ? [...PRIMARY_DRAW_TOOLS, ...SELECT_TOOLS]
    : PRIMARY_DRAW_TOOLS;

  const secondarySections = buildSecondarySections({
    tool,
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
    selectMode,
    onSelectModeChange,
    onClearSelection,
    sampleScope,
    onSampleScopeChange,
    transformScopes,
    onTransformScopeChange,
  });
  // desktop은 캔버스 하단에 createPortal로 보낸다 — 카드마다(선택 옵션·대상
  // 레이어 등) 따로 떨어진 흰 패널로 가로로 늘어놓아도 화면 폭이 넉넉해
  // 자연스럽다.
  const secondarySectionsNode =
    secondarySections.length > 0 ? (
      <div className="pointer-events-auto flex flex-wrap items-end justify-center gap-3">
        {secondarySections.map(({ key, node }) => (
          <div
            key={key}
            className={`flex flex-col gap-1.5 p-2 ${FLOATING_PANEL}`}
          >
            {node}
          </div>
        ))}
      </div>
    ) : null;

  // mobileLayout 전용 — desktop처럼 섹션마다 따로 흰 패널로 나누면(예: 마법봉은
  // "선택 옵션" + "대상 레이어" 2개 섹션) MobileToolRail의 좁은 플라이아웃
  // 폭(max-w-[280px]) 안에서 두 패널이 줄바꿈되며 서로 다른 폭으로 떨어져
  // 어색한 여백이 남는다 — 모든 섹션을 패널 하나에 세로로 모아 넣는다.
  // 섹션별 콘텐츠 자체(어떤 도구가 어떤 옵션을 갖는지)는 위 secondarySections
  // 계산을 그대로 재사용하고, 감싸는 모양만 다르다.
  const mobileOptionsNode =
    secondarySections.length > 0 ? (
      <div className={`flex flex-col gap-2 p-2 ${FLOATING_PANEL}`}>
        {secondarySections.map(({ key, node }) => (
          <div key={key}>{node}</div>
        ))}
      </div>
    ) : null;

  // mobileLayout이면 desktop 전용 카드 레이아웃 대신 세로 도구 열로
  // 위임한다 — drawCardTools는 위에서 이미 계산을 끝냈으므로 그대로
  // 넘기기만 하고, 옵션 콘텐츠는 mobileOptionsNode(위 참고)를 쓴다.
  if (mobileLayout) {
    return (
      <MobileToolRail
        primaryTools={drawCardTools}
        moreTools={COLLAPSIBLE_DRAW_TOOLS}
        tool={tool}
        onToolChange={onToolChange}
        optionsContent={mobileOptionsNode}
        railSlot={railSlot}
      />
    );
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
              {drawCardTools.map(({ tool: t, icon, label, key }) => (
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
            <div
              className={`absolute top-full left-0 z-30 mt-1 flex items-center gap-1 p-2 ${FLOATING_PANEL}`}
            >
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

        {/* 실행취소·격자·지우기는 항상 보이고, 가끔 쓰는 반전·회전·정렬은
            그리기 카드와 같은 방식으로 "더보기" 뒤에 접는다. 각 변형 버튼은
            자기 대상 레이어를 캐럿으로 고른다(지우기 포함). */}
        <div className="relative">
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
              <div className="mx-0.5 h-6 w-px shrink-0 bg-gray-200" />
              <ScopedActionButton
                icon={Loader}
                label="지우기"
                danger
                scope={transformScopes.clear}
                hasReferenceLayers={hasReferenceLayers}
                onScopeChange={(s) => onTransformScopeChange("clear", s)}
                onRun={onClearCanvas}
              />
              <button
                onClick={() => setShowMoreEdit((v) => !v)}
                title="반전·회전·정렬"
                className="flex h-8 items-center gap-0.5 bg-gray-100 px-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
              >
                더보기
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showMoreEdit ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            </ToolCard>
            {showMoreEdit && (
              <div
                className={`absolute top-full right-0 z-30 mt-1 p-2 ${FLOATING_PANEL}`}
              >
                <TransformMoreButtons
                  transformScopes={transformScopes}
                  hasReferenceLayers={hasReferenceLayers}
                  onTransformScopeChange={onTransformScopeChange}
                  onFlipHorizontal={onFlipHorizontal}
                  onFlipVertical={onFlipVertical}
                  onRotate90={onRotate90}
                  onAlignContent={onAlignContent}
                />
              </div>
            )}
          </div>
      </div>

      {secondarySections.length > 0 &&
        secondaryPortalTarget &&
        createPortal(secondarySectionsNode, secondaryPortalTarget)}
    </div>
  );
}
