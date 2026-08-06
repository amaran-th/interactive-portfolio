# 네모네모빔 레이어 판정 범위 + 콘텐츠 중앙 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `LayerPanel`에 레이어별 체크박스를 추가해, 그 체크 집합(`layerScope`)이 (1) 스포이트·마법봉·페인트통의 색/영역 판정 범위와 (2) "정렬"(콘텐츠를 캔버스 중앙으로 이동) 버튼의 대상 레이어를 동시에 결정하게 한다.

**Architecture:** 순수 세션 상태 `layerScope: Set<string>`을 `Editor.tsx`가 들고, 레이어 모드일 때만 활성 레이어 위/아래 합성(`scopeBelowComposite`/`scopeAboveLayers`)을 이 집합으로 필터링해 `PixelCanvas`에 새 props로 내려준다. `PixelCanvas`의 `getFullComposite`(스포이트·마법봉·페인트통이 공유하는 판정 함수)는 이 필터링된 값을 쓰도록 바뀐다 — 화면에 실제로 그려지는 렌더링 합성은 전혀 건드리지 않는다. 정렬은 새 순수 함수(`unionBoundingBox`, `shiftPixels`)로 체크된 레이어들의 불투명 영역 경계를 구하고 그만큼 같이 이동시키는, 기존 `handleFlattenLayers`와 같은 "레이어 배열을 통째로 바꿔 실행취소 스택에 한 번 올리는" 패턴이다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript, 상태는 React 훅으로만 관리(외부 상태 라이브러리 없음).

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다(`package.json`에 `test` 스크립트 없음). 각 태스크는 자동 테스트 대신 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, 그리고 필요한 태스크에서는 `npm run dev`로 띄운 브라우저에서의 수동 확인으로 검증한다. 새로운 테스트 프레임워크를 도입하지 않는다.
- 설명 문구(체크박스 title, 버튼 title 등)는 프로젝트의 한국어 문체 규칙(번역투 금지, 조사로 직결, 반복 회피)을 따른다.
- 이 Work(`5_PixelArtMaker`)는 밝은 OS 창 스타일(`bg-white`, `text-gray-600`, `text-[10px]` 버튼 등)을 쓴다. 새 UI 요소는 기존 `LayerPanel.tsx`의 스타일(예: "평탄화" 버튼은 `text-[10px] font-normal text-gray-400 hover:text-gray-600 disabled:opacity-30`)을 그대로 따른다.
- `layerScope`는 프레임 모드(`layerMode === "frames"`)에서는 적용하지 않는다 — 프레임 모드의 기존 온리언 스킨 동작(`belowComposite`/`aboveLayers`)을 그대로 통과시킨다.
- `layerScope`는 저장 포맷(V3 등)에 반영하지 않는다 — 세션 전용 상태로, 문서를 새로 열 때마다(`loadTab`이 `history.reset`을 호출하는 시점) 그 시점의 활성 레이어 하나로 다시 초기화한다.
- 커밋 메시지는 한글, `Co-Authored-By: Claude` 트레일러를 붙이지 않는다.
- 설계 문서: `docs/superpowers/specs/2026-08-06-nemo-nemo-beam-layer-scope-and-align-design.md` — 이 문서는 2026-08-06 브레인스토밍 중 다른 세션이 병합한 블렌드 모드·색보정 기능(`aboveComposite` → `aboveLayers` 아키텍처 변경)에 맞춰 이미 갱신되었으므로, 지금 이 계획의 코드 스니펫과 함께 최신 상태다.
- **주의:** 이 저장소의 `main` 브랜치는 다른 세션이 동시에 커밋하고 있을 수 있다(이번 계획을 브레인스토밍하는 도중에도 실제로 그런 일이 있었다). 각 태스크는 반드시 브리프에 적힌 "현재 코드" 블록이 실제 파일 내용과 정확히 일치하는지 확인한 뒤 수정해야 하고, 일치하지 않으면 추측해서 진행하지 말고 NEEDS_CONTEXT로 보고한다.

---

### Task 1: `pixelGrid.ts` — 정렬용 순수 함수 `unionBoundingBox`, `shiftPixels`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts`

**Interfaces:**
- Produces: `export function unionBoundingBox(pixelLists: PixelValue[][], width: number, height: number): { minX: number; minY: number; maxX: number; maxY: number } | null` — 모든 리스트가 완전히 투명하면 `null`.
- Produces: `export function shiftPixels(pixels: PixelValue[], width: number, height: number, dx: number, dy: number): PixelValue[]` — 캔버스 밖으로 나가는 픽셀은 잘리고, 새로 드러나는 자리는 `null`.
- Task 3이 이 두 함수를 `handleAlignLayers`에서 그대로 가져다 쓴다.

- [ ] **Step 1: 두 함수를 `pixelGrid.ts`에 추가**

`export function resizeGrid(` 정의 바로 뒤(`rotatePixelValuesBy`와 `resizeGrid` 사이 어디든 상관없지만, `resizeGrid` 함수가 끝나는 지점 — 정확한 줄 번호 대신 함수 시작 시그니처로 위치를 찾는다) 근처에, 다음 두 함수를 추가한다. 정확한 삽입 지점은 `export function idx(` 정의 바로 앞이다(그 사이에 다른 변환류 함수가 없다면):

```ts
// 여러 레이어의 불투명 픽셀을 하나의 집합으로 보고 그 경계 상자를 구한다.
// 전부 완전히 투명하면(정렬할 내용이 없으면) null을 돌려준다.
export function unionBoundingBox(
  pixelLists: PixelValue[][],
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pixels of pixelLists) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y * width + x] === null) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// pixels를 (dx, dy)만큼 평행이동한 같은 크기의 새 그리드를 돌려준다.
// 캔버스 밖으로 나가는 픽셀은 잘리고, 새로 드러나는 자리는 투명(null)으로 채운다.
export function shiftPixels(
  pixels: PixelValue[],
  width: number,
  height: number,
  dx: number,
  dy: number,
): PixelValue[] {
  const out = new Array<PixelValue>(width * height).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = x - dx;
      const srcY = y - dy;
      if (srcX < 0 || srcY < 0 || srcX >= width || srcY >= height) continue;
      out[y * width + x] = pixels[srcY * width + srcX];
    }
  }
  return out;
}
```

이 파일은 `PixelValue`를 이미 다른 함수들의 시그니처에 쓰고 있으므로(예: `getPixel`, `setPixel`) 별도 import가 필요 없다.

- [ ] **Step 2: 손으로 두 시나리오를 추적해 정확성을 확인**

이 프로젝트에는 테스트 프레임워크가 없으므로, 아래 두 경우를 코드를 읽으며 손으로 추적해 보고서에 기록한다(실행 가능한 스크립트가 있다면 그것도 좋다):

1. `unionBoundingBox`: `width=4, height=4`인 두 레이어 배열 중 하나는 (1,1)에만 색이 있고, 다른 하나는 (2,3)에만 색이 있다고 하자. 결과는 `{ minX: 1, minY: 1, maxX: 2, maxY: 3 }`이어야 한다(두 레이어를 합친 경계).
2. `shiftPixels`: `width=4, height=4`, (0,0)에만 색이 있는 그리드를 `dx=1, dy=1`로 이동하면 결과는 (1,1)에만 색이 있어야 하고, `dx=-1, dy=0`으로 이동하면(캔버스 밖으로 나감) 완전히 빈 그리드가 나와야 한다.

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts"
git commit -m "feat : 네모네모빔 콘텐츠 정렬용 unionBoundingBox·shiftPixels 추가"
```

---

### Task 2: 판정 범위 — `layerScope` 상태 + scope 합성 + `getFullComposite` 교체

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Produces (Editor.tsx, 세션 상태): `const [layerScope, setLayerScope] = useState<Set<string>>(...)` — Task 3이 `setLayerScope`를 읽어 체크박스 토글 핸들러를 만들고, `layerScope`를 읽어 정렬 대상을 고른다.
- Produces (Editor.tsx, 파생값): `scopeBelowComposite: PixelValue[] | null`, `scopeAboveLayers: PixelLayer[] | null`, `activeLayerInScope: boolean` — `PixelCanvas`에 새 props로 전달된다.
- Produces (PixelCanvas.tsx, 새 props): `scopeBelowComposite: PixelValue[] | null; scopeAboveLayers: PixelLayer[] | null; activeLayerInScope: boolean;`
- Consumes (Editor.tsx가 이미 갖고 있음): `history.presentLayers`, `history.activeLayerId`, `activeLayerIndex`, `layerMode`, `belowComposite`, `aboveLayers`, `compositeLayers`(이미 import됨).

이번 태스크가 끝나면(아직 체크박스 UI는 없지만) 눈에 보이는 동작 변화가 있다: 레이어가 2장 이상이고 둘 다 보이는 상태에서, 스포이트·마법봉·페인트통이 이제 **기본값으로 활성 레이어만** 판정 대상으로 삼는다(이전에는 항상 보이는 레이어 전부를 합성해 판정했다). 이게 이번 태스크의 브라우저 검증 포인트다.

- [ ] **Step 1: `layerScope` 상태 추가**

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`에서, 현재 다음 코드(`selection` 선언 바로 뒤):

```ts
  const selection = useSelection();

  // 저장·내보내기·탭 스냅숏 등 레이어를 모르는 모든 곳은 이 값(모든 레이어를
```

`const selection = useSelection();` 다음 줄에 삽입:

```ts
  const selection = useSelection();

  // 스포이트·마법봉·페인트통의 판정 범위이자 "정렬" 버튼의 대상 레이어 —
  // 활성 레이어(그리기 대상)와는 완전히 독립된 세션 전용 상태다. 저장 포맷에는
  // 반영하지 않고, 문서를 열 때마다(loadTab이 history.reset을 부르는 시점)
  // 그 시점의 활성 레이어 하나로 다시 초기화한다.
  const [layerScope, setLayerScope] = useState<Set<string>>(
    () => new Set([initialLayerState.activeLayerId]),
  );

  // 저장·내보내기·탭 스냅숏 등 레이어를 모르는 모든 곳은 이 값(모든 레이어를
```

- [ ] **Step 2: `loadTab`에서 새 문서를 열 때 `layerScope` 재초기화**

현재(`Editor.tsx`, `loadTab` 콜백 안):

```ts
      const { layers, activeLayerId } = layersFromDoc(tab.doc);
      history.reset(layers, activeLayerId, {
        width: tab.doc.width,
        height: tab.doc.height,
      });
      setActiveColorHex(DEFAULT_ACTIVE_COLOR);
```

다음으로 교체(한 줄 추가):

```ts
      const { layers, activeLayerId } = layersFromDoc(tab.doc);
      history.reset(layers, activeLayerId, {
        width: tab.doc.width,
        height: tab.doc.height,
      });
      setLayerScope(new Set([activeLayerId]));
      setActiveColorHex(DEFAULT_ACTIVE_COLOR);
```

- [ ] **Step 3: scope 합성 계산 추가**

현재(`Editor.tsx`), `aboveLayers`의 `useMemo` 정의가 끝나는 지점(`}, [layerMode, onionSkin, history.presentLayers, history.activeLayerId, activeLayerIndex]);`으로 끝나는 블록) 바로 뒤에 추가한다. 이 블록을 찾으려면 `aboveLayers`라는 이름으로 검색 — 그 블록 전체가 아래처럼 끝난다:

```ts
    const slice = history.presentLayers.slice(
      activeLayerIndex + 1,
      history.presentLayers.length,
    );
    return slice.length > 0 ? slice : null;
  }, [
    layerMode,
    onionSkin,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
  ]);
```

이 닫는 `}, [...]);` 바로 다음 줄에 추가:

```ts

  // 스포이트·마법봉·페인트통 판정 전용 합성 — 화면 렌더링용 belowComposite/
  // aboveLayers와 별개로, layerScope로 한 번 더 필터링한다. 프레임 모드는
  // scope 개념이 없어 기존 값을 그대로 통과시킨다.
  const scopeBelowComposite = useMemo(() => {
    if (layerMode === "frames") return belowComposite;
    const scoped = history.presentLayers
      .slice(0, activeLayerIndex)
      .filter((l) => layerScope.has(l.id));
    return compositeLayers(scoped, doc.width, doc.height);
  }, [
    layerMode,
    belowComposite,
    history.presentLayers,
    activeLayerIndex,
    layerScope,
    doc.width,
    doc.height,
  ]);

  const scopeAboveLayers = useMemo((): PixelLayer[] | null => {
    if (layerMode === "frames") return aboveLayers;
    const slice = history.presentLayers
      .slice(activeLayerIndex + 1)
      .filter((l) => layerScope.has(l.id));
    return slice.length > 0 ? slice : null;
  }, [layerMode, aboveLayers, history.presentLayers, activeLayerIndex, layerScope]);

  const activeLayerInScope =
    layerMode === "frames" ? true : layerScope.has(history.activeLayerId);
```

**주의:** 이 스텝을 적용하기 전에 실제 파일에서 `aboveLayers`의 `useMemo` 정의 전체(시작부터 닫는 `}, [...]` 까지)를 눈으로 확인해서, 위에 인용한 "현재 코드"와 정확히 일치하는지 먼저 확인한다. 다른 세션이 이 부분을 바꿨을 수 있다(Global Constraints 참고) — 일치하지 않으면 NEEDS_CONTEXT로 보고한다.

- [ ] **Step 4: `PixelCanvas`에 새 props 3개 추가**

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`에서, 함수 파라미터 구조분해와 타입 선언 두 곳을 고친다.

파라미터 구조분해, 현재:

```ts
  belowComposite,
  aboveLayers,
  activeLayerOpacity,
  activeLayerLocked,
  activeLayerBlendMode,
  activeLayerAdjustments,
}: {
```

다음으로 교체:

```ts
  belowComposite,
  aboveLayers,
  activeLayerOpacity,
  activeLayerLocked,
  activeLayerBlendMode,
  activeLayerAdjustments,
  scopeBelowComposite,
  scopeAboveLayers,
  activeLayerInScope,
}: {
```

타입 선언, 현재(`activeLayerAdjustments: LayerAdjustments;` 바로 뒤, `}) {` 바로 앞):

```ts
  activeLayerBlendMode: BlendMode;
  activeLayerAdjustments: LayerAdjustments;
}) {
```

다음으로 교체:

```ts
  activeLayerBlendMode: BlendMode;
  activeLayerAdjustments: LayerAdjustments;
  // 스포이트·마법봉·페인트통 판정 전용 — belowComposite/aboveLayers(화면
  // 렌더링용)와 별개로 layerScope로 필터링된 값을 받는다. activeLayerInScope가
  // false면 활성 레이어(workingRef.current) 자체가 판정에서 제외된다.
  scopeBelowComposite: PixelValue[] | null;
  scopeAboveLayers: PixelLayer[] | null;
  activeLayerInScope: boolean;
}) {
```

- [ ] **Step 5: `getFullComposite` 교체**

현재(`getFullComposite` 콜백 전체 — `const getFullComposite = useCallback((): PixelValue[] => {`로 시작해서 그 바로 뒤 `}, [...]);`로 끝나는 블록):

```ts
  const getFullComposite = useCallback((): PixelValue[] => {
    const hasAdjustments =
      !!activeLayerAdjustments.brightness ||
      !!activeLayerAdjustments.contrast ||
      !!activeLayerAdjustments.saturation ||
      !!activeLayerAdjustments.temperature ||
      !!activeLayerAdjustments.tint;
    if (
      !belowComposite &&
      (!aboveLayers || aboveLayers.length === 0) &&
      activeLayerOpacity >= 1 &&
      !hasAdjustments
    ) {
      return workingRef.current;
    }
    const base = belowComposite
      ? belowComposite.slice()
      : createGrid(width, height);
    const withActive = compositeOnto(
      base,
      workingRef.current,
      activeLayerOpacity,
      activeLayerBlendMode,
      activeLayerAdjustments,
    );
    return aboveLayers && aboveLayers.length > 0
      ? compositeLayersOnto(withActive, aboveLayers)
      : withActive;
  }, [
    belowComposite,
    aboveLayers,
    activeLayerOpacity,
    activeLayerBlendMode,
    activeLayerAdjustments,
    width,
    height,
  ]);
```

다음으로 교체(같은 이름·같은 위치 — `belowComposite`/`aboveLayers`는 이제 화면 렌더링에만 쓰이고, 판정은 `scopeBelowComposite`/`scopeAboveLayers`/`activeLayerInScope`를 쓴다):

```ts
  const getFullComposite = useCallback((): PixelValue[] => {
    const base = scopeBelowComposite
      ? scopeBelowComposite.slice()
      : createGrid(width, height);
    if (!activeLayerInScope) {
      return scopeAboveLayers && scopeAboveLayers.length > 0
        ? compositeLayersOnto(base, scopeAboveLayers)
        : base;
    }
    const withActive = compositeOnto(
      base,
      workingRef.current,
      activeLayerOpacity,
      activeLayerBlendMode,
      activeLayerAdjustments,
    );
    return scopeAboveLayers && scopeAboveLayers.length > 0
      ? compositeLayersOnto(withActive, scopeAboveLayers)
      : withActive;
  }, [
    scopeBelowComposite,
    scopeAboveLayers,
    activeLayerInScope,
    activeLayerOpacity,
    activeLayerBlendMode,
    activeLayerAdjustments,
    width,
    height,
  ]);
```

**주의:** 이 스텝도 Step 3과 마찬가지로, 실제 파일의 `getFullComposite` 정의가 위 "현재 코드"와 정확히 일치하는지 먼저 확인한다.

- [ ] **Step 6: `Editor.tsx`에서 `PixelCanvas`에 새 props 전달**

`Editor.tsx`에서 `<PixelCanvas` 렌더링 지점을 찾는다(파일에 한 곳만 있다). 현재:

```tsx
                    activeLayerLocked={activeLayer.locked || isPlaying}
                    activeLayerBlendMode={
                      layerMode === "frames"
                        ? "normal"
                        : (activeLayer.blendMode ?? "normal")
                    }
                    activeLayerAdjustments={
                      layerMode === "frames" ? {} : activeLayer
                    }
```

다음으로 교체(세 줄 추가):

```tsx
                    activeLayerLocked={activeLayer.locked || isPlaying}
                    activeLayerBlendMode={
                      layerMode === "frames"
                        ? "normal"
                        : (activeLayer.blendMode ?? "normal")
                    }
                    activeLayerAdjustments={
                      layerMode === "frames" ? {} : activeLayer
                    }
                    scopeBelowComposite={scopeBelowComposite}
                    scopeAboveLayers={scopeAboveLayers}
                    activeLayerInScope={activeLayerInScope}
```

- [ ] **Step 7: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 8: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 9: 수동 브라우저 확인**

Run: `npm run dev`, 플레이그라운드 → 네모네모빔 편집기 진입, 레이어 패널에서 레이어를 2장으로 만든다(레이어 추가 버튼).

확인 목록:
1. 레이어 1(활성)은 비워두고, 레이어 2(비활성, 아래나 위 아무 위치)에 도형 도구 등으로 눈에 띄는 색을 하나 칠한다.
2. 활성 레이어(레이어 1)를 그대로 둔 채, 스포이트로 레이어 2에만 칠해진 자리를 클릭한다 — **아무 색도 집히지 않아야 한다**(활성 레이어만 판정하는 게 새 기본값이므로, 그 자리는 활성 레이어 기준으로 완전히 투명).
3. 마법봉으로 같은 자리를 클릭한다 — **아무 것도 선택되지 않아야 한다**(선택 영역이 비어 있음).
4. 활성 레이어(레이어 1)에 직접 도형을 칠하고, 그 위에서 스포이트/마법봉/페인트통을 쓰면 지금까지처럼 정상 동작하는지 확인(활성 레이어 자신에 대한 판정은 전혀 달라지지 않아야 한다).
5. 화면에 실제로 그려지는 그림(레이어 2에 칠한 색)은 계속 정상적으로 보이는지 확인 — 이번 변경은 판정에만 영향을 주고 렌더링에는 영향을 주지 않아야 한다.
6. 프레임 모드로 전환해 온리언 스킨이 여전히 정상 동작하는지(다음/이전 프레임 유령 이미지가 흐리게 보이는지) 확인 — 이번 변경이 프레임 모드에는 영향을 주지 않아야 한다.

Expected: 위 6가지 모두 통과.

- [ ] **Step 10: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx"
git commit -m "feat : 네모네모빔 스포이트·마법봉·페인트통 판정 범위를 layerScope로 제한"
```

---

### Task 3: UI — 레이어 체크박스 + 정렬 버튼

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `unionBoundingBox`, `shiftPixels` (`pixelGrid.ts`에서 import). Task 2의 `layerScope: Set<string>`, `setLayerScope`, `pushLayerOp(nextLayers: PixelLayer[], nextActiveLayerId: string)`, `history.presentLayers`, `history.activeLayerId`, `doc.width`, `doc.height`.
- Produces (`LayerPanel.tsx`, 새 props): `layerScope: Set<string>`, `onToggleScope: (id: string) => void`, `onAlign: () => void`.

- [ ] **Step 1: `Editor.tsx`에 `handleToggleLayerScope`, `handleAlignLayers` 추가**

`Editor.tsx` 상단의 `./pixelGrid` import 블록, 현재:

```ts
import {
  applyAdjustments,
  compositeLayerRange,
  compositeLayers,
  compositeOnto,
  createGrid,
  createLayer,
  expandPoints,
  flipHorizontal,
  flipVertical,
  getPixel,
  PixelValue,
  resamplePixelValues,
  resizeGrid,
  rotate90,
  rotatePixelValuesBy,
  setPixel,
  shapeToolPoints,
} from "./pixelGrid";
```

다음으로 교체(`shiftPixels`, `unionBoundingBox` 두 줄 추가, 기존 정렬 순서 유지):

```ts
import {
  applyAdjustments,
  compositeLayerRange,
  compositeLayers,
  compositeOnto,
  createGrid,
  createLayer,
  expandPoints,
  flipHorizontal,
  flipVertical,
  getPixel,
  PixelValue,
  resamplePixelValues,
  resizeGrid,
  rotate90,
  rotatePixelValuesBy,
  setPixel,
  shapeToolPoints,
  shiftPixels,
  unionBoundingBox,
} from "./pixelGrid";
```

`handleFlattenLayers` 정의(`const handleFlattenLayers = useCallback(() => { ... }, [...]);`) 바로 뒤에 추가:

```ts
  // 체크된 레이어(layerScope)를 켜고 끈다 — 활성 레이어(그리기 대상)와는
  // 무관한 독립 상태라 pushLayerOp(실행취소)를 거치지 않는다.
  const handleToggleLayerScope = useCallback((id: string) => {
    setLayerScope((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 체크된 레이어들의 불투명 영역을 하나로 묶어 그 경계 상자가 캔버스
  // 중앙에 오도록, 체크된 레이어들만 같은 만큼(서로 상대 위치 유지) 이동시킨다.
  // 체크 안 된 레이어는 건드리지 않는다. handleFlattenLayers와 같은 패턴으로
  // pushLayerOp 한 번에 실행취소 스택에 올라간다.
  const handleAlignLayers = useCallback(() => {
    const targets = history.presentLayers.filter((l) => layerScope.has(l.id));
    if (targets.length === 0) return;
    const box = unionBoundingBox(
      targets.map((l) => l.pixels),
      doc.width,
      doc.height,
    );
    if (!box) return;
    const contentW = box.maxX - box.minX + 1;
    const contentH = box.maxY - box.minY + 1;
    const dx = Math.floor((doc.width - contentW) / 2) - box.minX;
    const dy = Math.floor((doc.height - contentH) / 2) - box.minY;
    if (dx === 0 && dy === 0) return;
    const nextLayers = history.presentLayers.map((l) =>
      layerScope.has(l.id)
        ? { ...l, pixels: shiftPixels(l.pixels, doc.width, doc.height, dx, dy) }
        : l,
    );
    pushLayerOp(nextLayers, history.activeLayerId);
  }, [history.presentLayers, history.activeLayerId, layerScope, doc.width, doc.height, pushLayerOp]);
```

- [ ] **Step 2: `LayerPanel.tsx`에 props 추가**

`LayerPanel.tsx`의 함수 시그니처(파라미터 구조분해)에서, 현재:

```ts
  onFlatten,
  isPlaying,
```

다음으로 교체:

```ts
  onFlatten,
  layerScope,
  onToggleScope,
  onAlign,
  isPlaying,
```

타입 선언에서, 현재:

```ts
  onFlatten: () => void;
  // 프레임 모드 전용 재생 컨트롤.
  isPlaying: boolean;
```

다음으로 교체:

```ts
  onFlatten: () => void;
  // 체크된 레이어 집합 — 스포이트·마법봉·페인트통 판정 범위이자 "정렬" 대상.
  // 활성 레이어(activeLayerId)와는 독립적이다.
  layerScope: Set<string>;
  onToggleScope: (id: string) => void;
  onAlign: () => void;
  // 프레임 모드 전용 재생 컨트롤.
  isPlaying: boolean;
```

- [ ] **Step 3: 헤더에 "정렬" 버튼 추가**

현재(레이어 모드 헤더 행, "평탄화" 버튼 부분):

```tsx
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
```

다음으로 교체(정렬 버튼을 평탄화 왼쪽에 추가, disabled 조건 없음):

```tsx
        {layerMode === "layers" && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAlign}
              title="체크된 레이어의 그림을 캔버스 중앙으로 옮긴다"
              className="text-[10px] font-normal text-gray-400 hover:text-gray-600"
            >
              정렬
            </button>
            <button
              onClick={onFlatten}
              disabled={layers.length <= 1}
              title="모든 레이어를 하나로 평탄화"
              className="text-[10px] font-normal text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              평탄화
            </button>
          </div>
        )}
```

- [ ] **Step 4: 레이어 행에 체크박스 추가**

현재(레이어 행, `.map` 콜백 안 — `onClick={() => onSelect(layer.id)}`인 바깥쪽 `<div>` 바로 다음, `<FileThumbnail` 바로 앞):

```tsx
                <div
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${
                    isActive ? "bg-violet-50" : "hover:bg-gray-50"
                  }`}
                >
                  <FileThumbnail width={width} height={height} pixels={layer.pixels} />
```

다음으로 교체(체크박스 하나 삽입, 클릭이 행 전체의 `onSelect`로 번지지 않게 `stopPropagation`):

```tsx
                <div
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${
                    isActive ? "bg-violet-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={layerScope.has(layer.id)}
                    onChange={() => onToggleScope(layer.id)}
                    onClick={(e) => e.stopPropagation()}
                    title="판정·정렬 범위에 포함"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <FileThumbnail width={width} height={height} pixels={layer.pixels} />
```

- [ ] **Step 5: `Editor.tsx`에서 `LayerPanel`에 새 props 전달 (두 렌더링 지점 모두)**

`Editor.tsx`에 `<LayerPanel`이 두 번 나온다(넓은 레이아웃, 좁은 플로팅 레이아웃). **두 곳 모두** 다음을 적용한다.

현재(두 곳 모두 동일):

```tsx
                      onFlatten={handleFlattenLayers}
                      layerMode={layerMode}
```

다음으로 교체(들여쓰기는 각 위치에 맞춘다 — 첫 번째는 6칸, 두 번째는 4칸 들여쓰기가 이미 다르니 그 파일의 기존 들여쓰기를 그대로 유지):

```tsx
                      onFlatten={handleFlattenLayers}
                      layerScope={layerScope}
                      onToggleScope={handleToggleLayerScope}
                      onAlign={handleAlignLayers}
                      layerMode={layerMode}
```

- [ ] **Step 6: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 7: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 8: 수동 브라우저 확인**

Run: `npm run dev`, 네모네모빔 편집기에서 레이어를 3장 만든다.

확인 목록:
1. 각 레이어 행 왼쪽에 체크박스가 보이고, 기본값으로 활성 레이어(방금 새로 만든 레이어)만 체크돼 있는지 확인.
2. 레이어 2(비활성)에 도형을 칠하고, 레이어 2의 체크박스를 켠다(활성 레이어는 그대로 두고). 활성 레이어를 그대로 둔 채 스포이트로 레이어 2의 그림 위를 클릭 — 이번엔 색이 집혀야 한다(Task 2에서 확인했던 "활성 레이어만" 기본 동작이, 체크로 넓히면 그만큼 넓어짐을 확인).
3. 레이어 2의 체크박스를 다시 끄면 스포이트가 다시 그 자리에서 색을 못 집는지 확인.
4. 다른 레이어 행을 클릭해 활성 레이어를 바꿔도 체크 상태가 전혀 바뀌지 않는지 확인(완전히 독립).
5. 레이어 1·2 둘 다 체크한 채, 각각 캔버스 한쪽 구석에 작은 그림을 그리고 "정렬" 버튼을 누른다 — 두 레이어의 그림을 합친 영역이 캔버스 중앙으로 옮겨지고, 두 레이어가 서로 상대 위치를 유지한 채 같이 이동했는지 확인. 체크 안 한 레이어 3에 그림이 있었다면 그건 움직이지 않았는지 확인.
6. Ctrl/Cmd+Z로 정렬을 한 번에 되돌릴 수 있는지 확인.
7. 아무 레이어도 체크하지 않은 상태에서 "정렬"을 눌러도 아무 일도 일어나지 않는지(에러 없이 조용히 무시) 확인.
8. 프레임 모드로 전환하면 체크박스·정렬 버튼이 있던 자리가 재생 컨트롤로 바뀌고(레이어 모드 전용 UI라 헤더의 "정렬"도 사라짐) 에러가 없는지 확인.

Expected: 위 8가지 모두 통과.

- [ ] **Step 9: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx"
git commit -m "feat : 네모네모빔 레이어 체크박스로 정렬 대상 지정 + 판정 범위 확장 UI"
```
