# 네모네모빔 — 레이어 블렌드 모드·색보정 설계

## 배경

[`2026-08-04-nemo-nemo-beam-layers-design.md`](./2026-08-04-nemo-nemo-beam-layers-design.md)에서 만든 레이어 스택에 클립스튜디오·피그마처럼 **레이어마다 계속 다시 조절할 수 있는 블렌드 모드와 색보정**을 추가한다. `opacity`·`visible`·`locked`와 같은 위치의 영구 레이어 속성이며, 브레인스토밍 과정에서 두 가지 대안(확정 시 픽셀에 굽는 destructive 방식 / 레이어에 계속 붙어있는 속성 방식)을 검토한 끝에 후자로 확정했다 — "멀티플라이로 뒀다가 나중에 다시 기본으로 되돌릴 수 있어야 한다"는 요구가 그 자체로 비파괴 속성이어야 함을 뜻한다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`
- `PixelLayer`에 `blendMode`·`brightness`·`contrast`·`saturation`·`temperature`·`tint` 필드 추가 — **저장 포맷 버전은 그대로 V3**(레이어·프레임 모드 때와 동일한 이유: `encodeStored`/`decodeStored`가 이미 객체 스프레드라 새 선택 필드가 코드 변경 없이 저장·복원된다)

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`
- `pixelGrid.ts` — 블렌드 공식·보정 공식을 순수 함수로 추가하고, `compositeOnto`/`compositeLayers`/`compositeLayerRange`가 이 값들을 반영하도록 확장
- `PixelCanvas.tsx` — **이번엔 실제로 수정한다**(레이어 스택·프레임 모드 때와 달리 불가피, 아래 "PixelCanvas 변경" 참고): 활성 레이어 자신의 블렌드·보정을 실시간으로 반영해 그리도록 렌더링 로직과 합성 기준 도구(스포이트·마법봉·페인트통)의 샘플링을 확장
- `LayerPanel.tsx` — 투명도 슬라이더 아래에 블렌드 모드 드롭다운 + 보정 슬라이더 5개 추가
- `Editor.tsx` — 새 레이어 액션 핸들러(블렌드 모드 변경·보정값 변경, 투명도와 같은 드래그 코얼레싱 패턴), `<PixelCanvas>` 호출부에 새 props 전달

## 데이터 모델

```ts
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

export type PixelLayer = {
  // ...기존 필드(id, name, pixels, visible, opacity, locked, frameDurationMs)
  blendMode?: BlendMode; // 없으면 "normal"
  brightness?: number; // -100~100, 없으면 0(영향 없음)
  contrast?: number; // -100~100, 없으면 0
  saturation?: number; // -100~100, 없으면 0
  temperature?: number; // -100~100, 없으면 0(차가움↔따뜻함)
  tint?: number; // -100~100, 없으면 0(녹색↔마젠타)
};
```

## 색보정 공식 (`pixelGrid.ts`에 추가)

각 함수는 픽셀 하나(`PixelValue`)를 받아 보정된 픽셀을 돌려준다 — 알파는 그대로 두고 RGB만 바꾼다. 다섯 보정은 이 순서로 차례로 적용한다: **색온도·틴트(화이트밸런스) → 밝기 → 대비 → 채도**(색온도/틴트를 먼저 적용해야 그 뒤의 밝기·대비가 최종 색 기준으로 자연스럽게 걸린다).

```ts
export type LayerAdjustments = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
};

// 다섯 값이 전부 0(또는 없음)이면 원본을 그대로 돌려준다(불필요한 재계산 방지).
export function applyAdjustments(
  value: PixelValue,
  adjustments: LayerAdjustments,
): PixelValue;
```

- **밝기**: R·G·B 각 채널에 `brightness/100 * 255`를 더하고 0~255로 자른다.
- **대비**: 128을 기준으로 채널을 밀어낸다 — `factor = (259 * (contrast*2.55 + 255)) / (255 * (259 - contrast*2.55))`, `c' = factor * (c - 128) + 128`(표준 대비 공식, 포토샵과 동일 계열).
- **채도**: 이미 있는 `hsv.ts`의 `rgbToHsv`/`hsvToRgb`로 HSV를 구해 `s' = clamp(s * (1 + saturation/100), 0, 1)`만 바꾸고 되돌린다.
- **색온도**: R 채널에 `+temperature/100 * 40`, B 채널에 `-temperature/100 * 40`(따뜻함=+R−B, 차가움=반대).
- **틴트**: G 채널에 `+tint/100 * 40`, R·B 채널에 `-tint/100 * 20`(마젠타↔그린 축의 단순 근사 — 정확한 CIE 기반 화이트밸런스가 아니라 사진 편집 도구들이 흔히 쓰는 근사치다).

## 블렌드 모드 공식 (`pixelGrid.ts`에 추가)

R·G·B 각 채널(0~1로 정규화)에 표준 합성 공식(W3C Compositing spec과 동일 계열, 포토샵 블렌드 모드와 결과가 같다)을 그대로 적용한다. `dst`=아래 결과, `src`=이 레이어의(보정 적용 후) 색.

```ts
export function blendChannel(dst: number, src: number, mode: BlendMode): number;
```

- `normal`: `src`
- `multiply`: `dst * src`
- `screen`: `1 - (1 - dst) * (1 - src)`
- `overlay`: `dst <= 0.5 ? 2*dst*src : 1 - 2*(1-dst)*(1-src)`
- `darken`: `min(dst, src)`
- `lighten`: `max(dst, src)`
- `color-dodge`: `src >= 1 ? 1 : min(1, dst / (1 - src))`
- `color-burn`: `src <= 0 ? 0 : 1 - min(1, (1 - dst) / src)`

## 합성 파이프라인 변경 — `compositeOnto`

지금 `compositeOnto(dst, src, srcOpacity)`는 `applyOpacityToPixel` → `compositePixel`(항상 src-over/normal) 순서로 처리한다. 여기에 보정·블렌드 모드를 끼워 넣는다:

```ts
export function compositeOnto(
  dst: PixelValue[],
  src: PixelValue[],
  srcOpacity: number,
  srcBlendMode: BlendMode = "normal",
  srcAdjustments?: LayerAdjustments,
): PixelValue[] {
  // 1) srcAdjustments가 있으면 그 레이어의 각 픽셀에 먼저 적용한다(원본 배열은
  //    바꾸지 않고, 합성 직전에만 계산한다 — 실제 저장된 픽셀은 항상 순수하다).
  // 2) blendMode로 dst와 섞은 색을 구한다(RGB만, 알파는 그대로).
  // 3) 그 섞인 색을 기존처럼 opacity로 dst 위에 얹는다(알파 합성은 그대로 src-over).
}
```

`compositeLayers`/`compositeLayerRange`는 각 레이어를 순회할 때 그 레이어의 `blendMode`/보정값을 그대로 넘기기만 하면 된다 — 함수 시그니처(호출부 관점)는 바뀌지 않는다. 전체 평탄화(`handleFlattenLayers`)는 이미 `compositeLayers`를 그대로 쓰므로 자동으로 반영된다.

**병합(`handleMergeDown`)도 같은 이유로 고쳐야 한다** — 지금은 `compositeOnto(below.pixels, layer.pixels, layer.opacity)`처럼 opacity만 넘기는데, 병합 대상 레이어에 블렌드 모드나 보정이 걸려 있으면 그 효과가 병합 순간 사라져(그냥 normal로 합쳐져) 그림이 바뀌어 보인다. `compositeOnto(below.pixels, layer.pixels, layer.opacity, layer.blendMode, layerAdjustments)`처럼 병합되는 레이어 자신의 블렌드·보정도 함께 넘겨야, 병합 전후로 화면에 보이는 결과가 그대로 유지된다.

## PixelCanvas 변경 — 이번엔 불가피하다

레이어 스택·프레임 모드 때는 "합성은 전부 Editor가 미리 계산해서 belowComposite/aboveComposite로 내려주고, PixelCanvas는 그 값을 보여주기만 한다"는 원칙으로 코드 변경을 피했다. 하지만 블렌드 모드는 **지금 그리고 있는 활성 레이어 자신**이 아래 레이어와 실시간으로 섞여 보여야 하는 기능이라, `PixelCanvas`가 그 두 값(블렌드 모드·보정)을 몰라서는 안 된다.

```tsx
// 기존 activeLayerOpacity 옆에 추가
activeLayerBlendMode: BlendMode;
activeLayerAdjustments: LayerAdjustments;
```

`render()`가 지금 `compositeOnto(base, data, activeLayerOpacity)`(항상 normal)로 활성 레이어를 아래 배경 위에 얹는 부분을, `compositeOnto(base, data, activeLayerOpacity, activeLayerBlendMode, activeLayerAdjustments)`로 바꾼다. **그림 데이터(픽셀 배열) 자체는 손대지 않는다** — 그리기 도구 코드(pencil/eraser/도형/텍스트 등)는 지금처럼 활성 레이어의 순수 픽셀만 다루고, 보정·블렌드는 오직 "화면에 어떻게 보여줄지" 계산에만 관여한다. 실제로 그린 색이 아니라 화면에 비치는 결과만 바뀌므로, 되돌리기 스택도 전혀 영향받지 않는다.

합성 기준으로 판정하는 스포이트·마법봉·페인트통(`getFullComposite`)도 같은 이유로 `activeLayerBlendMode`/`activeLayerAdjustments`를 반영해야 한다 — "보이는 그대로"라는 기존 원칙을 유지하려면 블렌드·보정이 반영된 색을 봐야 한다.

## UI — `LayerPanel.tsx`

투명도 슬라이더(`<label>투명도 ...</label>`) 다음에 블렌드 모드 드롭다운과 보정 슬라이더 5개를 추가한다:

- 블렌드 모드: `<select>`로 8개 나열, 활성 레이어의 값을 바로 바꾼다.
- 보정 5개: 각각 -100~100 슬라이더. 지금 투명도가 쓰는 **드래그 코얼레싱 패턴**(`opacityDragLayerIdRef` + `onPointerUp`/`onBlur`로 드래그 종료 시점에만 실행취소 경계를 만드는 방식)을 그대로 재사용한다 — 슬라이더 하나를 드래그하는 동안은 값만 갱신되고, 손을 뗄 때 한 번만 실행취소 스택에 쌓인다. 다섯 슬라이더가 각각 독립적으로 코얼레싱되어야 하므로(밝기를 드래그하다가 대비를 만지면 서로 다른 되돌리기 경계여야 한다), 드래그 중인 필드 이름까지 함께 추적하는 형태로 확장한다(`{layerId, field} | null`).

## `Editor.tsx` — 새 핸들러

`handleLayerOpacityChange`/`handleOpacityDragEnd`와 같은 모양으로 블렌드 모드·보정 5종을 다룬다:

- `handleLayerBlendModeChange(id, mode)` — 드롭다운은 드래그가 없으므로 매번 `pushLayerOp`로 바로 커밋(레이어 이름 바꾸기와 같은 패턴).
- `handleLayerAdjustmentChange(id, field, value)` + `handleAdjustmentDragEnd()` — 투명도와 동일한 코얼레싱, 다만 `{layerId, field}` 조합이 같을 때만 이어지는 드래그로 취급한다.

## 마이그레이션

새 필드는 전부 선택적(optional)이고 스프레드로 이미 저장·복원되므로, 레이어 스택 기능 자체의 V1→V2→V3 마이그레이션과 완전히 독립적이다. 없는 레이어는 전부 "영향 없음"(normal, 0)으로 취급되어 기존 파일이 깨지지 않는다.

## 범위 밖

- 하이라이트/섀도우(피그마에는 있지만 이번 5개 목록엔 없음).
- Soft Light·Hard Light·Difference·Exclusion·Hue·Saturation·Color·Luminosity 등 나머지 8개 블렌드 모드 — 기본 8개만 지원한다.
- 레이어가 아닌 캔버스 전체(모든 레이어 합성 결과)에 한 번에 보정을 거는 기능.
- 보정값 프리셋 저장/불러오기.
