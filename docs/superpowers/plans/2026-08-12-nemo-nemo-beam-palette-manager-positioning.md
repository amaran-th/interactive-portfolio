# 즐겨찾기 관리 드롭다운 위치 계산 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "즐겨찾기 관리" 드롭다운 패널이 사이드바에 새 스크롤을 만들거나 편집창 밖으로 잘려 나가지 않도록, 열 때마다 남은 공간을 실제로 재서 위치·최대 높이를 계산해 연다.

**Architecture:** 패널을 `position: absolute`(사이드바의 `overflow-y-auto` 스크롤 영역에 포함됨)에서 `position: fixed`로 바꾸고, 좌표를 편집창 루트(`Editor.tsx`의 `rootRef`) 기준 상대좌표로 계산한다 — `ContextMenu`(`Editor.tsx`의 `openFileMenu`/`openEditMenu`)가 이미 쓰는 것과 같은 관례. 패널을 연 직후 `useLayoutEffect`로 실제 남은 공간을 재서 방향(아래/위)과 `maxHeight`를 정하므로, 화면 크기와 무관하게 잘리거나 편집창을 벗어나지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 브라우저(Playwright 임시 스크립트) 확인이다.
- 좌표 계산은 `Editor.tsx`의 `openFileMenu`/`openEditMenu`(약 2307~2394번째 줄)가 쓰는 관례를 그대로 따른다: `x = rect.left - rootRect.left`, `y = rect.bottom - rootRect.top` — 편집창 루트에 `transform: scale(...)`이 걸려 있어 `fixed` 좌표는 뷰포트가 아니라 이 루트 기준으로 계산해야 한다.
- 여백 상수는 8px(`MARGIN = 8`)로 편집창 경계에서 항상 띄운다.
- 바깥 클릭으로 안 닫히는 것, 행 레이아웃(스와치 미리보기·이름·아이콘 3개)·삭제 호버 동작·`handleLoadSet`/`handleOverwriteSet`/`handleDeleteSet` 로직은 전혀 손대지 않는다.
- 패널의 시각적 스타일(배경색·그림자·패딩)은 유지하되, 너비는 `w-full`에서 `w-56`(224px, `DrawToolbar.tsx`/`LayerPanel.tsx`의 다른 드롭다운과 같은 값)으로 되돌린다 — `fixed` 요소의 `w-full`은 사이드바가 아니라 편집창 루트(매우 넓음) 기준 100%가 되어 버려 의미가 없어지기 때문이다.
- 이 저장소에는 이 작업과 무관한 사전 수정 파일들이 있다 — `git status`로 확인 후 이 태스크가 건드리는 파일만 정확히 스테이징한다. `git add -A`/`git add .`를 쓰지 않는다. `assetLibrary.ts`·`wallpaper.ts`는 절대 건드리지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.

---

### Task 1: 드롭다운 패널을 `fixed` + 충돌 회피 위치 계산으로 전환

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: 없음(기존 `paletteSets.ts` API, `PaletteSet` 타입 — 그대로 재사용). `Editor.tsx`가 이미 갖고 있는 `rootRef`(`useRef<HTMLDivElement>(null)`, `Editor.tsx:664`)를 새로 소비한다.
- Produces: `ColorWheel`에 새 필수 prop `boundsRef: RefObject<HTMLDivElement | null>` — 이 플랜의 유일한 태스크라 이후 태스크는 없지만, 이 prop을 `ColorWheel`을 렌더링하는 곳(`Editor.tsx`)이 반드시 채워야 컴파일된다.

- [ ] **Step 1: `ColorWheel.tsx`의 `react` import에 필요한 심볼 추가**

3~4번째 줄(현재 `import { Download, Save, Settings, Trash2, X } from "lucide-react";` 다음 줄 `import { useCallback, useState } from "react";`)을 다음으로 바꾼다:

```ts
import { Download, Save, Settings, Trash2, X } from "lucide-react";
import {
  CSSProperties,
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
```

- [ ] **Step 2: `ColorWheel`의 props에 `boundsRef` 추가**

함수 시그니처(현재 24~59번째 줄)의 구조분해 매개변수 목록 끝(`onChangeCanvasBgColor,` 다음 줄, 닫는 중괄호 `}: {` 앞)에 `boundsRef,`를 추가하고, 타입 객체 끝(`onChangeCanvasBgColor: (hex: string) => void;` 다음 줄, 닫는 `}) {` 앞)에 다음을 추가한다:

```ts
  // 드롭다운 패널이 벗어나면 안 되는 경계 — 편집창 루트(Editor.tsx의
  // rootRef). 편집창 루트에 transform(scale)이 걸려 있어, 패널을 fixed로
  // 띄울 때 뷰포트가 아니라 이 루트 기준으로 위치를 계산해야 한다.
  boundsRef: RefObject<HTMLDivElement | null>;
```

- [ ] **Step 3: 트리거·패널 ref와 위치 계산 로직 추가**

`const [showPaletteManager, setShowPaletteManager] = useState(false);`(현재 97번째 줄) 바로 다음에 추가한다:

```ts

  // 드롭다운 트리거(톱니바퀴)와 패널 DOM 노드 — 열 때마다 실제 남은 공간을
  // 재서 패널을 편집창 밖으로 나가지 않게 fixed로 띄운다.
  const paletteManagerTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteManagerPanelRef = useRef<HTMLDivElement>(null);
  const [paletteManagerPanelStyle, setPaletteManagerPanelStyle] =
    useState<CSSProperties>({});

  // 편집창 루트(boundsRef) 기준 좌표로 패널 위치를 다시 계산한다 —
  // ContextMenu(Editor.tsx의 openFileMenu/openEditMenu)와 같은 관례: 편집창
  // 루트에 transform(scale)이 걸려 있어, fixed 좌표는 뷰포트가 아니라 이
  // 루트 기준 상대좌표로 계산해야 정확히 자리 잡는다.
  const recomputePaletteManagerPosition = useCallback(() => {
    const trigger = paletteManagerTriggerRef.current;
    const panel = paletteManagerPanelRef.current;
    const bounds = boundsRef.current;
    if (!trigger || !panel || !bounds) return;

    const MARGIN = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const boundsRect = bounds.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    const spaceBelow = boundsRect.bottom - triggerRect.bottom - MARGIN;
    const spaceAbove = triggerRect.top - boundsRect.top - MARGIN;
    const openUpward =
      panelRect.height > spaceBelow && spaceAbove > spaceBelow;

    const style: CSSProperties = { position: "fixed" };
    if (openUpward) {
      style.bottom = boundsRect.bottom - triggerRect.top;
      style.maxHeight = spaceAbove;
    } else {
      style.top = triggerRect.bottom - boundsRect.top;
      style.maxHeight = spaceBelow;
    }

    let left = triggerRect.right - boundsRect.left - panelRect.width;
    if (left < MARGIN) left = MARGIN;
    style.left = left;

    setPaletteManagerPanelStyle(style);
  }, [boundsRef]);

  // 패널이 열려 있는 동안 편집창 크기가 바뀌면(narrow 감지에 쓰는 것과 같은
  // ResizeObserver 패턴) 위치를 다시 계산해, 창을 줄여도 경계를 벗어나지
  // 않게 한다. useLayoutEffect라 브라우저가 그리기 전에 최종 위치가 반영돼
  // 화면에는 깜빡임 없이 바로 최종 위치로 보인다.
  useLayoutEffect(() => {
    if (!showPaletteManager) return;
    recomputePaletteManagerPosition();
    const bounds = boundsRef.current;
    if (!bounds) return;
    const ro = new ResizeObserver(recomputePaletteManagerPosition);
    ro.observe(bounds);
    return () => ro.disconnect();
  }, [showPaletteManager, recomputePaletteManagerPosition, boundsRef]);
```

- [ ] **Step 4: 트리거 버튼에 ref 연결**

톱니바퀴 버튼(현재 269~279번째 줄)의 `<button` 태그에 `ref={paletteManagerTriggerRef}`를 추가한다:

```tsx
        <button
          ref={paletteManagerTriggerRef}
          onClick={() => setShowPaletteManager((v) => !v)}
          title="즐겨찾기 관리(팔레트 세트 불러오기·저장·삭제)"
          className={`flex h-5 w-5 items-center justify-center ${
            showPaletteManager
              ? "bg-violet-500 text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          <Settings className="h-3 w-3" />
        </button>
```

- [ ] **Step 5: 패널을 `fixed`로 바꾸고 ref·동적 style 연결, 목록에 내부 스크롤 추가**

패널 열리는 조건 블록(현재 283~284번째 줄)을 다음으로 바꾼다:

```tsx
        {showPaletteManager && (
          <div
            ref={paletteManagerPanelRef}
            style={paletteManagerPanelStyle}
            className="fixed z-30 flex w-56 flex-col gap-1 overflow-hidden bg-white p-2 shadow-xl"
          >
```

세트 목록 wrapper(현재 289번째 줄, `<div className="flex flex-col">`)를 다음으로 바꾼다 — `min-h-0`이 있어야 flex 안에서 이 목록이 배정된 공간보다 작게 줄어들면서 자체 스크롤될 수 있다:

```tsx
              <div className="flex min-h-0 flex-col overflow-y-auto">
```

그 아래 세트별 행 렌더링(`{paletteSets.map((set) => (...))}`)과 "새로 저장" 버튼, 패널을 닫는 `</div>`(현재 291~345번째 줄)는 전혀 손대지 않는다.

- [ ] **Step 6: `Editor.tsx`에서 `boundsRef` 전달**

`<ColorWheel` 호출부(현재 2703~2717번째 줄, `onChangeCanvasBgColor={setCanvasBgColor}` 다음 줄에 닫는 `/>`)에 `boundsRef={rootRef}`를 추가한다:

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

- [ ] **Step 7: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 8: 브라우저 수동 확인**

`npm run dev`가 이미 떠 있으면(소유자가 동시에 작업 중일 수 있음) 재사용하고 직접 시작한 서버가 아니면 종료하지 않는다. MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 확인한다. `localStorage`에 작은 캔버스(V3 포맷)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 연다. 팔레트 세트는 `localStorage`의 `pixel-art-maker:palette-sets` 키에 `paletteSets.ts`의 `PaletteSet` 형식(`{id, name, colors}[]`)으로 직접 주입한다.

1. **스크롤 미발생:** 세트 2~3개를 주입한 평범한 브라우저 창 크기에서 톱니바퀴를 누르기 전 사이드바 요소(`ColorWheel`을 감싸는 `w-56 ... overflow-y-auto` div, `Editor.tsx:2701`)의 `scrollHeight`를 읽어두고, 패널을 연 뒤 다시 읽어 두 값이 같은지 확인한다.
2. **목록 자체 스크롤:** 세트를 15개 이상 주입한 뒤 패널을 열어, 사이드바의 `scrollHeight`는 여전히 열기 전후로 같은데(시나리오 1과 동일 방식으로 재확인), 세트 목록 wrapper(`overflow-y-auto`가 붙은 그 div)의 `scrollHeight`가 `clientHeight`보다 큰지(자체적으로 스크롤 가능한 상태인지) 확인한다.
3. **위로 뒤집기:** 브라우저 창을 세로로 작게 줄이고(예: 700px 이하) 세트를 여러 개 주입해 패널이 아래로 열리면 편집창을 넘어설 만한 상황을 만든 뒤, 패널의 `getBoundingClientRect().top`이 톱니바퀴 버튼의 `getBoundingClientRect().top`보다 작은지(패널이 버튼 위쪽에 떴는지) 확인한다.
4. **왼쪽 경계 clamp:** 브라우저 창을 아주 좁게(예: 400px) 줄인 뒤 패널을 열어, 패널의 `getBoundingClientRect().left`가 편집창 루트(`.pam-editor` 클래스가 붙은 요소)의 `getBoundingClientRect().left`보다 작지 않은지 확인한다.
5. **리사이즈 대응:** 패널을 연 상태에서 Playwright의 `page.setViewportSize`로 창 크기를 바꾼 뒤, 패널의 bounding rect가 여전히 편집창 루트의 bounding rect 안에 포함되는지(포함 관계: `panel.left >= root.left && panel.right <= root.right && panel.top >= root.top && panel.bottom <= root.bottom`, 약간의 오차 허용) 확인한다.
6. **경계 포함(일반 케이스):** 시나리오 1의 평범한 창 크기에서도 시나리오 5와 같은 포함 관계 검사를 한 번 수행해, 특별한 상황이 아니어도 패널이 항상 편집창 경계 안에 있는지 확인한다.
7. **회귀 확인:** 패널 열기/닫기, 한 행의 불러오기·덮어쓰기·삭제 아이콘 클릭이 여전히 정상 동작하는지(즐겨찾기 교체, 세트 갱신, 목록에서 제거), 세트가 하나도 없을 때 안내 문구가 보이는지, "새로 저장" 버튼이 항상 눌리는지 확인한다.

각 시나리오는 실제 DOM 상태(bounding rect, scrollHeight/clientHeight, 텍스트 내용)를 Playwright locator API로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷을 정리하고, `git status`로 이 태스크가 의도한 두 파일(`ColorWheel.tsx`, `Editor.tsx`)만 스테이징됐는지 확인한다.

- [ ] **Step 9: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx"
git commit -m "fix: 즐겨찾기 관리 드롭다운이 사이드바 스크롤을 만들거나 편집창을 벗어나지 않게 위치 계산 개선"
```

---
