# 네모네모빔 — 레이어를 프레임(스프라이트 애니메이션)으로도 쓰는 프레임 모드 설계

## 배경

[`2026-08-04-nemo-nemo-beam-layers-design.md`](./2026-08-04-nemo-nemo-beam-layers-design.md)에서 레이어 스택을 구현했다. 이번 작업은 그 위에, 프로크리에이트의 "애니메이션 어시스트"처럼 **같은 레이어 스택을 두 가지로 해석**하는 기능을 추가한다 — 평소엔 레이어(합성해서 보여줌), "프레임 모드"를 켜면 같은 목록을 프레임(순서대로 재생)으로 취급한다. 새 레이어 개념(프레임 그룹, 별도 타임라인 자료구조)을 만들지 않고, 기존 `PixelLayer[]` 배열 하나를 그대로 재사용한다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`
- `PixelLayer.frameDurationMs`(선택), `PixelArt.layerMode`(선택) 필드 추가 — **저장 포맷 버전은 그대로 V3**(아래 "저장 포맷" 참고, 새 필드는 기존 스프레드 방식으로 이미 저장·복원됨)

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`
- `types.ts` — `DEFAULT_FRAME_DURATION_MS`, `MIN_FRAME_DURATION_MS`, `MAX_FRAME_DURATION_MS` 상수
- `LayerPanel.tsx` — 상단에 "레이어 | 프레임" 모드 토글 추가(레이어 모드 UI는 그대로, 프레임 모드일 때는 재생·반복·어니언스킨·내보내기 컨트롤만 보여주는 축약 형태로 전환)
- `FrameFilmstrip.tsx`(신규) — 프레임 모드에서 캔버스 아래에 뜨는 가로 필름스트립
- `Editor.tsx` — 모드 상태, 재생 엔진, 어니언스킨용 belowComposite/aboveComposite 분기, 내보내기 메뉴 확장
- `exportPixelArt.ts` — `exportAsGIF`, `exportAsSpriteSheet` 추가

`package.json` — `gifenc` 의존성 추가([mattdesl/gifenc](https://github.com/mattdesl/gifenc), 순수 JS GIF 인코더, API는 아래 "GIF 내보내기" 참고)

## 데이터 모델

```ts
export type PixelLayer = {
  id: string;
  name: string;
  pixels: (string | null)[];
  visible: boolean;
  opacity: number;
  locked: boolean;
  // 프레임 모드에서 이 레이어(프레임)가 화면에 머무는 시간(ms). 없으면
  // DEFAULT_FRAME_DURATION_MS로 취급한다 — 레이어 모드에선 읽지 않는다.
  frameDurationMs?: number;
};

export type PixelArt = {
  // ...기존 필드
  // 없으면 "layers"로 취급(레이어 기능만 있던 구파일과 호환).
  layerMode?: "layers" | "frames";
};
```

`types.ts`:

```ts
export const DEFAULT_FRAME_DURATION_MS = 100;
export const MIN_FRAME_DURATION_MS = 20; // 50fps 상한
export const MAX_FRAME_DURATION_MS = 5000; // 5초 하한(더 느리게는 의미 없음)
```

### 저장 포맷 — 버전 올릴 필요 없음

`_shared/assetLibrary.ts`의 `encodeStored`/`decodeStored`(V3)와 `wallpaper.ts`의 V3 디코딩은 이미 `{ ...art, ... }`/`{ ...l, ... }` 스프레드로 객체를 통째로 복사한다 — `layerMode`나 `frameDurationMs`처럼 새로 추가되는 선택 필드는 코드 변경 없이 이미 그대로 저장·복원된다. V4를 만들 필요가 없다.

`Editor.tsx`의 `parsePixelArtJSON`(JSON 불러오기 검증)만 확장한다 — 레이어 하나를 파싱할 때 `frameDurationMs`가 숫자면 그대로, 아니면 무시(기본값으로 취급)하고, 최상위 `layerMode`가 `"layers"`/`"frames"` 둘 중 하나면 그대로, 아니면 무시한다(기존의 관대한 검증 스타일과 동일).

## 모드 전환

`doc.layerMode`는 실행취소 대상이 아니다(도구를 바꾸는 것과 같은 성격) — `palette`/`name`을 바꿀 때와 같은 패턴으로 `setDoc`으로 갱신하고 `setHasMetaEdits(true)`로 표시해 저장 대상에는 포함시킨다.

`LayerPanel.tsx` 최상단에 "레이어 | 프레임" 세그먼트 토글을 추가한다:
- **레이어 모드**(기본): 지금 그대로 — 세로 목록 + 보이기·잠금·투명도·추가/복제/삭제/병합/이동/평탄화.
- **프레임 모드**: 레이어 목록 자체는 캔버스 아래 `FrameFilmstrip`으로 옮겨가고, `LayerPanel` 자리에는 재생/정지 버튼, 반복 토글, 어니언스킨 토글, 내보내기(GIF·스프라이트 시트) 버튼만 남는 축약 컨트롤 바를 보여준다.

## 필름스트립 UI (`FrameFilmstrip.tsx`, 신규)

캔버스 뷰포트(`Editor.tsx`의 `<div ref={canvasViewportRef} ...>`를 감싼 relative 래퍼) 바로 아래, 새로운 가로 바다. 지금 그 래퍼가 속한 캔버스 열은 `flex flex-1 overflow-hidden`(가로로만 배치)인데, 프레임 모드일 때 이 열을 세로 flex-col로 바꿔 위에는 캔버스 뷰포트, 아래에는 필름스트립을 쌓는다(레이어 모드일 때는 필름스트립이 없으므로 지금처럼 캔버스 열 전체를 뷰포트가 차지한다).

```tsx
export default function FrameFilmstrip({
  layers, // 아래→위 순서(레이어와 동일 배열)
  activeLayerId,
  width,
  height,
  isPlaying,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onDurationChange,
}: {
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  isPlaying: boolean; // 재생 중엔 프레임 편집 컨트롤(추가·삭제·이동·지속시간 입력)을 비활성화
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onDurationChange: (id: string, ms: number) => void;
  onToggleVisible: (id: string) => void;
}): JSX.Element;
```

프레임은 **왼쪽이 첫 프레임**(아래→위 배열을 그대로, 인덱스 0이 왼쪽)으로 나열한다 — 레이어 모드의 "위=나중" 관례와 자연스럽게 이어진다(배열 순서 자체는 똑같이 쓰되 필름스트립은 뒤집지 않고, 레이어 패널은 지금처럼 뒤집어서 보여준다). 각 칸: `FileThumbnail` 재사용 썸네일, 프레임 번호, 인라인 지속시간(초 단위) 입력, 보이기/숨기기 눈 아이콘(`onToggleVisible` — 재생·내보내기에서 건너뛸 프레임을 고르는 유일한 방법이므로 빠지면 안 된다), 삭제 아이콘. 활성 프레임은 강조 표시하고 클릭으로 전환한다. 프레임이 많아 다 안 들어가면 가로 스크롤. 좌우 이동은 `Editor.tsx`의 기존 `handleMoveLayer(id, direction)`를 그대로 재사용한다(레이어 모드의 위/아래를 프레임 모드에서는 왼쪽/오른쪽 버튼으로만 다르게 노출).

## 재생 엔진 (`Editor.tsx`)

```ts
const [isPlaying, setIsPlaying] = useState(false);
const [loopPlayback, setLoopPlayback] = useState(true);
const [onionSkin, setOnionSkin] = useState(true);
```

재생은 `requestAnimationFrame` 루프로 구현한다 — 매 프레임 콜백마다 경과 시간을 누적하다가, 현재 활성 프레임의 `frameDurationMs`(없으면 `DEFAULT_FRAME_DURATION_MS`)를 넘기면 다음 "보이는"(`visible`) 프레임으로 `history.setActiveLayerId(nextId)`를 호출한다. 프레임 전환에는 이미 실행취소 스택을 건드리지 않는 `setActiveLayerId`를 그대로 쓴다 — 재생이 되돌리기 이력을 어지럽히지 않는다.

```ts
// layers는 아래→위(=필름스트립 왼쪽→오른쪽) 순서. 현재 id 다음으로 "보이는"
// 레이어를 찾는다 — 끝에 닿았을 때 loop면 처음(보이는 첫 레이어)으로,
// 아니면 null(재생 정지)을 돌려준다.
function nextVisibleFrame(
  layers: PixelLayer[],
  currentId: string,
  loop: boolean,
): PixelLayer | null;
```

재생 중(`isPlaying === true`)에는 `PixelCanvas`의 그리기 도구 입력을 막는다 — 이미 있는 잠금 메커니즘(`activeLayerLocked`)과는 별개로, `Editor.tsx`가 `activeLayerLocked` prop 자체를 `activeLayer.locked || isPlaying`로 합성해서 넘긴다(레이어가 실제로 잠긴 게 아니어도 재생 중엔 그리기가 막힌다 — `PixelCanvas.tsx`는 수정 없이 기존 잠금 가드를 그대로 재사용).

## 어니언 스킨 — PixelCanvas 변경 없음

이미 만든 `belowComposite`/`aboveComposite` 메커니즘을 그대로 재사용한다. `Editor.tsx`의 기존 `belowComposite`/`aboveComposite` `useMemo`가 모드에 따라 분기한다:

- **레이어 모드**(지금과 동일): `compositeLayerRange`로 활성 레이어 아래/위 전체 스택을 합성.
- **프레임 모드 + 어니언스킨 켜짐**: 바로 이전/다음 "보이는" 프레임 한 장만, 고정된 낮은 투명도(`ONION_SKIN_OPACITY = 0.25`)로 `compositeLayers([{ ...prevFrame, opacity: ONION_SKIN_OPACITY }], width, height)` 형태로 계산해 `belowComposite`/`aboveComposite`에 넣는다.
- **프레임 모드 + 어니언스킨 꺼짐**: 둘 다 `null`(현재 프레임만 보임).

`PixelCanvas.tsx`는 belowComposite/aboveComposite를 "합성해서 보여줄 배경/전경"으로만 알 뿐 그 안에 몇 장이 어떻게 섞였는지 모르므로 **코드 변경이 전혀 필요 없다**.

## 내보내기

프레임 모드일 때만 파일 메뉴의 "내보내기" 서브메뉴에 "GIF"와 "스프라이트 시트"가 추가된다(레이어 모드에서는 애니메이션 개념이 없으므로 노출하지 않는다). 두 함수 모두 **보이는 프레임만, 순서대로, 각 프레임 자신의 픽셀만**(다른 레이어와 합성하지 않고) 렌더링한다 — `renderPixelArt.ts`의 `renderToCanvas(doc, scale)`는 `doc.pixels`(전체 합성) 기준이라 이 용도에 맞지 않으므로, 개별 `PixelLayer.pixels` 하나를 캔버스에 그리는 작은 헬퍼가 새로 필요하다(기존 `PixelCanvas.tsx`의 픽셀→캔버스 그리기 루프와 동일한 방식을 `exportPixelArt.ts`에 별도로 둔다 — `renderToCanvas`를 억지로 재사용하지 않는다).

### 스프라이트 시트

```ts
// 보이는 프레임을 왼쪽부터 가로로 이어붙인 PNG 한 장. 그리드(여러 행)는
// 범위 밖 — 항상 1행이다.
export function exportAsSpriteSheet(doc: PixelArt, scale = 8): void;
```

### GIF

`gifenc`(`GIFEncoder`, `quantize`, `applyPalette`)를 쓴다. 프레임마다 다시 양자화하면 프레임 사이에 색이 미세하게 달라져 깜빡이므로, **모든 보이는 프레임의 RGBA 데이터를 한 번에 합쳐 전역 팔레트를 하나만 만들고**, 그 팔레트를 프레임마다 재사용한다:

```ts
export function exportAsGIF(doc: PixelArt, scale = 8): Promise<void>;
```

구현 개요(정확한 `quantize`/`applyPalette` 옵션 조합은 구현 단계에서 실제로 그려보며 확정한다):
1. 보이는 프레임마다 그 프레임만 캔버스에 그려 `ImageData`(RGBA)를 뽑는다.
2. 모든 프레임의 RGBA를 이어붙여 `quantize(combined, 256)`로 전역 팔레트 하나를 만든다.
3. 각 프레임을 그 전역 팔레트로 `applyPalette`해 인덱스 비트맵으로 바꾸고, `gif.writeFrame(index, width, height, { palette: i === 0 ? globalPalette : undefined, delay: frame.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS, transparent: true })`로 순서대로 써넣는다. 완전 투명 픽셀은 팔레트의 투명 인덱스로 매핑되게 한다(`transparentIndex` 옵션).
4. `gif.finish()` → `gif.bytes()`를 `Blob({type: "image/gif"})`으로 감싸 `exportPixelArt.ts`의 기존 `triggerDownload` 헬퍼로 저장한다.

## 범위 밖

- 프레임 그룹(레이어 여러 장 = 프레임 하나) — "레이어 1장 = 프레임 1장" 단순 모델만 지원한다.
- 그리드형(여러 행) 스프라이트 시트 배치 — 항상 가로 1행.
- 프레임마다 다른 캔버스 크기 — 모든 프레임(레이어)은 항상 캔버스와 같은 크기(기존 레이어 제약을 그대로 물려받는다).
- 재생 중 그리기.
- 필름스트립에서 드래그로 순서 변경 — 좌/우 이동 버튼만 지원한다(레이어 패널의 위/아래 이동과 동일한 상호작용 수준).
- GIF 전역 팔레트가 256색을 넘는 경우의 정교한 색 손실 최소화(디더링 등) — 기본 `quantize` 동작에 맡긴다.
