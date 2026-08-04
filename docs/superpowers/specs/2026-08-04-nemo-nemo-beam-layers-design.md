# 네모네모빔 — 레이어 스택 설계

## 배경

네모네모빔(픽셀아트 메이커, `5_PixelArtMaker/`)은 지금 캔버스 하나당 `pixels: PixelValue[]` 평면 배열 하나만 가진다. 여러 장을 겹쳐 따로 그리고, 순서를 바꾸고, 켜고 끄는 레이어 개념이 전혀 없다. 이번 작업은 포토샵/아세프라이트류의 표준 레이어 스택(추가·삭제·순서변경·복제·병합·잠금·보이기·투명도·이름)을 추가한다. 블렌드 모드, 레이어 그룹핑은 범위 밖이다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`
- `types.ts` — `PixelLayer` 타입 추가
- `pixelGrid.ts` — 레이어 합성(compositing) 함수 추가
- `useCanvasHistory.ts` — 스냅숏을 레이어 스택 단위로 확장
- `Editor.tsx` — 레이어 상태 관리, 저장/불러오기, 내보내기 연동
- `PixelCanvas.tsx` — 배경/전경 합성 렌더링, 잠금 처리, 합성 기준 샘플링
- `LayerPanel.tsx` — 신규, 레이어 목록 UI
- `exportPixelArt.ts` — 변경 없음(항상 합성 결과를 내보냄)

`app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`
- `PixelArt` 타입에 `layers`/`activeLayerId` 선택 필드 추가, V3 저장 포맷

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/wallpaper.ts`
- 동일한 V2→V3 마이그레이션 패턴 반영(배경화면도 같은 `PixelArt` 타입을 쓰므로)

영향받지 않는 외부 소비처(변경 불필요, 회귀 확인만): `_shared/renderPixelArt.ts`, `FileThumbnail.tsx`, VN 스튜디오 `ResourcePicker.tsx` — 모두 `doc.pixels`(합성 결과)만 읽는다.

## 데이터 모델

`types.ts`에 추가:

```ts
export type PixelLayer = {
  id: string;
  name: string;
  pixels: PixelValue[];
  visible: boolean;
  opacity: number; // 0~1
  locked: boolean;
};

export const MAX_LAYERS = 20;
```

`_shared/assetLibrary.ts`의 `PixelArt`:

```ts
export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];
  pixels: (string | null)[]; // 항상 "합성된 최종 결과" — 레이어를 모르는 소비처용
  layers?: PixelLayer[];      // 있으면 레이어 스택. 없으면 pixels를 단일 레이어로 취급
  activeLayerId?: string;
  createdAt: number;
};
```

`pixels`를 계속 유지하는 이유: VN 스튜디오 리소스 피커·썸네일 등 레이어를 모르는 외부 소비처가 코드 변경 없이 계속 동작해야 한다. 편집기가 저장할 때마다 `layers`를 합성해 `pixels`를 다시 채운다.

## 합성(compositing) — `pixelGrid.ts`에 추가

```ts
// 보이는 레이어만, 배열 순서를 아래→위로 보고 순차 합성한다(위 레이어가 나중에 덮임).
// 각 레이어의 opacity는 전체를 곱색이 아니라 알파에 곱해 적용한다.
export function compositeLayers(
  layers: PixelLayer[],
  width: number,
  height: number,
): PixelValue[];

// layers 중 연속 구간([from, to] 인덱스, 아래→위)만 합성 — PixelCanvas가
// 활성 레이어 아래/위 구간을 배경·전경 캐시로 미리 만들 때 쓴다.
export function compositeLayerRange(
  layers: PixelLayer[],
  fromIndex: number,
  toIndex: number,
  width: number,
  height: number,
): PixelValue[];
```

기존 `compositePixel`(src-over 알파 합성)을 그대로 재사용해 픽셀 단위로 누적한다.

## 실행취소(Undo/Redo) — `useCanvasHistory.ts`

스냅숏을 레이어 스택 전체로 확장한다:

```ts
type Snapshot = {
  layers: PixelLayer[];
  activeLayerId: string;
  size: CanvasSize;
};
```

`push`/`undo`/`redo`/`reset`의 동작 방식(스택 두 개, 50개 제한)은 그대로 유지한다. 레이어 추가·삭제·순서변경·병합·복제·잠금·투명도 변경도 전부 `push`를 통해 같은 스택에 들어간다(사용자 확인: 그리기 실행취소와 통합). 레이어 개수 상한(`MAX_LAYERS = 20`)은 메모리 사용량이 레이어 수에 비례해 커지는 것을 억제하기 위함 — 스냅숏 하나가 레이어 수만큼의 평면 배열을 담기 때문에, 기존 "전체 배열 스냅숏" 방식 자체는 손대지 않고 상한으로 상쇄한다.

## 캔버스 렌더링 · 도구 동작 — `PixelCanvas.tsx`

기존 스트로크/도구 로직(펜슬·지우개·도형·선택·텍스트·그라데이션 등)은 지금처럼 **활성 레이어의 평면 배열만** 다룬다 — `pixels` prop은 계속 활성 레이어를 가리키고, `workingRef` 기반 실시간 미리보기 로직도 변경하지 않는다.

새로 받는 props:

```ts
belowComposite: PixelValue[] | null; // 활성 레이어 아래, 보이는 레이어들의 합성 결과
aboveComposite: PixelValue[] | null; // 활성 레이어 위, 보이는 레이어들의 합성 결과
activeLayerOpacity: number;          // 활성 레이어 자체 투명도(렌더링에만 사용)
activeLayerLocked: boolean;          // true면 이 캔버스는 그리기 도구를 전부 무시
```

`belowComposite`/`aboveComposite`는 Editor가 레이어 구조(순서·보이기·투명도·다른 레이어의 픽셀)가 바뀔 때만 재계산해 내려준다 — 활성 레이어를 그리는 동안(스트로크 중)에는 참조가 그대로라 매 프레임 재계산되지 않는다.

렌더 순서: `belowComposite` → 활성 레이어(`activeLayerOpacity` 적용) → `aboveComposite`.

**합성 기준 도구(스포이트·마법봉·페인트통)**: 클릭 시점에만 `belowComposite` + 활성 레이어(현재 `workingRef.current` 값) + `aboveComposite` 세 평면 배열을 `compositePixel`로 픽셀 단위 합성해 그 지점 색/연결 영역을 판정한다(raw `PixelLayer[]`가 아니라 이미 받아둔 두 합성 결과만 있으면 되므로 `compositeLayerRange`는 PixelCanvas 쪽에서 쓰지 않는다 — Editor가 belowComposite/aboveComposite를 만들 때만 쓴다). 판정은 합성 기준이지만, 실제 쓰기(페인트통 채우기)는 활성 레이어에만 적용한다. 스포이트는 판정된 색을 활성 색상으로 설정할 뿐 어디에도 쓰지 않는다.

`activeLayerLocked`가 true면 포인터 이벤트 핸들러 진입 지점에서 조기 반환 — 도형 미리보기·선택 등 읽기 전용 동작은 막지 않는다.

## 레이어 패널 UI — `LayerPanel.tsx`(신규)

우측 사이드바에 기존 "이미지 불러오기"·"내보내기" 아코디언과 나란히 두되, `Accordion`으로 접지 않고 항상 펼쳐둔다(자주 쓰는 조작이라 접혀 있으면 불편함).

- 목록은 위에서부터 최상단 레이어 순서로 표시(`layers` 배열은 아래→위 순서로 저장하고, 렌더링만 역순).
- 각 행: 작은 썸네일, 이름(더블클릭 또는 인라인 편집으로 이름 변경), 보이기/숨기기 토글(눈 아이콘), 잠금 토글(자물쇠 아이콘). 활성 레이어 행은 강조 표시하고 클릭으로 활성 레이어를 바꾼다.
- 목록 아래 툴바: 레이어 추가, 복제, 삭제, 병합(바로 아래 레이어와), 위/아래 이동 버튼. `MAX_LAYERS` 도달 시 추가 버튼 비활성화.
- 선택된(활성) 레이어의 투명도 슬라이더를 패널 하단에 둔다.
- 전체 평탄화(모든 레이어를 하나로)는 패널의 별도 메뉴 항목(예: `⋯` 메뉴)으로 둔다.
- 삭제/평탄화처럼 되돌리기 전에 데이터가 합쳐지는 동작은 실행취소로 복구 가능하므로 확인 다이얼로그 없이 즉시 실행한다(기존 `ConfirmDialog`는 "전체 지우기"처럼 실행취소 스택 자체를 건드리는 동작에만 쓰던 패턴 유지).

레이어가 1장뿐일 때 삭제 버튼은 비활성화(캔버스에 레이어가 0장인 상태를 만들지 않는다).

## 저장 · 내보내기 · 마이그레이션

`_shared/assetLibrary.ts`, `wallpaper.ts` 둘 다 기존 V1→V2 마이그레이션과 같은 패턴으로 V3를 추가한다:

```ts
type StoredPixelArtV3 = Omit<PixelArt, "pixels" | "layers"> & {
  pixels: PackedPixels;
  layers?: (Omit<PixelLayer, "pixels"> & { pixels: PackedPixels })[];
  version: 3;
};
```

- `encodeStored`: `layers`가 있으면 레이어별로 `packPixels` 적용, 없으면 생략. `pixels`(합성 결과)는 항상 포함.
- `decodeStored`: `version === 3`이면 `layers`를 언패킹해 그대로 돌려준다. `version === 2` 이하(또는 legacy)면 `layers`는 `undefined`로 둔다 — **레이어 합성은 여기서 하지 않는다.**
- `Editor.tsx`가 문서를 열 때 `art.layers`가 없으면 그 자리에서 `pixels`를 감싼 단일 레이어("레이어 1")를 합성해 편집 상태를 시작한다. 저장하기 전까지는 원본 저장소에 `layers` 필드를 쓰지 않고, 처음 저장하는 순간 V3 포맷으로 올라간다(자동 마이그레이션, 사용자에게 별도 안내 없음).

내보내기:
- PNG/JPG/SVG: 지금처럼 항상 합성된 `pixels`(`history.present`를 합성한 결과)를 사용 — 레이어를 모르는 내보내기 형식이므로 변경 없음.
- JSON: `layers`까지 포함해 온전히 내보낸다. 다시 불러오면(`parsePixelArtJSON`) 레이어 구조가 그대로 복원된다. 레이어 정보가 없는 JSON(구버전 내보내기 또는 손으로 수정한 파일)을 불러올 때는 위와 같은 단일 레이어 마이그레이션을 적용한다.

## 범위 밖

- 블렌드 모드(곱하기·스크린 등) — 투명도(알파 합성)만 지원.
- 레이어 그룹(폴더).
- 레이어 썸네일 캐싱 최적화 — 매번 다시 그린다(캔버스 최대 크기가 512×512로 제한돼 있어 문제 없다고 판단).
- 레이어별 실행취소 분리 — 전체 스택이 하나의 실행취소 단위.
