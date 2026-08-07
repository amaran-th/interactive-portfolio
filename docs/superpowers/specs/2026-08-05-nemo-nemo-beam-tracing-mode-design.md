# 네모네모빔 — 레퍼런스 모드를 창/트레이싱 둘로 분리하는 설계

## 배경

지금 "레퍼런스" 기능은 [`ReferenceWindow.tsx`](../../../app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx) 하나뿐이다 — 메뉴 바의 "레퍼런스" 버튼을 누르면 편집기 위에 떠다니는 OS 창 스타일 팝업이 열리고, 그 안에서 참고 이미지를 확대·이동해가며 보거나 스포이트로 색을 뽑는다. 여러 개를 동시에 띄울 수 있고, 저장되지 않는 세션 일회성 상태다.

이번 작업은 여기에 **캔버스 배경에 참고 이미지를 은은하게 깔아두고 따라 그리는(트레이싱) 기능**을 추가한다. 기존 레퍼런스 창은 손대지 않고 그대로 둔 채, 완전히 독립적인 새 기능으로 얹는다 — 두 기능은 서로 몰라도 되고 동시에 켜둘 수 있다(모드 전환이 아니다).

**단, 모바일(narrow 레이아웃)에서는 창 모드를 아예 지원하지 않는다** — 좁은 화면에서 여러 개의 자유 드래그 창은 다루기 어렵기 때문에, "레퍼런스" 버튼 자체를 숨기고 트레이싱 모드만 제공한다. 트레이싱 이미지 목록도 떠다니는 미니 창이 아니라, 이미 `LayerPanel`이 narrow에서 쓰고 있는 "아이콘 → 플로팅 리스트 팝업" 패턴을 그대로 재사용한다. 자세한 내용은 "모바일(narrow) 레이아웃" 절 참고.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`

- `types.ts` — `TracingImage` 타입, 기본값 상수 추가
- `TracingControlWindow.tsx`(신규, **wide 전용**) — 트레이싱 이미지 1장당 뜨는 미니 컨트롤 창(레퍼런스 창과 같은 시각 언어)
- `TracingListPanel.tsx`(신규, **narrow 전용**) — `LayerPanel.tsx` 스타일의 세로 목록. narrow에서 `TracingControlWindow` 대신 쓴다
- `useImageFileLoader.ts`(신규, 작은 리팩터) — `ReferenceWindow.tsx`의 파일/드래그드롭/클립보드 붙여넣기 로딩 로직을 훅으로 뽑아 `TracingControlWindow.tsx`/`TracingListPanel.tsx`와 공유
- `ReferenceWindow.tsx` — 위 훅을 쓰도록 내부 로딩 로직만 교체(동작 변화 없음)
- `PixelCanvas.tsx` — 트레이싱 이미지 배경 렌더링 + 조정 중인 이미지의 이동·크기·회전 핸들 오버레이(narrow/wide 공통)
- `Editor.tsx` — 트레이싱 모드 on/off, `tracingImages` 상태, wide는 미니 창 관리, narrow는 `openFloatingPanel`에 `"tracing"` 추가, 메뉴 바 버튼(레퍼런스 버튼은 `!narrow`일 때만)
- `useKeyboardShortcuts.ts` — Escape로 조정 중인 트레이싱 이미지 선택 해제

## 데이터 모델

`types.ts`에 추가:

```ts
export type TracingImage = {
  id: string;
  image: HTMLImageElement; // 세션 메모리에만 존재, 저장 안 됨
  // 캔버스 네이티브 픽셀 좌표계(그리드 단위) — 캔버스를 확대·스크롤하면
  // PixelCanvas의 기존 scale 변환을 그대로 타고 함께 움직인다.
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number; // 자유각, 0~360
  opacity: number; // 0~1
};

export const DEFAULT_TRACING_OPACITY = 0.5;
export const MIN_TRACING_SIZE = 8; // 그리드 단위, 너무 작아져 조작 불가능해지는 것 방지
```

`Editor.tsx`:

```ts
const [tracingMode, setTracingMode] = useState(false);
const [tracingImages, setTracingImages] = useState<TracingImage[]>([]);
// 조정 핸들이 지금 어느 이미지에 떠 있는지 — 한 번에 하나만 조정 가능.
const [activeTracingId, setActiveTracingId] = useState<string | null>(null);
// 미니 컨트롤 창 자체의 위치·z-index — referenceWindows와 완전히 같은 패턴.
const [tracingWindows, setTracingWindows] = useState<
  { id: string; zIndex: number; spawnIndex: number; minimized: boolean }[]
>([]);
const tracingZRef = useRef(60);
const tracingSpawnRef = useRef(0);
```

`tracingImages`와 `tracingWindows`는 `id`로 짝을 이루는 병렬 배열이다 — 이미지 자체(위치·크기·회전·투명도)와 창 UI 상태(위치·최소화)를 분리해, 창을 드래그해도 이미지 지오메트리 계산과 섞이지 않게 한다(레퍼런스 창이 이미지 데이터와 창 위치를 한 컴포넌트 안에서 같이 들고 있는 것과 달리, 여기서는 여러 장을 동시에 다루므로 Editor가 두 배열을 함께 관리).

**탭(문서)별이 아니라 편집기 세션 전체에서 공유**한다 — `referenceWindows`와 동일한 스코프. 다른 크기의 캔버스 탭으로 전환해도 같은 `tracingImages` 배열을 그대로 쓴다(좌표가 새 캔버스 밖으로 나갈 수 있음 — "범위 밖" 참고).

## 트레이싱 모드 켜기/끄기 & 이미지 추가

메뉴 바의 기존 "레퍼런스" 버튼을 `{!narrow && (...)}`로 감싸 narrow에서는 아예 렌더링하지 않는다. 그 옆에 narrow/wide 공통으로 뜨는 독립 토글 버튼 "트레이싱"을 추가한다. 레퍼런스 버튼과 똑같은 스타일(켜져 있으면 `bg-violet-50 text-violet-700`)을 쓰되 별개의 상태(`tracingMode`)를 토글할 뿐, 레퍼런스 창과는 아무 관계가 없다.

```tsx
{!narrow && (
  <button onClick={openReferenceWindow} className={...}>레퍼런스</button>
)}
<button onClick={() => setTracingMode((v) => !v)} className={...}>
  트레이싱
</button>
{tracingMode && !narrow && (
  <button onClick={openTracingWindow} title="트레이싱 이미지를 추가합니다">
    + 이미지
  </button>
)}
```

`tracingMode`는 오직 **렌더링 표시 여부**만 결정한다 — 꺼도 `tracingImages`/`tracingWindows` 상태는 그대로 남고(창도 사라지지 않고 화면에서만 숨김), 다시 켜면 그대로 복원된다. wide에서 새 이미지 추가(`openTracingWindow`)는 `openReferenceWindow`와 같은 패턴으로 빈 상태의 `TracingControlWindow`를 계단식 배치로 하나 더 띄운다 — 이미지는 그 창에서 파일 선택/드래그드롭/붙여넣기로 불러온 뒤에야 `tracingImages`에 항목이 생긴다(불러오기 전에는 `tracingWindows`에만 존재). narrow에서 이미지를 추가하는 방법은 "모바일(narrow) 레이아웃" 절 참고.

이미지를 불러오면 초기 지오메트리는 캔버스 안에 전체가 들어오도록 맞추고 가운데 정렬한다(`ReferenceWindow`의 `fitScale` 계산과 같은 방식으로 `min(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight)`를 구해 `width`/`height`를 정하고, `x`/`y`는 캔버스 중앙 정렬), `opacity: DEFAULT_TRACING_OPACITY`, `rotationDeg: 0`으로 시작한다.

## 미니 컨트롤 창 (`TracingControlWindow.tsx`, 신규, **wide 전용**)

레퍼런스 창의 제목표시줄 드래그·최소화·닫기·계단식 스폰 패턴(`ReferenceWindow.tsx`의 `pos`/`handleTitleDown/Move/Up`/`clampPos`/cascade 로직)을 그대로 재사용한 축소판이다. 뷰포트·줌·스포이트 관련 코드는 전혀 없다.

```tsx
export default function TracingControlWindow({
  tracing, // TracingImage | null — 아직 이미지 없으면 null
  isActive, // 지금 조정 핸들이 떠 있는 대상인지
  boundsRef,
  zIndex,
  spawnIndex,
  minimized,
  onFocus,
  onToggleMinimize,
  onClose,
  onImageLoaded, // (image: HTMLImageElement) => void — 처음 이미지를 불러올 때
  onOpacityChange, // (opacity: number) => void
  onToggleAdjust, // () => void — "조정" 버튼, isActive 토글
}: { ... }): JSX.Element;
```

내부 레이아웃: 제목표시줄("트레이싱") + 최소화/닫기 버튼(레퍼런스 창과 동일) → 본문은 두 상태:
- **이미지 없음**: `ReferenceWindow`의 빈 상태와 똑같은 드래그드롭/파일 선택/클립보드 붙여넣기 UI(`useImageFileLoader` 훅 사용).
- **이미지 있음**: 작은 썸네일(`<img>` 또는 `object-fit: contain` 캔버스) + 투명도 슬라이더(`LayerPanel.tsx:161-178`의 `<input type="range" min={0} max={100}>` 패턴 재사용) + "조정" 버튼(눌려있으면 강조 표시, `isActive`와 동기화) + 삭제 버튼.

### `useImageFileLoader.ts` (신규 훅, 작은 리팩터)

`ReferenceWindow.tsx:132-173`의 `loadFile`/`handleDrop`/`handlePasteFromClipboard`/`objectUrlRef` 정리 로직을 그대로 뽑아낸 훅:

```ts
export function useImageFileLoader(onLoaded: (img: HTMLImageElement) => void): {
  loadFile: (file: File) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePasteFromClipboard: () => Promise<void>;
  isDragOver: boolean;
  setIsDragOver: (v: boolean) => void;
};
```

`ReferenceWindow.tsx`는 이 훅을 쓰도록 내부 구현만 교체한다(동작·시그니처 변화 없음, 순수 내부 리팩터). 같은 30줄 가까운 로직을 두 컴포넌트에 복붙하지 않기 위한 최소한의 추출이다.

## 캔버스 렌더링 (`PixelCanvas.tsx`)

트레이싱 이미지는 픽셀 데이터가 아니라 **진짜 이미지**로, 그리드 셀 단위가 아니라 자유 좌표로 그려야 한다(그래서 `belowComposite`/`aboveComposite`처럼 `PixelValue[]`로 합성하는 기존 레이어 메커니즘과는 별개다). `draw()` 콜백(`PixelCanvas.tsx:455` 부근, `ctx.clearRect` 직후 — 그리드·픽셀·pendingImage보다 먼저, 항상 맨 뒤에 깔리도록)에 삽입한다:

```ts
// belowComposite/활성 레이어/aboveComposite/그리드보다 먼저 그려서 항상
// 맨 뒤에 깔리게 한다 — 실제 픽셀 데이터가 아니라 눈으로 보는 보조선이므로
// 내보내기(exportPixelArt.ts)에서는 이 캔버스를 아예 참조하지 않는다.
if (tracingImages.length > 0) {
  for (const t of tracingImages) {
    ctx.save();
    ctx.globalAlpha = t.opacity;
    const cx = (t.x + t.width / 2) * scale;
    const cy = (t.y + t.height / 2) * scale;
    ctx.translate(cx, cy);
    ctx.rotate((t.rotationDeg * Math.PI) / 180);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      t.image,
      (-t.width / 2) * scale,
      (-t.height / 2) * scale,
      t.width * scale,
      t.height * scale,
    );
    ctx.restore();
  }
}
```

`width`/`height`/`showGrid` 등과 같은 `useCallback` 의존성 배열에 `tracingImages`를 추가한다. **내보내기(PNG/SVG/GIF 등)는 이 레이어를 절대 참조하지 않는다** — `exportPixelArt.ts`는 지금처럼 `doc.pixels`/`PixelLayer`만 읽으므로 별도 변경이 필요 없다(트레이싱 이미지가 실제 픽셀에 섞일 방법 자체가 없다).

## 조정 상호작용 — 이동·크기·자유각 회전

`PixelCanvas.tsx`가 `pendingImage`에 이미 갖고 있는 "캔버스 위 절대 위치 div 오버레이 + 포인터 드래그" 패턴(`PixelCanvas.tsx:1364-1428`, `1768` 부근 렌더링)을 확장해서 재사용한다. 차이는 두 가지뿐이다: (1) 픽셀에 커밋되는 대상이 아니라 `activeTracingImage`이므로 커밋/취소 개념이 없고 그냥 "선택 해제"만 있다, (2) 회전 핸들이 새로 필요하다(기존 `pendingImage.rotation`은 90도 스텝 버튼이라 핸들이 없었다).

```ts
activeTracingImage: TracingImage | null; // tracingImages.find(t => t.id === activeTracingId)
onActiveTracingChange: (patch: Partial<Pick<TracingImage, "x" | "y" | "width" | "height" | "rotationDeg">>) => void;
onActiveTracingDeselect: () => void; // 빈 캔버스 클릭 시
```

오버레이 div는 `pendingImage`와 같은 위치 공식(`left: t.x * scale, top: t.y * scale, width: t.width * scale, height: t.height * scale`)에 `transform: rotate(${t.rotationDeg}deg)`(중심 기준, `transform-origin: center`)를 추가로 얹는다. 안에 세 종류의 손잡이:

- **본체**: 포인터다운 후 드래그 → `onActiveTracingChange({ x, y })` (이동 드래그 오프셋 계산은 `pendingImage`의 `handleImageBodyDown/Move`와 동일한 방식, `toRawGridPoint` 재사용)
- **모서리 리사이즈 핸들**(우하단, `pendingImage`와 동일 위치): 드래그 → `onActiveTracingChange({ width, height })`, `MIN_TRACING_SIZE`로 하한
- **회전 핸들**(신규 — 바운딩 박스 상단 중앙에서 일정 픽셀 위로 띄운 작은 원): 드래그 시작 시 이미지 중심과 포인터 사이 각도를 기준각으로 잡고, 드래그 중 현재 각도와의 차이를 `rotationDeg`에 더해 `onActiveTracingChange({ rotationDeg })` 호출. 계산은 `Math.atan2(pointerY - cy, pointerX - cx)` 기반.

**활성화/비활성화**: wide는 `TracingControlWindow`, narrow는 `TracingListPanel`의 "조정" 버튼이 `activeTracingId`를 그 이미지 id로 세팅(같은 버튼 다시 누르면 `null`로 해제) — 둘 다 같은 `onToggleAdjust` 콜백 모양을 쓴다. 핸들이 없는 빈 캔버스 영역을 클릭해도 해제(`onActiveTracingDeselect`). `useKeyboardShortcuts.ts:181`의 기존 Escape 분기에 `hasActiveTracing`/`onCancelActiveTracing`을 추가해, `hasPendingImage`/`hasPendingShape`와 같은 우선순위로 Escape가 조정 상태부터 해제하게 한다(선택 해제 다음 순서로).

조정 중이 아닌 트레이싱 이미지는 완전히 비활성 — 클릭해도 선택되지 않는다(여러 장이 겹쳐 있을 때 "캔버스 위 이미지를 클릭해서 선택"은 범위 밖, 항상 미니 창/리스트의 "조정" 버튼으로만 선택한다).

## 모바일(narrow) 레이아웃

`Editor.tsx`는 이미 narrow에서 사이드 패널(레이어·이미지 불러오기·내보내기)을 `w-60` 고정 패널 대신 아이콘 세 개짜리 얇은 열로 접고, 아이콘을 누르면 그 내용이 캔버스 위로 뜨는 `w-72` 플로팅 팝업으로 나타나는 패턴(`openFloatingPanel: "layers" | "import" | "export" | null` 상태)을 갖고 있다. 트레이싱 목록도 이 패턴에 그대로 합류시킨다 — 새 UI 패턴을 만들지 않는다.

- `openFloatingPanel`의 유니언에 `"tracing"`을 추가한다.
- 아이콘 열에 네 번째 버튼(트레이싱 아이콘)을 추가한다 — `tracingMode`가 꺼져 있으면 이 아이콘 자체를 숨긴다(트레이싱이 꺼진 상태에서 목록을 열 이유가 없다).
- 팝업 안에는 `TracingListPanel`을 렌더링한다 — `LayerPanel.tsx`와 같은 세로 목록 스타일: 각 행에 작은 썸네일, 투명도 슬라이더(`LayerPanel`의 opacity 슬라이더 패턴 재사용), "조정" 버튼, 삭제 버튼. 맨 위(또는 아래)에 "+ 이미지 추가" 행 — `useImageFileLoader`로 파일 선택/클립보드 붙여넣기를 연결한다(드래그드롭은 narrow 팝업이 좁아 생략).
- "조정" 버튼을 누르면 `activeTracingId`를 세팅함과 **동시에 `setOpenFloatingPanel(null)`로 팝업을 닫는다** — 안 그러면 `w-72` 팝업이 캔버스 상당 부분을 가려 정작 캔버스 위 이동·크기·회전 핸들을 조작하기 어렵다. 핸들 조작 자체(`PixelCanvas.tsx`의 오버레이 div, Pointer Events)는 narrow/wide 구분 없이 동일하게 동작한다(터치도 포인터 이벤트로 들어온다).
- narrow 전용이므로 `tracingWindows`(플로팅 창 위치·zIndex 상태)는 쓰지 않는다 — `TracingListPanel`은 `tracingImages` 배열만 직접 순회해서 그린다.

**narrow ↔ wide 전환**: `tracingImages`는 두 레이아웃이 공유하는 같은 상태이므로, 편집기 창 너비가 `NARROW_BREAKPOINT`를 넘나들어도(브라우저 창 리사이즈) 데이터는 그대로 유지되고 표시 방식만 바뀐다. wide에서 열려 있던 `TracingControlWindow`들은 narrow로 좁아지면 안 보이게 되고(narrow는 애초에 이 컴포넌트를 렌더링하지 않는다), 다시 wide로 넓히면 `tracingWindows`에 남아있던 위치 그대로 복원된다.

## 그리기 도구와의 관계

- `activeTracingId === null`(조정 중인 이미지 없음)이면 트레이싱 이미지는 순수 배경 그림일 뿐 — 어떤 도구를 쓰든 포인터 이벤트는 지금처럼 그대로 그리기/선택 등에 쓰인다. `PixelCanvas.tsx`의 기존 포인터 핸들러는 손대지 않는다.
- `activeTracingId !== null`이면 그 이미지의 오버레이 div가 캔버스 위에 뜨고, 그 안(본체·핸들) 포인터 이벤트만 조정에 쓰인다 — 오버레이 바깥 캔버스 클릭은 선택 해제로만 처리하고 그리기로 이어지지 않는다(`pendingImage`가 떠 있을 때 다른 도구 입력을 막는 것과 같은 성격의 "모달에 가까운" 상호작용).
- 스포이트 도구는 트레이싱 이미지를 지원하지 않는다(레퍼런스 창과 달리, 확정된 답변) — 트레이싱 이미지 위에서 스포이트를 쓰면 그 아래 실제 캔버스 픽셀(또는 캔버스 배경색)에서 색을 뽑는 지금 동작 그대로 둔다.

## 범위 밖

- 탭(문서)마다 독립된 트레이싱 이미지 세트 — 편집기 세션 전체에서 공유한다(레퍼런스 창과 동일 스코프). 탭을 바꾸면 좌표가 새 캔버스 크기와 안 맞을 수 있다.
- 저장/재로드 — 레퍼런스 창처럼 완전히 세션 일회성이다. 문서 저장(JSON/자동저장)에 트레이싱 이미지는 전혀 포함하지 않는다.
- 캔버스 위 이미지를 직접 클릭해 선택 — 여러 장이 겹쳐 있어도 항상 미니 창/리스트의 "조정" 버튼으로만 선택한다.
- 스포이트로 트레이싱 이미지에서 색 추출.
- 여러 이미지를 동시에 조정(핸들을 동시에 여러 개 띄우기) — 한 번에 하나만.
- 트레이싱 이미지 잠금/숨김 개별 토글 — 필요하면 해당 미니 창/리스트 항목을 삭제하는 것으로 대신한다.
- narrow에서 창 모드(레퍼런스 창) 지원 — narrow는 트레이싱 모드만 제공한다.
- narrow 팝업 안에서 드래그드롭으로 이미지 추가 — 파일 선택·클립보드 붙여넣기만 지원한다.
