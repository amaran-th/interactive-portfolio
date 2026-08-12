# 네모네모빔 어니언 스킨 세부 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어니언 스킨을 on/off 토글에서 투명도·범위(앞뒤 몇 프레임까지)를 조절 가능한 기능으로 확장한다. 레이어(프레임)별이 아니라 전역 값 하나이고, 프레임 모드 패널에서 설정한다.

**Architecture:** `Editor.tsx`에 두 개의 새 세션 상태(`onionSkinOpacity`, `onionSkinRange`)를 추가하고, 재생 진행용 `nextVisibleFrame`/`prevVisibleFrame`(단수)은 그대로 둔 채 어니언 스킨 전용 복수형 헬퍼를 새로 만들어 기존 `belowComposite`/`aboveLayers` 합성 로직을 확장한다. `LayerPanel.tsx`의 프레임 모드 패널에 슬라이더 UI를 추가한다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 브라우저(Playwright 임시 스크립트) 확인이다.
- 기본값은 지금 하드코딩된 동작과 완전히 같아야 한다: 투명도 기본 `ONION_SKIN_OPACITY`(0.25), 범위 기본 1(앞뒤 1장씩) — 사용자가 슬라이더를 조절하기 전까지 화면에 변화가 없어야 한다.
- 두 설정값은 세션 동안만 유지한다 — `PixelArt`/`PixelLayer` 타입에 필드를 추가하지 않고, 저장 포맷(V3)도 건드리지 않는다.
- 재생 진행에 쓰이는 기존 `nextVisibleFrame`(단수, `loop` 매개변수 있음)은 절대 변경하지 않는다 — 어니언 스킨 전용 새 함수를 따로 만든다.
- 두 슬라이더는 실행취소 스택(`history`)과 무관한 순수 뷰 상태다 — `pushLayerOp`나 드래그 코얼레싱을 쓰지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 이 저장소에는 이 작업과 무관한, 세션 내내 있어 온 사전 수정 파일들이 있다 — `git status`로 확인 후 이 태스크가 건드리는 파일만 정확히 스테이징한다. `git add -A`/`git add .`를 쓰지 않는다.

---

### Task 1: `Editor.tsx` — 상태·헬퍼·합성 로직

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: 없음(기존 `ONION_SKIN_OPACITY`, `compositeLayers`, `PixelLayer` 타입 재사용).
- Produces: 컴포넌트 스코프 상태 `onionSkinOpacity: number`(0~1), `onionSkinRange: number`(1~5), 핸들러 `handleOnionSkinOpacityChange: (opacity: number) => void`, `handleOnionSkinRangeChange: (range: number) => void` — Task 2가 `<LayerPanel>` 호출부에서 그대로 쓴다. 모듈 스코프 함수 `prevVisibleFrames(layers, currentId, count): PixelLayer[]`, `nextVisibleFrames(layers, currentId, count): PixelLayer[]`.

- [ ] **Step 1: 어니언 스킨 전용 복수형 헬퍼 추가**

`prevVisibleFrame` 함수(현재 303~312번째 줄) 다음, `computeFitTracingGeometry` 함수 이전 주석(현재 314번째 줄) 앞에 추가:

```ts
// 어니언 스킨 전용 — 현재 프레임에서 이전/다음 방향으로 최대 count장까지
// "보이는" 프레임을 가까운 순서대로 모은다. 재생(nextVisibleFrame)과 달리
// 순환하지 않는다 — 어니언 스킨은 스택 끝에서 반대편으로 넘어가 보여주면
// 오히려 혼란스럽다.
function prevVisibleFrames(
  layers: PixelLayer[],
  currentId: string,
  count: number,
): PixelLayer[] {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  const result: PixelLayer[] = [];
  for (let i = currentIndex - 1; i >= 0 && result.length < count; i--) {
    if (layers[i].visible) result.push(layers[i]);
  }
  return result;
}

function nextVisibleFrames(
  layers: PixelLayer[],
  currentId: string,
  count: number,
): PixelLayer[] {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  const result: PixelLayer[] = [];
  for (let i = currentIndex + 1; i < layers.length && result.length < count; i++) {
    if (layers[i].visible) result.push(layers[i]);
  }
  return result;
}
```

- [ ] **Step 2: 새 상태 추가**

`const [onionSkin, setOnionSkin] = useState(true);`(현재 736번째 줄) 다음 줄에 추가:

```ts
  const [onionSkin, setOnionSkin] = useState(true);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(ONION_SKIN_OPACITY);
  const [onionSkinRange, setOnionSkinRange] = useState(1);
```

- [ ] **Step 3: `belowComposite`가 범위·투명도를 반영하도록 수정**

`belowComposite` useMemo(현재 767~808번째 줄)를 다음으로 바꾼다:

```ts
  const belowComposite = useMemo(() => {
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const prevFrames = prevVisibleFrames(
        history.presentLayers,
        history.activeLayerId,
        onionSkinRange,
      );
      if (prevFrames.length === 0) return null;
      // 어니언 스킨 유령 이미지는 항상 흐린 미리보기일 뿐이다 — 각 프레임
      // 자신에 블렌드 모드·보정이 걸려 있어도 무시하고 일반 겹치기로만
      // 보여준다(프레임 모드에서는 블렌드·보정을 편집 화면에 반영하지
      // 않기로 했다). 가까운 프레임이 먼 프레임보다 위에 오도록(더 잘
      // 보이도록) 배열을 뒤집어(먼 프레임 → 가까운 프레임 순으로) 합성한다.
      return compositeLayers(
        [...prevFrames].reverse().map((frame) => ({
          ...frame,
          blendMode: "normal" as const,
          brightness: undefined,
          contrast: undefined,
          saturation: undefined,
          temperature: undefined,
          tint: undefined,
          opacity: onionSkinOpacity,
        })),
        doc.width,
        doc.height,
      );
    }
    return compositeLayerRange(
      history.presentLayers,
      0,
      activeLayerIndex - 1,
      doc.width,
      doc.height,
    );
  }, [
    layerMode,
    onionSkin,
    onionSkinOpacity,
    onionSkinRange,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
    doc.width,
    doc.height,
  ]);
```

- [ ] **Step 4: `aboveLayers`가 범위·투명도를 반영하도록 수정**

`aboveLayers` useMemo(현재 809~846번째 줄)의 프레임 모드 분기(`if (layerMode === "frames") { ... }` 블록, 현재 810~829번째 줄)를 다음으로 바꾼다 — 그 아래 레이어 모드 분기(`slice`로 시작하는 부분)는 그대로 둔다:

```ts
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const nextFrames = nextVisibleFrames(
        history.presentLayers,
        history.activeLayerId,
        onionSkinRange,
      );
      if (nextFrames.length === 0) return null;
      // 어니언 스킨 유령 이미지는 항상 흐린 미리보기일 뿐이다 — 각 프레임
      // 자신에 블렌드 모드·보정이 걸려 있어도 무시하고 일반 겹치기로만
      // 보여준다(프레임 모드에서는 블렌드·보정을 편집 화면에 반영하지
      // 않기로 했다). 가까운 프레임이 먼 프레임보다 위에 오도록(더 잘
      // 보이도록) 배열을 뒤집어(먼 프레임 → 가까운 프레임 순으로) 넘긴다.
      return [...nextFrames].reverse().map((frame) => ({
        ...frame,
        blendMode: "normal" as const,
        brightness: undefined,
        contrast: undefined,
        saturation: undefined,
        temperature: undefined,
        tint: undefined,
        opacity: onionSkinOpacity,
      }));
    }
```

그리고 이 useMemo의 의존성 배열(현재 840~846번째 줄)에 `onionSkinOpacity, onionSkinRange`를 추가한다:

```ts
  }, [
    layerMode,
    onionSkin,
    onionSkinOpacity,
    onionSkinRange,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
  ]);
```

- [ ] **Step 5: 새 핸들러 추가**

`const handleToggleOnionSkin = useCallback(() => setOnionSkin((o) => !o), []);`(현재 993번째 줄) 다음 줄에 추가:

```ts
  const handleToggleOnionSkin = useCallback(() => setOnionSkin((o) => !o), []);
  const handleOnionSkinOpacityChange = useCallback(
    (opacity: number) => setOnionSkinOpacity(opacity),
    [],
  );
  const handleOnionSkinRangeChange = useCallback(
    (range: number) => setOnionSkinRange(range),
    [],
  );
```

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음(새 핸들러 2개·상태 2개가 아직 어디서도 안 쓰여서 나는 미사용 변수 경고만 남을 수 있다 — Task 2에서 해결).

Run: `npm run lint`
Expected: 새 핸들러 2개의 미사용 경고 외에 새 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 어니언 스킨 투명도·범위 상태와 합성 로직 추가"
```

---

### Task 2: `LayerPanel.tsx` — 슬라이더 UI + 배선 + 전체 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `onionSkinOpacity: number`, `onionSkinRange: number`, `handleOnionSkinOpacityChange: (opacity: number) => void`, `handleOnionSkinRangeChange: (range: number) => void`.
- Produces: 없음(이 계획의 마지막 태스크).

- [ ] **Step 1: `LayerPanel`에 새 props 추가**

구조분해 목록에서 `onToggleOnionSkin,`(현재 74번째 줄) 다음에 추가:

```ts
  onToggleOnionSkin,
  onionSkinOpacity,
  onOnionSkinOpacityChange,
  onionSkinRange,
  onOnionSkinRangeChange,
}: {
```

타입 선언에서 `onToggleOnionSkin: () => void;`(현재 123번째 줄) 다음에 추가:

```ts
  onToggleOnionSkin: () => void;
  onionSkinOpacity: number;
  onOnionSkinOpacityChange: (opacity: number) => void;
  onionSkinRange: number;
  onOnionSkinRangeChange: (range: number) => void;
}) {
```

- [ ] **Step 2: 슬라이더 UI 추가**

어니언 스킨 토글 버튼(현재 450~460번째 줄, `<button onClick={onToggleOnionSkin}>...어니언 스킨</button>`) 바로 다음, `</div>`(프레임 모드 패널을 닫는 태그) 이전에 추가:

```tsx
          {onionSkin && (
            <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
              <label className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                투명도
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(onionSkinOpacity * 100)}
                  onChange={(e) =>
                    onOnionSkinOpacityChange(Number(e.target.value) / 100)
                  }
                  className="flex-1 accent-violet-500"
                />
                <span className="w-8 shrink-0 text-right">
                  {Math.round(onionSkinOpacity * 100)}%
                </span>
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                범위
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={onionSkinRange}
                  onChange={(e) =>
                    onOnionSkinRangeChange(Number(e.target.value))
                  }
                  className="flex-1 accent-violet-500"
                />
                <span className="w-8 shrink-0 text-right">
                  {onionSkinRange}장
                </span>
              </label>
            </div>
          )}
```

- [ ] **Step 3: `Editor.tsx`의 두 `<LayerPanel>` 호출부에 배선**

넓은 사이드바용 호출부(`onionSkin={onionSkin}`·`onToggleOnionSkin={handleToggleOnionSkin}`이 있는 곳, 현재 2914~2915번째 줄)를 다음으로 바꾼다:

```tsx
                      onionSkin={onionSkin}
                      onToggleOnionSkin={handleToggleOnionSkin}
                      onionSkinOpacity={onionSkinOpacity}
                      onOnionSkinOpacityChange={handleOnionSkinOpacityChange}
                      onionSkinRange={onionSkinRange}
                      onOnionSkinRangeChange={handleOnionSkinRangeChange}
```

좁은 플로팅 패널용 호출부(같은 두 줄, 현재 2970~2971번째 줄)도 동일하게(들여쓰기만 4칸으로) 바꾼다:

```tsx
                  onionSkin={onionSkin}
                  onToggleOnionSkin={handleToggleOnionSkin}
                  onionSkinOpacity={onionSkinOpacity}
                  onOnionSkinOpacityChange={handleOnionSkinOpacityChange}
                  onionSkinRange={onionSkinRange}
                  onOnionSkinRangeChange={handleOnionSkinRangeChange}
```

- [ ] **Step 4: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 브라우저 수동 확인**

`npm run dev`를 백그라운드로 띄우고, MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 확인한다. `localStorage`에 프레임 5장 이상짜리 캔버스(`PixelArt`, V3 포맷, `layerMode: "frames"`, 각 프레임을 서로 다른 색으로)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 열고, 가운데쯤(예: 3번째) 프레임을 활성으로 선택하면 앞뒤로 프레임이 남아있는 상태에서 검증할 수 있다.

1. 어니언 스킨을 켠 기본 상태(투명도 25%, 범위 1)에서 캔버스를 `getImageData`로 읽어, 활성 프레임 앞뒤 각 1장의 색만 흐리게(낮은 알파로) 섞여 보이고 그 바깥 프레임은 안 보이는지 확인한다(기본값이 지금까지와 동일한지 확인).
2. 범위 슬라이더를 3으로 올리면, 앞뒤 각 최대 3장까지 유령 이미지가 보이는지(캔버스 픽셀에 더 먼 프레임의 색 기여가 나타나는지) 확인한다.
3. 투명도 슬라이더를 예를 들어 80%로 올리면, 유령 이미지가 눈에 띄게 진해지는지(합성된 픽셀이 원본 프레임 색에 더 가까워지는지) 픽셀 값으로 확인한다.
4. 어니언 스킨 토글을 끄면 두 슬라이더(투명도·범위) 블록이 화면에서 사라지는지 확인한다.
5. 맨 첫 프레임을 활성으로 선택하고 범위를 3으로 둔 상태에서, 에러 없이 정상 동작하고(콘솔 에러 없음) 다음 프레임 쪽만 유령 이미지가 보이는지(이전 프레임이 없으므로) 확인한다.
6. 재생(▶) 버튼을 눌러 프레임이 정상적으로 순환 재생되는지 확인한다(어니언 스킨 범위 확장이 재생 로직에 영향 없는지).
7. "레이어" 모드로 전환하면 어니언 스킨 토글·슬라이더 UI 자체가 안 보이는지 확인한다.

각 시나리오는 실제 캔버스 픽셀 데이터(`getImageData`)나 DOM 상태(슬라이더 값, UI 요소 존재 여부)를 `page.evaluate`로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷·백그라운드 dev 서버를 모두 정리하고 `git status`로 깨끗한지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 프레임 패널에 어니언 스킨 투명도·범위 슬라이더 추가 및 배선"
```

---
