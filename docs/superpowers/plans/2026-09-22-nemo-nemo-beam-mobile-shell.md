# 네모네모빔 모바일 셸(Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 편집창이 좁은 화면(< 820px)에서 열릴 때, 데스크톱 letterbox 창 대신 진짜 전체화면 + 캔버스 최대화 + 하단 독과 그 위 앵커 팝오버로 도구·색상·레이어·나머지 기능에 접근하는 모바일 셸을 만든다(개정 2026-09-24: 바텀시트·탭 목록 시트 방식에서 하단 독+`FLOATING_PANEL` 앵커 팝오버 방식으로 전환, 자세한 배경은 스펙 참고).

**Architecture:** `PixelArtMaker.tsx`에서 모바일 폭이면 편집창 wrapper의 letterbox 크기 제약을 없앤다. `Editor.tsx`는 루트 `<div ref={rootRef}>`는 그대로 유지한 채(폭 감지 `ResizeObserver`가 이 노드를 계속 관찰해야 하므로), 그 안의 콘텐츠만 `narrow` 여부로 통째로 갈라 새 `MobileEditorShell` 컴포넌트를 렌더한다. 도구바·색상환·레이어 패널은 지금 인라인/중복 선언된 것을 top-level 변수로 뽑아 데스크톱과 모바일 셸이 공유한다. 모바일 셸은 하단 독 아이콘을 누르면 이 편집기에 이미 있는 `FLOATING_PANEL` 플로팅 패널 패턴(narrow 아이콘열이 이미 씀)을 그대로 재사용해 그 아이콘 바로 위에 작은 팝오버만 띄운다 — 화면을 덮는 바텀시트나 편집기 내 탭 전환 UI는 만들지 않는다(여러 파일 전환은 갤러리 화면으로 나가서 처리). 다이얼로그·모달(새 캔버스·열기·도움말·크기수정·탭 닫기 확인·나가기 확인·알림)은 이미 조건부 렌더 위치가 두 분기 바깥(형제)이라 손대지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (기존 스택 그대로, 새 의존성 없음).

**Spec:** `docs/superpowers/specs/2026-09-18-nemo-nemo-beam-mobile-shell-design.md`

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다 — 각 태스크의 검증은 `npx tsc --noEmit -p apps/services/tsconfig.json`, `npm run lint --workspace services`, 그리고 필요한 경우 브라우저 수동 확인(DevTools 기기 에뮬레이션, 폭 390px)으로 한다. 전부 리포 루트(`/Users/seyeon/Documents/github_projects/interactive-portfolio`)에서 실행한다.
- 대상 앱은 `apps/services/components/works/5_PixelArtMaker/`(라우트: `apps/services/app/nemo-nemo-beam/page.tsx`) — dev 서버는 `npm run dev:services`(포트 3100), 이 파일 경로 접근은 `http://localhost:3100/nemo-nemo-beam`.
- `narrow`(< `NARROW_BREAKPOINT` = 820px, `types.ts`)보다 넓은 데스크톱 레이아웃은 이 작업 전체에서 **동작이 한 픽셀도 바뀌면 안 된다** — 매 태스크마다 데스크톱 폭(예: 1280px)에서 회귀 여부를 확인한다.
- 커밋 메시지는 한국어, 이 리포의 기존 커밋 스타일(`fix : ...`, `feat : ...` 등 접두사 + 한국어 설명)을 따른다.
- 파일 경로/라인 번호는 이 계획을 쓴 시점 기준이다 — 실제 라인이 몇 줄 어긋나 있으면 주변 코드(인용된 텍스트)로 정확한 위치를 다시 찾는다.

---

## Task 1: 모바일 폭에서 편집창을 진짜 전체화면으로

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/PixelArtMaker.tsx`

**Interfaces:**
- Consumes: `NARROW_BREAKPOINT`(`./types`에서 이미 export됨, 값 820).
- Produces: 없음(이 태스크는 리프 — 이후 태스크가 이 값을 쓰지 않는다).

- [ ] **Step 1: 코드 확인**

`PixelArtMaker.tsx`를 열어 아래 두 지점을 확인한다(지금 이 계획을 쓴 시점 기준 줄 번호):

```tsx
// 31행 근처
export default function PixelArtMaker() {
  const [screen, setScreen] = useState<Screen>({ view: "desktop" });
  ...
  const [fittedSize, setFittedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
```

```tsx
// 94행 근처 — return 시작
  return (
    <div
      className={`pam-app ${monaFont.className} relative h-full w-full overflow-hidden`}
    >
      ...
      {screen.view === "editor" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="pointer-events-auto h-full w-full"
            style={
              fittedSize
                ? { width: fittedSize.width, height: fittedSize.height }
                : undefined
            }
          >
            <Editor ... />
          </div>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 2: `isMobile` 상태와 감지 이펙트 추가**

`PixelArtMaker.tsx` 상단 import에 추가:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { NARROW_BREAKPOINT } from "./types";
```

(`useEffect`/`useRef`는 이미 import돼 있을 수 있다 — 없는 것만 추가한다.)

`export default function PixelArtMaker() {` 바로 아래, `const [screen, ...]` 위나 아래 아무 곳에 추가:

```tsx
  const appRef = useRef<HTMLDivElement>(null);
  // narrow 폭에서는 편집창이 데스크탑 배경화면 비율(fittedSize)을 무시하고
  // 뷰포트를 그대로 채운다 — Editor.tsx가 이 폭을 기준으로 모바일 셸을
  // 켜므로, 편집창 자체도 letterbox 없이 그 폭 그대로 받아야 앞뒤가 맞는다.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const update = () => setIsMobile(el.clientWidth < NARROW_BREAKPOINT);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
```

- [ ] **Step 3: 루트 div에 ref 연결, wrapper style 조건 수정**

```tsx
    <div
      ref={appRef}
      className={`pam-app ${monaFont.className} relative h-full w-full overflow-hidden`}
    >
```

그리고 편집창 wrapper의 `style`을:

```tsx
            style={
              !isMobile && fittedSize
                ? { width: fittedSize.width, height: fittedSize.height }
                : undefined
            }
```

- [ ] **Step 4: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

둘 다 에러 없어야 한다(기존에 있던 `<img>` 관련 warning 8개는 이 변경과 무관하니 그대로 있어도 된다).

- [ ] **Step 5: 브라우저 확인**

`npm run dev:services` 실행 후(이미 떠 있으면 생략) `http://localhost:3100/nemo-nemo-beam`을 연다. 편집창을 하나 연다(새 캔버스나 기존 작품). DevTools 기기 툴바로 폭을 390px로 바꾼다 — 편집창이 letterbox 여백 없이 화면을 꽉 채워야 한다(이 시점엔 내부 레이아웃은 아직 데스크톱 그대로라 좁은 화면에 욱여넣은 것처럼 보이는 게 정상 — Task 4가 끝나야 내부도 바뀐다). 폭을 다시 1280px로 늘리면 원래의 letterbox 창으로 돌아와야 한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/PixelArtMaker.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 편집창이 모바일 폭에서 letterbox 없이 전체화면이 되도록

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 2 (개정 2026-09-24): `BottomSheet.tsx` 삭제 — 대체 컴포넌트 없음

> 원래 Task 2는 공용 `BottomSheet`(바텀시트) 컴포넌트를 만들고 커밋(`e8d26ed`)까지 마쳤으나, 스펙이 "웹사이트/모달 느낌" 피드백에 따라 하단 독 + `FLOATING_PANEL` 앵커 팝오버 방식(Option F)으로 전면 개정되며 이 컴포넌트 자체가 필요 없어졌다. 대체 컴포넌트를 만들지 않는다 — Task 4가 이 편집기에 이미 있는 `FLOATING_PANEL`(`./panelStyles`) + `absolute bottom-full` 패턴(`Editor.tsx:3399`)을 그대로 재사용한다. 자세한 배경은 스펙 문서의 "개정 이력(2026-09-24)" 참고.

**Files:**
- Delete: `apps/services/components/works/5_PixelArtMaker/BottomSheet.tsx`

**Interfaces:**
- Consumes: 없음.
- Produces: 없음(삭제만 한다 — Task 4는 이 컴포넌트를 쓰지 않는다).

- [ ] **Step 1: 참조 확인**

```bash
grep -rn "BottomSheet" apps/services/components/works/5_PixelArtMaker/
```

`BottomSheet.tsx` 자기 자신 말고 다른 파일에서 import하는 곳이 없어야 한다(Task 4의 `MobileEditorShell.tsx`는 아직 존재하지 않거나, 존재하더라도 이 계획의 새 버전은 `BottomSheet`를 import하지 않는다). 참조가 남아 있으면 먼저 그 참조부터 정리한다.

- [ ] **Step 2: 파일 삭제**

```bash
rm apps/services/components/works/5_PixelArtMaker/BottomSheet.tsx
```

- [ ] **Step 3: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

- [ ] **Step 4: 커밋**

```bash
git add -A apps/services/components/works/5_PixelArtMaker/BottomSheet.tsx
git commit -m "$(cat <<'EOF'
refactor : 네모네모빔 모바일 셸 설계 개정으로 BottomSheet 컴포넌트 제거

하단 독 + FLOATING_PANEL 앵커 팝오버 방식(Option F)으로 전환하며
이 편집기에 이미 있는 플로팅 패널 패턴을 재사용하게 되어 더 이상
필요 없어짐(대체 컴포넌트 없음).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 3: 도구바·색상환·레이어·캔버스를 top-level 변수로 정리(순수 리팩터, 동작 무변화)

이 태스크는 데스크톱 동작을 조금도 바꾸지 않고, `DrawToolbar`/`ColorWheel`을 top-level 변수로 빼고(지금은 1회성 인라인), `LayerPanel`의 완전히 동일한 두 인스턴스(wide 사이드바용·narrow 아이콘열용)를 하나로 합치고, 캔버스 뷰포트 블록을 top-level 변수로 뺀다. Task 4가 이 변수들을 `MobileEditorShell`에 그대로 넘긴다.

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: 없음(기존 코드 재배치).
- Produces: top-level `const`(모두 `return (` 직전, 지금 `importPanel`/`exportPanel`이 있는 자리 근처): `toolPanel: ReactNode`, `colorPanel: ReactNode`, `layerPanel: ReactNode`, `canvasArea: ReactNode`. Task 4는 이 네 변수 + 이미 있던 `importPanel`/`exportPanel`을 `MobileEditorShell`에 넘긴다.

- [ ] **Step 1: `toolPanel` 변수로 추출**

`Editor.tsx`에서 `<DrawToolbar` 로 시작하는 블록을 찾는다(지금 기준 3046행 근처, 아래 내용과 정확히 일치하는지 확인):

```tsx
          <DrawToolbar
            tool={tool}
            onToolChange={setTool}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            filledShapes={filledShapes}
            onToggleFilledShapes={() => setFilledShapes((f) => !f)}
            shapeGradientFill={shapeGradientFill}
            onToggleShapeGradientFill={() => setShapeGradientFill((g) => !g)}
            gradientSteps={gradientSteps}
            onGradientStepsChange={setGradientSteps}
            gradientAngleDeg={gradientAngleDeg}
            onGradientAngleChange={setGradientAngleDeg}
            wandGlobal={wandGlobal}
            onToggleWandGlobal={() => setWandGlobal((g) => !g)}
            hasSelection={!!selection.mask && selection.mask.size > 0}
            onFillSelection={handleFillSelection}
            canvasBgColor={canvasBgColor}
            selectMode={selectMode}
            onSelectModeChange={setSelectMode}
            onClearSelection={() => selection.setMask(null)}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            showCrosshair={showCrosshair}
            onToggleCrosshair={() => setShowCrosshair((c) => !c)}
            onClearCanvas={handleClearCanvas}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onRotate90={handleRotate90}
            onAlignContent={handleAlignLayers}
            hasReferenceLayers={hasReferenceLayers}
            sampleScope={activeSampleScope}
            onSampleScopeChange={handleSampleScopeChange}
            transformScopes={transformScopes}
            onTransformScopeChange={handleTransformScopeChange}
            secondaryPortalTarget={secondaryToolbarPortal}
            compact={toolbarCompact}
          />
```

이 블록을 **그 자리에서 제거**하고, `const exportPanel = (...)` 선언 바로 뒤(`return (` 바로 앞)에 아래처럼 변수로 추가한다:

```tsx
  // 도구바 — wide/narrow 어디서든 인스턴스가 하나뿐이라 지금까지는 그 자리에
  // 인라인으로 있었다. 모바일 셸의 "도구" 시트도 같은 노드를 써야 해서
  // top-level 변수로 뺀다.
  const toolPanel = (
    <DrawToolbar
      tool={tool}
      onToolChange={setTool}
      brushSize={brushSize}
      onBrushSizeChange={setBrushSize}
      filledShapes={filledShapes}
      onToggleFilledShapes={() => setFilledShapes((f) => !f)}
      shapeGradientFill={shapeGradientFill}
      onToggleShapeGradientFill={() => setShapeGradientFill((g) => !g)}
      gradientSteps={gradientSteps}
      onGradientStepsChange={setGradientSteps}
      gradientAngleDeg={gradientAngleDeg}
      onGradientAngleChange={setGradientAngleDeg}
      wandGlobal={wandGlobal}
      onToggleWandGlobal={() => setWandGlobal((g) => !g)}
      hasSelection={!!selection.mask && selection.mask.size > 0}
      onFillSelection={handleFillSelection}
      canvasBgColor={canvasBgColor}
      selectMode={selectMode}
      onSelectModeChange={setSelectMode}
      onClearSelection={() => selection.setMask(null)}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={handleUndo}
      onRedo={handleRedo}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid((g) => !g)}
      showCrosshair={showCrosshair}
      onToggleCrosshair={() => setShowCrosshair((c) => !c)}
      onClearCanvas={handleClearCanvas}
      onFlipHorizontal={handleFlipHorizontal}
      onFlipVertical={handleFlipVertical}
      onRotate90={handleRotate90}
      onAlignContent={handleAlignLayers}
      hasReferenceLayers={hasReferenceLayers}
      sampleScope={activeSampleScope}
      onSampleScopeChange={handleSampleScopeChange}
      transformScopes={transformScopes}
      onTransformScopeChange={handleTransformScopeChange}
      secondaryPortalTarget={secondaryToolbarPortal}
      compact={toolbarCompact}
    />
  );
```

그리고 원래 자리에는 `{toolPanel}`만 남긴다.

- [ ] **Step 2: `colorPanel` 변수로 추출**

같은 방식으로 `<ColorWheel` 블록(지금 기준 3107행 근처):

```tsx
                <ColorWheel
                  favorites={doc.palette}
                  activeColorHex={activeColorHex}
                  secondaryColorHex={secondaryColorHex}
                  onChangeActiveColor={setActiveColorHex}
                  onChangeSecondaryColor={setSecondaryColorHex}
                  onAddFavorite={handleAddFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                  onEditFavorite={handleEditFavorite}
                  onReplaceFavorites={handleReplaceFavorites}
                  tool={tool}
                  onToolChange={setTool}
                  canvasBgColor={canvasBgColor}
                  onChangeCanvasBgColor={setCanvasBgColor}
                  boundsRef={rootRef}
                />
```

를 제거하고 `toolPanel` 바로 아래에 변수로 추가:

```tsx
  const colorPanel = (
    <ColorWheel
      favorites={doc.palette}
      activeColorHex={activeColorHex}
      secondaryColorHex={secondaryColorHex}
      onChangeActiveColor={setActiveColorHex}
      onChangeSecondaryColor={setSecondaryColorHex}
      onAddFavorite={handleAddFavorite}
      onRemoveFavorite={handleRemoveFavorite}
      onEditFavorite={handleEditFavorite}
      onReplaceFavorites={handleReplaceFavorites}
      tool={tool}
      onToolChange={setTool}
      canvasBgColor={canvasBgColor}
      onChangeCanvasBgColor={setCanvasBgColor}
      boundsRef={rootRef}
    />
  );
```

원래 자리엔 `{colorPanel}`만 남긴다.

- [ ] **Step 3: `layerPanel` 중복 제거**

`Editor.tsx`에 지금 완전히 동일한 `<LayerPanel ... 33개 prop .../>` 인스턴스가 **두 곳**(wide 사이드바 — `!narrow` 분기 안, narrow 아이콘열 — `const layerPanel = (...)`로 이미 변수화돼 있는 곳) 있다. 하나로 합친다.

1. narrow 아이콘열의 `const layerPanel = (<LayerPanel .../>);` 선언 전체를 그 자리에서 제거한다.
2. wide 사이드바의 인라인 `<LayerPanel .../>`도 제거한다.
3. `colorPanel` 바로 아래(top-level)에 그 내용 그대로 `const layerPanel = (...)`를 새로 선언한다:

```tsx
  // wide 사이드바·narrow 아이콘열 두 곳에 완전히 같은 props로 중복
  // 선언돼 있던 걸 하나로 합친다 — 모바일 셸의 "레이어" 시트도 같은
  // 노드를 쓴다.
  const layerPanel = (
    <LayerPanel
      layers={history.presentLayers}
      activeLayerId={history.activeLayerId}
      width={doc.width}
      height={doc.height}
      onSelect={handleSelectLayer}
      onAdd={handleAddLayer}
      onDuplicate={handleDuplicateLayer}
      onDelete={handleDeleteLayer}
      onMergeDown={handleMergeDown}
      onMoveUp={(id) => handleMoveLayer(id, 1)}
      onMoveDown={(id) => handleMoveLayer(id, -1)}
      onRename={handleRenameLayer}
      onToggleVisible={handleToggleLayerVisible}
      onToggleLocked={handleToggleLayerLocked}
      referenceLayerIds={referenceLayerIds}
      onToggleReference={handleToggleReference}
      onOpacityChange={handleLayerOpacityChange}
      onOpacityDragEnd={handleOpacityDragEnd}
      onBlendModeChange={handleLayerBlendModeChange}
      onBlendModePreview={handleLayerBlendModePreview}
      onAdjustmentChange={handleLayerAdjustmentChange}
      onAdjustmentDragEnd={handleAdjustmentDragEnd}
      onResetAdjustments={handleResetAdjustments}
      onFlatten={handleFlattenLayers}
      layerMode={layerMode}
      onLayerModeChange={handleLayerModeChange}
      isPlaying={isPlaying}
      onTogglePlay={handleTogglePlay}
      pingPong={pingPong}
      onTogglePingPong={handleTogglePingPong}
      onionSkin={onionSkin}
      onToggleOnionSkin={handleToggleOnionSkin}
      onionSkinOpacity={onionSkinOpacity}
      onOnionSkinOpacityChange={handleOnionSkinOpacityChange}
      onionSkinRange={onionSkinRange}
      onOnionSkinRangeChange={handleOnionSkinRangeChange}
      onFrameDurationChange={handleFrameDurationChange}
    />
  );
```

4. wide 사이드바 자리(`{showPreview && <PreviewPanel .../>}` 바로 아래)엔 `{layerPanel}`만 남긴다.
5. narrow 아이콘열의 `const panelTitle = ...` 계산 로직 바로 아래(원래 `const layerPanel = (...)`가 있던 자리)엔 아무것도 안 남긴다(선언 자체를 지웠으므로) — 그 아래에서 `layerPanel`을 쓰던 `{openFloatingPanel === "layers" ? layerPanel : ...}` 참조는 그대로 둔다(이제 top-level 변수를 가리키게 된다).

- [ ] **Step 4: `canvasArea` 변수로 추출**

`<div className="relative flex flex-1 flex-col overflow-hidden">`로 시작해서(캔버스 뷰포트 + 확대축소 컨트롤 + 참조 레이어 경고 + `FrameFilmstrip`을 담은) 그 짝 `</div>`로 끝나는 블록 전체(지금 기준 3204~3367행, 아래 시작/끝 부분으로 정확한 경계 확인):

```tsx
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div className="relative flex flex-1 overflow-hidden">
                <div
                  ref={canvasViewportRef}
                  ...
```//

...(중략, 그대로)...

```tsx
              {layerMode === "frames" && (
                <FrameFilmstrip
                  layers={history.presentLayers}
                  activeLayerId={history.activeLayerId}
                  width={doc.width}
                  height={doc.height}
                  isPlaying={isPlaying}
                  onSelect={handleSelectLayer}
                  onAdd={handleAddLayer}
                />
              )}
            </div>
```

이 블록 전체를 그 자리에서 제거하고, `layerPanel` 바로 아래에 그대로 옮긴다:

```tsx
  const canvasArea = (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* ...제거한 내용 그대로... */}
    </div>
  );
```

원래 자리엔 `{canvasArea}`만 남긴다. **주의:** 이 블록 안의 JSX는 `canvasViewportRef`/`secondaryToolbarPortal`/`doc`/`history` 등 컴포넌트 스코프 변수를 그대로 참조한다 — top-level 변수로 옮겨도 클로저라 문제없이 접근된다(옮기면서 이름을 바꾸거나 값을 복사하지 않는다).

- [ ] **Step 5: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

- [ ] **Step 6: 브라우저 회귀 확인(데스크톱 폭)**

`http://localhost:3100/nemo-nemo-beam`을 1280px 폭에서 연다. 다음이 리팩터 전과 완전히 동일하게 동작해야 한다:
- 캔버스에 그리기, 도구 전환(연필/지우개/도형 등), 브러시 크기 조절
- 색상환에서 색 선택, 즐겨찾기 추가
- 레이어 추가/삭제/순서변경/투명도, 프레임 모드 전환·재생·필름스트립
- 확대/축소 버튼, 프레임 모드일 때 필름스트립 표시
- 편집창을 다시 820px 미만으로 좁혔다가(narrow 아이콘열) 레이어/불러오기/내보내기 아이콘을 눌러 플로팅 패널이 예전과 똑같이 뜨는지(이 패널들도 지금 top-level 변수를 참조하도록 바뀌었으므로 회귀 확인 필수)

- [ ] **Step 7: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/Editor.tsx
git commit -m "$(cat <<'EOF'
refactor : 네모네모빔 도구바·색상환·레이어·캔버스를 top-level 변수로 정리

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 4 (개정 2026-09-24): `MobileEditorShell` 작성 및 연결 — 하단 독 + 앵커 팝오버

> 원래 Task 4는 Task 2의 `BottomSheet`와 탭 목록 시트를 쓰는 설계였으나, 스펙 개정(Option F)에 따라 전면 재작성한다. 바텀시트 대신 이 편집기에 이미 있는 `FLOATING_PANEL`(`./panelStyles`) + `absolute bottom-full` 앵커링 패턴(`Editor.tsx:3399`, narrow 아이콘열의 이미지 불러오기/내보내기 팝업과 동일한 방식)을 그대로 쓴다. **여러 파일 전환 UI(탭 목록)는 만들지 않는다** — 파일을 바꾸려면 상단 바의 `‹`(`onExit`)로 갤러리(`Desktop.tsx`)로 나간다. 파일명 인라인 편집은 탭 목록과 충돌할 일이 없어졌으므로 상단 바에 그대로 둔다.

**Files:**
- Create: `apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `FLOATING_PANEL`(`./panelStyles`, 기존), `toolPanel`/`colorPanel`/`layerPanel`/`canvasArea`/`importPanel`/`exportPanel`(Task 3 + 기존), `TracingListPanel`(기존, 이미 `Editor.tsx`가 import함).
- Produces: `MobileEditorShell` 컴포넌트(이 계획의 마지막 소비자 — 더 이상 다른 태스크가 이걸 쓰지 않는다).

- [ ] **Step 1: `MobileEditorShell.tsx` 작성**

```tsx
"use client";

import { Layers, Menu, Palette, PenTool, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FLOATING_PANEL } from "./panelStyles";

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
  onRenameFile: (name: string) => void;
  onExit: () => void;
  onSave: () => void;
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canvas: React.ReactNode;
  toolPanel: React.ReactNode;
  colorPanel: React.ReactNode;
  layerPanel: React.ReactNode;
  moreItems: MobileMoreItem[];
  onNewTab: () => void;
  onOpenExisting: () => void;
};

type PopoverKind = "tools" | "color" | "layers" | "more" | null;

export default function MobileEditorShell({
  hasActiveTab,
  fileName,
  onRenameFile,
  onExit,
  onSave,
  saveError,
  showSavedNotice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canvas,
  toolPanel,
  colorPanel,
  layerPanel,
  moreItems,
  onNewTab,
  onOpenExisting,
}: MobileEditorShellProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [moreDetail, setMoreDetail] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpenPopover(null);
    setMoreDetail(null);
  };

  const toggle = (kind: Exclude<PopoverKind, null>) => {
    setOpenPopover((cur) => (cur === kind ? null : kind));
    setMoreDetail(null);
  };

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
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-50 text-center">
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
    );
  }

  const activeMoreItem = moreItems.find((m) => m.id === moreDetail);

  let popoverContent: React.ReactNode = null;
  if (openPopover === "tools") popoverContent = toolPanel;
  else if (openPopover === "color") popoverContent = colorPanel;
  else if (openPopover === "layers") popoverContent = layerPanel;
  else if (openPopover === "more") {
    popoverContent = activeMoreItem ? (
      <div>
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
            className="flex items-center justify-between py-3 text-left text-sm text-gray-800"
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 상단 바 */}
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
        <button
          onClick={onSave}
          title="저장"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="되돌리기"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 disabled:opacity-30"
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="다시실행"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 disabled:opacity-30"
        >
          ↪
        </button>
      </div>

      {/* 캔버스 */}
      <div className="relative min-h-0 flex-1">{canvas}</div>

      {/* 하단 독 + 그 위 팝오버 — Editor.tsx:3399의 FLOATING_PANEL 패턴 그대로 */}
      <div ref={dockRef} className="relative">
        {openPopover && (
          <div
            className={`absolute bottom-full left-2 right-2 z-40 mb-2 flex max-h-[60vh] flex-col overflow-y-auto ${FLOATING_PANEL}`}
          >
            {popoverContent}
          </div>
        )}
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            onClick={() => toggle("tools")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "tools" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <PenTool className="h-5 w-5" />
            도구
          </button>
          <button
            onClick={() => toggle("color")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "color" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Palette className="h-5 w-5" />
            색상
          </button>
          <button
            onClick={() => toggle("layers")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "layers" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Layers className="h-5 w-5" />
            레이어
          </button>
          <button
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

- [ ] **Step 2: 정적 검증(이 파일만)**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

`lucide-react`의 `Layers`/`Menu`/`Palette`/`PenTool`/`Save` 아이콘이 없다는 에러가 나면(이 라이브러리 버전에 따라 이름이 다를 수 있다) `Editor.tsx` 상단 import에서 이미 쓰고 있는 아이콘 이름을 참고해 맞춘다. `FLOATING_PANEL`이 `./panelStyles`에 없다는 에러가 나면 `Editor.tsx` 상단에서 실제 import 경로/이름을 확인한다.

- [ ] **Step 3: `Editor.tsx`에 데이터 준비 + 최상위 분기 연결**

`import`에 추가:

```tsx
import MobileEditorShell, { MobileMoreItem } from "./MobileEditorShell";
```

`canvasArea` 선언(Task 3) 바로 아래, `return (` 바로 위에 아래 내용을 추가한다. 각 핸들러는 이미 파일에 존재하는 것을 그대로 참조한다(새로 만들지 않는다) — 정확한 이름은 아래 표를 참고해 `Editor.tsx`에서 실제로 그 이름으로 존재하는지 grep으로 먼저 확인한다:

| 이 계획에서 쓰는 이름 | 이미 있는 것 |
|---|---|
| 파일 저장 | `handleSave` |
| 다른 이름으로 저장 | `handleSaveAs` |
| 편집기 나가기(더러우면 확인) | `handleExitClick` |
| 실행취소/다시실행 | `handleUndo` / `handleRedo`, `history.canUndo` / `history.canRedo` |
| 새 캔버스 다이얼로그 열기 | `setShowNewCanvasDialog(true)` |
| 열기 다이얼로그 열기 | `setShowOpenDialog(true)` |
| JSON 불러오기 | `jsonFileInputRef.current?.click()` |
| 도움말 열기 | `setShowHelpDialog(true)` |
| 복사 | `selection.copy(history.present, doc.width)` |
| 캔버스 크기 수정 다이얼로그 | `setResizingCanvas(true)` |
| 붙여넣기 | `handlePaste` |
| 레퍼런스 리스트 | `TracingListPanel`(이미 import됨), props는 아래 참고 |
| 파일명 인라인 편집 | `setName` + `setHasMetaEdits(true)`(단, `isWallpaper`면 무시 — 데스크톱 제목표시줄과 동일) |

```tsx
  // 모바일 셸 전용 데이터 — Editor.tsx의 기존 핸들러를 그대로 재사용한다.
  const isWallpaperTab = doc.id === WALLPAPER_ID;

  const mobileMoreItems: MobileMoreItem[] = [
    {
      id: "file",
      label: "파일",
      kind: "detail",
      content: () => (
        <div className="flex flex-col divide-y divide-gray-100">
          <button onClick={() => setShowNewCanvasDialog(true)} className="py-3 text-left text-sm text-gray-800">새로 만들기</button>
          <button onClick={() => setShowOpenDialog(true)} className="py-3 text-left text-sm text-gray-800">열기</button>
          <button onClick={() => jsonFileInputRef.current?.click()} className="py-3 text-left text-sm text-gray-800">JSON 불러오기</button>
          <button onClick={handleSave} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">저장</button>
          <button onClick={handleSaveAs} disabled={activeTabIndex < 0} className="py-3 text-left text-sm text-gray-800 disabled:text-gray-300">다른 이름으로 저장</button>
        </div>
      ),
    },
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
    { id: "import", label: "이미지 불러오기", kind: "detail", content: () => importPanel },
    { id: "export", label: "내보내기", kind: "detail", content: () => exportPanel },
    {
      id: "reference",
      label: "레퍼런스",
      kind: "detail",
      // 조정할 이미지를 고르는 순간 데스크톱(narrow 아이콘열)과 똑같이
      // 팝오버를 닫아 캔버스의 조정 손잡이가 보이게 한다.
      content: (closeAll) => (
        <TracingListPanel
          tracingImages={tracingCanvasImages}
          activeTracingId={activeReferenceId}
          onAdd={handleReferenceListAdd}
          onOpacityChange={handleReferenceOpacityChange}
          onToggleAdjust={(id) => {
            handleToggleReferenceAdjust(id);
            closeAll();
          }}
          onDelete={handleReferenceDelete}
        />
      ),
    },
    { id: "help", label: "도움말", kind: "action", onSelect: () => setShowHelpDialog(true) },
  ];
```

- [ ] **Step 4: 루트 반환문 재구성**

`return (` (지금 기준 2799행)부터 3835행 근처(`{pendingCloseTabIndex !== null && (` 시작 직전)까지 구조를 아래처럼 바꾼다. **제목표시줄·메뉴바·탭바·`{menuAnchor && <ContextMenu/>}`·3열 콘텐츠(`{activeTabIndex >= 0 ? (...) : (...)}`) 블록 전체**를 `<>...</>`로 감싸 `narrow`가 아닐 때만 렌더하고, 그 앞에 `narrow`일 때의 `<MobileEditorShell/>`을 추가한다. `<style>`과 숨은 JSON `<input>`은 그대로 최상단에 남긴다:

```tsx
  return (
    <div
      ref={rootRef}
      className={`pam-editor relative flex h-full w-full select-none flex-col overflow-hidden bg-white text-gray-900 transition-all duration-200 ease-out ${
        mounted && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      onPointerDownCapture={(e) => {
        /* 기존 코드 그대로 */
      }}
    >
      <style>{`/* 기존 코드 그대로 */`}</style>

      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportJSONFile(file);
          e.target.value = "";
        }}
      />

      {narrow ? (
        <MobileEditorShell
          hasActiveTab={activeTabIndex >= 0}
          fileName={isWallpaperTab ? WALLPAPER_NAME : name}
          onRenameFile={(newName) => {
            if (isWallpaperTab) return;
            setName(newName);
            setHasMetaEdits(true);
          }}
          onExit={handleExitClick}
          onSave={handleSave}
          saveError={saveError}
          showSavedNotice={showSavedNotice}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canvas={canvasArea}
          toolPanel={toolPanel}
          colorPanel={colorPanel}
          layerPanel={layerPanel}
          moreItems={mobileMoreItems}
          onNewTab={() => setShowNewCanvasDialog(true)}
          onOpenExisting={() => setShowOpenDialog(true)}
        />
      ) : (
        <>
          {/* 제목표시줄 — 기존 코드 그대로 */}
          {/* 메뉴 바 — 기존 코드 그대로 */}
          {/* 탭 바 — 기존 코드 그대로 */}
          {menuAnchor && (
            <ContextMenu
              x={menuAnchor.x}
              y={menuAnchor.y}
              items={menuAnchor.items}
              onClose={() => setMenuAnchor(null)}
            />
          )}
          {activeTabIndex >= 0 ? (
            /* 기존 3열 콘텐츠 그대로 — 이제 toolPanel/colorPanel/layerPanel/canvasArea 변수를 참조 */
          ) : (
            /* 기존 "열린 파일이 없습니다" 빈 상태 그대로 */
          )}
        </>
      )}

      {/* 아래는 기존 위치 그대로, narrow 여부와 무관하게 항상 렌더 */}
      {showNewCanvasDialog && (/* 기존 코드 그대로 */)}
      {showOpenDialog && (/* 기존 코드 그대로 */)}
      {showHelpDialog && (/* 기존 코드 그대로 */)}
      {resizingCanvas && (/* 기존 코드 그대로 */)}
      {pendingCloseTabIndex !== null && (/* 기존 코드 그대로 */)}
      {pendingExit && (/* 기존 코드 그대로 */)}
      <AlertModal /* 기존 코드 그대로 */ />
      <PromptModal /* 기존 코드 그대로 */ />
      {!narrow && (/* 레퍼런스 창 — 기존 코드 그대로, 이미 !narrow 가드가 있다 */)}
    </div>
  );
```

옮기는 과정에서 JSX 내용 자체(각 블록 안쪽)는 **한 글자도 바꾸지 않는다** — 괄호 중첩 위치만 바뀐다. 옮긴 뒤 중괄호/괄호 짝이 맞는지 에디터의 문법 하이라이트로 확인한다.

- [ ] **Step 5: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

타입 에러가 나면 대부분 괄호 짝이 안 맞거나 `MobileEditorShell`에 넘기는 prop 타입 불일치다 — 에러 메시지의 파일:줄을 보고 고친다.

- [ ] **Step 6: 브라우저 확인 — 모바일 폭(390px)**

`http://localhost:3100/nemo-nemo-beam`, DevTools 기기 에뮬레이션 390px:

1. 편집창이 letterbox 없이 전체화면, 상단 바(‹ 파일명 💾 ↩ ↪) + 캔버스 + 하단 독(도구/색상/레이어/더보기)이 보이는지.
2. 도구/색상/레이어를 각각 눌러 그 독 바로 위에 작은 팝오버가 뜨고(캔버스 대부분이 계속 보임, 화면을 덮는 모달이 아님), 같은 아이콘을 다시 누르거나 팝오버 바깥(캔버스)을 누르면 닫히는지. 색상환에서 색을 고르면 실제로 활성 색이 바뀌는지, 도구를 바꾸면 실제로 그리기 도구가 바뀌는지, 레이어를 추가/삭제하면 반영되는지(내부 컴포넌트는 그대로라 잘 되는 게 정상).
3. 더보기 → 목록이 뜨고, 파일/편집/이미지 불러오기/내보내기/레퍼런스를 누르면 같은 팝오버 안에서 그 내용으로 바뀌며 "‹ 목록으로"로 되돌아오는지. 도움말을 누르면 팝오버가 닫히며 도움말 다이얼로그가 뜨는지.
4. 더보기 > 파일 > 새로 만들기 → NewCanvasDialog가 실제로 뜨는지(전역 다이얼로그라 모바일에서도 떠야 함 — Step 4의 재구성이 맞는지 검증하는 핵심 지점).
5. 상단 바 파일명 입력칸을 눌러 이름을 바꿀 수 있는지(입력하는 즉시 반영되는지, 데스크톱 제목표시줄과 동일).
6. 상단 바 저장 버튼과 ‹(닫기)가 동작하는지(닫기는 변경사항이 있으면 확인 없이 나가지지 않아야 함 — `handleExitClick`이 그대로 처리).
7. 레퍼런스 팝오버에서 이미지를 조정 모드로 고르면 팝오버가 닫히고 캔버스에 조정 손잡이가 보이는지.
8. (드문 경우) 마지막 탭을 닫아 "열린 파일이 없습니다" 빈 상태가 뜨면 새로 만들기/열기가 동작하는지.

- [ ] **Step 7: 브라우저 회귀 확인 — 데스크톱 폭(1280px)**

같은 페이지를 1280px로 열어 Task 3의 Step 6 체크리스트를 다시 확인한다 — 제목표시줄·메뉴바·탭바·레퍼런스 창까지 전부 재구성 전과 동일해야 한다(모바일 셸에 탭 UI가 없다고 데스크톱의 탭 기능이 줄어드는 게 아니다).

- [ ] **Step 8: 폭 전환 확인**

편집창을 열어둔 채 DevTools 폭을 820px 위아래로 여러 번 오가며, 매번 셸이 깨끗하게 전환되는지(그림 내용 유실 없음, 에러 없음) 확인한다. 이게 Task 4 이전에 고친 `rootRef` 공유 문제가 실제로 해결됐는지 보는 핵심 확인이다 — 좁혔다 넓혔다를 여러 번 반복해도 매번 정상적으로 전환돼야 한다(한 번 좁아지면 다시 안 넓어지는 버그가 없어야 함).

- [ ] **Step 9: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx apps/services/components/works/5_PixelArtMaker/Editor.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 모바일 폭(<820px)에 전용 셸(하단 독+앵커 팝오버) 적용

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Self-Review Notes

> **개정 2026-09-24:** 아래 노트는 Option F(하단 독 + 앵커 팝오버) 재작성 이후 기준으로 다시 썼다. 원래 Task 2(BottomSheet)/Task 4(탭 목록 포함) 버전의 self-review는 더 이상 유효하지 않다.

- **스펙 커버리지:** 컨테이너 전체화면(Task 1), `BottomSheet.tsx` 삭제·대체 없음(Task 2), 도구/색상/레이어/캔버스 공유 변수(Task 3), 상단 바(닫기·파일명 인라인 편집·저장·되돌리기·다시실행)·하단 독·`FLOATING_PANEL` 앵커 팝오버·더보기 목록→상세 매핑(Task 4) — 스펙의 모든 섹션에 대응하는 태스크가 있다. 여러 파일 전환은 스펙대로 셸 범위 밖(갤러리로 나가기)이라 별도 태스크가 없다.
- **빈 상태:** 스펙에 명시되진 않았지만 데스크톱에 이미 있는 "열린 파일이 없습니다" 상태를 모바일에도 동등하게 뒀다(`hasActiveTab`/`onNewTab`/`onOpenExisting`) — 없으면 마지막 탭을 닫는 순간 모바일에서 막다른 화면이 된다(드문 경우지만 데스크톱과 동급 커버리지를 위해 유지).
- **타입 일관성:** `MobileMoreItem`의 `kind` 판별 유니언과 `content: (closeAll: () => void) => ReactNode` 렌더 프롭 시그니처를 `MobileEditorShell.tsx`(정의)와 `Editor.tsx`(구성)에서 동일하게 쓴다. `openPopover`/`moreDetail`은 셸 내부 상태로만 존재하고 `MobileEditorShellProps`에 없다 — Editor.tsx는 이 값을 몰라도 된다(스펙의 "Editor.tsx가 알 필요 없는 순수 네비게이션 상태" 원칙과 일치).
- **outside-click 충돌 검증:** 하단 독 팝오버의 바깥 클릭 감지는 `ContextMenu.tsx`와 같은 `window` `mousedown` 리스너 패턴을 쓰되, ref를 팝오버 자신이 아니라 팝오버+독 아이콘 바를 함께 감싸는 `relative` 컨테이너에 둔다 — 그래야 독 아이콘을 다시 눌러 토글하는 클릭이 "바깥 클릭"으로 오인되어 `mousedown` 시점에 먼저 닫혔다가 뒤이은 `onClick` 토글로 다시 열리는 깜빡임/오작동이 생기지 않는다.
- **플레이스홀더 없음:** 전 태스크의 코드 스텝은 실제 JSX/핸들러 이름을 그대로 썼다(TBD 없음). Task 4 Step 4의 "기존 코드 그대로"는 자리표시자가 아니라 "이 계획 문서에 전체를 다시 옮겨적지 않고 원본을 그대로 이동하라"는 명시적 지시다 — 실행자는 실제 파일에서 그 블록을 잘라 옮기면 된다(내용을 새로 작성하지 않는다).
