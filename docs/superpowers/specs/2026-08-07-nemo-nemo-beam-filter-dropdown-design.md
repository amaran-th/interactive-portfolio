# 네모네모빔 필터(블렌드·보정) 드롭다운 패널 전환 설계

**목표:** `LayerPanel.tsx`에서 항상 펼쳐져 있는 블렌드 모드·색보정 UI를 아이콘 트리거 버튼 + 드롭다운 패널로 바꾸고, 보정값 초기화 버튼을 추가하고, 스타일을 네모네모빔의 보라색(violet) 베이스에 맞춘다.

**배경:** 블렌드 모드·색보정 기능(레이어 속성으로 영구 저장, 언제든 재편집 가능)은 이미 구현·리뷰 완료된 상태다. 이번 작업은 그 기능 자체가 아니라 UI 표현 방식만 바꾼다 — 데이터 모델(`PixelLayer`의 `blendMode`/`brightness`/`contrast`/`saturation`/`temperature`/`tint`)과 합성 로직(`pixelGrid.ts`)은 전혀 건드리지 않는다.

## 현재 상태

`LayerPanel.tsx`의 "layers" 모드 분기 안, 투명도 슬라이더 블록(262~305번째 줄) 다음에 블렌드 모드 `<select>`와 보정 슬라이더 5개가 항상 펼쳐진 채로 렌더링된다. 회색 톤(`bg-gray-100`, `text-gray-500`, `text-gray-600`)으로 스타일링되어 있고, 사이드바 공간을 항상 차지한다.

## 새 구조 — 트리거 버튼 + 드롭다운 패널

`DrawToolbar.tsx`의 기존 "더보기" 드롭다운 패턴(`showMoreDrawTools` 로컬 state + `absolute top-full ... bg-white p-2 shadow-xl` 패널)을 그대로 따른다.

- 새 로컬 state `const [showFilterPanel, setShowFilterPanel] = useState(false);`
- 지금 블렌드·보정 블록이 있던 자리(투명도 슬라이더 블록 다음)를, 아이콘 전용 토글 버튼 하나로 교체한다. 아이콘은 `lucide-react`의 `SlidersHorizontal`.
- 버튼을 감싸는 `<div className="relative ...">`가 있어야 드롭다운 패널이 그 버튼 기준으로 절대 위치를 잡는다.
- 버튼 클릭 시 `setShowFilterPanel((v) => !v)`. 패널은 트리거를 다시 눌러야 닫힌다 — 바깥 클릭 감지나 슬라이더 조작 시 자동 닫힘은 넣지 않는다(여러 슬라이더를 연달아 조작해야 하는 UI라 자동 닫힘이 오히려 방해된다. `DrawToolbar`의 기존 드롭다운도 같은 이유로 바깥 클릭 처리가 없다).
- `showFilterPanel && (...)` 조건으로 패널을 렌더링한다. 패널 안 내용(블렌드 모드 `<select>` + 5개 슬라이더)은 지금 코드 그대로 옮기되, 아래 "스타일" 절의 색상만 바꾼다.

## 트리거 버튼 — 활성 상태 강조

필터가 "걸려 있는지"(블렌드 모드가 Normal이 아니거나, 보정 5개 중 하나라도 0이 아닌지)를 판정하는 `hasActiveFilter` 불리언을 계산한다:

```ts
const hasActiveFilter =
  (activeLayer.blendMode ?? "normal") !== "normal" ||
  !!activeLayer.brightness ||
  !!activeLayer.contrast ||
  !!activeLayer.saturation ||
  !!activeLayer.temperature ||
  !!activeLayer.tint;
```

트리거 버튼은 `hasActiveFilter`가 true면 보라색(`bg-violet-500 text-white`), false면 회색 톤(`bg-gray-100 text-gray-600 hover:bg-gray-200`)으로 스타일링한다 — `DrawToolbar.tsx`의 좁은 화면용 "더보기" 버튼이 하위 도구 선택 여부에 따라 보라색으로 바뀌는 것과 같은 패턴. 이렇게 하면 패널을 열지 않고도 지금 필터가 걸려 있는지 한눈에 알 수 있다.

## 스타일 — 보라색 베이스

- 패널 컨테이너: `absolute top-full left-0 z-30 mt-1 w-48 flex flex-col gap-1 bg-white p-2 shadow-xl`(`DrawToolbar`의 드롭다운 패널과 같은 톤 — 너비만 슬라이더 레이아웃에 맞게 `w-48` 정도로 지정).
- 블렌드 모드 `<select>`: 기존 스타일(`bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600`) 유지 — `ColorWheel.tsx`의 기존 `<select>` 관례와 일치하는 스타일이라 굳이 바꾸지 않는다.
- 5개 `<input type="range">`: `className`에 `accent-violet-500`을 추가해 슬라이더 자체의 색(채워진 트랙·손잡이)을 보라색 계열로 바꾼다. 지금은 브라우저 기본 색(대개 파란색 계열)이 그대로 노출되어 있다.
- "초기화" 버튼(아래 절): `text-[10px] text-violet-500 hover:text-violet-700`(텍스트만 있는 링크 스타일 버튼 — 슬라이더 5개 밑에 작게 둔다. `Editor.tsx`의 "되돌리기 안내" 링크(`text-violet-400 underline underline-offset-2 hover:text-violet-500`, 2701·2708번째 줄)와 톤을 맞춘다).

## 초기화 버튼

패널 안, 5개 슬라이더 다음에 추가한다:

```tsx
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
```

**초기화 범위:** 보정 5개(밝기·대비·채도·색온도·틴트)만 0으로 되돌린다. 블렌드 모드는 건드리지 않는다 — Normal로 되돌리고 싶으면 드롭다운에서 직접 고르면 되므로, "레이어의 모든 필터 효과 지우기"가 아니라 "보정 슬라이더만 초기화"로 범위를 좁힌다(사용자 확정 사항).

## 새 props

`LayerPanel`에 새 prop 하나 추가:

```ts
onResetAdjustments: (id: string) => void;
```

기존 `onOpacityDragEnd`/`onBlendModeChange`/`onAdjustmentChange`/`onAdjustmentDragEnd`와 같은 자리(구조분해 목록·타입 선언 둘 다)에 끼워 넣는다.

## `Editor.tsx` 변경

새 핸들러 `handleResetAdjustments`를 기존 `handleLayerAdjustmentChange`/`handleLayerBlendModeChange` 근처에 추가한다:

```ts
const handleResetAdjustments = useCallback(
  (id: string) => {
    const nextLayers = history.presentLayers.map((l) =>
      l.id === id
        ? {
            ...l,
            brightness: undefined,
            contrast: undefined,
            saturation: undefined,
            temperature: undefined,
            tint: undefined,
          }
        : l,
    );
    pushLayerOp(nextLayers, history.activeLayerId);
  },
  [history.presentLayers, history.activeLayerId, pushLayerOp],
);
```

(`handleLayerBlendModeChange`와 같은 패턴 — 드래그가 아니라 한 번의 클릭이므로 코얼레싱 없이 바로 `pushLayerOp`로 실행취소 항목 하나를 남긴다.)

두 `<LayerPanel>` 호출부(넓은 사이드바·좁은 플로팅 패널) 모두에 `onResetAdjustments={handleResetAdjustments}`를 추가한다 — 기존 `onAdjustmentDragEnd={handleAdjustmentDragEnd}` 다음 줄.

## 영향받지 않는 것

- `PixelLayer` 타입, `pixelGrid.ts`의 합성·블렌드 수식, 저장 포맷(V3) — 전혀 변경 없음.
- 드래그 코얼레싱(`dragCoalesceRef`) 로직 — 슬라이더 자체의 동작(드래그 중 실행취소 항목 하나로 묶기)은 그대로 유지. 패널을 여닫는 것과는 무관하다.
- 프레임 모드 — 이 UI는 `layerMode === "layers"` 분기 안에만 있으므로(기존과 동일), 프레임 모드에서는 지금처럼 아예 보이지 않는다.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 스크립트, 이전 작업들과 같은 방식)로 다음을 확인한다:

1. 트리거 버튼 클릭 → 패널이 열리고, 다시 클릭 → 닫힌다.
2. 블렌드 모드를 Normal이 아닌 값으로 바꾸면 트리거 버튼이 보라색으로 바뀐다(패널을 닫아도 유지).
3. 슬라이더 하나를 0이 아닌 값으로 두면 트리거 버튼이 보라색으로 바뀐다.
4. "초기화" 클릭 → 슬라이더 5개가 전부 0으로 돌아가고, 블렌드 모드는 그대로 유지된다. Ctrl+Z 한 번으로 초기화 이전 값으로 되돌아간다.
5. 보정이 전부 기본값(블렌드 Normal, 슬라이더 전부 0)이면 "초기화" 버튼이 비활성화된다.
6. 넓은 사이드바·좁은 플로팅 패널 두 레이아웃 모두에서 동일하게 동작한다.
