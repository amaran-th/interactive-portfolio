# 네모네모빔 레이어 블렌드 모드·색보정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔의 레이어에 클립스튜디오·피그마처럼 언제든 다시 조절 가능한 블렌드 모드(8종)와 색보정(밝기·대비·채도·색온도·틴트)을 추가한다.

**Architecture:** `opacity`·`visible`·`locked`와 같은 위치의 영구 `PixelLayer` 속성으로 추가한다. 합성 수식(`pixelGrid.ts`)에 보정·블렌드 계산을 끼워 넣고, 저장·내보내기용 합성(`compositeLayers`)과 화면에 실시간으로 보여주는 합성(`PixelCanvas`)이 같은 함수를 공유하게 한다. 레이어 스택·프레임 모드 때와 달리 이번엔 `PixelCanvas.tsx`를 실제로 수정한다 — 지금 그리고 있는 활성 레이어 자신이 아래 레이어와 실시간으로 섞여 보여야 하는 기능이라 피할 수 없다(그림 데이터 자체는 손대지 않고 화면에 보여주는 계산만 확장한다).

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript.

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다. 각 태스크는 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, 필요한 태스크에서는 `npm run dev` 브라우저 수동 확인으로 검증한다.
- 저장 포맷 버전은 그대로 V3다 — `encodeStored`/`decodeStored`가 이미 객체 스프레드로 저장하므로 새 선택 필드는 코드 변경 없이 저장·복원된다. 새 버전을 만들지 않는다.
- 블렌드 모드는 8종만 지원한다: `normal`·`multiply`·`screen`·`overlay`·`darken`·`lighten`·`color-dodge`·`color-burn`. 보정은 5종만 지원한다: `brightness`·`contrast`·`saturation`·`temperature`·`tint`(전부 -100~100, 없으면 0).
- 커밋 메시지는 한글, `Co-Authored-By: Claude` 트레일러를 붙이지 않는다.
- 그리기 도구(pencil/eraser/도형/텍스트 등)가 다루는 픽셀 배열 자체는 이번 작업으로 전혀 바뀌지 않는다 — 블렌드·보정은 오직 "화면에 어떻게 보여줄지" 계산에만 관여한다.

---

### Task 1: 데이터 모델 — `BlendMode` · 색보정 필드

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`

**Interfaces:**
- Produces: `export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn";`, `PixelLayer.blendMode?: BlendMode`, `PixelLayer.brightness?: number`, `PixelLayer.contrast?: number`, `PixelLayer.saturation?: number`, `PixelLayer.temperature?: number`, `PixelLayer.tint?: number`.

- [ ] **Step 1: `BlendMode` 타입과 `PixelLayer` 필드 추가**

`PixelLayer` 타입 선언(`frameDurationMs?: number;`가 마지막 필드) 바로 위에 추가:

```ts
// 8종만 지원한다 — Soft Light·Hard Light·Difference·Exclusion·Hue·
// Saturation·Color·Luminosity 같은 나머지 블렌드 모드는 범위 밖이다.
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";
```

`PixelLayer` 타입 안, `frameDurationMs?: number;` 다음에 추가:

```ts
  frameDurationMs?: number;
  // 아래 레이어와 섞이는 방식 — 없으면 "normal"(그냥 얹기)로 취급한다.
  blendMode?: BlendMode;
  // 다섯 다 -100~100, 없으면 0(영향 없음). 화면에 보여줄 때만 계산되고
  // 실제 저장된 픽셀 값은 절대 바뀌지 않는다(pixelGrid.ts의 applyAdjustments 참고).
  brightness?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
};
```

`encodeStored`/`decodeStored`/`duplicatePixelArt`는 이미 객체 스프레드라 **변경하지 않는다** — 새 선택 필드는 코드 손대지 않아도 이미 저장·복원·복제된다.

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 이 필드들을 실제로 쓰는 코드가 없으므로 기존 동작에 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/_shared/assetLibrary.ts
git commit -m "feat: PixelLayer에 블렌드 모드·색보정 필드 추가"
```

---

### Task 2: 합성 수식 — `pixelGrid.ts`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts`

**Interfaces:**
- Consumes: Task 1의 `BlendMode`.
- Produces: `export type LayerAdjustments = Pick<PixelLayer, "brightness" | "contrast" | "saturation" | "temperature" | "tint">`, `export function applyAdjustments(value: PixelValue, adjustments: LayerAdjustments): PixelValue`, `compositeOnto(dst, src, srcOpacity, srcBlendMode?: BlendMode, srcAdjustments?: LayerAdjustments): PixelValue[]`(기존 3-인자 호출과 하위 호환 — 새 인자 둘 다 선택적), `compositeLayers`/`compositeLayerRange`가 각 레이어의 `blendMode`/보정을 자동으로 반영.

- [ ] **Step 1: import 추가**

파일 최상단 import(현재 1~3번째 줄)를 다음으로 바꾼다:

```ts
import { hexToRgba, hsvToRgb, rgbaToHex, rgbToHsv } from "./hsv";
import type { Point } from "./types";
import type { BlendMode, PixelLayer } from "../_shared/assetLibrary";
```

- [ ] **Step 2: 색보정 함수 추가**

`createGrid` 함수(`export function createGrid(width, height) {...}`) 바로 다음에 추가:

```ts
export type LayerAdjustments = Pick<
  PixelLayer,
  "brightness" | "contrast" | "saturation" | "temperature" | "tint"
>;

// 색보정 다섯 개를 정해진 순서(색온도·틴트 → 밝기 → 대비 → 채도)로 차례로
// 적용한다 — 화이트밸런스를 먼저 잡아야 그 뒤의 밝기·대비가 최종 색 기준으로
// 자연스럽게 걸린다. 다섯 값이 전부 0(또는 없음)이면 원본을 그대로 돌려줘
// 불필요한 재계산을 피한다. 이 함수는 화면에 보여줄 때만 불리고, 실제
// 저장된 픽셀 값은 절대 바꾸지 않는다.
export function applyAdjustments(
  value: PixelValue,
  adjustments: LayerAdjustments,
): PixelValue {
  const {
    brightness = 0,
    contrast = 0,
    saturation = 0,
    temperature = 0,
    tint = 0,
  } = adjustments;
  if (
    value === null ||
    (brightness === 0 &&
      contrast === 0 &&
      saturation === 0 &&
      temperature === 0 &&
      tint === 0)
  ) {
    return value;
  }
  const [r0, g0, b0, a] = hexToRgba(value);
  let r = r0;
  let g = g0;
  let b = b0;

  // 색온도(따뜻함↔차가움)·틴트(마젠타↔그린) — 정확한 CIE 기반 화이트밸런스가
  // 아니라 사진 편집 도구들이 흔히 쓰는 채널 이동 근사치다.
  r += (temperature / 100) * 40;
  b -= (temperature / 100) * 40;
  g += (tint / 100) * 40;
  r -= (tint / 100) * 20;
  b -= (tint / 100) * 20;

  // 밝기 — 세 채널에 동일하게 더한다.
  r += (brightness / 100) * 255;
  g += (brightness / 100) * 255;
  b += (brightness / 100) * 255;

  // 대비 — 128을 기준으로 밀어낸다(표준 대비 공식).
  if (contrast !== 0) {
    const c = contrast * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
  }

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  // 채도 — HSV로 바꿔 S만 조절하고 되돌린다(이미 있는 hsv.ts 변환 재사용).
  if (saturation !== 0) {
    const [h, s, v] = rgbToHsv(r, g, b);
    const s2 = Math.min(1, Math.max(0, s * (1 + saturation / 100)));
    [r, g, b] = hsvToRgb(h, s2, v);
  }

  return rgbaToHex(r, g, b, a);
}

// 0~1로 정규화된 채널 값 기준 표준 블렌드 공식(W3C 합성 스펙과 동일 계열,
// 포토샵 블렌드 모드와 결과가 같다).
function blendChannel(dst: number, src: number, mode: BlendMode): number {
  switch (mode) {
    case "multiply":
      return dst * src;
    case "screen":
      return 1 - (1 - dst) * (1 - src);
    case "overlay":
      return dst <= 0.5 ? 2 * dst * src : 1 - 2 * (1 - dst) * (1 - src);
    case "darken":
      return Math.min(dst, src);
    case "lighten":
      return Math.max(dst, src);
    case "color-dodge":
      return src >= 1 ? 1 : Math.min(1, dst / (1 - src));
    case "color-burn":
      return src <= 0 ? 0 : 1 - Math.min(1, (1 - dst) / src);
    case "normal":
    default:
      return src;
  }
}

// dst·src 픽셀(hex)의 RGB 채널마다 blendChannel을 적용해 섞은 색을 돌려준다.
// dst가 비어있으면(투명) 섞을 대상이 없으므로 src를 그대로 돌려준다 — 배경이
// 없는 곳에서는 블렌드 모드가 사실상 아무 효과가 없다는 뜻이다. 알파는
// src의 것을 그대로 들고 나가고, 실제 투명도 반영은 호출부(compositeOnto)가
// opacity로 이어서 한다.
function blendColor(dst: PixelValue, src: string, mode: BlendMode): string {
  if (mode === "normal" || dst === null) return src;
  const [dr, dg, db] = hexToRgba(dst);
  const [sr, sg, sb, sa] = hexToRgba(src);
  const r = blendChannel(dr / 255, sr / 255, mode) * 255;
  const g = blendChannel(dg / 255, sg / 255, mode) * 255;
  const b = blendChannel(db / 255, sb / 255, mode) * 255;
  return rgbaToHex(r, g, b, sa);
}
```

- [ ] **Step 3: `compositeOnto`가 블렌드·보정을 반영하도록 확장**

`compositeOnto` 함수를 다음으로 바꾼다:

```ts
// src 레이어를 자신의 투명도(srcOpacity)·블렌드 모드·보정까지 반영해 dst 위에
// 겹쳐 합성한다 — 레이어 하나를 그 아래 결과 위에 얹는 기본 단위 연산.
// srcBlendMode·srcAdjustments는 선택적이라 기존 3-인자 호출부(핵심은 그대로
// normal 블렌드 + 보정 없음)는 코드 변경 없이 그대로 동작한다.
export function compositeOnto(
  dst: PixelValue[],
  src: PixelValue[],
  srcOpacity: number,
  srcBlendMode: BlendMode = "normal",
  srcAdjustments?: LayerAdjustments,
): PixelValue[] {
  const out = dst.slice();
  for (let i = 0; i < src.length; i++) {
    const adjusted = srcAdjustments
      ? applyAdjustments(src[i], srcAdjustments)
      : src[i];
    const s = applyOpacityToPixel(adjusted, srcOpacity);
    if (s === null) continue;
    const blended =
      srcBlendMode === "normal" ? s : blendColor(out[i], s, srcBlendMode);
    out[i] = compositePixel(out[i], blended);
  }
  return out;
}
```

- [ ] **Step 4: `compositeLayers`가 레이어마다 블렌드·보정을 넘기도록 수정**

`compositeLayers` 함수 안의 `out = compositeOnto(out, layer.pixels, layer.opacity);` 줄을 다음으로 바꾼다:

```ts
    out = compositeOnto(
      out,
      layer.pixels,
      layer.opacity,
      layer.blendMode ?? "normal",
      layer,
    );
```

(`layer: PixelLayer`를 `LayerAdjustments`가 필요한 자리에 그대로 넘긴다 — `PixelLayer`가 `brightness`~`tint` 다섯 필드를 이미 갖고 있어 구조적으로 그대로 들어맞는다.) `compositeLayerRange`는 내부적으로 `compositeLayers`를 그대로 호출하므로 별도 수정이 필요 없다.

- [ ] **Step 5: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts
git commit -m "feat: 레이어 블렌드 모드·색보정 합성 수식 추가"
```

---

### Task 3: `PixelCanvas.tsx` — 활성 레이어 블렌드·보정 실시간 반영

레이어 스택·프레임 모드 때와 달리 이번엔 이 파일을 실제로 고친다 — 지금 그리고 있는 활성 레이어 자신이 아래 레이어와 실시간으로 섞여 보여야 한다.

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: Task 1의 `BlendMode`, Task 2의 `LayerAdjustments`/확장된 `compositeOnto`.
- Produces: `PixelCanvas`가 새 props `activeLayerBlendMode: BlendMode`, `activeLayerAdjustments: LayerAdjustments`를 받는다.

- [ ] **Step 1: import 추가**

`./pixelGrid` import(현재 24~39번째 줄)에 `LayerAdjustments`를 타입으로 추가한다:

```ts
import {
  compositeOnto,
  compositePixel,
  createGrid,
  expandPoints,
  getPixel,
  lassoMask,
  LayerAdjustments,
  linePoints,
  PixelValue,
  resamplePixelValues,
  rotatePixelValuesBy,
  setPixel,
  shapeToolPoints,
  wandMask,
  wandMaskGlobal,
} from "./pixelGrid";
```

`./types` import(현재 41번째 줄) 다음 줄에 추가:

```ts
import type { BlendMode } from "../_shared/assetLibrary";
```

- [ ] **Step 2: props 추가**

구조분해 목록에서 `activeLayerLocked,`(현재 192번째 줄) 다음에 추가:

```ts
  activeLayerLocked,
  activeLayerBlendMode,
  activeLayerAdjustments,
}: {
```

타입 선언에서 `activeLayerLocked: boolean;`(현재 291번째 줄) 다음에 추가:

```ts
  activeLayerLocked: boolean;
  // 활성 레이어 자신이 belowComposite와 섞이는 방식·보정 — render()와
  // getFullComposite() 둘 다 이 값을 반영한다.
  activeLayerBlendMode: BlendMode;
  activeLayerAdjustments: LayerAdjustments;
}) {
```

- [ ] **Step 3: `render()`가 블렌드·보정을 반영하도록 수정**

`render` 함수 안의 `visibleBase` 계산(현재 459~468번째 줄)을 다음으로 바꾼다:

```ts
      const hasAdjustments =
        !!activeLayerAdjustments.brightness ||
        !!activeLayerAdjustments.contrast ||
        !!activeLayerAdjustments.saturation ||
        !!activeLayerAdjustments.temperature ||
        !!activeLayerAdjustments.tint;
      const visibleBase =
        belowComposite || aboveComposite || activeLayerOpacity < 1 || hasAdjustments
          ? compositeOnto(
              belowComposite
                ? belowComposite.slice()
                : createGrid(width, height),
              data,
              activeLayerOpacity,
              activeLayerBlendMode,
              activeLayerAdjustments,
            )
          : data;
```

(블렌드 모드 자체는 이 조건에 넣지 않는다 — `belowComposite`가 없으면 섞을 대상이 없어 블렌드 모드가 있어도 결과가 `data`와 같으므로, 이미 있는 `belowComposite` 조건이 그 경우를 자연히 포함한다.)

`render`의 `useCallback` 의존성 배열(현재 761~781번째 줄)에 `activeLayerBlendMode, activeLayerAdjustments`를 추가한다.

- [ ] **Step 4: `getFullComposite`가 블렌드·보정을 반영하도록 수정**

`getFullComposite` 함수(현재 846~855번째 줄) 전체를 다음으로 바꾼다:

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
      !aboveComposite &&
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
    return aboveComposite ? compositeOnto(withActive, aboveComposite, 1) : withActive;
  }, [
    belowComposite,
    aboveComposite,
    activeLayerOpacity,
    activeLayerBlendMode,
    activeLayerAdjustments,
    width,
    height,
  ]);
```

- [ ] **Step 5: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `Editor.tsx`의 `<PixelCanvas>` 호출부가 아직 새 props를 안 넘겨서 나는 에러만 남는다(Task 5에서 해결). `PixelCanvas.tsx` 자체에서 나는 에러는 없어야 한다.

Run: `npm run lint`
Expected: `PixelCanvas.tsx`에서 나는 새 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: PixelCanvas가 활성 레이어의 블렌드 모드·색보정을 실시간 반영하도록 확장"
```

---

### Task 4: `LayerPanel.tsx` — 블렌드 모드 드롭다운 + 보정 슬라이더 5개

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `BlendMode`.
- Produces: `LayerPanel`이 새 props `onBlendModeChange: (id: string, mode: BlendMode) => void`, `onAdjustmentChange: (id: string, field: "brightness" | "contrast" | "saturation" | "temperature" | "tint", value: number) => void`, `onAdjustmentDragEnd: () => void`를 받는다. 기존 props는 전부 그대로 유지된다.

- [ ] **Step 1: import 추가**

`import type { PixelLayer } from "../_shared/assetLibrary";`(현재 16번째 줄)를 다음으로 바꾼다:

```ts
import type { BlendMode, PixelLayer } from "../_shared/assetLibrary";
```

- [ ] **Step 2: 보정 필드 목록 상수 추가**

파일 최상단 import 블록 다음(컴포넌트 함수 선언 이전)에 추가:

```ts
type AdjustmentField =
  | "brightness"
  | "contrast"
  | "saturation"
  | "temperature"
  | "tint";

// 슬라이더 5개를 하나씩 반복해 적지 않고 이 목록을 map으로 그린다 —
// ExportPanel.tsx의 FORMATS/SCALE_OPTIONS와 같은 패턴.
const ADJUSTMENT_ROWS: { field: AdjustmentField; label: string }[] = [
  { field: "brightness", label: "밝기" },
  { field: "contrast", label: "대비" },
  { field: "saturation", label: "채도" },
  { field: "temperature", label: "색온도" },
  { field: "tint", label: "틴트" },
];
```

- [ ] **Step 3: props 추가**

구조분해 목록에서 `onOpacityDragEnd,`(현재 42번째 줄) 다음에 추가:

```ts
  onOpacityDragEnd,
  onBlendModeChange,
  onAdjustmentChange,
  onAdjustmentDragEnd,
  onFlatten,
```

(`onFlatten,`이 이미 다음 줄에 있으므로, 그 사이에 세 줄을 끼워 넣는 형태다.)

타입 선언에서 `onOpacityDragEnd: () => void;`(현재 77번째 줄) 다음에 추가:

```ts
  onOpacityDragEnd: () => void;
  onBlendModeChange: (id: string, mode: BlendMode) => void;
  onAdjustmentChange: (
    id: string,
    field: AdjustmentField,
    value: number,
  ) => void;
  onAdjustmentDragEnd: () => void;
```

- [ ] **Step 4: 블렌드 모드·보정 UI 추가**

투명도 슬라이더를 담은 `<div className="shrink-0 border-t border-gray-100 px-3 py-2">...</div>` 블록(현재 215~234번째 줄) 바로 다음에 추가:

```tsx
          <div className="flex shrink-0 flex-col gap-1 border-t border-gray-100 px-3 py-2">
            <label className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
              블렌드 모드
              <select
                value={activeLayer.blendMode ?? "normal"}
                onChange={(e) =>
                  onBlendModeChange(activeLayer.id, e.target.value as BlendMode)
                }
                className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="color-burn">Color Burn</option>
              </select>
            </label>
            {ADJUSTMENT_ROWS.map(({ field, label }) => (
              <label
                key={field}
                className="flex items-center gap-2 text-[10px] text-gray-500"
              >
                {label}
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={activeLayer[field] ?? 0}
                  onChange={(e) =>
                    onAdjustmentChange(activeLayer.id, field, Number(e.target.value))
                  }
                  onPointerUp={onAdjustmentDragEnd}
                  onBlur={onAdjustmentDragEnd}
                  className="flex-1"
                />
                <span className="w-8 shrink-0 text-right">
                  {activeLayer[field] ?? 0}
                </span>
              </label>
            ))}
          </div>
```

- [ ] **Step 5: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `Editor.tsx`의 두 `<LayerPanel>` 호출부가 아직 새 props를 안 넘겨서 나는 에러만 남는다(Task 5에서 해결). `LayerPanel.tsx` 자체에서 나는 에러는 없어야 한다.

Run: `npm run lint`
Expected: `LayerPanel.tsx`에서 나는 새 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx
git commit -m "feat: 레이어 패널에 블렌드 모드 드롭다운과 보정 슬라이더 5개 추가"
```

---

### Task 5: `Editor.tsx` (1/2) — 드래그 코얼레싱 확장 + 새 핸들러

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `BlendMode`, Task 2의 확장된 `compositeOnto`.
- Produces: 컴포넌트 스코프 값·핸들러 `handleLayerBlendModeChange`, `handleLayerAdjustmentChange`, `handleAdjustmentDragEnd` — Task 6이 그대로 쓴다. 기존 `opacityDragLayerIdRef`/`handleLayerOpacityChange`/`handleOpacityDragEnd`는 이름과 내부 저장 형태만 바뀌고(레이어 id 하나만 → `{레이어 id, 필드}` 쌍) 동작은 동일하게 유지된다.

- [ ] **Step 1: import에 `BlendMode` 추가**

`_shared/assetLibrary` import(`PixelArt, PixelLayer, savePixelArt, uid` 등이 있는 블록)에 `BlendMode`를 추가한다:

```ts
import {
  BlendMode,
  getPixelArt,
  listPixelArt,
  PixelArt,
  PixelLayer,
  savePixelArt,
  uid,
} from "../_shared/assetLibrary";
```

- [ ] **Step 2: `DragCoalesceField` 타입 추가**

`type Tab = { doc: PixelArt; hasMetaEdits: boolean; pixelsDirty: boolean };` 선언 다음에 추가:

```ts
// 투명도·보정(밝기·대비·채도·색온도·틴트) 슬라이더의 드래그 코얼레싱이
// "지금 이어지는 드래그가 어느 레이어의 어느 값인지" 구분하는 데 쓰는 필드.
type DragCoalesceField =
  | "opacity"
  | "brightness"
  | "contrast"
  | "saturation"
  | "temperature"
  | "tint";
```

- [ ] **Step 3: `opacityDragLayerIdRef`를 `dragCoalesceRef`로 확장**

`opacityDragLayerIdRef` 선언과 그 위 주석(현재 603~610번째 줄)을 다음으로 바꾼다:

```ts
  // 투명도·보정 슬라이더를 드래그하는 동안 "지금 이어지는 드래그가 어느
  // 레이어의 어느 값인지" 기억한다 — handleLayerOpacityChange·
  // handleLayerAdjustmentChange가 같은 레이어의 같은 값에서 연속으로
  // 불리면(레이어 id와 필드가 둘 다 같으면) 실행취소 스택에 새로 쌓지 않고
  // 값만 갱신하고, 다른 레이어·다른 값이거나 첫 틱이면 정상적으로 되돌리기
  // 경계를 만든다. 아래 세 pushXxx 함수는 호출될 때마다 이 값을 비워, 드래그
  // 중간에 다른 조작이 끼어들면 다음 드래그가 항상 새 경계에서 시작하게 한다.
  const dragCoalesceRef = useRef<{
    layerId: string;
    field: DragCoalesceField;
  } | null>(null);
```

`pushHistory`·`pushHistoryAllLayers`·`pushLayerOp` 세 함수 안의 `opacityDragLayerIdRef.current = null;`(각각 현재 639·657·677번째 줄) 세 곳을 전부 `dragCoalesceRef.current = null;`로 바꾼다. 이 세 함수의 `useCallback` 의존성 배열 자체는 바꿀 필요 없다(ref는 의존성 목록에 넣지 않는다).

`handleSelectLayer` 안의 주석과 `opacityDragLayerIdRef.current = null;`(현재 1671~1674번째 줄)을 다음으로 바꾼다:

```ts
      // 다른 레이어로 활성을 바꾸면 지금까지 진행 중이던 드래그 코얼레싱은
      // 더 이상 의미가 없다 — 다음 드래그는 항상 새 되돌리기 경계에서 시작해야 한다.
      dragCoalesceRef.current = null;
```

- [ ] **Step 4: `handleLayerOpacityChange`/`handleOpacityDragEnd`가 새 ref 형태를 쓰도록 수정**

`handleLayerOpacityChange`(현재 1806~1821번째 줄)를 다음으로 바꾼다:

```ts
  const handleLayerOpacityChange = useCallback(
    (id: string, opacity: number) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, opacity } : l,
      );
      if (
        dragCoalesceRef.current?.layerId === id &&
        dragCoalesceRef.current.field === "opacity"
      ) {
        history.replacePresentLayers(nextLayers, history.activeLayerId);
      } else {
        // pushLayerOp가 내부에서 dragCoalesceRef를 비우므로, 이 드래그의
        // 시작임을 기록하는 아래 줄은 반드시 pushLayerOp 호출 다음에 온다.
        pushLayerOp(nextLayers, history.activeLayerId);
        dragCoalesceRef.current = { layerId: id, field: "opacity" };
      }
    },
    [history, pushLayerOp],
  );
```

`handleOpacityDragEnd`(현재 1826~1828번째 줄)를 다음으로 바꾼다:

```ts
  const handleOpacityDragEnd = useCallback(() => {
    dragCoalesceRef.current = null;
  }, []);
```

- [ ] **Step 5: 새 핸들러 추가**

`handleOpacityDragEnd` 다음, `handleFlattenLayers` 이전에 추가:

```ts
  const handleLayerBlendModeChange = useCallback(
    (id: string, blendMode: BlendMode) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, blendMode } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  // range 입력 다섯 개(밝기·대비·채도·색온도·틴트)가 공유하는 핸들러 —
  // handleLayerOpacityChange와 동일한 코얼레싱 패턴이지만, 레이어 id뿐
  // 아니라 어느 필드인지까지 같아야 "이어지는 드래그"로 취급한다.
  const handleLayerAdjustmentChange = useCallback(
    (
      id: string,
      field: "brightness" | "contrast" | "saturation" | "temperature" | "tint",
      value: number,
    ) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      );
      if (
        dragCoalesceRef.current?.layerId === id &&
        dragCoalesceRef.current.field === field
      ) {
        history.replacePresentLayers(nextLayers, history.activeLayerId);
      } else {
        pushLayerOp(nextLayers, history.activeLayerId);
        dragCoalesceRef.current = { layerId: id, field };
      }
    },
    [history, pushLayerOp],
  );

  const handleAdjustmentDragEnd = useCallback(() => {
    dragCoalesceRef.current = null;
  }, []);
```

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `<PixelCanvas>`·`<LayerPanel>` 호출부가 아직 새 props를 안 넘겨서 나는 에러, 그리고 새로 추가한 핸들러 3개가 아직 어디서도 안 쓰여서 나는 미사용 변수 경고만 남는다(Task 6에서 전부 해결). 그 외(드래그 코얼레싱 리팩터 관련) 에러는 없어야 한다.

Run: `npm run lint`
Expected: 새로 추가한 핸들러 3개의 미사용 경고 외에 새 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor에 블렌드 모드·색보정 드래그 코얼레싱과 핸들러 추가"
```

---

### Task 6: `Editor.tsx` (2/2) — 배선(PixelCanvas·LayerPanel·병합)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 3의 `PixelCanvas` 새 props, Task 4의 `LayerPanel` 새 props, Task 5의 새 핸들러.

- [ ] **Step 1: `<PixelCanvas>`에 새 props 전달**

`<PixelCanvas>` 호출(현재 2280번째 줄부터) 안, `activeLayerLocked={activeLayer.locked || isPlaying}` 다음 줄에 추가:

```tsx
                    activeLayerLocked={activeLayer.locked || isPlaying}
                    activeLayerBlendMode={activeLayer.blendMode ?? "normal"}
                    activeLayerAdjustments={activeLayer}
```

(`activeLayer: PixelLayer`를 `LayerAdjustments` 자리에 그대로 넘긴다 — `PixelLayer`가 다섯 보정 필드를 이미 갖고 있어 구조적으로 들어맞는다.)

- [ ] **Step 2: `<LayerPanel>` 두 곳에 새 props 전달**

넓은 화면용(현재 2443~2469번째 줄)과 좁은 화면용(현재 2490~2515번째 줄) `<LayerPanel>` 호출 둘 다에, `onOpacityDragEnd={handleOpacityDragEnd}` 다음 줄로 추가한다(두 곳 모두 동일하게):

```tsx
                      onOpacityDragEnd={handleOpacityDragEnd}
                      onBlendModeChange={handleLayerBlendModeChange}
                      onAdjustmentChange={handleLayerAdjustmentChange}
                      onAdjustmentDragEnd={handleAdjustmentDragEnd}
```

- [ ] **Step 3: `handleMergeDown`이 블렌드·보정을 함께 병합하도록 수정**

`handleMergeDown` 안의 `merged` 객체(현재 1740~1743번째 줄)를 다음으로 바꾼다:

```ts
      const merged: PixelLayer = {
        ...below,
        pixels: compositeOnto(
          below.pixels,
          layer.pixels,
          layer.opacity,
          layer.blendMode ?? "normal",
          layer,
        ),
      };
```

(병합되는 위 레이어 자신의 블렌드 모드·보정까지 함께 넘기지 않으면, 병합 대상에 멀티플라이 등이 걸려 있을 때 병합 순간 그 효과가 사라져 그림이 바뀌어 보인다.)

- [ ] **Step 4: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(레이어 기능·프레임 모드 관련 코드를 포함해 전체가 클린해야 한다).

- [ ] **Step 5: 브라우저 수동 확인**

Run: `npm run dev`

`/nemo-nemo-beam`을 열고 레이어 2장을 겹쳐 그린 뒤 다음을 확인한다:

1. 위 레이어를 활성으로 고르고 블렌드 모드를 Multiply로 바꾸면 캔버스에 바로 반영되는지 확인한다.
2. 밝기·대비·채도·색온도·틴트 슬라이더를 하나씩 움직여보고 각각 캔버스에 실시간으로 반영되는지 확인한다.
3. 슬라이더를 드래그하는 동안 여러 번 값이 바뀌어도, 손을 뗀 뒤 Ctrl+Z 한 번으로 드래그 시작 전 값으로 완전히 되돌아가는지 확인한다(중간값에서 멈추지 않는지).
4. 블렌드 모드를 Multiply로 뒀다가 다시 Normal로 되돌려서, 그 즉시 원래 모습으로 돌아오는지 확인한다.
5. 위 레이어에 Multiply와 밝기값이 걸린 상태에서 "병합"을 누르면, 병합 직후 화면이 병합 전과 똑같이 보이는지(효과가 사라지지 않는지) 확인한다.
6. 저장 후 탭을 닫았다가 다시 열어 블렌드 모드·보정값이 그대로 복원되는지 확인한다.
7. 내보내기(PNG)한 결과가 화면에 보이던 블렌드·보정 결과와 일치하는지 확인한다.
8. 스포이트로 블렌드·보정이 적용된 지점을 클릭하면 화면에 보이는(합성된) 색이 뽑히는지 확인한다.
9. 레이어를 하나만 그린(다른 레이어가 없는) 상태에서 그 레이어에 보정을 걸어도 정상적으로 반영되는지 확인한다(배경 레이어가 없어도 보정 자체는 걸려야 한다).

Expected: 위 9가지 모두 설계 스펙(`docs/superpowers/specs/2026-08-06-nemo-nemo-beam-layer-blend-adjustments-design.md`)대로 동작.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 블렌드 모드·색보정 UI를 PixelCanvas·LayerPanel에 배선"
```

---

### Task 7: 전체 빌드 확인

**Files:** 없음(검증 전용 태스크).

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 2: 기존 저장 파일 하위 호환 확인(수동)**

블렌드 모드·보정 필드가 없는(이번 작업 이전에 저장된) 기존 레이어 작품을 열어본다 — 전부 Normal·0으로 표시되고 그림이 깨지지 않는지 확인한다. 없다면 이 단계는 생략하고 그 사실을 기록한다.

- [ ] **Step 3: 커밋(변경 사항이 있는 경우에만)**

이 태스크에서 코드 변경이 없다면 커밋할 것이 없다.
