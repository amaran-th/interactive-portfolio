# 네모네모빔 모바일 도구바(DrawToolbar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 "도구" 팝오버가 데스크톱 도구바를 그대로 보여주는 대신, 주요 도구 7개 상시 노출(+더보기 5개), 도구별 하위 옵션 인라인 표시, 편집 액션(격자·십자선·지우기·반전·회전·정렬)을 `더보기 > 편집`으로 이동하는 모바일 전용 레이아웃을 갖게 한다.

**Architecture:** `DrawToolbar.tsx`에 `mobileLayout?: boolean` prop을 추가해 `LayerPanel`의 `hideModeToggle`/`showFrameThumbnails`와 같은 패턴으로 동작을 바꾼다 — 그리기 카드에 선택 도구를 합류시키고, 편집 카드를 통째로 숨기고, 도구별 하위 옵션을 캔버스 포털 대신 컴포넌트 자신의 JSX 안에 그린다. `Editor.tsx`는 이미 desktop·모바일이 공유하는 `toolPanel` 변수 하나에 `mobileLayout={narrow}`를 추가하고, 모바일 `더보기 > 편집` 목록에 격자·십자선 토글과 지우기·반전·회전·정렬 행을 새로 추가한다(desktop과 같은 상태·콜백 재사용).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4 (기존 스택 그대로, 새 의존성 없음).

**Spec:** `docs/superpowers/specs/2026-09-26-nemo-nemo-beam-mobile-toolbar-design.md`

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 각 태스크는 `npx tsc --noEmit -p apps/services/tsconfig.json`, `npm run lint --workspace services`, 브라우저 수동 확인(DevTools 기기 에뮬레이션 390px, 데스크톱 회귀는 1280px)으로 검증한다. 전부 리포 루트(`/Users/seyeon/Documents/github_projects/interactive-portfolio`)에서 실행한다.
- 대상 앱: `apps/services/components/works/5_PixelArtMaker/`, dev 서버는 `npm run dev:services`(포트 3100), 접근 경로 `http://localhost:3100/nemo-nemo-beam`.
- desktop 폭(≥ 820px, `NARROW_BREAKPOINT`)에서 `DrawToolbar`의 동작·레이아웃은 이 작업 전체에서 **한 픽셀도 바뀌면 안 된다** — `mobileLayout`이 `undefined`/`false`일 때 지금과 100% 동일해야 한다.
- 커밋 메시지는 한국어, 이 리포의 기존 스타일(`feat : ...`, `refactor : ...` 등 접두사 + 한국어 설명)을 따른다.
- 파일 경로/줄 번호는 이 계획을 쓴 시점 기준이다 — 실제 줄이 어긋나 있으면 주변 코드(인용된 텍스트)로 정확한 위치를 다시 찾는다.

---

## Task 1: `DrawToolbar.tsx`에 `mobileLayout` 모드 추가

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx`

**Interfaces:**
- Consumes: 없음(기존 파일 내부 재구성).
- Produces: `export default function DrawToolbar(props: { ...기존 props, mobileLayout?: boolean })` — Task 2가 `mobileLayout={narrow}`로 넘긴다. `export function SegmentedControl({ label, value, onChange }: { label: string; value: LayerScope; onChange: (v: LayerScope) => void })` — Task 2가 모바일 편집 목록의 대상 레이어 선택 버튼에 재사용한다(`label=""`로 넘기면 라벨·도움말 아이콘 없이 버튼 3개만 그린다).

- [ ] **Step 1: `SegmentedControl`을 export하고 빈 라벨을 지원하도록 수정**

`DrawToolbar.tsx`에서 이 블록을 찾는다(122행 근처):

```tsx
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
      <span className="flex shrink-0 items-center gap-1">
        {label}
        <HelpTip text={HELP.layerScope} />
      </span>
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
```

`function SegmentedControl(` 앞에 `export`를 붙이고, 라벨이 빈 문자열이면 라벨+도움말 `<span>`을 아예 렌더링하지 않도록 바꾼다(모바일 편집 목록에서는 행 자체가 이미 "반전(좌우)" 같은 라벨을 갖고 있어 중복을 피해야 한다):

```tsx
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
```

기존 두 사용처(`<SegmentedControl label="대상 레이어" .../>`, 샘플 스코프·이동 스코프)는 `label`이 항상 채워져 있으므로 동작이 바뀌지 않는다.

- [ ] **Step 2: `mobileLayout` prop 추가**

`export default function DrawToolbar({` 로 시작하는 props 구조분해(368행 근처)에서, `compact,` 다음 줄에 `mobileLayout,`을 추가한다:

```tsx
  secondaryPortalTarget,
  compact,
  mobileLayout,
}: {
```

타입 쪽(`compact: boolean;` 바로 다음 줄, 467행 근처)에도 추가한다:

```tsx
  // 편집기 폭이 TOOLBAR_COMPACT_WIDTH보다 좁은지 — ...
  compact: boolean;
  // 모바일 셸("도구" 팝오버) 전용 — true면: (1) 그리기 카드에 선택 도구
  // 4개(선택·올가미·이동·자동선택)가 합류해 별도 "선택·조작" 카드가
  // 사라진다, (2) "편집" 카드(격자·십자선·지우기·반전·회전·정렬)를
  // 렌더링하지 않는다(Editor.tsx가 그 값들을 더보기>편집 목록에 직접
  // 그린다), (3) 도구별 하위 옵션(secondarySections)을 캔버스 포털이
  // 아니라 이 컴포넌트 안에 바로 그린다. desktop은 이 prop이 없으니
  // (undefined) 지금과 완전히 동일하게 동작한다.
  mobileLayout?: boolean;
}) {
```

- [ ] **Step 3: 그리기 카드에 표시할 도구 목록을 `mobileLayout`에 따라 바꾸기**

`const [showMoreDrawTools, setShowMoreDrawTools] = useState(false);` 바로 아래(478행 근처)에 추가:

```tsx
  // mobileLayout이면 "선택·조작" 카드(SELECT_TOOLS)를 별도로 렌더링하지
  // 않고 그리기 카드의 같은 줄에 합류시킨다 — desktop은 지금처럼 분리된
  // 카드를 유지한다.
  const drawCardTools = mobileLayout
    ? [...PRIMARY_DRAW_TOOLS, ...SELECT_TOOLS]
    : PRIMARY_DRAW_TOOLS;
```

- [ ] **Step 4: `secondarySections`를 포털 대신 바로 쓸 수 있는 노드로도 준비**

`return (` (714행 근처) 바로 위, `secondarySections` 배열을 다 채운 다음 줄에 추가:

```tsx
  // desktop은 이 내용을 createPortal로 캔버스 하단에 보내고, mobileLayout은
  // 이 컴포넌트 자신의 JSX 안(도구 행 바로 아래)에 그대로 그린다 — 내용은
  // 완전히 동일하고 위치만 다르므로 노드 자체는 한 번만 만든다.
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
```

- [ ] **Step 5: `return` 블록 재구성**

지금 `return (`부터 파일 끝(`893`행)까지는 이렇다:

```tsx
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

        {/* 실행취소·격자·지우기는 항상 보이고, ... */}
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
        createPortal(
          <div className="pointer-events-auto flex flex-wrap items-end justify-center gap-3">
            {secondarySections.map(({ key, node }) => (
              <div
                key={key}
                className={`flex flex-col gap-1.5 p-2 ${FLOATING_PANEL}`}
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
```

이걸 아래 내용으로 바꾼다. **바뀌는 부분에 주석을 달아뒀다 — 그 외(그리기 카드 안쪽 `ToolButton` 매핑, "편집" 카드 내부, `TransformMoreButtons` 호출부)는 위 원본과 한 글자도 다르지 않게 그대로 옮긴다:**

```tsx
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
              {/* 바뀐 부분: PRIMARY_DRAW_TOOLS.map(...) → drawCardTools.map(...) */}
              {drawCardTools.map(({ tool: t, icon, label, key }) => (
                <ToolButton
                  key={t}
                  active={tool === t}
                  onClick={() => onToolChange(t)}
                  title={`${label} (${key})`}
                  icon={icon}
                />
              ))}
              {/* 바뀐 부분: !compact → !compact && !mobileLayout */}
              {!compact &&
                !mobileLayout &&
                COLLAPSIBLE_DRAW_TOOLS.map(({ tool: t, icon, label, key }) => (
                  <ToolButton
                    key={t}
                    active={tool === t}
                    onClick={() => onToolChange(t)}
                    title={`${label} (${key})`}
                    icon={icon}
                  />
                ))}
              {/* 바뀐 부분: compact → compact || mobileLayout (아래 두 곳 모두) */}
              {(compact || mobileLayout) && (
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
          {(compact || mobileLayout) && showMoreDrawTools && (
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

        {/* 바뀐 부분: 전체를 {!mobileLayout && (...)}로 감쌈 */}
        {!mobileLayout && (
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
        )}

        {/* 바뀐 부분: 전체를 {!mobileLayout && (...)}로 감쌈 — 안쪽은
            원본 "편집" 카드 그대로(실행취소·다시실행·격자·십자선·
            ScopedActionButton 지우기·더보기 버튼·TransformMoreButtons) */}
        {!mobileLayout && (
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
        )}
      </div>

      {/* 바뀐 부분: mobileLayout이면 포털 대신 바로 렌더링 */}
      {mobileLayout
        ? secondarySectionsNode
        : secondarySections.length > 0 &&
          secondaryPortalTarget &&
          createPortal(secondarySectionsNode, secondaryPortalTarget)}
    </div>
  );
}
```

- [ ] **Step 6: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

`mobileLayout`을 아직 아무도 `true`로 넘기지 않으므로(Task 2에서 연결) 브라우저 확인은 desktop 회귀만 가능하다.

- [ ] **Step 7: 브라우저 회귀 확인(데스크톱 폭)**

`npm run dev:services` 실행 후 `http://localhost:3100/nemo-nemo-beam`을 1280px 폭에서 연다. 편집창을 열어 도구바가 기존과 완전히 동일하게 보이는지(그리기·선택·조작·편집 세 카드, 도구 선택 시 캔버스 하단에 하위 옵션이 뜨는지) 확인한다 — `mobileLayout`이 `undefined`이므로 Step 5에서 추가한 모든 조건이 원래 동작으로 되돌아가야 한다.

- [ ] **Step 8: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 DrawToolbar에 모바일 전용 레이아웃(mobileLayout) 추가

그리기 카드에 선택 도구를 합류시키고, 편집 카드를 숨기고, 도구별
하위 옵션을 캔버스 포털 대신 컴포넌트 자신 안에 그리는 mobileLayout
모드를 추가했다. mobileLayout이 없으면(desktop) 기존과 동일하다.
SegmentedControl은 빈 라벨을 지원하도록 고쳐 export했다(모바일
편집 목록에서 라벨 중복 없이 버튼 3개만 재사용하기 위함 — 실제
사용은 다음 태스크에서).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 2: `Editor.tsx` 연결 — `mobileLayout` 전달 + `더보기 > 편집` 확장

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `DrawToolbar`의 `mobileLayout` prop, `SegmentedControl`(Task 1에서 export됨, `{ label, value, onChange }`).
- Produces: 없음(이 계획의 마지막 태스크).

- [ ] **Step 1: import 추가**

파일 상단 `lucide-react` import(51행 근처, `Image as ImageIcon`으로 시작하는 블록)에 아이콘을 추가한다:

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

`DrawToolbar` import 바로 아래에 `SegmentedControl`을 함께 가져오고, `Switch` 컴포넌트도 새로 import한다:

```tsx
import DrawToolbar, { SegmentedControl } from "./DrawToolbar";
```

(정확한 기존 `DrawToolbar` import 줄을 grep으로 찾아 그 줄만 위처럼 바꾼다 — 다른 import 순서는 건드리지 않는다.)

```tsx
import Switch from "./Switch";
```

(적당한 다른 `import ... from "./..."` 줄 옆에 알파벳 순서 등 기존 관례에 맞춰 추가한다.)

- [ ] **Step 2: `toolPanel`에 `mobileLayout`·`compact` 연결**

`const toolPanel = (` 블록(2802행 근처) 안의 마지막 두 prop을 찾는다:

```tsx
            secondaryPortalTarget={secondaryToolbarPortal}
            compact={toolbarCompact}
          />
  );
```

아래처럼 바꾼다:

```tsx
            secondaryPortalTarget={secondaryToolbarPortal}
            compact={toolbarCompact || narrow}
            mobileLayout={narrow}
          />
  );
```

- [ ] **Step 3: `mobileMoreItems`의 "편집" 항목에 격자·십자선·지우기·반전·회전·정렬 추가**

`mobileMoreItems` 배열(3081행 근처)에서 `id: "edit"` 항목을 찾는다:

```tsx
    {
      id: "edit",
      label: "편집",
      kind: "detail",
      content: () => (
        <div className="flex flex-col divide-y divide-gray-100">
          <button onClick={() => selection.copy(history.present, doc.width)} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">복사</button>
          <button onClick={() => setResizingCanvas(true)} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">캔버스 크기 수정</button>
          <button onClick={handlePaste} disabled={activeTabIndex < 0 || !selection.clipboard} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">붙여넣기</button>
        </div>
      ),
    },
```

`content`의 `<div>` 안, 기존 세 버튼 뒤에 아래 내용을 추가한다(세 버튼 자체는 그대로 둔다):

```tsx
    {
      id: "edit",
      label: "편집",
      kind: "detail",
      content: () => (
        <div className="flex flex-col divide-y divide-gray-100">
          <button onClick={() => selection.copy(history.present, doc.width)} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">복사</button>
          <button onClick={() => setResizingCanvas(true)} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">캔버스 크기 수정</button>
          <button onClick={handlePaste} disabled={activeTabIndex < 0 || !selection.clipboard} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">붙여넣기</button>
          <label className="flex items-center justify-between gap-2 py-3 text-sm text-gray-800">
            <span className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-gray-500" />
              격자 표시
            </span>
            <Switch checked={showGrid} onClick={() => setShowGrid((g) => !g)} />
          </label>
          <label className="flex items-center justify-between gap-2 py-3 text-sm text-gray-800">
            <span className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-gray-500" />
              십자선
            </span>
            <Switch checked={showCrosshair} onClick={() => setShowCrosshair((c) => !c)} />
          </label>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={handleClearCanvas}
              disabled={
                transformScopes.clear === "reference" && !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-red-500 disabled:text-gray-300"
            >
              <Loader className="h-4 w-4" />
              지우기
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.clear}
              onChange={(s) => handleTransformScopeChange("clear", s)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={handleFlipHorizontal}
              disabled={
                transformScopes.flipH === "reference" && !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-gray-800 disabled:text-gray-300"
            >
              <FlipHorizontal2 className="h-4 w-4 text-gray-500" />
              반전(좌우)
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.flipH}
              onChange={(s) => handleTransformScopeChange("flipH", s)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={handleFlipVertical}
              disabled={
                transformScopes.flipV === "reference" && !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-gray-800 disabled:text-gray-300"
            >
              <FlipVertical2 className="h-4 w-4 text-gray-500" />
              반전(상하)
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.flipV}
              onChange={(s) => handleTransformScopeChange("flipV", s)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={() => handleRotate90(-1)}
              disabled={
                transformScopes.rotateCcw === "reference" &&
                !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-gray-800 disabled:text-gray-300"
            >
              <RotateCcw className="h-4 w-4 text-gray-500" />
              회전(반시계)
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.rotateCcw}
              onChange={(s) => handleTransformScopeChange("rotateCcw", s)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={() => handleRotate90(1)}
              disabled={
                transformScopes.rotateCw === "reference" && !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-gray-800 disabled:text-gray-300"
            >
              <RotateCw className="h-4 w-4 text-gray-500" />
              회전(시계)
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.rotateCw}
              onChange={(s) => handleTransformScopeChange("rotateCw", s)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              onClick={handleAlignLayers}
              disabled={
                transformScopes.align === "reference" && !hasReferenceLayers
              }
              className="flex items-center gap-2 text-sm text-gray-800 disabled:text-gray-300"
            >
              <Focus className="h-4 w-4 text-gray-500" />
              정렬
            </button>
            <SegmentedControl
              label=""
              value={transformScopes.align}
              onChange={(s) => handleTransformScopeChange("align", s)}
            />
          </div>
        </div>
      ),
    },
```

`showGrid`/`setShowGrid`/`showCrosshair`/`setShowCrosshair`/`handleClearCanvas`/`handleFlipHorizontal`/`handleFlipVertical`/`handleRotate90`/`handleAlignLayers`/`transformScopes`/`handleTransformScopeChange`/`hasReferenceLayers`는 전부 이미 `Editor.tsx`에 있는 이름 그대로다(desktop의 `toolPanel`이 `DrawToolbar`에 넘기는 것과 동일한 값) — 새로 만들지 않는다.

- [ ] **Step 4: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

타입 에러가 나면 대부분 import 누락이나 괄호 짝이 안 맞는 경우다 — 에러 메시지의 파일:줄을 보고 고친다.

- [ ] **Step 5: 브라우저 확인 — 모바일 폭(390px)**

`http://localhost:3100/nemo-nemo-beam`, DevTools 기기 에뮬레이션 390px:

1. "도구" 팝오버를 열어 펜슬·지우개·채우기·선택·올가미·이동·자동선택 7개 + 더보기가 한 줄에 보이는지.
2. 더보기를 눌러 직선·사각형·원·텍스트·그라데이션 5개가 펼쳐지고, 하나를 고르면 도구가 바뀌며 더보기 패널이 닫히는지.
3. 펜슬을 고르면 그 바로 아래에 브러시 크기(1·2·3·4) 옵션이 뜨는지, 사각형을 고르면 채우기/그라데이션 옵션이 뜨는지, 선택 도구를 고르면 선택 모드(새 선택/추가/제외)+전역 동일색 옵션이 뜨는지 — 도구를 바꿀 때마다 이 영역 내용이 즉시 바뀌는지.
4. 더보기 > 편집을 열어: 격자 표시·십자선 토글이 실제 캔버스에 반영되는지, 지우기·반전(좌우)·반전(상하)·회전(반시계)·회전(시계)·정렬이 눌렀을 때 실제로 실행되는지.
5. 레이어 팝오버에서 레이어 하나를 전구 아이콘으로 "참조 레이어"로 지정한 뒤, 더보기 > 편집의 반전(좌우) 행에서 "참조"를 선택하면 그 레이어만 반전되는지(현재/전체 선택 시에는 각각 활성 레이어/보이는 전체 레이어가 반전되는지). 참조 레이어를 지정하지 않은 상태로 "참조"를 고르면 실행 버튼이 비활성화되는지.

- [ ] **Step 6: 브라우저 회귀 확인 — 데스크톱 폭(1280px)**

같은 페이지를 1280px로 열어 도구바가 이 작업 이전과 완전히 동일하게 동작하는지(그리기·선택·조작·편집 세 카드, 캔버스 하단 포털에 하위 옵션) 확인한다 — `mobileLayout={narrow}`가 desktop 폭에서는 `false`이므로 Task 1의 모든 조건이 원래 경로로 돌아가야 한다.

- [ ] **Step 7: 폭 전환 확인**

편집창을 열어둔 채 DevTools 폭을 820px 위아래로 오가며 셸이 정상 전환되는지(에러 없음, "도구" 팝오버가 열려 있지 않은 상태에서 확인) 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/Editor.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 모바일 도구바에 mobileLayout 연결 및 더보기>편집 확장

toolPanel에 mobileLayout={narrow}를 넘기고, 모바일 더보기>편집 목록에
격자 표시·십자선 토글과 지우기·반전·회전·정렬(대상 레이어 선택 포함)을
추가했다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Self-Review Notes

- **스펙 커버리지:** 주요 도구 7개+더보기(Task 1 Step 5), 하위 옵션 인라인 표시(Task 1 Step 4-5), 편집 카드 제거+더보기>편집 통합(Task 1 Step 5 + Task 2 Step 3), `mobileLayout` prop 설계(Task 1 Step 2) — 스펙의 모든 섹션에 대응하는 태스크가 있다.
- **desktop 회귀 안전장치:** Task 1의 모든 분기(`drawCardTools`, `!compact && !mobileLayout`, `compact || mobileLayout`, `!mobileLayout && (...)`, `mobileLayout ? ... : createPortal(...)`)가 `mobileLayout`이 `undefined`일 때 원래 조건(`compact`만 보던 것)과 동일하게 평가되는지 각 스텝에서 확인 가능하도록 원본 코드를 함께 인용해뒀다.
- **타입 일관성:** `SegmentedControl`의 `label: string`(옵셔널 아님, 빈 문자열 `""`을 넘기는 방식) — Task 1에서 정의한 시그니처와 Task 2에서 호출하는 6곳(지우기·반전×2·회전×2·정렬) 모두 `label=""`로 일치한다. `mobileLayout?: boolean`도 Task 1 정의와 Task 2의 `mobileLayout={narrow}` 호출이 일치한다(`narrow`는 `Editor.tsx`에 이미 존재하는 `boolean`).
- **플레이스홀더 없음:** 모든 코드 스텝이 실제 JSX·핸들러 이름을 그대로 썼다. Task 1 Step 5의 "원본과 한 글자도 다르지 않게 그대로 옮긴다"는 지시는 실행자가 파일에서 해당 블록을 그대로 이동하면 되는 명시적 지시이지 자리표시자가 아니다(원본 전체 텍스트가 스텝 안에 그대로 인용돼 있어 무엇을 옮기는지 모호하지 않다).
