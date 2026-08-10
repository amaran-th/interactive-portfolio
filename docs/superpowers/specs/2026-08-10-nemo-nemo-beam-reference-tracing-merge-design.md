# 네모네모빔 — 레퍼런스 창과 트레이싱 모드를 하나로 합치는 설계

## 배경

[`2026-08-05-nemo-nemo-beam-tracing-mode-design.md`](./2026-08-05-nemo-nemo-beam-tracing-mode-design.md)에서 레퍼런스 창(참고용 뷰포트)과 트레이싱 모드(캔버스 배경 오버레이)를 **완전히 독립된 두 기능**으로 구현했다(창 모드/트레이싱 모드가 서로 몰라도 되고 동시에 켤 수 있는 구조, 10개 태스크로 이미 구현·리뷰·커밋 완료).

실제로 써보니 이 둘은 "같은 참고 이미지를 다르게 보여주는 방식"일 뿐 — 사실상 같은 창이다. 이번 작업은 둘을 **하나의 "레퍼런스" 개념**으로 합친다: 레퍼런스 항목 하나가 "참고 모드"(뷰포트로 확대·이동해서 보기, 스포이트 지원)와 "트레이싱 모드"(캔버스 배경에 깔아 따라 그리기, 이동·크기·회전 조정)를 **같은 이미지 데이터 위에서** 오갈 수 있다. 기본값은 참고 모드다.

**핵심 통찰: `PixelCanvas.tsx`는 이 작업에서 전혀 손댈 필요가 없다.** 이전 설계에서 `PixelCanvas`는 이미 "그릴 배경 이미지 배열"(`TracingImage[]`)만 알 뿐, 그게 어디서 왔는지는 모르는 구조로 만들어졌다. `Editor.tsx`가 통합된 레퍼런스 항목 중 트레이싱 모드인 것만 걸러 그 배열을 만들어 넘기던 걸, 지금부터도 그대로 하면 된다 — 가장 어려웠던 회전·리사이즈 기하 계산(Task 6)과 렌더링 순서(Task 5)는 이미 리뷰를 통과한 채 그대로 재사용된다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`

- `types.ts` — `ReferenceMode`, `ReferenceItem` 타입 추가(`TracingImage`는 그대로 유지 — PixelCanvas가 쓰는 "캔버스 배경 이미지" 타입으로 계속 쓰인다)
- `ReferenceWindow.tsx` — 모드 토글 추가, 트레이싱 모드일 때의 body(썸네일·투명도·조정 버튼)를 흡수
- `TracingControlWindow.tsx` — **삭제** (내용이 `ReferenceWindow.tsx`에 흡수됨)
- `TracingListPanel.tsx` — 그대로 유지(narrow는 항상 트레이싱 모드이므로 지금 하던 일 그대로), 데이터 소스만 `Editor.tsx`에서 새로 파생한 배열로 교체
- `Editor.tsx` — `referenceWindows`(창 UI 상태)/`referenceItems`(데이터) 두 배열로 통합, 메뉴 바를 "레퍼런스" 버튼 하나로 축소, narrow 아이콘 컬럼의 트레이싱 아이콘을 "레퍼런스"로 개명하고 상시 노출로 전환

`useKeyboardShortcuts.ts`, `useImageFileLoader.ts`, `PixelCanvas.tsx`는 변경 없음.

## 데이터 모델

`types.ts`에 추가(`TracingImage`는 삭제하지 않고 그대로 둔다):

```ts
export type ReferenceMode = "lookup" | "tracing"; // 참고 모드 / 트레이싱 모드

// 레퍼런스 창 하나가 다루는 통합 데이터 — 참고 모드로 보다가 트레이싱 모드로
// 전환해도 같은 이미지·id를 유지한다. 세션 메모리 전용, 저장 안 됨(기존과 동일).
export type ReferenceItem = {
  id: string;
  image: HTMLImageElement | null; // 아직 안 불러왔으면 null
  mode: ReferenceMode;
  // 트레이싱 모드에 처음 들어갈 때 한 번만 채워지고, 이후 참고 모드로 돌아가도
  // 유지된다(모드를 오가도 캔버스 위 위치·크기·회전·투명도를 기억하기 위함).
  // TracingImage와 필드가 같지만 id/image가 빠진 부분집합이라 별도 타입으로 뺀다.
  tracingGeometry: Omit<TracingImage, "id" | "image"> | null;
};

export const DEFAULT_REFERENCE_MODE: ReferenceMode = "lookup";
```

`MIN_TRACING_SIZE`/`DEFAULT_TRACING_OPACITY`는 그대로 쓴다(트레이싱 지오메트리 초기값 계산에 여전히 필요).

## `Editor.tsx` 상태 통합

기존 `referenceWindows`(레퍼런스 창 전용, `{id, zIndex, spawnIndex}[]`)와 `tracingWindows`(트레이싱 창 전용, `{id, zIndex, spawnIndex, minimized}[]`)를 **하나의 `referenceWindows`**로 합친다 — 이제 창은 모드와 무관하게 전부 이 배열 하나로 관리된다. `minimized`는 Editor가 들 필요 없이(기존 `ReferenceWindow.tsx`처럼) 창 컴포넌트 로컬 상태로 되돌린다 — Editor가 몰라도 되는 순수 UI 상태이기 때문이다.

```ts
const [referenceWindows, setReferenceWindows] = useState<
  { id: string; zIndex: number; spawnIndex: number }[]
>([]);
const [referenceItems, setReferenceItems] = useState<ReferenceItem[]>([]);
// 캔버스 위에서 조정 손잡이가 떠 있는 대상 — mode가 "tracing"인 항목만
// 의미가 있다("조정" 버튼도 트레이싱 모드일 때만 보인다).
const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);
```

`tracingMode`(전역 on/off 플래그)는 **삭제**한다 — 더 이상 "전체를 숨기는" 개념이 없다. 안 보고 싶으면 그 항목을 참고 모드로 돌리거나 닫으면 된다.

### 핸들러 (기존 `handleTracing*`를 `handleReference*`로 재정리)

- `openReferenceWindow()` — 기존과 동일하게 `referenceWindows`에 빈 창 항목 하나 추가(계단식 배치). `referenceItems`에는 아직 아무것도 안 만든다(이미지 불러오기 전).
- `handleReferenceImageLoaded(id, image)` — 그 창에 처음 이미지가 로드되면 `referenceItems`에 `{ id, image, mode: DEFAULT_REFERENCE_MODE, tracingGeometry: null }`을 추가한다.
- `handleReferenceListAdd(image)` (narrow 전용, `TracingListPanel`의 `onAdd`) — 새 id를 만들어 `handleReferenceImageLoaded`를 재사용하되, **`mode: "tracing"`으로 강제**하고 즉시 `tracingGeometry`도 계산해 채운다(narrow는 참고 모드 뷰가 없으므로 트레이싱으로 바로 시작해야 화면에 뭔가 보인다).
- `handleReferenceModeChange(id, mode)` — 그 항목의 `mode`를 바꾼다. `mode === "tracing"`으로 바뀌는 순간 `tracingGeometry`가 아직 `null`이고 `image`가 있으면, 기존 `handleTracingImageLoaded`가 하던 것과 같은 계산(캔버스에 맞춰 가운데 정렬한 fit 크기, `rotationDeg: 0`, `opacity: DEFAULT_TRACING_OPACITY`)으로 한 번만 채운다. 이미 값이 있으면 그대로 둔다(모드를 오가도 위치 기억). 반대로 `"tracing"`에서 다른 모드로 바뀌는데 그 항목이 `activeReferenceId`였다면 함께 해제한다 — 안 그러면 손잡이가 안 보이는 참고 모드를 거쳤다가 나중에 다시 트레이싱으로 돌아왔을 때 조정 손잡이가 사용자가 누르지도 않았는데 뜬금없이 다시 나타난다.
- `handleReferenceOpacityChange(id, opacity)` — `tracingGeometry.opacity`만 갱신.
- `handleReferenceDelete(id)` — 창 항목 + 데이터 항목을 함께 지우고, 조정 중이었다면 `activeReferenceId`도 해제(기존 `handleTracingDelete`와 동일한 역할, `referenceWindows`/`referenceItems` 대상으로).
- `handleToggleReferenceAdjust(id)` — `activeReferenceId` 토글(기존 `handleToggleTracingAdjust`와 동일).
- `handleActiveReferenceGeometryChange(patch)` — `activeReferenceId`인 항목의 `tracingGeometry`를 patch(기존 `handleActiveTracingChange`와 동일한 역할, 저장 위치만 `item.tracingGeometry`로 한 단계 더 들어감).
- `handleReferenceDeselect()` — `activeReferenceId`를 `null`로(기존 `handleTracingDeselect`와 동일).

### PixelCanvas·narrow 리스트에 넘길 배열 파생

`PixelCanvas`(변경 없음)와 `TracingListPanel`(변경 없음)이 원하는 모양(`TracingImage[]`)은 여전히 "이미지가 있고 트레이싱 모드인 항목들"이다 — 이 파생을 한 곳에서 만들어 둘 다에서 재사용한다:

```ts
const tracingCanvasImages: TracingImage[] = referenceItems
  .filter(
    (r): r is ReferenceItem & { image: HTMLImageElement; tracingGeometry: NonNullable<ReferenceItem["tracingGeometry"]> } =>
      r.mode === "tracing" && r.image !== null && r.tracingGeometry !== null,
  )
  .map((r) => ({ id: r.id, image: r.image, ...r.tracingGeometry }));

const activeReferenceItem = referenceItems.find((r) => r.id === activeReferenceId) ?? null;
const activeTracingCanvasImage: TracingImage | null =
  activeReferenceItem?.mode === "tracing" &&
  activeReferenceItem.image &&
  activeReferenceItem.tracingGeometry
    ? { id: activeReferenceItem.id, image: activeReferenceItem.image, ...activeReferenceItem.tracingGeometry }
    : null;
```

`<PixelCanvas>`에는 이제 `tracingMode ? ... : []` 삼항 없이 그냥 `tracingImages={tracingCanvasImages}`, `activeTracingImage={activeTracingCanvasImage}`를 넘긴다(전역 on/off가 없어졌으므로 필요 없다). `onActiveTracingChange`는 `handleActiveReferenceGeometryChange`를, `onActiveTracingDeselect`는 `handleReferenceDeselect`를 그대로 연결한다 — **PixelCanvas가 받는 prop 이름·타입은 한 글자도 안 바뀐다.**

`TracingListPanel`에도 `tracingImages={tracingCanvasImages}`를 그대로 넘긴다(이 컴포넌트는 변경 없음 — narrow는 정의상 트레이싱 항목만 다루므로 지금 하던 그대로 맞는다).

## 메뉴 바 · narrow 아이콘 통합

메뉴 바의 "레퍼런스"/"트레이싱"/"+ 이미지" 세 버튼을 **"레퍼런스" 하나**로 되돌린다 — `openReferenceWindow`만 호출한다. `narrow`일 때 아예 숨기던 것도 없앤다: wide에서는 이 버튼이 새 창을 띄우고, narrow에서는(원래도 그랬듯) 이 버튼 자체가 안 보이는 대신 사이드 아이콘 컬럼 쪽 진입점을 쓴다 — 이 부분은 기존 "narrow에서는 창 모드 없음" 정책을 유지한다(참고 모드의 자유 드래그 뷰포트 UX가 narrow에 안 맞는다는 원래 판단은 그대로 유효).

narrow 아이콘 컬럼의 4번째 버튼은 `{tracingMode && (...)}` 조건을 없애고(전역 플래그가 사라졌으므로) Layers/Import/Export 버튼과 똑같이 **항상 노출**한다. 라벨·타이틀을 "트레이싱" → "레퍼런스"로 바꾼다. 클릭하면 뜨는 팝업 안 `<TracingListPanel>`은 그대로 — `onAdd`만 `handleReferenceListAdd`로 바뀐다.

## `ReferenceWindow.tsx` — 모드 토글 흡수

기존 시그니처에 다음을 더한다:

```ts
{
  // ...기존 props(onClose, boundsRef, eyedropperActive, onPickColor, zIndex, spawnIndex, onFocus)
  mode: ReferenceMode;
  onModeChange: (mode: ReferenceMode) => void;
  onImageLoaded: (image: HTMLImageElement) => void; // 기존엔 내부에서 setImage로 끝, 이제 Editor가 알아야 하므로 올려보낸다
  image: HTMLImageElement | null; // 기존 로컬 useState<HTMLImageElement | null>(null) 대신 Editor의 referenceItems에서 받는다
  // 트레이싱 모드 전용 — mode === "tracing"일 때만 쓰인다
  tracingGeometry: Omit<TracingImage, "id" | "image"> | null;
  isAdjusting: boolean;
  onToggleAdjust: () => void;
  onOpacityChange: (opacity: number) => void;
}
```

`image` 상태는 이제 Editor가 소유한다(참고 모드↔트레이싱 모드 전환에도 같은 이미지가 필요하므로 창 로컬에 가둘 수 없다) — 기존 `const [image, setImage] = useState<HTMLImageElement | null>(null);`을 지우고 prop으로 받는다. `zoom`(참고 모드 뷰포트 배율)은 계속 창 로컬 상태로 남는다 — Editor·트레이싱 쪽 어디서도 안 쓰는 순수 뷰 상태이기 때문이다. `useImageFileLoader`의 `onLoaded` 콜백도 `setImage(img)` 대신 `onImageLoaded(img)`(Editor로 위임)로 바뀐다.

제목표시줄 아래, 본문 위에 모드 토글을 추가한다(최소화됐을 땐 안 보임 — 제목표시줄 자체는 그대로 둔다):

```tsx
<div className="flex border-b border-gray-100 text-[10px]">
  <button
    onClick={() => onModeChange("lookup")}
    className={`flex-1 py-1 ${mode === "lookup" ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
  >
    참고
  </button>
  <button
    onClick={() => onModeChange("tracing")}
    className={`flex-1 py-1 ${mode === "tracing" ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
  >
    트레이싱
  </button>
</div>
```

본문(`{!minimized && (...)}` 안)은 이제 `mode`로 분기한다:

- **`mode === "lookup"`**: 지금 `ReferenceWindow.tsx`가 하던 본문(이미지 없으면 드래그드롭/파일선택/붙여넣기, 있으면 뷰포트+줌+스포이트+확대경) — **한 글자도 안 바뀐다**, `image`만 로컬 state 대신 prop에서 읽도록 참조만 바꾼다.
- **`mode === "tracing"`**: `TracingControlWindow.tsx`가 하던 본문(이미지 없으면 같은 드래그드롭/파일선택/붙여넣기 UI, 있으면 썸네일+투명도 슬라이더+"조정" 버튼) — `tracing.opacity`였던 참조를 `tracingGeometry!.opacity`로, `onToggleAdjust`/`isActive`를 `onToggleAdjust`/`isAdjusting`으로 이름만 맞춰 그대로 옮긴다.

두 모드 모두 이미지가 없을 때는 완전히 같은 "불러오기" UI를 쓰므로(둘 다 `useImageFileLoader` 기반, 문구도 동일), 이 부분은 모드 분기 **밖**에 두고 `!image`일 때 공통으로 렌더링한다 — 중복 제거.

창 크기: 참고 모드는 지금처럼 자유 리사이즈(`DEFAULT_WIDTH/HEIGHT`, 우하단 손잡이)를 유지한다. 트레이싱 모드는 `TracingControlWindow`처럼 고정 폭(`WINDOW_WIDTH = 220`, 리사이즈 없음)이 본문 성격상 더 맞는다 — 모드에 따라 `size`/리사이즈 손잡이 렌더링 여부를 분기한다(참고 모드일 때만 리사이즈 손잡이와 가변 `size.height`를 쓰고, 트레이싱 모드일 때는 `TracingControlWindow`처럼 폭 고정·높이 자동).

## `TracingControlWindow.tsx` 삭제

전체 삭제. `Editor.tsx`의 import와 `{tracingWindows.map(...)}` 렌더 블록도 함께 제거된다(아래 참고).

## `Editor.tsx` 렌더링 통합

기존 `{referenceWindows.map(...)}`(참고 전용)와 `{tracingMode && tracingWindows.map(...)}`(트레이싱 전용) 두 블록을 **하나**로 합친다:

```tsx
{referenceWindows.map((w) => {
  const item = referenceItems.find((r) => r.id === w.id) ?? null;
  return (
    <ReferenceWindow
      key={w.id}
      boundsRef={rootRef}
      eyedropperActive={tool === "eyedropper"}
      onPickColor={handlePickColor}
      onClose={() => handleReferenceDelete(w.id)}
      zIndex={w.zIndex}
      spawnIndex={w.spawnIndex}
      onFocus={() => bringReferenceWindowToFront(w.id)}
      mode={item?.mode ?? DEFAULT_REFERENCE_MODE}
      onModeChange={(mode) => handleReferenceModeChange(w.id, mode)}
      image={item?.image ?? null}
      onImageLoaded={(image) => handleReferenceImageLoaded(w.id, image)}
      tracingGeometry={item?.tracingGeometry ?? null}
      isAdjusting={activeReferenceId === w.id}
      onToggleAdjust={() => handleToggleReferenceAdjust(w.id)}
      onOpacityChange={(opacity) => handleReferenceOpacityChange(w.id, opacity)}
    />
  );
})}
```

## 범위 밖

- 참고 모드 전용 상태(뷰포트 줌·스크롤 위치)를 모드 전환 중에 기억 — 트레이싱으로 갔다가 참고로 돌아오면 줌은 100%로 리셋된다(뷰포트 줌은 창 로컬 상태라 애초에 저장 대상이 아니었다 — 이 동작은 병합 전 레퍼런스 창 단독 사용 때와 동일).
- 참고 모드에서도 이동·크기·회전 손잡이로 캔버스 위 위치를 미리 보기 — 참고 모드는 여전히 순수 뷰포트일 뿐, 캔버스에는 전혀 나타나지 않는다(트레이싱 모드로 바꿔야 캔버스에 보인다).
- narrow에서 참고 모드 진입 — 여전히 지원하지 않는다(narrow는 항상 트레이싱).
- 창 접기(최소화)는 기존 `Minus` 버튼 그대로 — 새 UI를 추가하지 않는다(사용자 확인 완료).
