# 네모네모빔 레이어 스택 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔(픽셀아트 메이커) 캔버스에 포토샵식 레이어 스택(추가·삭제·순서변경·복제·병합·잠금·보이기·투명도·이름)을 추가한다.

**Architecture:** `history.present`(활성 레이어의 평면 픽셀 배열)라는 기존 개념을 그대로 유지하면서, `useCanvasHistory`가 내부적으로 레이어 배열 전체를 스냅숏으로 관리하도록 확장한다. 그리기 도구(펜슬·도형·텍스트·그라데이션 등)는 지금처럼 활성 레이어 배열 하나만 다루므로 대부분 변경이 필요 없고, `PixelCanvas`는 활성 레이어 위/아래에 다른 레이어들을 합성한 배경·전경을 받아 표시만 한다. 저장·내보내기는 항상 전체 레이어를 합성한 `pixels`를 쓴다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript, 상태는 React 훅으로만 관리(외부 상태 라이브러리 없음), 저장은 `localStorage`.

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다(`package.json`에 `test` 스크립트 없음, `CLAUDE.md`에 명시). 각 태스크는 자동 테스트 대신 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, 그리고 필요한 태스크에서는 `npm run dev`로 띄운 브라우저에서의 수동 확인으로 검증한다. 새로운 테스트 프레임워크를 도입하지 않는다.
- 설명 문구(레이어 이름 기본값, 버튼 title 등)는 프로젝트의 한국어 문체 규칙(번역투 금지, 조사로 직결, 반복 회피)을 따른다.
- 다크 테마 글래스모피즘(`bg-gray-950` 등)이 아니라, 이 Work(`5_PixelArtMaker`)가 이미 쓰고 있는 밝은 OS 창 스타일(`bg-white`, `shadow-md`, `text-gray-500/700`, 활성 강조는 `violet-500`, 아이콘 버튼은 `h-7 w-7`~`h-8 w-8`)을 그대로 따른다 — `Accordion.tsx`, `DrawToolbar.tsx` 참고.
- 레이어 개수 상한은 `MAX_LAYERS = 20`.
- 커밋 메시지는 한글, `Co-Authored-By: Claude` 트레일러를 붙이지 않는다.

---

### Task 1: 데이터 모델 — `_shared/assetLibrary.ts`에 `PixelLayer` 추가 + V3 저장 포맷

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`

**Interfaces:**
- Produces: `export type PixelLayer = { id: string; name: string; pixels: (string | null)[]; visible: boolean; opacity: number; locked: boolean; }`. `PixelArt`에 `layers?: PixelLayer[]; activeLayerId?: string;` 추가. `encodeStored(art: PixelArt)`은 이제 `version: 3`을 반환.

- [ ] **Step 1: `PixelLayer` 타입과 `PixelArt` 확장**

`export type PixelArt = {` 선언(현재 9~17번째 줄) 바로 위에 추가:

```ts
// 레이어 하나 — pixels는 캔버스와 같은 width×height 크기의 평면 배열이다.
// opacity는 0~1이고, 이 레이어를 아래 레이어들 위에 합성할 때만 쓰인다
// (레이어 안의 개별 픽셀 알파와는 별개로 곱해진다).
export type PixelLayer = {
  id: string;
  name: string;
  pixels: (string | null)[];
  visible: boolean;
  opacity: number;
  locked: boolean;
};
```

`PixelArt` 타입 안에 `pixels` 필드 설명 주석을 다음으로 바꾸고 필드를 추가:

```ts
export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[]; // 즐겨찾기 색 목록 — 그림 데이터 자체와는 무관하다.
  // 항상 "레이어를 모두 합성한 최종 결과"다 — 레이어 개념을 모르는 소비처
  // (썸네일, VN 스튜디오 리소스 피커 등)는 이 필드만 읽으면 된다.
  pixels: (string | null)[];
  // 있으면 편집기가 그대로 복원할 수 있는 레이어 스택. 없으면(V2 이하로
  // 저장된 구파일) pixels를 감싼 단일 레이어로 취급한다 — 이 마이그레이션은
  // 이 파일이 아니라 Editor.tsx가 문서를 열 때 담당한다(아래 참고).
  layers?: PixelLayer[];
  activeLayerId?: string;
  createdAt: number;
};
```

- [ ] **Step 2: V3 저장 포맷 + 마이그레이션**

`type StoredPixelArtV2 = ...` 선언(현재 103~110번째 줄) 을 다음으로 바꾼다:

```ts
type StoredPixelLayerV3 = Omit<PixelLayer, "pixels"> & { pixels: PackedPixels };
type StoredPixelArtV3 = Omit<PixelArt, "pixels" | "layers"> & {
  pixels: PackedPixels;
  layers?: StoredPixelLayerV3[];
  version: 3;
};
type StoredPixelArtV2 = Omit<PixelArt, "pixels"> & {
  pixels: PackedPixels;
  version: 2;
};
type StoredPixelArtV1 = Omit<PixelArt, "pixels"> & {
  pixels: string | number[];
};
type StoredPixelArt = StoredPixelArtV3 | StoredPixelArtV2 | StoredPixelArtV1;

function isV3(stored: StoredPixelArt): stored is StoredPixelArtV3 {
  return (stored as StoredPixelArtV3).version === 3;
}

function isV2(stored: StoredPixelArt): stored is StoredPixelArtV2 {
  return (stored as StoredPixelArtV2).version === 2;
}

function decodeStored(stored: StoredPixelArt): PixelArt {
  if (isV3(stored)) {
    return {
      ...stored,
      pixels: unpackPixels(stored.pixels),
      layers: stored.layers?.map((l) => ({
        ...l,
        pixels: unpackPixels(l.pixels),
      })),
    };
  }
  if (isV2(stored)) {
    return { ...stored, pixels: unpackPixels(stored.pixels) };
  }
  return { ...stored, pixels: legacyUnpack(stored.pixels, stored.palette) };
}

export function encodeStored(art: PixelArt): StoredPixelArtV3 {
  return {
    ...art,
    pixels: packPixels(art.pixels),
    layers: art.layers?.map((l) => ({ ...l, pixels: packPixels(l.pixels) })),
    version: 3,
  };
}
```

(기존에 있던 `type StoredPixelArt = StoredPixelArtV2 | StoredPixelArtV1;`, `function isV2(...)`, `function decodeStored(...)`, `export function encodeStored(...)` 선언은 위 코드로 완전히 대체되므로 지운다.)

`saveLibrary` 안의 저장 타입 주석(현재 168~182번째 줄 부근)에서 `pixelArt: StoredPixelArtV2[]`를 `pixelArt: StoredPixelArtV3[]`로 바꾼다.

- [ ] **Step 3: `duplicatePixelArt`가 레이어도 깊은 복사하도록 수정**

`duplicatePixelArt` 안의 `copy` 객체(현재 231~238번째 줄)에 `layers` 필드를 추가한다 — 안 그러면 복제본이 원본과 같은 레이어 배열/픽셀 배열 참조를 공유한다:

```ts
const copy: PixelArt = {
  ...item,
  id: uid(),
  name: `${item.name} 사본`,
  pixels: item.pixels.slice(),
  layers: item.layers?.map((l) => ({ ...l, pixels: l.pixels.slice() })),
  palette: item.palette.slice(),
  createdAt: Date.now(),
};
```

- [ ] **Step 4: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음(이 시점엔 아직 `layers`를 실제로 쓰는 코드가 없으므로 기존 동작에 영향 없음).

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/_shared/assetLibrary.ts
git commit -m "feat: PixelArt에 레이어 스택 데이터 모델과 V3 저장 포맷 추가"
```

---

### Task 2: `wallpaper.ts` — 배경화면도 같은 V3 마이그레이션 반영

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/wallpaper.ts`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`, `encodeStored`(이제 V3 반환), `unpackPixels`.
- Produces: `getWallpaper()`가 V3(레이어 포함) 파일도 올바르게 읽는다. `saveWallpaper`는 코드 변경 없이 이미 V3로 저장된다(내부에서 `encodeStored`를 그대로 호출하기 때문).

- [ ] **Step 1: import에 `PixelLayer` 추가**

파일 상단 import(현재 1~6번째 줄)를 다음으로 바꾼다:

```ts
import {
  encodeStored,
  PackedPixels,
  PixelArt,
  PixelLayer,
  unpackPixels,
} from "../_shared/assetLibrary";
```

- [ ] **Step 2: `getWallpaper`가 V3를 읽도록 확장**

`type StoredWallpaperV2 = ...`/`type StoredWallpaperV1 = ...` 선언(현재 109~115번째 줄)을 다음으로 바꾼다:

```ts
type StoredWallpaperV3 = Omit<PixelArt, "pixels" | "layers"> & {
  pixels: PackedPixels;
  layers?: (Omit<PixelLayer, "pixels"> & { pixels: PackedPixels })[];
  version: 3;
};
type StoredWallpaperV2 = Omit<PixelArt, "pixels"> & {
  pixels: PackedPixels;
  version: 2;
};
type StoredWallpaperV1 = Omit<PixelArt, "pixels"> & {
  pixels: string | number[];
};
```

`getWallpaper` 함수(현재 117~146번째 줄) 안의 파싱 부분을 다음으로 바꾼다:

```ts
export function getWallpaper(): PixelArt {
  if (typeof window === "undefined") return defaultWallpaper();
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as
        | StoredWallpaperV3
        | StoredWallpaperV2
        | StoredWallpaperV1;
      if ("version" in parsed && parsed.version === 3) {
        return {
          ...parsed,
          pixels: unpackPixels(parsed.pixels),
          layers: parsed.layers?.map((l) => ({
            ...l,
            pixels: unpackPixels(l.pixels),
          })),
        };
      }
      if ("version" in parsed && parsed.version === 2) {
        return { ...parsed, pixels: unpackPixels(parsed.pixels) };
      }
      // 이전(인덱스 팔레트) 포맷 — 인덱스를 palette로 풀어 실제 hex로 바꾸고,
      // 예전 palette는 그대로 즐겨찾기 목록으로 이어받는다.
      const legacy = parsed as StoredWallpaperV1;
      const legacyPixels = legacy.pixels;
      const indices: number[] = Array.isArray(legacyPixels)
        ? legacyPixels
        : Array.from(legacyPixels, (ch) =>
            ch === "." ? -1 : parseInt(ch, 36),
          );
      return {
        ...legacy,
        pixels: indices.map((i) =>
          i < 0 ? null : (legacy.palette[i] ?? null),
        ),
      };
    }
  } catch {}
  const fresh = defaultWallpaper();
  saveWallpaper(fresh);
  return fresh;
}
```

`saveWallpaper`(148~157번째 줄)는 그대로 둔다 — `encodeStored`가 이제 V3를 반환하므로 자동으로 새 포맷으로 저장된다.

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/wallpaper.ts
git commit -m "feat: 배경화면 저장소도 레이어 V3 포맷을 읽도록 확장"
```

---

### Task 3: `types.ts` — `MAX_LAYERS` 상수

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts`

**Interfaces:**
- Produces: `export const MAX_LAYERS = 20;`

- [ ] **Step 1: 상수 추가**

`export const MAX_PALETTE_COLORS = 12;` 바로 아래(현재 74번째 줄)에 추가:

```ts
// 레이어 스냅숏 하나가 레이어 수만큼의 평면 배열을 담으므로(실행취소 스택
// 50개 기준), 레이어 수에 상한을 둬 메모리 사용량을 억제한다.
export const MAX_LAYERS = 20;
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/types.ts
git commit -m "feat: 레이어 개수 상한(MAX_LAYERS) 추가"
```

---

### Task 4: `pixelGrid.ts` — 레이어 합성 함수

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`.
- Produces: `export function compositePixel(dst: PixelValue, src: string): PixelValue`(기존 함수를 export로 전환), `export function applyOpacityToPixel(value: PixelValue, opacity: number): PixelValue`, `export function compositeOnto(dst: PixelValue[], src: PixelValue[], srcOpacity: number): PixelValue[]`, `export function compositeLayers(layers: PixelLayer[], width: number, height: number): PixelValue[]`, `export function compositeLayerRange(layers: PixelLayer[], fromIndex: number, toIndex: number, width: number, height: number): PixelValue[] | null`, `export function createLayer(id: string, name: string, width: number, height: number): PixelLayer`.

- [ ] **Step 1: import에 `PixelLayer` 추가, `compositePixel` export로 전환**

파일 최상단 import(현재 1~2번째 줄)를 다음으로 바꾼다:

```ts
import { hexToRgba, rgbaToHex } from "./hsv";
import type { Point } from "./types";
import type { PixelLayer } from "../_shared/assetLibrary";
```

`function compositePixel(...)` 선언(현재 10번째 줄)의 `function`을 `export function`으로 바꾼다.

- [ ] **Step 2: 합성 헬퍼 추가**

`createGrid` 함수(현재 25~27번째 줄) 바로 아래에 추가:

```ts
// 레이어 투명도를 픽셀 알파에 곱해 적용한다 — opacity가 1이면 원본 그대로,
// 0이면(완전 투명) 합성에 아무 영향이 없다.
export function applyOpacityToPixel(
  value: PixelValue,
  opacity: number,
): PixelValue {
  if (value === null || opacity >= 1) return value;
  if (opacity <= 0) return null;
  const [r, g, b, a] = hexToRgba(value);
  return rgbaToHex(r, g, b, a * opacity);
}

// src 레이어를 자신의 투명도(srcOpacity)까지 반영해 dst 위에 겹쳐 합성한다 —
// 레이어 하나를 그 아래 결과 위에 얹는 기본 단위 연산.
export function compositeOnto(
  dst: PixelValue[],
  src: PixelValue[],
  srcOpacity: number,
): PixelValue[] {
  const out = dst.slice();
  for (let i = 0; i < src.length; i++) {
    const s = applyOpacityToPixel(src[i], srcOpacity);
    if (s !== null) out[i] = compositePixel(out[i], s);
  }
  return out;
}

// 보이는 레이어만, 배열 순서(아래→위)대로 차례로 겹쳐 하나의 평면 이미지로
// 합성한다 — 저장·내보내기·썸네일처럼 레이어를 모르는 곳에서 쓰는 최종 결과.
export function compositeLayers(
  layers: PixelLayer[],
  width: number,
  height: number,
): PixelValue[] {
  let out = createGrid(width, height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    out = compositeOnto(out, layer.pixels, layer.opacity);
  }
  return out;
}

// layers(아래→위 순서) 중 [fromIndex, toIndex] 구간만 합성한다 — PixelCanvas가
// 활성 레이어 아래/위의 배경·전경을 미리 만들어둘 때 쓴다. 구간에 보이는
// 레이어가 하나도 없으면(범위를 벗어나거나 전부 숨김) null을 돌려준다.
export function compositeLayerRange(
  layers: PixelLayer[],
  fromIndex: number,
  toIndex: number,
  width: number,
  height: number,
): PixelValue[] | null {
  if (fromIndex > toIndex || fromIndex >= layers.length || toIndex < 0) {
    return null;
  }
  const slice = layers
    .slice(Math.max(0, fromIndex), Math.min(layers.length, toIndex + 1))
    .filter((l) => l.visible);
  if (slice.length === 0) return null;
  return compositeLayers(slice, width, height);
}

// 빈 레이어 하나를 만든다 — id는 호출부(Editor)가 uid()로 발급해 넘긴다.
export function createLayer(
  id: string,
  name: string,
  width: number,
  height: number,
): PixelLayer {
  return {
    id,
    name,
    pixels: createGrid(width, height),
    visible: true,
    opacity: 1,
    locked: false,
  };
}
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts
git commit -m "feat: 레이어 합성 유틸 함수 추가"
```

---

### Task 5: `useCanvasHistory.ts` — 레이어 스택 단위로 스냅숏 확장

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useCanvasHistory.ts`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`.
- Produces: `useCanvasHistory(initialLayers: PixelLayer[], initialActiveLayerId: string, initialSize: CanvasSize)`가 다음을 반환: `present: PixelValue[]`(활성 레이어 픽셀, 기존과 동일한 의미), `presentLayers: PixelLayer[]`, `activeLayerId: string`, `presentSize: CanvasSize`, `push(nextPixels: PixelValue[], nextSize?: CanvasSize): void`(기존과 동일한 시그니처 — 활성 레이어만 교체), `pushLayers(nextLayers: PixelLayer[], nextActiveLayerId: string, nextSize?: CanvasSize): void`(신규 — 레이어 구조 변경/캔버스 전체 변형용), `setActiveLayerId(id: string): void`(신규 — 실행취소 스택에 쌓이지 않음), `undo/redo/reset/canUndo/canRedo`(기존과 동일한 이름, `reset`은 시그니처가 `(nextLayers, nextActiveLayerId, nextSize)`로 바뀜).

이 파일 전체를 다음으로 교체한다:

```ts
import { useCallback, useRef, useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import { PixelValue } from "./pixelGrid";

const HISTORY_LIMIT = 50;

export type CanvasSize = { width: number; height: number };

type Snapshot = {
  layers: PixelLayer[];
  activeLayerId: string;
  size: CanvasSize;
};

// 회전·캔버스 크기 수정처럼 가로세로 자체가 바뀌는 조작도, 레이어 구조가
// 바뀌는 조작(추가·삭제·순서변경·병합·복제·보이기·투명도·잠금·이름)도 모두
// 되돌릴 수 있어야 한다 — 그래서 스냅숏 하나가 레이어 배열 전체와 활성
// 레이어 id, 그 시점의 캔버스 크기를 함께 기억한다.
export function useCanvasHistory(
  initialLayers: PixelLayer[],
  initialActiveLayerId: string,
  initialSize: CanvasSize,
) {
  const [presentSnap, setPresentSnap] = useState<Snapshot>({
    layers: initialLayers,
    activeLayerId: initialActiveLayerId,
    size: initialSize,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  const commit = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize?: CanvasSize,
    ) => {
      undoStack.current.push(presentSnap);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setPresentSnap({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        size: nextSize ?? presentSnap.size,
      });
      setCanUndo(true);
      setCanRedo(false);
    },
    [presentSnap],
  );

  // 활성 레이어의 픽셀만 교체한다 — 나머지 레이어는 그대로 둔 채 그 레이어
  // 객체 하나만 새로 만든다. 그리기·채우기·텍스트·도형 등 대부분의 편집이
  // 여기를 탄다(기존 push(pixels, size?) 시그니처와 동일하게 유지).
  const push = useCallback(
    (nextPixels: PixelValue[], nextSize?: CanvasSize) => {
      const nextLayers = presentSnap.layers.map((l) =>
        l.id === presentSnap.activeLayerId ? { ...l, pixels: nextPixels } : l,
      );
      commit(nextLayers, presentSnap.activeLayerId, nextSize);
    },
    [presentSnap, commit],
  );

  // 레이어 구조 자체가 바뀌거나(추가·삭제·순서변경·병합·복제·보이기·투명도·
  // 잠금·이름) 캔버스 전체가 변형되는(회전·반전·크기 수정) 조작 전용 — 새
  // layers 배열 전체와 활성 레이어 id를 그대로 받는다.
  const pushLayers = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize?: CanvasSize,
    ) => {
      commit(nextLayers, nextActiveLayerId, nextSize);
    },
    [commit],
  );

  // 어떤 레이어가 활성인지 바꾸는 것 자체는 편집이 아니다 — 실행취소 스택에
  // 쌓지 않는다(도구를 바꾸는 것과 같은 성격).
  const setActiveLayerId = useCallback((id: string) => {
    setPresentSnap((s) =>
      s.activeLayerId === id ? s : { ...s, activeLayerId: id },
    );
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(presentSnap);
    setPresentSnap(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [presentSnap]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(presentSnap);
    setPresentSnap(next);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, [presentSnap]);

  const reset = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize: CanvasSize,
    ) => {
      undoStack.current = [];
      redoStack.current = [];
      setPresentSnap({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        size: nextSize,
      });
      setCanUndo(false);
      setCanRedo(false);
    },
    [],
  );

  const activeLayer =
    presentSnap.layers.find((l) => l.id === presentSnap.activeLayerId) ??
    presentSnap.layers[presentSnap.layers.length - 1];

  return {
    present: activeLayer.pixels,
    presentLayers: presentSnap.layers,
    activeLayerId: presentSnap.activeLayerId,
    presentSize: presentSnap.size,
    push,
    pushLayers,
    setActiveLayerId,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
```

- [ ] **Step 2: 타입 검사(이 시점엔 컴파일 에러가 나는 게 정상)**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `Editor.tsx`에서 `useCanvasHistory(initial.doc.pixels, {...})`가 옛 2-인자 시그니처로 호출되고 있어 에러가 난다. 이는 Task 8에서 고친다 — 지금은 `useCanvasHistory.ts` 자체에서 나는 에러가 없는지만 확인한다(에러 메시지가 전부 `Editor.tsx` 쪽을 가리키는지 확인).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useCanvasHistory.ts
git commit -m "feat: useCanvasHistory가 레이어 스택 단위 스냅숏을 관리하도록 확장"
```

---

### Task 6: `PixelCanvas.tsx` — 합성 렌더링 · 잠금 · 합성 기준 도구

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: Task 4의 `compositeOnto`, `createGrid`.
- Produces: `PixelCanvas`가 새 props `belowComposite: PixelValue[] | null`, `aboveComposite: PixelValue[] | null`, `activeLayerOpacity: number`, `activeLayerLocked: boolean`을 받는다. `pixels` prop의 의미(활성 레이어)는 그대로 유지된다.

- [ ] **Step 1: import 정리 — `floodFill` 제거, `compositeOnto`/`createGrid` 추가**

현재 24~37번째 줄의 `pixelGrid` import에서 `floodFill`을 지우고(Step 5에서 대체하므로 더는 쓰지 않는다) `compositeOnto`, `createGrid`를 추가한다:

```ts
import {
  compositeOnto,
  createGrid,
  expandPoints,
  getPixel,
  lassoMask,
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

- [ ] **Step 2: props 추가**

`bottomToolbarPortalTarget,` 다음 줄(현재 156번째 줄, 구조분해 목록의 마지막)에 추가:

```ts
  bottomToolbarPortalTarget,
  belowComposite,
  aboveComposite,
  activeLayerOpacity,
  activeLayerLocked,
}: {
```

그리고 타입 선언에서 `bottomToolbarPortalTarget: HTMLDivElement | null;`(현재 245번째 줄) 다음에 추가:

```ts
  bottomToolbarPortalTarget: HTMLDivElement | null;
  // 활성 레이어 아래/위에 있는, 보이는 다른 레이어들을 미리 합성해둔 배경·
  // 전경 — 레이어 구조가 바뀔 때만(그리는 동안에는 그대로) Editor가 새로
  // 계산해 내려준다. 활성 레이어가 맨 아래/맨 위면 각각 null.
  belowComposite: PixelValue[] | null;
  aboveComposite: PixelValue[] | null;
  // 활성 레이어 자체의 투명도 — 렌더링에서 belowComposite 위에 얹을 때만 쓴다.
  activeLayerOpacity: number;
  // true면 이 캔버스는 그리기 도구를 전부 무시한다(스포이트·선택류는 계속 동작).
  activeLayerLocked: boolean;
}) {
```

- [ ] **Step 3: `render`가 합성된 배경을 그리도록 수정**

`render` 함수 본문(현재 401~424번째 줄)의 캔버스 초기화 직후, 첫 번째 픽셀 그리기 루프를 다음으로 바꾼다 — `getPixel(data, ...)`를 쓰던 루프를 합성된 `visibleBase`를 쓰도록 바꾸고, 그 아래 나머지 오버레이(선택 영역·미리보기·텍스트 등)는 계속 `data`(활성 레이어)를 그대로 참조한다:

```ts
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 화면에는 belowComposite → 활성 레이어(자기 투명도 적용) →
      // aboveComposite 순서로 겹쳐 보여준다 — 실제로 편집되는 대상은
      // data(활성 레이어)뿐이고, 이 두 밴드는 시각적 맥락일 뿐이다.
      const visibleBase =
        belowComposite || aboveComposite || activeLayerOpacity < 1
          ? compositeOnto(
              belowComposite
                ? belowComposite.slice()
                : createGrid(width, height),
              data,
              activeLayerOpacity,
            )
          : data;
      const visibleWithAbove = aboveComposite
        ? compositeOnto(visibleBase, aboveComposite, 1)
        : visibleBase;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = getPixel(visibleWithAbove, width, x, y);
          if (color === null) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
```

이 루프 이후(선택 영역 표시부터 pendingImage 미리보기까지) 코드는 전부 그대로 둔다 — 거기서 쓰는 `data`/`getPixel(data, ...)` 호출은 의도적으로 활성 레이어만 본다(텍스트 안티에일리어싱 배경색 섞기 등).

`render`의 `useCallback` 의존성 배열(현재 675~691번째 줄)에 `belowComposite, aboveComposite, activeLayerOpacity`를 추가한다.

- [ ] **Step 4: 합성 기준 샘플링 헬퍼 추가**

`plotPoint` 선언(현재 733~750번째 줄) 다음에 추가:

```ts
  // 스포이트·마법봉·페인트통은 화면에 보이는 그대로(합성 기준)로 판정해야
  // 한다 — belowComposite + 활성 레이어(지금 workingRef 값, 자기 투명도
  // 적용) + aboveComposite를 그 순간에만 한 번 합성한다. 매 프레임 계산하지
  // 않고 이 세 도구가 실제로 클릭될 때만 부른다.
  const getFullComposite = useCallback((): PixelValue[] => {
    if (!belowComposite && !aboveComposite && activeLayerOpacity >= 1) {
      return workingRef.current;
    }
    const base = belowComposite
      ? belowComposite.slice()
      : createGrid(width, height);
    const withActive = compositeOnto(base, workingRef.current, activeLayerOpacity);
    return aboveComposite ? compositeOnto(withActive, aboveComposite, 1) : withActive;
  }, [belowComposite, aboveComposite, activeLayerOpacity, width, height]);
```

- [ ] **Step 5: 잠금 가드 + 스포이트/페인트통/마법봉을 합성 기준으로 전환**

`SPECIAL_TOOLS` 선언(현재 106번째 줄) 다음에 추가:

```ts
// 활성 레이어가 잠겨 있으면 이 도구들은 아무 것도 하지 않는다 — 스포이트·
// 선택류(select·lasso·wand)는 그리지 않으므로 잠금과 무관하게 계속 동작한다.
const LOCK_BLOCKED_TOOLS: Tool[] = [
  "pencil",
  "eraser",
  "bucket",
  "line",
  "rect",
  "circle",
  "text",
  "gradient",
  "move",
];
```

`handlePointerDown` 안, `if (isSpaceHeld) { ... return; }` 블록(현재 756~769번째 줄) 바로 다음, `const point = toGridPoint(e);`(현재 771번째 줄) 이전에 추가:

```ts
      if (activeLayerLocked && LOCK_BLOCKED_TOOLS.includes(tool)) return;

```

스포이트 분기(현재 775~779번째 줄)를 다음으로 바꾼다:

```ts
      if (tool === "eyedropper") {
        const color = getPixel(getFullComposite(), width, point.x, point.y);
        if (color !== null) onPickColor(color);
        return;
      }
```

페인트통 분기(현재 838~853번째 줄)를 다음으로 바꾼다 — `floodFill`(활성 레이어만 보고 채움) 대신 `wandMask`로 합성 기준 연결 영역을 구하고, 그 영역만 활성 레이어에 칠한다:

```ts
      if (tool === "bucket") {
        const mask = wandMask(getFullComposite(), width, height, point.x, point.y);
        if (mask.size > 0) {
          let next = workingRef.current;
          mask.forEach((i) => {
            const x = i % width;
            const y = Math.floor(i / width);
            next = setPixel(next, width, x, y, activeColorHex);
          });
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }
```

마법봉 분기(현재 855~876번째 줄) 안의 `wandGlobal ? wandMaskGlobal(workingRef.current, ...) : wandMask(workingRef.current, ...)`를 다음으로 바꾼다(나머지 로직은 그대로):

```ts
        const clicked = wandGlobal
          ? wandMaskGlobal(getFullComposite(), width, point.x, point.y)
          : wandMask(getFullComposite(), width, height, point.x, point.y);
```

`handlePointerDown`의 `useCallback` 의존성 배열(현재 944~963번째 줄)에 `belowComposite, aboveComposite, activeLayerOpacity, activeLayerLocked, getFullComposite`를 추가한다.

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `PixelCanvas.tsx` 자체에서는 에러 없음(호출부인 `Editor.tsx`가 아직 새 props를 넘기지 않아 나는 에러는 Task 9에서 해결).

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: PixelCanvas가 레이어 합성 배경과 잠금, 합성 기준 도구를 지원하도록 확장"
```

---

### Task 7: `LayerPanel.tsx` — 레이어 목록 UI(신규)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`, `FileThumbnail`(기존 컴포넌트, `{width, height, pixels}` 소품), Task 3의 `MAX_LAYERS`.
- Produces: `export default function LayerPanel(props): JSX.Element` — Task 9(Editor.tsx)가 그대로 소비한다.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers as LayersIcon,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import FileThumbnail from "./FileThumbnail";
import { MAX_LAYERS } from "./types";

export default function LayerPanel({
  layers,
  activeLayerId,
  width,
  height,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMergeDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onToggleVisible,
  onToggleLocked,
  onOpacityChange,
  onFlatten,
}: {
  // 아래→위 순서(가장 아래가 0번)로 저장된 레이어 배열 — 데이터 모델과
  // Editor의 useCanvasHistory가 쓰는 순서를 그대로 따른다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMergeDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onFlatten: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
  const activeLayer = layers[activeIndex] ?? layers[layers.length - 1];
  // 화면에는 위에서부터(최상단 먼저) 보여준다 — 배열 자체는 아래→위 순서.
  const topToBottom = [...layers].reverse();

  const commitRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white shadow-md">
      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-1.5">
          <LayersIcon className="h-3.5 w-3.5" />
          레이어
        </span>
        <button
          onClick={onFlatten}
          disabled={layers.length <= 1}
          title="모든 레이어를 하나로 평탄화"
          className="text-[10px] font-normal text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          평탄화
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {topToBottom.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${
                isActive ? "bg-violet-50" : "hover:bg-gray-50"
              }`}
            >
              <FileThumbnail width={width} height={height} pixels={layer.pixels} />
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(layer.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 border border-violet-300 px-1 text-xs text-gray-700 outline-none"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(layer.id);
                    setEditingName(layer.name);
                  }}
                  className="min-w-0 flex-1 truncate text-xs text-gray-700"
                  title={layer.name}
                >
                  {layer.name}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLocked(layer.id);
                }}
                title={layer.locked ? "잠금 해제" : "잠그기"}
                className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                  layer.locked
                    ? "text-gray-700"
                    : "text-gray-300 hover:text-gray-600"
                }`}
              >
                {layer.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
                title={layer.visible ? "숨기기" : "보이기"}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800"
              >
                {layer.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-3 py-2">
        <label className="flex items-center gap-2 text-[10px] text-gray-500">
          투명도
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(activeLayer.opacity * 100)}
            onChange={(e) =>
              onOpacityChange(activeLayer.id, Number(e.target.value) / 100)
            }
            className="flex-1"
          />
          <span className="w-7 shrink-0 text-right">
            {Math.round(activeLayer.opacity * 100)}%
          </span>
        </label>
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-2 py-1.5">
        <button
          onClick={onAdd}
          disabled={layers.length >= MAX_LAYERS}
          title="레이어 추가"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDuplicate(activeLayerId)}
          title="레이어 복제"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(activeLayerId)}
          disabled={layers.length <= 1}
          title="레이어 삭제"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMergeDown(activeLayerId)}
          disabled={activeIndex <= 0}
          title="아래 레이어와 병합"
          className="flex h-7 w-7 items-center justify-center text-[10px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          병합
        </button>
        <button
          onClick={() => onMoveUp(activeLayerId)}
          disabled={activeIndex < 0 || activeIndex >= layers.length - 1}
          title="위로 이동"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMoveDown(activeLayerId)}
          disabled={activeIndex <= 0}
          title="아래로 이동"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 어디서도 import하지 않으므로 미사용 컴포넌트지만 그 자체로는 타입 에러가 없어야 한다).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx
git commit -m "feat: 레이어 패널 UI 컴포넌트 추가"
```

---

### Task 8: `Editor.tsx` (1/2) — 레이어 상태·저장·불러오기 배선

문서를 열 때 레이어 스택을 만들고(마이그레이션 포함), `useCanvasHistory`를 새 시그니처로 호출하고, 저장·내보내기·탭 전환·JSON 불러오기가 전부 레이어를 인지하도록 고친다. 레이어 패널 자체 UI 배선은 Task 9에서 한다.

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`, Task 4의 `compositeLayers`/`compositeLayerRange`/`compositeOnto`/`createLayer`, Task 5의 새 `useCanvasHistory` 시그니처.
- Produces: `compositePixels`, `activeLayerIndex`, `activeLayer`, `belowComposite`, `aboveComposite`(컴포넌트 스코프 값 — Task 9와 Editor 안의 다른 코드가 그대로 쓴다).

- [ ] **Step 1: import 정리**

`react` import(현재 4번째 줄)에 `useMemo` 추가:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
```

`_shared/assetLibrary` import(현재 5~11번째 줄)에 `PixelLayer` 추가:

```ts
import {
  getPixelArt,
  listPixelArt,
  PixelArt,
  PixelLayer,
  savePixelArt,
  uid,
} from "../_shared/assetLibrary";
```

`./pixelGrid` import(현재 45~58번째 줄)에 `compositeLayers`, `compositeLayerRange`, `compositeOnto`, `createLayer` 추가:

```ts
import {
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

`./types` import(현재 62~72번째 줄)에 `MAX_LAYERS` 추가.

- [ ] **Step 2: 문서 → 레이어 마이그레이션 헬퍼**

`resolveInitialDoc` 함수(현재 156~169번째 줄) 바로 다음에 추가:

```ts
// 문서를 열 때 레이어 스택을 확정한다 — layers가 있으면(V3 이후 저장분)
// 그대로 쓰고, 없으면(V2 이하 구파일이거나 JSON에서 레이어 없이 불러온 경우)
// pixels를 감싼 단일 레이어로 그 자리에서 만든다(자동 마이그레이션, 저장하기
// 전까지는 원본에 반영되지 않는다).
function layersFromDoc(doc: PixelArt): {
  layers: PixelLayer[];
  activeLayerId: string;
} {
  if (doc.layers && doc.layers.length > 0) {
    const activeLayerId =
      doc.activeLayerId && doc.layers.some((l) => l.id === doc.activeLayerId)
        ? doc.activeLayerId
        : doc.layers[doc.layers.length - 1].id;
    return { layers: doc.layers, activeLayerId };
  }
  const layer: PixelLayer = {
    id: uid(),
    name: "레이어 1",
    pixels: doc.pixels,
    visible: true,
    opacity: 1,
    locked: false,
  };
  return { layers: [layer], activeLayerId: layer.id };
}
```

- [ ] **Step 3: `useCanvasHistory` 호출부와 파생 값**

`const history = useCanvasHistory(initial.doc.pixels, { width: initial.doc.width, height: initial.doc.height });`(현재 374~377번째 줄)를 다음으로 바꾼다:

```ts
  const initialLayerState = layersFromDoc(initial.doc);
  const history = useCanvasHistory(
    initialLayerState.layers,
    initialLayerState.activeLayerId,
    { width: initial.doc.width, height: initial.doc.height },
  );
```

`const selection = useSelection();`(현재 378번째 줄) 바로 다음에 합성 파생 값을 추가한다:

```ts
  const selection = useSelection();

  // 저장·내보내기·탭 스냅숏 등 레이어를 모르는 모든 곳은 이 값(모든 레이어를
  // 합성한 최종 결과)만 쓴다 — PixelCanvas에 넘기는 history.present(활성
  // 레이어)와는 다른 값이다.
  const compositePixels = useMemo(
    () => compositeLayers(history.presentLayers, doc.width, doc.height),
    [history.presentLayers, doc.width, doc.height],
  );
  const activeLayerIndex = history.presentLayers.findIndex(
    (l) => l.id === history.activeLayerId,
  );
  const activeLayer =
    history.presentLayers[activeLayerIndex] ??
    history.presentLayers[history.presentLayers.length - 1];
  const belowComposite = useMemo(
    () =>
      compositeLayerRange(
        history.presentLayers,
        0,
        activeLayerIndex - 1,
        doc.width,
        doc.height,
      ),
    [history.presentLayers, activeLayerIndex, doc.width, doc.height],
  );
  const aboveComposite = useMemo(
    () =>
      compositeLayerRange(
        history.presentLayers,
        activeLayerIndex + 1,
        history.presentLayers.length - 1,
        doc.width,
        doc.height,
      ),
    [history.presentLayers, activeLayerIndex, doc.width, doc.height],
  );
```

- [ ] **Step 4: 캔버스 전체 변형(리사이즈·반전·회전) — 레이어별로 적용**

`handleResizeCanvas`(현재 1120~1134번째 줄)를 다음으로 바꾼다:

```ts
  const handleResizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      const nextLayers = history.presentLayers.map((l) => ({
        ...l,
        pixels: resizeGrid(l.pixels, doc.width, doc.height, newWidth, newHeight),
      }));
      pushHistoryAllLayers(nextLayers, { width: newWidth, height: newHeight });
      setResizingCanvas(false);
      setHasMetaEdits(true);
    },
    [doc.width, doc.height, history.presentLayers, pushHistoryAllLayers],
  );
```

`handleFlipHorizontal`/`handleFlipVertical`/`handleRotate90`(현재 1139~1162번째 줄)를 다음으로 바꾼다:

```ts
  const handleFlipHorizontal = useCallback(() => {
    const nextLayers = history.presentLayers.map((l) => ({
      ...l,
      pixels: flipHorizontal(l.pixels, doc.width, doc.height),
    }));
    pushHistoryAllLayers(nextLayers);
  }, [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers]);

  const handleFlipVertical = useCallback(() => {
    const nextLayers = history.presentLayers.map((l) => ({
      ...l,
      pixels: flipVertical(l.pixels, doc.width, doc.height),
    }));
    pushHistoryAllLayers(nextLayers);
  }, [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers]);

  const handleRotate90 = useCallback(
    (direction: 1 | -1) => {
      let newWidth = doc.height;
      let newHeight = doc.width;
      const nextLayers = history.presentLayers.map((l) => {
        const rotated = rotate90(l.pixels, doc.width, doc.height, direction);
        newWidth = rotated.width;
        newHeight = rotated.height;
        return { ...l, pixels: rotated.pixels };
      });
      pushHistoryAllLayers(nextLayers, { width: newWidth, height: newHeight });
      setHasMetaEdits(true);
    },
    [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers],
  );
```

이 네 함수보다 위(예: `pushHistory` 선언 바로 다음, 현재 404~419번째 줄 다음)에 `pushHistoryAllLayers`를 추가한다 — 기존 `pushHistory`(활성 레이어 전용)와 나란히 두는 새 래퍼로, 레이어 전체를 바꾸면서도 `moveSelectionUndoRef`/`pixelsDirty` 관리는 동일하게 한다:

```ts
  // 캔버스 전체 변형(리사이즈·반전·회전)처럼 모든 레이어의 픽셀이 한꺼번에
  // 바뀌는 조작 전용 — pushHistory(활성 레이어만 교체)와 달리 레이어 배열
  // 전체를 새로 받는다. moveSelectionUndoRef 관리는 pushHistory와 동일하게
  // "이 되돌리기 단계는 선택 영역을 건드리지 않는다"(undefined)로 채운다.
  const pushHistoryAllLayers = useCallback(
    (nextLayers: PixelLayer[], nextSize?: CanvasSize) => {
      history.pushLayers(nextLayers, history.activeLayerId, nextSize);
      moveSelectionUndoRef.current.push(undefined);
      if (moveSelectionUndoRef.current.length > 50) {
        moveSelectionUndoRef.current.shift();
      }
      moveSelectionRedoRef.current = [];
      setPixelsDirty(true);
    },
    [history],
  );
```

- [ ] **Step 5: `loadTab`이 레이어를 복원하도록 수정**

`loadTab`(현재 504~523번째 줄) 안의 `history.reset(tab.doc.pixels, { width: tab.doc.width, height: tab.doc.height });`을 다음으로 바꾼다:

```ts
      const { layers, activeLayerId } = layersFromDoc(tab.doc);
      history.reset(layers, activeLayerId, {
        width: tab.doc.width,
        height: tab.doc.height,
      });
```

- [ ] **Step 6: `syncActiveTabSnapshot`이 레이어까지 스냅숏에 담도록 수정**

`syncActiveTabSnapshot`(현재 488~502번째 줄)을 다음으로 바꾼다:

```ts
  const syncActiveTabSnapshot = useCallback(
    (list: Tab[]): Tab[] => {
      if (activeTabIndex < 0) return list;
      return list.map((t, i) =>
        i === activeTabIndex
          ? {
              doc: {
                ...doc,
                name,
                pixels: compositePixels,
                layers: history.presentLayers,
                activeLayerId: history.activeLayerId,
              },
              hasMetaEdits,
              pixelsDirty,
            }
          : t,
      );
    },
    [
      activeTabIndex,
      doc,
      name,
      compositePixels,
      history.presentLayers,
      history.activeLayerId,
      hasMetaEdits,
      pixelsDirty,
    ],
  );
```

- [ ] **Step 7: 저장·다른 이름으로 저장이 레이어를 포함하도록 수정**

`handleSave`(현재 1032~1054번째 줄) 안의 `toSave` 객체를 다음으로 바꾼다:

```ts
    const toSave: PixelArt = {
      ...doc,
      name: isWallpaper ? WALLPAPER_NAME : name,
      pixels: compositePixels,
      layers: history.presentLayers,
      activeLayerId: history.activeLayerId,
    };
```

의존성 배열(현재 1054번째 줄)을 `[activeTabIndex, doc, name, compositePixels, history.presentLayers, history.activeLayerId, isWallpaper, flagSaveError]`로 바꾼다.

`handleConfirmSaveAs`(현재 1085~1113번째 줄) 안의 `toSave` 객체도 동일하게 바꾼다:

```ts
      const toSave: PixelArt = {
        ...doc,
        id: uid(),
        name: newName,
        pixels: compositePixels,
        layers: history.presentLayers,
        activeLayerId: history.activeLayerId,
        createdAt: Date.now(),
      };
```

의존성 배열(현재 1112번째 줄)을 `[activeTabIndex, doc, compositePixels, history.presentLayers, history.activeLayerId, flagSaveError]`로 바꾼다.

- [ ] **Step 8: 내보내기·ExportPanel이 합성 결과를 쓰도록 수정**

`openFileMenu`의 내보내기 서브메뉴(현재 1319~1343번째 줄) 안의 4개 `pixels: history.present`를 전부 `pixels: compositePixels`로 바꾼다. 의존성 배열(현재 1347번째 줄)의 `history`를 `compositePixels`로 바꾼다.

`exportPanel` 선언(현재 1783~1785번째 줄)의 `<ExportPanel doc={{ ...doc, pixels: history.present }} />`을 `<ExportPanel doc={{ ...doc, pixels: compositePixels }} />`으로 바꾼다.

- [ ] **Step 9: JSON 불러오기가 레이어를 함께 읽도록 확장**

`parsePixelArtJSON`(현재 108~140번째 줄)을 다음으로 바꾼다:

```ts
function parsePixelArtJSON(raw: unknown): {
  name: string;
  width: number;
  height: number;
  palette: string[];
  pixels: PixelValue[];
  layers?: PixelLayer[];
  activeLayerId?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.width !== "number" || typeof d.height !== "number") return null;
  if (
    !Number.isInteger(d.width) ||
    !Number.isInteger(d.height) ||
    d.width < 1 ||
    d.height < 1 ||
    d.width > MAX_CANVAS_SIZE ||
    d.height > MAX_CANVAS_SIZE
  ) {
    return null;
  }
  if (!Array.isArray(d.pixels) || d.pixels.length !== d.width * d.height) {
    return null;
  }
  const cellCount = d.width * d.height;
  const rawLayers = Array.isArray(d.layers) ? d.layers : [];
  const parsedLayers: PixelLayer[] = rawLayers
    .filter((l): l is Record<string, unknown> => {
      if (!l || typeof l !== "object") return false;
      const layer = l as Record<string, unknown>;
      return (
        typeof layer.id === "string" &&
        Array.isArray(layer.pixels) &&
        layer.pixels.length === cellCount
      );
    })
    .map((l) => ({
      id: l.id as string,
      name: typeof l.name === "string" && l.name.trim() ? l.name : "레이어",
      pixels: (l.pixels as unknown[]).map((p) => (typeof p === "string" ? p : null)),
      visible: typeof l.visible === "boolean" ? l.visible : true,
      opacity:
        typeof l.opacity === "number" && l.opacity >= 0 && l.opacity <= 1
          ? l.opacity
          : 1,
      locked: typeof l.locked === "boolean" ? l.locked : false,
    }));
  return {
    name: typeof d.name === "string" && d.name.trim() ? d.name : "제목 없음",
    width: d.width,
    height: d.height,
    palette: Array.isArray(d.palette)
      ? d.palette.filter((c): c is string => typeof c === "string")
      : [],
    pixels: d.pixels.map((p) => (typeof p === "string" ? p : null)),
    layers: parsedLayers.length > 0 ? parsedLayers : undefined,
    activeLayerId:
      typeof d.activeLayerId === "string" ? d.activeLayerId : undefined,
  };
}
```

`handleImportJSONFile`(현재 555~584번째 줄) 안의 `openNewTab({...})` 호출에 `layers`/`activeLayerId`를 추가한다:

```ts
        openNewTab({
          id: uid(),
          name: parsed.name,
          width: parsed.width,
          height: parsed.height,
          palette: parsed.palette,
          pixels: parsed.pixels,
          layers: parsed.layers,
          activeLayerId: parsed.activeLayerId,
          createdAt: Date.now(),
        });
```

- [ ] **Step 10: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `PixelCanvas` 호출부(아직 새 props를 안 넘김)와 레이어 액션 핸들러 미배선(Task 9)으로 인한 에러만 남아야 한다 — `useCanvasHistory`/저장/내보내기/탭 전환 관련 에러는 이 시점에 전부 사라져 있어야 한다.

- [ ] **Step 11: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor가 레이어 스택을 불러오고 저장·내보내도록 배선"
```

---

### Task 9: `Editor.tsx` (2/2) — 레이어 액션 핸들러 + UI 배선

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 7의 `LayerPanel`, Task 6의 `PixelCanvas` 새 props, Task 8에서 만든 `compositePixels`/`activeLayer`/`belowComposite`/`aboveComposite`.

- [ ] **Step 1: `LayerPanel` import**

다른 컴포넌트 import들 사이(예: `ImportPanel` import, 현재 36번째 줄) 다음에 추가:

```ts
import LayerPanel from "./LayerPanel";
```

- [ ] **Step 2: 레이어 액션 핸들러**

`handlePickColor`(현재 1289~1291번째 줄) 다음에 추가:

```ts
  const handleSelectLayer = useCallback(
    (id: string) => history.setActiveLayerId(id),
    [history],
  );

  const handleAddLayer = useCallback(() => {
    if (history.presentLayers.length >= MAX_LAYERS) return;
    const newLayer = createLayer(
      uid(),
      `레이어 ${history.presentLayers.length + 1}`,
      doc.width,
      doc.height,
    );
    const insertAt = activeLayerIndex + 1;
    const nextLayers = [
      ...history.presentLayers.slice(0, insertAt),
      newLayer,
      ...history.presentLayers.slice(insertAt),
    ];
    pushLayerOp(nextLayers, newLayer.id);
  }, [history.presentLayers, activeLayerIndex, doc.width, doc.height, pushLayerOp]);

  const handleDuplicateLayer = useCallback(
    (id: string) => {
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index < 0) return;
      const source = history.presentLayers[index];
      const copy: PixelLayer = {
        ...source,
        id: uid(),
        name: `${source.name} 사본`,
        pixels: source.pixels.slice(),
      };
      const nextLayers = [
        ...history.presentLayers.slice(0, index + 1),
        copy,
        ...history.presentLayers.slice(index + 1),
      ];
      pushLayerOp(nextLayers, copy.id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleDeleteLayer = useCallback(
    (id: string) => {
      if (history.presentLayers.length <= 1) return;
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index < 0) return;
      const nextLayers = history.presentLayers.filter((l) => l.id !== id);
      const nextActiveIndex = Math.min(index, nextLayers.length - 1);
      pushLayerOp(nextLayers, nextLayers[nextActiveIndex].id);
    },
    [history.presentLayers, pushLayerOp],
  );

  // 병합 대상(id)의 내용을 바로 아래 레이어 위에 합성해 그 아래 레이어에
  // 반영하고, 병합된(위) 레이어는 배열에서 없앤다 — 아래 레이어의 투명도는
  // 그대로 둔다(내용만 받는다).
  const handleMergeDown = useCallback(
    (id: string) => {
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index <= 0) return;
      const layer = history.presentLayers[index];
      const below = history.presentLayers[index - 1];
      const merged: PixelLayer = {
        ...below,
        pixels: compositeOnto(below.pixels, layer.pixels, layer.opacity),
      };
      const nextLayers = [
        ...history.presentLayers.slice(0, index - 1),
        merged,
        ...history.presentLayers.slice(index + 1),
      ];
      pushLayerOp(nextLayers, merged.id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleMoveLayer = useCallback(
    (id: string, direction: 1 | -1) => {
      const index = history.presentLayers.findIndex((l) => l.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= history.presentLayers.length) {
        return;
      }
      const nextLayers = history.presentLayers.slice();
      [nextLayers[index], nextLayers[target]] = [
        nextLayers[target],
        nextLayers[index],
      ];
      pushLayerOp(nextLayers, id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleRenameLayer = useCallback(
    (id: string, layerName: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, name: layerName } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleToggleLayerVisible = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleToggleLayerLocked = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleLayerOpacityChange = useCallback(
    (id: string, opacity: number) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, opacity } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleFlattenLayers = useCallback(() => {
    if (history.presentLayers.length <= 1) return;
    const flat: PixelLayer = {
      id: uid(),
      name: "레이어 1",
      pixels: compositeLayers(history.presentLayers, doc.width, doc.height),
      visible: true,
      opacity: 1,
      locked: false,
    };
    pushLayerOp([flat], flat.id);
  }, [history.presentLayers, doc.width, doc.height, pushLayerOp]);
```

이 블록보다 위(Task 8의 `pushHistoryAllLayers` 바로 다음)에 `pushLayerOp`를 추가한다 — 레이어 구조 변경 전용 래퍼로, `pushHistoryAllLayers`와 로직은 같지만 이름을 구분해 호출부의 의도를 분명히 한다:

```ts
  // 레이어 구조 변경(추가·삭제·순서변경·병합·복제·보이기·투명도·잠금·이름)
  // 전용 — pushHistoryAllLayers와 동작은 같지만 호출부 의도를 이름으로 구분한다.
  const pushLayerOp = useCallback(
    (nextLayers: PixelLayer[], nextActiveLayerId: string) => {
      history.pushLayers(nextLayers, nextActiveLayerId);
      moveSelectionUndoRef.current.push(undefined);
      if (moveSelectionUndoRef.current.length > 50) {
        moveSelectionUndoRef.current.shift();
      }
      moveSelectionRedoRef.current = [];
      setPixelsDirty(true);
    },
    [history],
  );
```

- [ ] **Step 3: `PixelCanvas` 호출부에 새 props 전달**

`<PixelCanvas` 호출(현재 1662번째 줄 부근) 안, `pixels={history.present}` 다음에 추가:

```tsx
                  pixels={history.present}
                  belowComposite={belowComposite}
                  aboveComposite={aboveComposite}
                  activeLayerOpacity={activeLayer.opacity}
                  activeLayerLocked={activeLayer.locked}
```

- [ ] **Step 4: 우측 사이드바에 `LayerPanel` 배선(넓은 화면)**

`if (!narrow) { return ( <div className="flex w-60 shrink-0 flex-col gap-3"> ... </div> ); }` 블록(현재 1787~1798번째 줄)을 다음으로 바꾼다:

```tsx
              if (!narrow) {
                return (
                  <div className="flex w-60 shrink-0 flex-col gap-3">
                    <LayerPanel
                      layers={history.presentLayers}
                      activeLayerId={history.activeLayerId}
                      width={doc.width}
                      height={doc.height}
                      onSelect={handleSelectLayer}
                      onAdd={handleAddLayer}
                      onDuplicate={handleDuplicateLayer}
                      onDelete={handleDeleteLayer}
                      onMergeDown={handleMergeDown}
                      onMoveUp={(id) => handleMoveLayer(id, 1)}
                      onMoveDown={(id) => handleMoveLayer(id, -1)}
                      onRename={handleRenameLayer}
                      onToggleVisible={handleToggleLayerVisible}
                      onToggleLocked={handleToggleLayerLocked}
                      onOpacityChange={handleLayerOpacityChange}
                      onFlatten={handleFlattenLayers}
                    />
                    <Accordion title="이미지 불러오기" defaultOpen={false}>
                      {importPanel}
                    </Accordion>
                    <Accordion title="내보내기" defaultOpen={false}>
                      {exportPanel}
                    </Accordion>
                  </div>
                );
              }
```

- [ ] **Step 5: 좁은 화면 — 플로팅 아이콘에 "레이어" 추가**

`openFloatingPanel` state 선언(현재 318~320번째 줄)을 다음으로 바꾼다:

```ts
  const [openFloatingPanel, setOpenFloatingPanel] = useState<
    "layers" | "import" | "export" | null
  >(null);
```

narrow 분기(현재 1800~1857번째 줄) 전체를 다음으로 바꾼다 — 기존 두 아이콘 버튼 앞에 "레이어" 버튼을 추가하고, `panelTitle`/패널 내용 분기에 `"layers"` 케이스를 추가한다:

```tsx
              // 편집기가 좁아지면 w-60짜리 사이드바가 캔버스 자리를 너무 많이
              // 차지해 보여, 아이콘 세 개짜리 얇은 열로 줄이고 실제 내용은
              // 누른 아이콘 쪽에서만 캔버스 위로 뜨는 플로팅 팝업으로 보여준다.
              const panelTitle =
                openFloatingPanel === "layers"
                  ? "레이어"
                  : openFloatingPanel === "import"
                    ? "이미지 불러오기"
                    : "내보내기";
              const layerPanel = (
                <LayerPanel
                  layers={history.presentLayers}
                  activeLayerId={history.activeLayerId}
                  width={doc.width}
                  height={doc.height}
                  onSelect={handleSelectLayer}
                  onAdd={handleAddLayer}
                  onDuplicate={handleDuplicateLayer}
                  onDelete={handleDeleteLayer}
                  onMergeDown={handleMergeDown}
                  onMoveUp={(id) => handleMoveLayer(id, 1)}
                  onMoveDown={(id) => handleMoveLayer(id, -1)}
                  onRename={handleRenameLayer}
                  onToggleVisible={handleToggleLayerVisible}
                  onToggleLocked={handleToggleLayerLocked}
                  onOpacityChange={handleLayerOpacityChange}
                  onFlatten={handleFlattenLayers}
                />
              );
              return (
                <div className="relative flex w-10 shrink-0 flex-col items-center gap-2">
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "layers" ? null : "layers",
                      )
                    }
                    title="레이어"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "layers"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <LayersIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "import" ? null : "import",
                      )
                    }
                    title="이미지 불러오기"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "import"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "export" ? null : "export",
                      )
                    }
                    title="내보내기"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "export"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {openFloatingPanel && (
                    <div className="absolute top-0 right-full z-40 mr-2 flex max-h-full w-72 flex-col bg-white shadow-xl">
                      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500">
                        {panelTitle}
                        <button
                          onClick={() => setOpenFloatingPanel(null)}
                          title="닫기"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 pt-0">
                        {openFloatingPanel === "layers"
                          ? layerPanel
                          : openFloatingPanel === "import"
                            ? importPanel
                            : exportPanel}
                      </div>
                    </div>
                  )}
                </div>
              );
```

파일 최상단 lucide-react import(현재 3번째 줄)에 `Layers as LayersIcon`을 추가한다:

```ts
import { Download, ImagePlus, Layers as LayersIcon, Minus, Plus, Save, X } from "lucide-react";
```

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev`

`/nemo-nemo-beam`(또는 플레이그라운드의 픽셀아트 메이커 카드)를 열고 새 캔버스를 만든 뒤 다음을 확인한다:

1. 우측 사이드바에 "레이어" 패널이 보이고 "레이어 1" 하나가 있다.
2. 레이어를 그리고, "+"로 레이어를 추가한 뒤 다른 색으로 그려서 두 레이어가 겹쳐 보이는지 확인한다.
3. 아래 레이어의 눈 아이콘을 꺼서 위 레이어만 보이는지, 다시 켜서 둘 다 보이는지 확인한다.
4. 위 레이어의 투명도 슬라이더를 낮춰 아래 레이어가 비쳐 보이는지 확인한다.
5. 아래 레이어의 자물쇠를 잠그고 그 레이어를 활성으로 선택한 뒤, 펜슬로 그려도 아무 일도 일어나지 않는지 확인한다. 스포이트로는 여전히 색을 뽑을 수 있는지 확인한다.
6. Ctrl+Z(또는 Cmd+Z)로 레이어 추가·그리기·잠금까지 순서대로 되돌려지는지 확인한다.
7. 두 레이어를 겹쳐 그린 상태에서 스포이트로 겹친 지점을 클릭하면 위쪽 레이어의 색이 뽑히는지(합성 기준) 확인한다.
8. "저장" 후 탭을 닫았다가 "열기"로 다시 열어 레이어 구성이 그대로 복원되는지 확인한다.
9. 내보내기 > PNG를 눌러 받은 이미지가 두 레이어를 합성한 모습으로 나오는지 확인한다.
10. 레이어 패널의 "병합"·"복제"·"삭제"·순서 이동 버튼이 각각 의도대로 동작하는지 확인한다.
11. 좁은 창 너비(브라우저 창을 줄이거나 개발자 도구로 뷰포트를 좁혀 `narrow` 모드 진입)에서 레이어 아이콘을 눌러 플로팅 레이어 패널이 뜨는지 확인한다.

Expected: 위 11가지 모두 설계 스펙(`docs/superpowers/specs/2026-08-04-nemo-nemo-beam-layers-design.md`)대로 동작.

- [ ] **Step 8: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 레이어 패널을 편집기에 배선하고 레이어 조작 핸들러 추가"
```

---

### Task 10: 전체 빌드 확인

**Files:** 없음(검증 전용 태스크).

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공(타입 에러·lint 에러 없이 완료).

- [ ] **Step 2: 기존 저장 파일 하위 호환 확인(수동)**

`npm run dev`로 편집기를 열고, 이번 세션 이전에 만들어져 있던(레이어 없는 V2 이하) 기존 작품이 있다면 하나 열어본다 — 레이어 패널에 "레이어 1" 하나로 정상 표시되고, 그림이 깨지지 않는지 확인한다. 저장해서 새 형식(V3)으로 넘어간 뒤 다시 열어도 정상인지 확인한다. 기존 작품이 없다면 이 단계는 생략하고 그 사실을 기록한다.

- [ ] **Step 3: 커밋(변경 사항이 있는 경우에만)**

이 태스크에서 코드 변경이 없다면 커밋할 것이 없다. Step 1~2에서 문제를 발견해 고쳤다면 그 수정 사항을 커밋한다.
