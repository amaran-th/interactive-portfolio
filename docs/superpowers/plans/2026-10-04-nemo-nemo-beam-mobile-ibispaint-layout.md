# 네모네모빔 모바일 ibisPaint 레이아웃 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔 모바일 편집기 화면 레이아웃을 ibisPaint 참고 설계대로 재구성한다 — 세로 도구 열(`MobileToolRail`)을 캔버스 위 모드 도구 줄 + 상단 좌측 되돌리기/다시실행 오버레이 + 하단 그리기 도구 피커 + 상시 노출 옵션 strip으로 대체하고, 하단 독을 4버튼(그리기 도구·색상·레이어·더보기)으로 바꾼다.

**Architecture:** `DrawToolbar.tsx`의 도구별 하위 옵션 계산(`secondarySections`)을 `buildSecondarySections`라는 순수 함수로 뽑아 desktop·모바일이 완전히 공유하게 한다. `MobileToolRail.tsx`(세로 열 + 플라이아웃 단일 컴포넌트)를 삭제하고, 그 역할을 서로 다른 화면 위치에 흩어지는 조각들로 나눠 `MobileEditorShell.tsx`가 직접 그린다(모드 도구 줄·되돌리기/다시실행은 캔버스 위 오버레이, 옵션 strip은 캔버스 아래 실제 레이아웃 공간, 그리기 도구 피커는 기존 색상/레이어/더보기와 같은 팝오버 패턴). `DrawToolbar.tsx`는 desktop 전용으로 되돌아간다(`mobileLayout`/`railSlot` prop 제거).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4. 자동 테스트 없음 — `npx tsc --noEmit -p apps/services/tsconfig.json` + `npm run lint --workspace services`로 검증(baseline: 9 warnings, 0 errors — 모두 이 작업과 무관한 기존 경고).

**Spec:** `docs/superpowers/specs/2026-10-04-nemo-nemo-beam-mobile-ibispaint-layout-design.md`

## Global Constraints

- 데스크탑(`narrow=false`) `DrawToolbar` 렌더링과 동작은 1px도 바뀌면 안 된다 — 모든 변경은 모바일(`narrow=true`) 전용이거나, desktop·모바일이 공유하는 순수 로직 추출(동작 동일성 보장)이어야 한다.
- "불투명도" 슬라이더는 추가하지 않는다(대응 기능 없음, 스펙 범위 밖).
- 보조색(secondary color) 전용 버튼은 추가하지 않는다 — 기존 색상 패널(`ColorWheel`)이 이미 `activeColorHex`/`secondaryColorHex` 둘 다 다룬다.
- 색상/레이어/더보기 패널 내부 내용·동작은 변경하지 않는다 — 꺼내는 버튼 위치·순서만 바뀐다.
- 캔버스 줌 컨트롤(`bottom-2 left-2`, `canvasArea` 내부)은 공유 코드이므로 건드리지 않는다.
- 각 Task가 끝난 시점에 `npx tsc --noEmit -p apps/services/tsconfig.json`와 `npm run lint --workspace services`가 baseline(9 warnings, 0 errors)과 동일해야 한다. 루트에서 실행.

---

## Task 1: `DrawToolbar.tsx`에서 도구 목록·옵션 계산을 공유 가능한 형태로 추출

데스크탑과 모바일이 "어떤 도구가 어떤 하위 옵션을 갖는지" 계산을 100% 공유해야 하므로, 그 계산을 `buildSecondarySections`라는 exported 순수 함수로 뽑는다. 이 Task는 **순수 리팩터링**이다 — 이 시점엔 아직 `mobileLayout`/`MobileToolRail`을 건드리지 않으므로, desktop과 기존 모바일 세로 열 둘 다 지금과 완전히 동일하게 동작해야 한다.

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx`

**Interfaces:**
- Produces: `export type ToolMeta = { tool: Tool; icon: typeof MousePointer2; label: string; key: string }`, `export const SELECT_TOOLS: ToolMeta[]`, `export const PRIMARY_DRAW_TOOLS: ToolMeta[]`, `export const COLLAPSIBLE_DRAW_TOOLS: ToolMeta[]`, `export type SecondarySectionsParams`, `export function buildSecondarySections(params: SecondarySectionsParams): { key: string; node: React.ReactNode }[]` — Task 2가 이 네 심볼(과 `ToolMeta`)을 `Editor.tsx`/`MobileEditorShell.tsx`에서 import한다.

- [ ] **Step 1: `SELECT_TOOLS`/`PRIMARY_DRAW_TOOLS`/`COLLAPSIBLE_DRAW_TOOLS`를 `ToolMeta` 타입으로 통일하고 export**

`apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx`의 다음 블록(파일 44-85번째 줄 부근, `// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다.` 주석부터 `COLLAPSIBLE_DRAW_TOOLS` 선언 끝까지)을 찾는다:

```tsx
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
```

이것으로 교체한다:

```tsx
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
```

- [ ] **Step 2: `buildSecondarySections` 함수를 `export default function DrawToolbar` 바로 앞에 삽입**

파일에서 `export default function DrawToolbar({` 줄을 찾아, 그 바로 앞에 다음 블록을 삽입한다(이 블록은 뒤에 나오는 `DrawToolbar` 함수 본문에 있던 로직을 그대로 옮긴 것이다):

```tsx
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

```

- [ ] **Step 3: `DrawToolbar` 함수 본문의 중복 계산을 `buildSecondarySections` 호출로 교체**

`DrawToolbar` 함수 본문에서 다음 블록(`const showBrushSizeRow = ...`부터 `const secondarySections: { key: string; node: React.ReactNode }[] = [];`를 거쳐 `if (tool === "move") { ... }`의 닫는 `}`까지)을 찾는다:

```tsx
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

  // mobileLayout이면 "선택·조작" 카드(SELECT_TOOLS)를 별도로 렌더링하지
  // 않고 그리기 카드의 같은 줄에 합류시킨다 — desktop은 지금처럼 분리된
  // 카드를 유지한다.
  const drawCardTools = mobileLayout
    ? [...PRIMARY_DRAW_TOOLS, ...SELECT_TOOLS]
    : PRIMARY_DRAW_TOOLS;

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
```

그 아래 똑같은 내용이 이어지는 `if` 블록 3개(`selectOptions`/`sampleScope`/`moveScope`, Step 2에서 그대로 옮긴 것과 동일한 코드)까지 전부 포함해서, `if (tool === "move") { ... }`의 닫는 `}`까지 통째로 아래로 교체한다:

```tsx
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
```

주의: 이 함수 본문 바로 다음에는 원래 `secondarySectionsNode`와 `mobileOptionsNode` 계산이 그대로 남아 있어야 한다(둘 다 이 Task에서는 건드리지 않는다 — `MobileToolRail`과 `mobileLayout` 분기 제거는 Task 2의 일이다). 즉 이 Step이 지우는 범위는 **딱 위에서 보여준 "Before" 블록 전체**이고, 그 뒤에 이어지는 `const secondarySectionsNode = ...`, `const mobileOptionsNode = ...`, `if (mobileLayout) { return <MobileToolRail .../> }` 블록은 그대로 둔다.

- [ ] **Step 4: 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

Expected: tsc 에러 0개, lint는 baseline(9 warnings, 0 errors)과 정확히 동일. desktop(`narrow=false`)과 기존 모바일 세로 열(`narrow=true`, 아직 `MobileToolRail` 경유) 둘 다 동작 변화가 없어야 한다 — 이 Task는 계산 로직을 옮긴 것뿐, 아무 분기도 삭제하지 않았다.

- [ ] **Step 5: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx
git commit -m "refactor : 도구 목록·하위 옵션 계산을 DrawToolbar에서 공유 가능한 형태로 추출"
```

---

## Task 2: `MobileToolRail`을 ibisPaint 레이아웃 조각(모드 도구 줄·되돌리기/다시실행 오버레이·그리기 도구 피커·상시 옵션 strip)으로 교체

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx` (mobileLayout/railSlot 제거, desktop 전용으로 환원)
- Delete: `apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx` (전체 재작성)
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx` (`mobileRailSlot` 제거, 모바일 전용 데이터 추가, 두 호출부 갱신)

**Interfaces:**
- Consumes (Task 1): `ToolMeta`, `SELECT_TOOLS`, `PRIMARY_DRAW_TOOLS`, `COLLAPSIBLE_DRAW_TOOLS`, `buildSecondarySections` — 전부 `./DrawToolbar`에서 import.
- Produces: `MobileEditorShellProps`에 `tool: Tool`, `onToolChange: (tool: Tool) => void`, `modeTools: ToolMeta[]`, `drawToolButtonIcon: ToolMeta["icon"]`, `drawToolsPanel: (closeAll: () => void) => React.ReactNode`, `optionsSections: { key: string; node: React.ReactNode }[]` 추가(`onRailSlotMount`/`toolPanel` 제거) — 이후 Task에서 재사용하지 않지만, 이 교체가 이 Task의 산출물이다.

### Step 1: `DrawToolbar.tsx` — `mobileLayout`/`railSlot` 제거, desktop 전용으로 환원

- [ ] **1a. `MobileToolRail` import 제거**

```tsx
import MobileToolRail from "./MobileToolRail";
```

이 줄을 삭제한다(파일 39번째 줄 부근, `import HelpTip from "./HelpTip";`과 `import { HELP } from "./helpTexts";` 다음).

- [ ] **1b. props 구조분해에서 `mobileLayout`/`railSlot` 제거**

```tsx
  secondaryPortalTarget,
  compact,
  mobileLayout,
  railSlot,
}: {
```

를

```tsx
  secondaryPortalTarget,
  compact,
}: {
```

로 교체한다.

- [ ] **1c. props 타입에서 `mobileLayout`/`railSlot` 선언 제거**

```tsx
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
```

를

```tsx
  // 도구별 하위 옵션(브러시 크기·채우기·그라데이션·선택 모드)을 그릴 자리 —
  // 캔버스 영역 하단 중앙에 떠 있는 DOM 노드를 Editor.tsx가 내려준다. 이
  // 컴포넌트 자신은 상단 바에 렌더링되므로 포털로 그 노드에 그린다.
  secondaryPortalTarget: HTMLDivElement | null;
  // 편집기 폭이 TOOLBAR_COMPACT_WIDTH보다 좁은지 — true면 도형·텍스트·
  // 그라데이션 도구와 반전·회전을 "더보기" 뒤로 접어 도구 카드가 한 줄에
  // 유지되게 한다. Editor.tsx가 rootRef.clientWidth로 판정해 내려준다.
  compact: boolean;
}) {
```

로 교체한다.

- [ ] **1d. `drawCardTools` 변수 제거 (desktop은 항상 `PRIMARY_DRAW_TOOLS`였으므로 동작 변화 없음)**

Task 1에서 만든 다음 블록:

```tsx
  // mobileLayout이면 "선택·조작" 카드(SELECT_TOOLS)를 별도로 렌더링하지
  // 않고 그리기 카드의 같은 줄에 합류시킨다 — desktop은 지금처럼 분리된
  // 카드를 유지한다.
  const drawCardTools = mobileLayout
    ? [...PRIMARY_DRAW_TOOLS, ...SELECT_TOOLS]
    : PRIMARY_DRAW_TOOLS;

  const secondarySections = buildSecondarySections({
```

를

```tsx
  const secondarySections = buildSecondarySections({
```

로 교체한다.

- [ ] **1e. `drawCardTools` 사용처를 `PRIMARY_DRAW_TOOLS`로 교체**

```tsx
              {drawCardTools.map(({ tool: t, icon, label, key }) => (
```

를

```tsx
              {PRIMARY_DRAW_TOOLS.map(({ tool: t, icon, label, key }) => (
```

로 교체한다("그리기" `ToolCard` 안, `COLLAPSIBLE_DRAW_TOOLS.map`보다 먼저 나오는 줄 — 파일에 `.map`이 여러 번 나오므로 `drawCardTools.map`이라는 정확한 문자열로 찾는다).

- [ ] **1f. `mobileOptionsNode`와 `mobileLayout` 이른 return 제거**

```tsx
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
```

를

```tsx
  return (
```

로 교체한다(삭제).

### Step 2: `MobileToolRail.tsx` 삭제

- [ ] **2a. 파일 삭제**

```bash
rm apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx
```

### Step 3: `MobileEditorShell.tsx` 전체 재작성

- [ ] **3a. 파일 전체를 아래 내용으로 교체**

`apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx`의 전체 내용을 다음으로 바꾼다:

```tsx
"use client";

import { Layers, Menu, Play, Redo2, Save, Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ToolMeta } from "./DrawToolbar";
import { FLOATING_PANEL } from "./panelStyles";
import { Tool } from "./types";

export type MobileMoreItem =
  | { id: string; label: string; kind: "action"; onSelect: () => void }
  | {
      id: string;
      label: string;
      kind: "detail";
      // 렌더 프롭 — "레퍼런스" 항목이 이미지를 조정 모드로 고르는 순간
      // 데스크톱(narrow 아이콘열)처럼 팝오버를 닫아 캔버스의 조정 손잡이가
      // 보이게 해야 해서, 콘텐츠 쪽에서 팝오버를 닫을 수 있는 함수를
      // 받는다(단순 ReactNode면 이걸 할 수 없다). 안 쓰는 항목(파일/편집/
      // 불러오기/내보내기)은 인자를 무시한다.
      content: (closeAll: () => void) => React.ReactNode;
    };

export type MobileEditorShellProps = {
  hasActiveTab: boolean; // false면 "열린 파일 없음" 빈 상태를 보여준다
  fileName: string;
  fileNameReadOnly: boolean; // 배경화면 탭이면 데스크톱 제목표시줄과 동일하게 편집 불가
  onRenameFile: (name: string) => void;
  onExit: () => void;
  onSave: () => void;
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // 레이어/프레임 모드 선택 — 이 셸에서는 상단 바가 이 선택 UI를 담당한다
  // (데스크톱은 레이어 패널 자체에 있다). 하단 독의 세 번째 아이콘도 이
  // 값에 따라 "레이어"/"프레임"으로 라벨·아이콘이 바뀐다.
  layerMode: "layers" | "frames";
  onLayerModeChange: (mode: "layers" | "frames") => void;
  canvas: React.ReactNode;
  // 지금 활성 도구 — 상단 모드 도구 줄의 활성 표시, 그리기 도구 그리드 안
  // 선택 표시 둘 다에 필요하다.
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  // 캔버스 위 상단 우측에 떠 있는 모드 도구 줄 — 선택·올가미·이동·자동
  // 선택 4개, 탭하면 즉시 전환된다(ibisPaint처럼 다시 탭해도 옵션이 열리지
  // 않는다 — 옵션은 항상 아래 optionsSections에 떠 있으므로 따로 열 필요가
  // 없다).
  modeTools: ToolMeta[];
  // 하단 독의 "그리기 도구" 버튼에 보여줄 아이콘 — 지금 활성 도구가 그리기
  // 도구 8개 중 하나면 그 아이콘, 아니면(모드 도구가 활성이면) 고정 펜슬
  // 아이콘(Editor.tsx가 계산해 내려준다).
  drawToolButtonIcon: ToolMeta["icon"];
  // "그리기 도구" 팝오버에 그려 넣을 8개 도구 그리드 — moreItems의 detail
  // 항목과 같은 render-prop 패턴(골라서 팝오버를 닫는 동작까지 콘텐츠
  // 쪽에서 하므로 콜백을 받는다).
  drawToolsPanel: (closeAll: () => void) => React.ReactNode;
  // 지금 활성 도구의 하위 옵션 섹션(buildSecondarySections 결과, Editor.tsx가
  // 계산) — 하단 메인 줄 바로 위에 상시 노출되는 strip 하나로 모아 그린다.
  // 빈 배열이면 strip 자체가 안 보인다(텍스트 도구처럼 옵션이 없는 도구).
  optionsSections: { key: string; node: React.ReactNode }[];
  // 하단 독의 "색상" 탭 아이콘을 팔레트 모양 대신 지금 활성 색상 스와치로
  // 보여주기 위한 값 — 다른 드로잉 앱들처럼 탭을 열지 않아도 지금 어떤
  // 색을 쓰고 있는지 한눈에 보이게 한다.
  activeColorHex: string;
  colorPanel: React.ReactNode;
  layerPanel: React.ReactNode;
  moreItems: MobileMoreItem[];
  onNewTab: () => void;
  onOpenExisting: () => void;
};

type PopoverKind = "tools" | "color" | "layers" | "more" | null;

const POPOVER_MARGIN = 8; // 화면 가장자리에서 최소로 띄우는 여백 — mb-2와 같은 0.5rem

export default function MobileEditorShell({
  hasActiveTab,
  fileName,
  fileNameReadOnly,
  onRenameFile,
  onExit,
  onSave,
  saveError,
  showSavedNotice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layerMode,
  onLayerModeChange,
  canvas,
  tool,
  onToolChange,
  modeTools,
  drawToolButtonIcon,
  drawToolsPanel,
  optionsSections,
  activeColorHex,
  colorPanel,
  layerPanel,
  moreItems,
  onNewTab,
  onOpenExisting,
}: MobileEditorShellProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [moreDetail, setMoreDetail] = useState<string | null>(null);
  const [popoverLeft, setPopoverLeft] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const layersBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const btnRefFor = (kind: Exclude<PopoverKind, null>) =>
    kind === "tools"
      ? toolsBtnRef
      : kind === "color"
        ? colorBtnRef
        : kind === "layers"
          ? layersBtnRef
          : moreBtnRef;

  const closeAll = () => {
    setOpenPopover(null);
    setMoreDetail(null);
  };

  const toggle = (kind: Exclude<PopoverKind, null>) => {
    setOpenPopover((cur) => (cur === kind ? null : kind));
    setMoreDetail(null);
  };

  // 팝오버는 자신을 연 독 아이콘 바로 위(가운데)에 뜬다 — 4개 아이콘이 늘
  // 같은 자리에 있지 않고, 팝오버 폭도 종류마다 다르므로(레이어/프레임만
  // 고정 폭, 나머지는 내용에 맞춘 폭) 매번 팝오버 자신의 실제 렌더 폭과
  // 그 아이콘의 실제 위치를 재서 dockRef 기준 left를 계산한다
  // (ContextMenu·PaletteModal 등 이 편집기의 다른 팝업들과 같은
  // "컨테이너 기준 rect 계산" 패턴).
  useLayoutEffect(() => {
    if (!openPopover) return;
    const place = () => {
      const btn = btnRefFor(openPopover).current;
      const dock = dockRef.current;
      const popover = popoverRef.current;
      if (!btn || !dock || !popover) return;
      const btnRect = btn.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const popoverWidth = popover.getBoundingClientRect().width;
      const btnCenter = btnRect.left - dockRect.left + btnRect.width / 2;
      const maxLeft = dockRect.width - popoverWidth - POPOVER_MARGIN;
      const left = Math.max(
        POPOVER_MARGIN,
        Math.min(btnCenter - popoverWidth / 2, Math.max(maxLeft, POPOVER_MARGIN)),
      );
      setPopoverLeft(left);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [openPopover, moreDetail]);

  // 독(팝오버 + 하단 아이콘 바) 바깥을 누르면 닫는다 — ContextMenu.tsx와
  // 같은 mousedown 패턴. 독 자체(아이콘 버튼 포함)는 ref 안에 있으므로
  // 아이콘을 다시 눌러 토글하는 동작과 충돌하지 않는다.
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openPopover]);

  if (!hasActiveTab) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        {/* 데스크톱 제목표시줄과 동일하게, 열린 파일이 없어도 나가기 버튼은
            남겨둔다 — 없으면 갤러리로 돌아갈 방법이 없는 막다른 화면이 된다. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2 py-1.5">
          <button
            onClick={onExit}
            title="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
          >
            ‹
          </button>
          <span className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-gray-400">
            편집기
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-gray-50 text-center">
          <p className="text-sm text-gray-400">열린 파일이 없습니다</p>
          <p className="text-xs text-gray-300">
            <button
              onClick={onNewTab}
              className="text-violet-500 underline underline-offset-2"
            >
              새로 만들기
            </button>
            {" 또는 "}
            <button
              onClick={onOpenExisting}
              className="text-violet-500 underline underline-offset-2"
            >
              열기
            </button>
          </p>
        </div>
      </div>
    );
  }

  const activeMoreItem = moreItems.find(
    (m): m is Extract<MobileMoreItem, { kind: "detail" }> =>
      m.kind === "detail" && m.id === moreDetail,
  );

  let popoverContent: React.ReactNode = null;
  if (openPopover === "tools") popoverContent = drawToolsPanel(closeAll);
  else if (openPopover === "color") popoverContent = colorPanel;
  else if (openPopover === "layers") popoverContent = layerPanel;
  else if (openPopover === "more") {
    popoverContent = activeMoreItem ? (
      <div className="p-3">
        <button
          onClick={() => setMoreDetail(null)}
          className="mb-2 flex items-center gap-1 text-xs text-violet-600"
        >
          ‹ 목록으로
        </button>
        {activeMoreItem.content(closeAll)}
      </div>
    ) : (
      <div className="flex flex-col divide-y divide-gray-100">
        {moreItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.kind === "action") {
                item.onSelect();
                closeAll();
              } else {
                setMoreDetail(item.id);
              }
            }}
            className="flex items-center justify-between px-3 py-3 text-left text-sm text-gray-800"
          >
            {item.label}
            {item.kind === "detail" && (
              <span className="text-gray-300">›</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  const DrawToolIcon = drawToolButtonIcon;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 상단 바 — 되돌리기/다시실행은 엄지가 닿기 먼 자리라는 피드백으로
          여기서 빼고 캔버스 위 좌상단 오버레이로 옮겼다(아래 캔버스 래퍼). */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2 py-1.5">
        <button
          onClick={onExit}
          title="닫기"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          ‹
        </button>
        <input
          value={fileName}
          readOnly={fileNameReadOnly}
          onChange={(e) => onRenameFile(e.target.value)}
          className="min-w-0 flex-1 truncate border-none bg-transparent px-1 text-sm font-semibold text-gray-900 outline-none"
        />
        {saveError && (
          <span className="shrink-0 text-[10px] font-semibold text-red-500">
            저장 실패
          </span>
        )}
        {!saveError && showSavedNotice && (
          <span className="shrink-0 text-[10px] font-semibold text-green-600">
            저장됨
          </span>
        )}
        {/* 레이어/프레임 모드 선택 — 데스크톱에서는 레이어 패널 안에 있는
            토글을 여기(상단 바)로 옮겼다. 버튼 두 개 대신 하나로 눌러
            전환하는 토글 버튼 하나로 둔다 — 지금 모드의 아이콘을 보여주고
            누르면 반대 모드로 바뀐다(하단 독의 표시와 항상 같은 아이콘). */}
        <button
          onClick={() =>
            onLayerModeChange(layerMode === "layers" ? "frames" : "layers")
          }
          title={
            layerMode === "layers" ? "프레임 모드로 전환" : "레이어 모드로 전환"
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-violet-50 text-violet-600"
        >
          {layerMode === "frames" ? (
            <Play className="h-4 w-4" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onSave}
          title="저장"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          <Save className="h-4 w-4" />
        </button>
      </div>

      {/* 캔버스 — 상단 좌측에 되돌리기/다시실행, 상단 우측에 모드 도구 줄을
          오버레이로 띄운다. 기존 줌 컨트롤(canvasArea 안, bottom-2 left-2)과
          같은 "relative 래퍼 안에 absolute" 관례를 그대로 따른다. 옵션
          strip은 반대로 오버레이가 아니라 실제 레이아웃 높이를 차지하는
          영역이라, 이 relative 래퍼 바깥(아래)에 형제로 둔다 — 이비스페인트의
          브러시 크기/불투명도 슬라이더가 캔버스를 가리지 않고 항상 그 아래
          고정 공간을 차지하는 것과 같다. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-gray-50 p-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {canvas}
          <div className="pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="되돌리기"
              className={`pointer-events-auto flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30 ${FLOATING_PANEL}`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="다시실행"
              className={`pointer-events-auto flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30 ${FLOATING_PANEL}`}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
            {modeTools.map(({ tool: t, icon: Icon, label, key }) => (
              <button
                key={t}
                onClick={() => onToolChange(t)}
                title={`${label} (${key})`}
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center ${FLOATING_PANEL} ${
                  tool === t ? "bg-violet-500 text-white" : "text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        {/* 상시 노출 옵션 strip — 도구를 다시 탭해야 열리던 기존(세로 열)
            방식과 달리, 하단 메인 줄 바로 위에 항상 떠 있는다. 섹션 계산
            (buildSecondarySections) 자체는 desktop과 완전히 동일하게
            공유하고, 패널 하나에 세로로 모으는 감싸는 방식만 여기 전용이다.
            옵션이 없는 도구(텍스트)는 배열이 비어 있어 strip 자체가 렌더
            되지 않는다. */}
        {optionsSections.length > 0 && (
          <div className={`flex flex-wrap items-start gap-2 p-2 ${FLOATING_PANEL}`}>
            {optionsSections.map(({ key, node }) => (
              <div key={key}>{node}</div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 독 + 그 위 팝오버 — 기존 FLOATING_PANEL 패턴 그대로. 그리기
          도구가 첫 번째 자리로 새로 들어오고, 레이어/프레임만 내용량 차이가
          커서 최소 높이 + 고정 폭을 주고, 나머지(그리기 도구/색상/더보기)는
          내용 크기 그대로 두되 화면 밖으로 넘치지 않게 최대 높이만 잡는다. */}
      <div ref={dockRef} className="relative">
        {openPopover && (
          <div
            ref={popoverRef}
            style={{ left: popoverLeft }}
            className={`absolute bottom-full z-40 mb-2 flex max-w-[calc(100vw-1rem)] flex-col overflow-y-auto ${
              openPopover === "layers"
                ? "min-h-[280px] max-h-[65vh] w-72"
                : "max-h-[70vh]"
            } ${FLOATING_PANEL}`}
          >
            {popoverContent}
          </div>
        )}
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            ref={toolsBtnRef}
            onClick={() => toggle("tools")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "tools" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <DrawToolIcon className="h-5 w-5" />
            그리기 도구
          </button>
          <button
            ref={colorBtnRef}
            onClick={() => toggle("color")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "color" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <span
              className="h-5 w-5 rounded-full ring-1 ring-inset ring-gray-300"
              style={{ backgroundColor: activeColorHex }}
            />
            색상
          </button>
          <button
            ref={layersBtnRef}
            onClick={() => toggle("layers")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "layers" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            {layerMode === "frames" ? (
              <Play className="h-5 w-5" />
            ) : (
              <Layers className="h-5 w-5" />
            )}
            {layerMode === "frames" ? "프레임" : "레이어"}
          </button>
          <button
            ref={moreBtnRef}
            onClick={() => toggle("more")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "more" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Menu className="h-5 w-5" />
            더보기
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 4: `Editor.tsx` 배선 갱신

- [ ] **4a. lucide-react import에 `Paintbrush` 추가**

```tsx
import {
  Crosshair,
  Focus,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Image as ImageIcon,
  ImagePlus,
  Layers as LayersIcon,
  Loader,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Share,
  TriangleAlert,
  X,
} from "lucide-react";
```

를

```tsx
import {
  Crosshair,
  Focus,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Image as ImageIcon,
  ImagePlus,
  Layers as LayersIcon,
  Loader,
  Minus,
  Paintbrush,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Share,
  TriangleAlert,
  X,
} from "lucide-react";
```

로 교체한다.

- [ ] **4b. `DrawToolbar` import에 Task 1에서 만든 심볼들 추가**

```tsx
import DrawToolbar, { SegmentedControl } from "./DrawToolbar";
```

를

```tsx
import DrawToolbar, {
  buildSecondarySections,
  COLLAPSIBLE_DRAW_TOOLS,
  PRIMARY_DRAW_TOOLS,
  SegmentedControl,
  SELECT_TOOLS,
} from "./DrawToolbar";
```

로 교체한다.

- [ ] **4c. `mobileRailSlot` state 제거**

```tsx
  // 모바일 도구 열(MobileToolRail)이 포털로 그려 넣을, 캔버스 옆 레이아웃
  // 칸의 실제 DOM 노드 — MobileEditorShell이 콜백 ref로 올려준다(마운트
  // 되기 전까지는 null). 위 secondaryToolbarPortal과 같은 "자식이 그린
  // 노드를 상태로 받아 다음 렌더에 내려준다" 패턴.
  const [mobileRailSlot, setMobileRailSlot] =
    useState<HTMLDivElement | null>(null);
  // "JSON 불러오기" 메뉴 항목은 화면에 보이지 않는 이 input을 대신 클릭시켜
```

를

```tsx
  // "JSON 불러오기" 메뉴 항목은 화면에 보이지 않는 이 input을 대신 클릭시켜
```

로 교체한다(바로 위의 `const [secondaryToolbarPortal, setSecondaryToolbarPortal] = useState<HTMLDivElement | null>(null);`는 그대로 둔다).

- [ ] **4d. `DrawToolbar` 호출부에서 `mobileLayout`/`railSlot` 제거**

```tsx
            secondaryPortalTarget={secondaryToolbarPortal}
            compact={toolbarCompact || narrow}
            mobileLayout={narrow}
            railSlot={mobileRailSlot}
          />
```

를

```tsx
            secondaryPortalTarget={secondaryToolbarPortal}
            compact={toolbarCompact}
          />
```

로 교체한다.

- [ ] **4e. 모바일 전용 데이터(모드 도구·그리기 도구 피커·옵션 strip) 추가**

`const mobileMoreItems: MobileMoreItem[] = [` 선언 바로 앞(그 선언 앞의 `// 모바일 셸 전용 데이터 — Editor.tsx의 기존 핸들러를 그대로 재사용한다.` 주석 줄 바로 위)에 다음 블록을 삽입한다:

```tsx
  // 모바일 셸의 상단 모드 도구 줄·하단 "그리기 도구" 버튼·상시 옵션
  // strip 전용 데이터 — desktop DrawToolbar와 완전히 같은 도구 목록·옵션
  // 계산(buildSecondarySections)을 재사용하고, 감싸는 모양만 모바일 전용.
  const mobileDrawToolButtonIcon =
    [...PRIMARY_DRAW_TOOLS, ...COLLAPSIBLE_DRAW_TOOLS].find(
      (t) => t.tool === tool,
    )?.icon ?? Paintbrush;
  const mobileDrawToolsPanel = (closeAll: () => void) => (
    <div className="grid grid-cols-4 gap-1.5 p-2">
      {[...PRIMARY_DRAW_TOOLS, ...COLLAPSIBLE_DRAW_TOOLS].map(
        ({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            onClick={() => {
              setTool(t);
              closeAll();
            }}
            title={`${label} (${key})`}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 ${
              tool === t
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ),
      )}
    </div>
  );
  const mobileOptionsSections = buildSecondarySections({
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
    hasSelection: !!selection.mask && selection.mask.size > 0,
    onFillSelection: handleFillSelection,
    selectMode,
    onSelectModeChange: setSelectMode,
    onClearSelection: () => selection.setMask(null),
    sampleScope: activeSampleScope,
    onSampleScopeChange: handleSampleScopeChange,
    transformScopes,
    onTransformScopeChange: handleTransformScopeChange,
  });

```

(이 값들 — `tool`/`brushSize`/`onBrushSizeChange`/...는 전부 바로 위 `toolPanel` 변수를 만들 때 이미 쓰인 것과 정확히 같은 식별자다.)

- [ ] **4f. `MobileEditorShell` 호출부 갱신**

```tsx
          canvas={canvasArea}
          toolPanel={toolPanel}
          activeColorHex={activeColorHex}
          onRailSlotMount={setMobileRailSlot}
          colorPanel={colorPanel}
```

를

```tsx
          canvas={canvasArea}
          tool={tool}
          onToolChange={setTool}
          modeTools={SELECT_TOOLS}
          drawToolButtonIcon={mobileDrawToolButtonIcon}
          drawToolsPanel={mobileDrawToolsPanel}
          optionsSections={mobileOptionsSections}
          activeColorHex={activeColorHex}
          colorPanel={colorPanel}
```

로 교체한다.

### Step 5: 검증

- [ ] **5a. 타입·린트**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

Expected: tsc 에러 0개, lint는 baseline(9 warnings, 0 errors)과 동일(새 경고 없음 — 특히 `MobileToolRail.tsx` 삭제로 생기던 미사용 import 경고가 없어야 한다).

- [ ] **5b. 브라우저 수동 검증 (모바일 폭)**

`npm run dev:services`로 서비스 앱을 띄우고 네모네모빔 편집기를 모바일 폭(또는 브라우저 자동화가 안 되면 반응형 뷰 강제)에서 연다. 확인 항목(스펙의 테스트 계획과 동일):

- 상단 좌: 되돌리기/다시실행 버튼이 캔버스 좌상단에 떠 있고, 이력이 없을 땐 비활성(흐림) 상태인지.
- 캔버스 우상단: 선택·올가미·이동·자동 선택 4개 아이콘이 가로로 떠 있고, 탭하면 즉시 전환되는지.
- 모드 도구 중 하나(예: 선택)를 탭하면 하단 옵션 strip에 해당 옵션(선택 모드/전역 동일색 등)이 바로 반영되는지.
- 하단 독 첫 버튼("그리기 도구")을 탭하면 연필~그라데이션 8개 그리드가 팝오버로 뜨고, 고르면 팝오버가 닫히며 strip에 브러시 크기 등 옵션이 반영되는지.
- 텍스트 도구를 고르면 옵션 strip이 아예 안 보이는지(빈 배열이라 렌더 안 됨).
- 색상 탭 아이콘이 활성 색상 스와치로 보이고, 레이어/더보기 기존 동작에 회귀가 없는지.
- 데스크탑 폭(`narrow=false`)에서 그리기/선택·조작/편집 카드, 캔버스 하단 포털 옵션이 전부 기존과 동일하게 보이는지.

- [ ] **5c. 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx \
        apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx \
        apps/services/components/works/5_PixelArtMaker/Editor.tsx
git rm apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx
git commit -m "feat : 모바일 세로 도구 열을 이비스페인트식 레이아웃(모드 도구 줄·되돌리기 오버레이·그리기 도구 피커·상시 옵션 strip)으로 교체"
```

---

## Task 3: 참조 레이어 경고 배너 위치 조정

Task 2로 모바일(`narrow`)의 캔버스 영역에는 더 이상 하단에 떠 있는 옵션 오버레이가 없다(옵션 strip이 캔버스 바깥 실제 레이아웃 공간으로 옮겨졌으므로). 배너가 `bottom-14`로 고정돼 있던 건 desktop의 `secondaryToolbarPortal`(캔버스 하단 `bottom-2`에 뜨는 옵션 패널)을 피하기 위해서였다 — 모바일에서는 그 포털이 더 이상 겹칠 일이 없으므로 `bottom-2`로 내려 기존 줌 컨트롤과 같은 높이에 맞춘다.

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `narrow`(기존 top-level 변수, `canvasArea` 선언 시점에 이미 스코프 안에 있음).

- [ ] **Step 1: 배너 위치를 `narrow` 여부에 따라 분기**

```tsx
                {(tool === "eyedropper" ||
                  tool === "wand" ||
                  tool === "bucket") &&
                  activeSampleScope === "reference" &&
                  !hasReferenceLayers && (
                    <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-md ring-1 ring-amber-200">
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                      참조 레이어로 지정된 레이어가 없습니다 — 레이어 목록의 전구
                      아이콘을 켜주세요
                    </div>
                  )}
```

를

```tsx
                {(tool === "eyedropper" ||
                  tool === "wand" ||
                  tool === "bucket") &&
                  activeSampleScope === "reference" &&
                  !hasReferenceLayers && (
                    <div
                      className={`pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-md ring-1 ring-amber-200 ${
                        narrow ? "bottom-2" : "bottom-14"
                      }`}
                    >
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                      참조 레이어로 지정된 레이어가 없습니다 — 레이어 목록의 전구
                      아이콘을 켜주세요
                    </div>
                  )}
```

로 교체한다.

- [ ] **Step 2: 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

Expected: baseline과 동일. 브라우저에서 스포이트/마법봉/채우기 도구로 "참조" 대상을 선택했는데 참조 레이어가 없을 때, 모바일 폭에서는 배너가 줌 컨트롤과 같은 높이(`bottom-2`)에, 데스크탑 폭에서는 기존처럼 `bottom-14`에 뜨는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/Editor.tsx
git commit -m "fix : 모바일 참조 레이어 경고 배너가 옵션 strip과 안 겹치게 위치 조정"
```

---

## 범위 밖 (이 플랜에서 다루지 않음)

- 실기기(iOS Safari·Android Chrome)에서 텍스트 도구로 키보드를 띄웠을 때 하단 바가 가려지는지 확인 — 스펙에 명시된 대로 구현 후 실기기 확인이 필요한 항목이며, 가려지는 게 확인되면 `visualViewport` API 기반 보강을 별도 작업으로 진행한다.
- 불투명도 슬라이더, 캔버스 축소 미리보기(내비게이터) — 스펙의 "범위 밖" 항목 그대로.
