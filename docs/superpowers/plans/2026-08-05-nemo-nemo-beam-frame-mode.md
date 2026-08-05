# 네모네모빔 프레임 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔의 레이어 스택을 프로크리에이트의 애니메이션 어시스트처럼, 같은 배열을 "레이어"(합성) 또는 "프레임"(순차 재생)으로 해석하는 프레임 모드를 추가한다.

**Architecture:** 새 레이어 개념을 만들지 않고 기존 `PixelLayer[]` 하나를 그대로 재사용한다. 문서에 `layerMode: "layers" | "frames"`(기본 `"layers"`)를 추가해 같은 배열의 해석 방식만 바꾼다. 프레임 전환은 이미 실행취소에서 자유로운 `history.setActiveLayerId`를 그대로 쓰고, 어니언 스킨은 이미 있는 `belowComposite`/`aboveComposite` 메커니즘에 입력만 다르게 넣는 방식으로 구현해 `PixelCanvas.tsx`는 코드 변경이 없다. GIF·스프라이트 시트 내보내기는 새 순수 함수로 추가한다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript, `gifenc`(신규 의존성, 순수 JS GIF 인코더).

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다. 각 태스크는 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, 필요한 태스크에서는 `npm run dev` 브라우저 수동 확인으로 검증한다.
- 설명 문구(버튼 title, 기본 이름 등)는 프로젝트의 한국어 문체 규칙(번역투 금지, 조사로 직결, 반복 회피)을 따른다.
- 이 Work(`5_PixelArtMaker`)의 밝은 OS 창 스타일(`bg-white`, `shadow-md`, `text-gray-500/700`, 활성 강조 `violet-500`, 아이콘 버튼 `h-6 w-6`~`h-7 w-7`)을 그대로 따른다.
- 레이어 개수 상한은 기존 `MAX_LAYERS = 20`을 프레임 개수 상한으로도 그대로 쓴다(같은 배열이므로 별도 상한 불필요).
- 저장 포맷 버전은 그대로 V3다 — `encodeStored`/`decodeStored`가 이미 객체 스프레드로 저장하므로 `layerMode`/`frameDurationMs` 같은 새 선택 필드는 코드 변경 없이 저장·복원된다. 새 버전을 만들지 않는다.
- 커밋 메시지는 한글, `Co-Authored-By: Claude` 트레일러를 붙이지 않는다.
- `PixelCanvas.tsx`는 이 플랜에서 변경하지 않는다 — 어니언 스킨·재생 잠금 모두 기존 `belowComposite`/`aboveComposite`/`activeLayerLocked` props에 다른 값을 흘려보내는 방식으로만 구현한다.

---

### Task 1: 데이터 모델 — `frameDurationMs` · `layerMode`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`

**Interfaces:**
- Produces: `PixelLayer.frameDurationMs?: number`, `PixelArt.layerMode?: "layers" | "frames"`.

- [ ] **Step 1: 필드 추가**

`PixelLayer` 타입(현재 13~20번째 줄)을 다음으로 바꾼다:

```ts
export type PixelLayer = {
  id: string;
  name: string;
  pixels: (string | null)[];
  visible: boolean;
  opacity: number;
  locked: boolean;
  // 프레임 모드에서 이 레이어(프레임)가 화면에 머무는 시간(ms). 없으면
  // DEFAULT_FRAME_DURATION_MS(5_PixelArtMaker/types.ts)로 취급한다 — 레이어
  // 모드에선 읽지 않는다.
  frameDurationMs?: number;
};
```

`PixelArt` 타입(현재 22~37번째 줄)의 `activeLayerId?: string;` 다음 줄에 추가:

```ts
  activeLayerId?: string;
  // 같은 layers 배열을 "레이어"(합성해서 보여줌)로 볼지 "프레임"(순서대로
  // 재생)으로 볼지. 없으면 "layers"로 취급한다(레이어 기능만 있던 구파일과
  // 호환). encodeStored/decodeStored는 이미 객체 스프레드로 이 필드를 그대로
  // 저장·복원하므로 저장 포맷 버전을 올릴 필요가 없다.
  layerMode?: "layers" | "frames";
```

`encodeStored`/`decodeStored`/`duplicatePixelArt`는 이미 `{ ...art, ... }`/`{ ...l, ... }` 스프레드로 객체를 통째로 다루므로 **변경하지 않는다** — 새 선택 필드는 코드 손대지 않아도 이미 저장·복원·복제된다.

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 이 필드들을 실제로 쓰는 코드가 없으므로 기존 동작에 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/_shared/assetLibrary.ts
git commit -m "feat: PixelLayer에 프레임 지속시간, PixelArt에 레이어/프레임 모드 필드 추가"
```

---

### Task 2: 상수 — `types.ts`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts`

**Interfaces:**
- Produces: `DEFAULT_FRAME_DURATION_MS`, `MIN_FRAME_DURATION_MS`, `MAX_FRAME_DURATION_MS`, `ONION_SKIN_OPACITY`.

- [ ] **Step 1: 상수 추가**

`export const MAX_LAYERS = 20;` 선언(현재 76~78번째 줄) 다음에 추가:

```ts
// 프레임 모드에서 지속시간을 지정하지 않은 프레임(레이어)의 기본 재생 시간.
export const DEFAULT_FRAME_DURATION_MS = 100;
export const MIN_FRAME_DURATION_MS = 20; // 50fps 상한
export const MAX_FRAME_DURATION_MS = 5000; // 5초 하한(더 느리게는 의미 없음)

// 프레임 모드 + 어니언 스킨에서 이전/다음 프레임을 겹쳐 보여줄 때 쓰는 고정 투명도.
export const ONION_SKIN_OPACITY = 0.25;
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/types.ts
git commit -m "feat: 프레임 지속시간·어니언 스킨 관련 상수 추가"
```

---

### Task 3: `gifenc` 의존성 추가 + 타입 선언

**Files:**
- Modify: `package.json`, `package-lock.json`(npm install이 자동 갱신)
- Create: `gifenc.d.ts`(저장소 루트)

**Interfaces:**
- Produces: `import { GIFEncoder, quantize, applyPalette } from "gifenc";`가 타입 에러 없이 동작.

- [ ] **Step 1: 의존성 설치**

Run: `npm install gifenc@1.0.3`
Expected: `package.json`의 `dependencies`에 `"gifenc": "^1.0.3"`이 추가되고(알파벳 순서상 `"@tanstack/react-virtual"`과 `"html-to-image"` 사이), `package-lock.json`이 함께 갱신된다.

- [ ] **Step 2: 타입 선언 파일 작성**

`gifenc`는 자체 타입 선언을 제공하지 않는다(`@types/gifenc`도 없음, 확인 완료). 저장소 루트(기존 `svgr.d.ts`와 같은 위치)에 `gifenc.d.ts`를 만든다 — `tsconfig.json`의 `include: ["**/*.ts", ...]`가 루트의 `.d.ts`를 자동으로 포함하므로 별도 설정이 필요 없다:

```ts
// gifenc(https://github.com/mattdesl/gifenc)는 자체 타입 선언이 없다 — 이
// 프로젝트가 실제로 쓰는 GIFEncoder/quantize/applyPalette API만 최소로
// 선언한다(전체 API 표면이 아니다).
declare module "gifenc" {
  // 실제로는 [r,g,b] 또는 [r,g,b,a] 길이의 배열이지만, 고정 길이 튜플
  // 유니온으로 선언하면 c[3](알파) 접근이 3-튜플 쪽 분기에서 "인덱스 3이
  // 없다"는 컴파일 에러가 난다 — number[]로 느슨하게 선언해 그 문제를 피한다.
  export type GifencColor = number[];

  export interface GIFEncoderWriteFrameOptions {
    palette?: GifencColor[];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFEncoderWriteFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(options?: { auto?: boolean }): GIFEncoderInstance;

  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string },
  ): GifencColor[];

  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifencColor[],
    format?: string,
  ): Uint8Array;
}
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 아무 코드도 `gifenc`를 import하지 않으므로 이 타입 선언 자체만 컴파일된다).

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json gifenc.d.ts
git commit -m "feat: GIF 내보내기용 gifenc 의존성과 타입 선언 추가"
```

---

### Task 4: `exportPixelArt.ts` — GIF · 스프라이트 시트 내보내기

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`, Task 2의 `DEFAULT_FRAME_DURATION_MS`, Task 3의 `gifenc`, 기존 `renderToCanvas`(`_shared/renderPixelArt.ts`, 변경 없음 — `PixelArt`의 `width`/`height`/`pixels`만 읽으므로 `pixels`만 프레임 것으로 바꾼 임시 객체를 넘기면 그대로 재사용된다), 기존 `triggerDownload`(이 파일에 이미 있음).
- Produces: `export function exportAsSpriteSheet(doc: PixelArt, scale?: number): void`, `export function exportAsGIF(doc: PixelArt, scale?: number): Promise<void>`.

- [ ] **Step 1: import 추가**

파일 최상단 import(현재 1~3번째 줄)를 다음으로 바꾼다:

```ts
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { PixelArt, PixelLayer } from "../_shared/assetLibrary";
import { renderToCanvas } from "../_shared/renderPixelArt";
import { DEFAULT_FRAME_DURATION_MS } from "./types";
import { hexToRgba, rgbToHex } from "./hsv";
```

- [ ] **Step 2: 함수 추가**

파일 끝(`copyTextToClipboard` 다음)에 추가:

```ts
// 프레임 모드 전용 — 보이는 프레임만, doc.layers에 저장된 순서(아래→위 =
// 왼쪽→오른쪽) 그대로 돌려준다.
function visibleFrames(doc: PixelArt): PixelLayer[] {
  return (doc.layers ?? []).filter((l) => l.visible);
}

// 보이는 프레임을 왼쪽부터 가로로 이어붙인 PNG 한 장 — 그리드(여러 행)는
// 지원하지 않는다. 각 프레임은 다른 레이어와 합성하지 않고 그 프레임 자신의
// 픽셀만 그린다.
export function exportAsSpriteSheet(doc: PixelArt, scale = 8): void {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return;
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale * frames.length;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, i) => {
    const frameCanvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
    ctx.drawImage(frameCanvas, i * doc.width * scale, 0);
  });
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}_sprite.png`);
  }, "image/png");
}

// 보이는 프레임을 순서대로 재생하는 애니메이션 GIF로 내보낸다. 프레임마다
// 따로 양자화하면 프레임 사이에 색이 미세하게 달라져 깜빡이므로, 모든
// 프레임의 RGBA를 한 번에 합쳐 전역 팔레트 하나만 만들고 프레임마다
// 재사용한다.
export async function exportAsGIF(doc: PixelArt, scale = 8): Promise<void> {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return;
  const width = doc.width * scale;
  const height = doc.height * scale;

  const frameRGBA = frames.map((frame) => {
    const canvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
    const ctx = canvas.getContext("2d")!;
    return ctx.getImageData(0, 0, width, height).data;
  });

  const combined = new Uint8Array(
    frameRGBA.reduce((sum, d) => sum + d.length, 0),
  );
  let offset = 0;
  for (const data of frameRGBA) {
    combined.set(data, offset);
    offset += data.length;
  }
  // rgba4444 포맷이라야 완전 투명 픽셀이 팔레트에 알파 0인 항목으로 남는다.
  const globalPalette = quantize(combined, 256, { format: "rgba4444" });
  const transparentIndex = globalPalette.findIndex((c) => (c[3] ?? 255) === 0);

  const gif = GIFEncoder();
  frameRGBA.forEach((data, i) => {
    const index = applyPalette(data, globalPalette, "rgba4444");
    gif.writeFrame(index, width, height, {
      palette: i === 0 ? globalPalette : undefined,
      delay: frames[i].frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    });
  });
  gif.finish();
  triggerDownload(
    new Blob([gif.bytes()], { type: "image/gif" }),
    `${doc.name}.gif`,
  );
}
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음. (`exportAsSpriteSheet`/`exportAsGIF`를 아직 아무 데서도 import하지 않으므로 미사용 export지만 그 자체로는 에러가 없어야 한다.)

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts
git commit -m "feat: GIF·스프라이트 시트 내보내기 함수 추가"
```

---

### Task 5: `LayerPanel.tsx` — 모드 토글 + 프레임 모드 축약 컨트롤

레이어 모드 UI는 지금 그대로 두고, 최상단에 "레이어 | 프레임" 토글을 추가한다. 프레임 모드일 때는 목록·투명도·레이어 툴바 대신 재생/반복/어니언스킨 버튼만 보여준다(실제 프레임 목록은 Task 6의 필름스트립이 캔버스 아래에 별도로 보여준다).

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`

**Interfaces:**
- Consumes: 없음(신규 prop만 추가).
- Produces: `LayerPanel`이 새 props `layerMode: "layers" | "frames"`, `onLayerModeChange: (mode: "layers" | "frames") => void`, `isPlaying: boolean`, `onTogglePlay: () => void`, `loopPlayback: boolean`, `onToggleLoop: () => void`, `onionSkin: boolean`, `onToggleOnionSkin: () => void`를 받는다. 기존 props는 전부 그대로 유지된다.

- [ ] **Step 1: 파일 전체를 다음으로 바꾼다**

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
  Pause,
  Play,
  Plus,
  Repeat,
  Sparkles,
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
  layerMode,
  onLayerModeChange,
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
  onOpacityDragEnd,
  onFlatten,
  isPlaying,
  onTogglePlay,
  loopPlayback,
  onToggleLoop,
  onionSkin,
  onToggleOnionSkin,
}: {
  // 아래→위 순서(가장 아래가 0번)로 저장된 레이어 배열 — 데이터 모델과
  // Editor의 useCanvasHistory가 쓰는 순서를 그대로 따른다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  // 같은 레이어 스택을 레이어(합성)로 볼지 프레임(순차 재생)으로 볼지 — 이
  // 패널이 두 모드의 진입점이다. 프레임 목록 자체(필름스트립)는 이 패널이
  // 아니라 캔버스 아래에 별도로 뜬다.
  layerMode: "layers" | "frames";
  onLayerModeChange: (mode: "layers" | "frames") => void;
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
  onOpacityDragEnd: () => void;
  onFlatten: () => void;
  // 프레임 모드 전용 재생 컨트롤.
  isPlaying: boolean;
  onTogglePlay: () => void;
  loopPlayback: boolean;
  onToggleLoop: () => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
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
      <div className="flex shrink-0 items-center justify-between px-2 py-2">
        <div className="flex text-[10px] font-semibold">
          <button
            onClick={() => onLayerModeChange("layers")}
            className={`flex items-center gap-1 px-2 py-1 ${
              layerMode === "layers"
                ? "bg-violet-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <LayersIcon className="h-3 w-3" />
            레이어
          </button>
          <button
            onClick={() => onLayerModeChange("frames")}
            className={`flex items-center gap-1 px-2 py-1 ${
              layerMode === "frames"
                ? "bg-violet-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Play className="h-3 w-3" />
            프레임
          </button>
        </div>
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
      </div>
      {layerMode === "layers" ? (
        <>
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
                onPointerUp={onOpacityDragEnd}
                onBlur={onOpacityDragEnd}
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
              disabled={layers.length >= MAX_LAYERS}
              title="레이어 복제"
              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
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
        </>
      ) : (
        <div className="flex flex-1 flex-col gap-2 p-3">
          <button
            onClick={onTogglePlay}
            className="flex items-center justify-center gap-1.5 bg-violet-500 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                정지
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                재생
              </>
            )}
          </button>
          <button
            onClick={onToggleLoop}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs ${
              loopPlayback
                ? "bg-violet-50 text-violet-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            반복
          </button>
          <button
            onClick={onToggleOnionSkin}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs ${
              onionSkin
                ? "bg-violet-50 text-violet-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            어니언 스킨
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `Editor.tsx`의 두 `<LayerPanel>` 호출부가 아직 새 props를 안 넘겨서 나는 에러만 남는다(Task 8에서 해결). `LayerPanel.tsx` 자체에서 나는 에러는 없어야 한다.

Run: `npm run lint`
Expected: `LayerPanel.tsx`에서 나는 새 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx
git commit -m "feat: 레이어 패널에 레이어/프레임 모드 토글과 재생 컨트롤 추가"
```

---

### Task 6: `FrameFilmstrip.tsx` — 필름스트립 UI(신규)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/FrameFilmstrip.tsx`

**Interfaces:**
- Consumes: Task 1의 `PixelLayer`, Task 2의 `DEFAULT_FRAME_DURATION_MS`/`MIN_FRAME_DURATION_MS`/`MAX_FRAME_DURATION_MS`/`MAX_LAYERS`, 기존 `FileThumbnail`.
- Produces: `export default function FrameFilmstrip(props): JSX.Element` — Task 8(Editor.tsx)이 그대로 소비한다.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { PixelLayer } from "../_shared/assetLibrary";
import FileThumbnail from "./FileThumbnail";
import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MAX_LAYERS,
  MIN_FRAME_DURATION_MS,
} from "./types";

export default function FrameFilmstrip({
  layers,
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
  onToggleVisible,
  onDurationChange,
}: {
  // 아래→위(= 필름스트립 왼쪽→오른쪽) 순서 — 레이어 패널이 쓰는 배열과 동일하다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  // 재생 중엔 프레임 편집(추가·복제·삭제·이동·지속시간·전환)을 막는다 —
  // 정지해야 편집할 수 있다.
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDurationChange: (id: string, ms: number) => void;
}) {
  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);

  return (
    <div className="flex h-24 shrink-0 items-stretch gap-2 border-t border-gray-200 bg-white px-2 py-2">
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          const durationSec = (
            (layer.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS) / 1000
          ).toFixed(2);
          return (
            <div
              key={layer.id}
              onClick={() => !isPlaying && onSelect(layer.id)}
              className={`flex w-16 shrink-0 flex-col items-center gap-0.5 px-1 py-1 ${
                isActive ? "bg-violet-50" : "hover:bg-gray-50"
              } ${isPlaying ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex w-full items-center justify-between text-[9px] text-gray-400">
                <span>{index + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPlaying) onToggleVisible(layer.id);
                  }}
                  disabled={isPlaying}
                  title={layer.visible ? "숨기기" : "보이기"}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  {layer.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </button>
              </div>
              <FileThumbnail width={width} height={height} pixels={layer.pixels} />
              <input
                type="number"
                min={MIN_FRAME_DURATION_MS / 1000}
                max={MAX_FRAME_DURATION_MS / 1000}
                step={0.01}
                value={durationSec}
                disabled={isPlaying}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const sec = Number(e.target.value);
                  if (!Number.isFinite(sec)) return;
                  const ms = Math.min(
                    MAX_FRAME_DURATION_MS,
                    Math.max(MIN_FRAME_DURATION_MS, Math.round(sec * 1000)),
                  );
                  onDurationChange(layer.id, ms);
                }}
                className="w-full border border-gray-200 px-0.5 text-center text-[9px] text-gray-600 outline-none disabled:opacity-50"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPlaying) onDelete(layer.id);
                }}
                disabled={isPlaying || layers.length <= 1}
                title="프레임 삭제"
                className="text-gray-300 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 flex-col gap-1 border-l border-gray-100 pl-2">
        <button
          onClick={onAdd}
          disabled={isPlaying || layers.length >= MAX_LAYERS}
          title="프레임 추가"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDuplicate(activeLayerId)}
          disabled={isPlaying || layers.length >= MAX_LAYERS}
          title="프레임 복제"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMoveLeft(activeLayerId)}
          disabled={isPlaying || activeIndex <= 0}
          title="왼쪽으로 이동"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMoveRight(activeLayerId)}
          disabled={isPlaying || activeIndex < 0 || activeIndex >= layers.length - 1}
          title="오른쪽으로 이동"
          className="flex h-6 w-6 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 어디서도 import하지 않는 미사용 컴포넌트지만 그 자체로는 에러가 없어야 한다).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/FrameFilmstrip.tsx
git commit -m "feat: 프레임 필름스트립 UI 컴포넌트 추가"
```

---

### Task 7: `Editor.tsx` (1/2) — 모드 상태 · 재생 엔진 · 어니언 스킨 · JSON 파싱 확장

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `frameDurationMs`/`layerMode`, Task 2의 상수, 기존 `history.setActiveLayerId`(실행취소 스택을 안 건드림).
- Produces: 컴포넌트 스코프 값 `layerMode`, `isPlaying`, `loopPlayback`, `onionSkin`, 핸들러 `handleLayerModeChange`/`handleTogglePlay`/`handleToggleLoop`/`handleToggleOnionSkin` — Task 8이 그대로 쓴다. `belowComposite`/`aboveComposite`가 프레임 모드를 인식하도록 바뀐다(같은 이름, 같은 반환 타입 `PixelValue[] | null` — Task 8·PixelCanvas 호출부는 변경 불필요).

- [ ] **Step 1: 모듈 최상단 헬퍼 함수 추가**

`layersFromDoc` 함수(현재 223~243번째 줄) 다음에 추가:

```ts
// layers는 아래→위(=필름스트립 왼쪽→오른쪽) 순서. currentId 다음으로
// "보이는" 레이어를 찾는다 — 끝에 닿았을 때 loop면 처음(보이는 첫 레이어)
// 으로, 아니면 null(재생 정지 신호)을 돌려준다. 어니언 스킨의 "다음 보이는
// 프레임"에도 loop=false로 재사용한다.
function nextVisibleFrame(
  layers: PixelLayer[],
  currentId: string,
  loop: boolean,
): PixelLayer | null {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  for (let i = currentIndex + 1; i < layers.length; i++) {
    if (layers[i].visible) return layers[i];
  }
  if (!loop) return null;
  for (let i = 0; i <= currentIndex; i++) {
    if (layers[i].visible) return layers[i];
  }
  return null;
}

// 어니언 스킨의 "이전 보이는 프레임" — 재생과 달리 순환하지 않는다(이전
// 프레임이 없으면 그냥 안 보여준다).
function prevVisibleFrame(
  layers: PixelLayer[],
  currentId: string,
): PixelLayer | null {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (layers[i].visible) return layers[i];
  }
  return null;
}
```

- [ ] **Step 2: import 추가**

`./types` import(현재 76~87번째 줄)에 `DEFAULT_FRAME_DURATION_MS`, `ONION_SKIN_OPACITY`를 추가한다.

- [ ] **Step 3: 모드·재생 상태 추가**

`const [mounted, setMounted] = useState(false);`(현재 447번째 줄) 다음에 추가:

```ts
  // 같은 layers 배열을 레이어로 볼지 프레임으로 볼지 — doc에 실려 저장되므로
  // palette/name처럼 setDoc으로 갱신한다(실행취소 대상이 아니다, 도구를
  // 바꾸는 것과 같은 성격).
  const layerMode = doc.layerMode ?? "layers";
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [onionSkin, setOnionSkin] = useState(true);
```

- [ ] **Step 4: `belowComposite`/`aboveComposite`가 프레임 모드를 인식하도록 수정**

`belowComposite`/`aboveComposite` `useMemo` 두 개(현재 470~491번째 줄)를 다음으로 바꾼다:

```ts
  const belowComposite = useMemo(() => {
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const prev = prevVisibleFrame(history.presentLayers, history.activeLayerId);
      if (!prev) return null;
      return compositeLayers(
        [{ ...prev, opacity: ONION_SKIN_OPACITY }],
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
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
    doc.width,
    doc.height,
  ]);
  const aboveComposite = useMemo(() => {
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const next = nextVisibleFrame(history.presentLayers, history.activeLayerId, false);
      if (!next) return null;
      return compositeLayers(
        [{ ...next, opacity: ONION_SKIN_OPACITY }],
        doc.width,
        doc.height,
      );
    }
    return compositeLayerRange(
      history.presentLayers,
      activeLayerIndex + 1,
      history.presentLayers.length - 1,
      doc.width,
      doc.height,
    );
  }, [
    layerMode,
    onionSkin,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
    doc.width,
    doc.height,
  ]);
```

- [ ] **Step 5: 재생 엔진**

`pushLayerOp` 선언(현재 573~585번째 줄) 다음에 추가:

```ts
  const handleLayerModeChange = useCallback((mode: "layers" | "frames") => {
    // 모드를 바꾸는 순간 재생 중이었다면 멈춘다 — 레이어 모드로 돌아가면
    // "재생"이라는 개념 자체가 없다.
    setIsPlaying(false);
    setDoc((d) => ({ ...d, layerMode: mode }));
    setHasMetaEdits(true);
  }, []);

  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleToggleLoop = useCallback(() => setLoopPlayback((l) => !l), []);
  const handleToggleOnionSkin = useCallback(() => setOnionSkin((o) => !o), []);

  // 재생 루프(requestAnimationFrame) 안에서 항상 최신 값을 읽기 위한 ref들 —
  // history.presentLayers/activeLayerId는 재생 중 프레임이 바뀔 때마다
  // 바뀌므로, 이 값들을 useEffect 의존성에 직접 넣으면 프레임이 바뀔 때마다
  // 루프가 처음부터 재시작돼(경과 시간 누적이 매번 끊겨) 재생이 멈춘 것처럼
  // 보이거나 불규칙해진다. 대신 ref로만 최신값을 따라가고, useEffect
  // 자체는 isPlaying이 바뀔 때만(재생 시작/정지) 재시작한다.
  const playbackLayersRef = useRef(history.presentLayers);
  const playbackActiveIdRef = useRef(history.activeLayerId);
  const playbackLoopRef = useRef(loopPlayback);
  useEffect(() => {
    playbackLayersRef.current = history.presentLayers;
  }, [history.presentLayers]);
  useEffect(() => {
    playbackActiveIdRef.current = history.activeLayerId;
  }, [history.activeLayerId]);
  useEffect(() => {
    playbackLoopRef.current = loopPlayback;
  }, [loopPlayback]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      elapsed += delta;
      const currentId = playbackActiveIdRef.current;
      const currentLayer = playbackLayersRef.current.find(
        (l) => l.id === currentId,
      );
      const duration = currentLayer?.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS;
      if (elapsed >= duration) {
        elapsed = 0;
        const next = nextVisibleFrame(
          playbackLayersRef.current,
          currentId,
          playbackLoopRef.current,
        );
        if (next) {
          history.setActiveLayerId(next.id);
        } else {
          setIsPlaying(false);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // history 객체 자체는 매 렌더 새로 만들어지므로 의존성에 넣지 않는다 —
    // history.setActiveLayerId는 useCanvasHistory 안에서 deps: []인
    // useCallback이라 참조가 안정적이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, history.setActiveLayerId]);
```

- [ ] **Step 6: 탭 전환 시 재생 정지**

`loadTab`(현재 685~705번째 줄) 안의 `setCanvasZoom(1);` 다음에 추가:

```ts
      setCanvasZoom(1);
      // 다른 탭으로 넘어가면 재생 중이던 애니메이션은 의미가 없다.
      setIsPlaying(false);
```

- [ ] **Step 7: JSON 불러오기가 `layerMode`/`frameDurationMs`도 읽도록 확장**

`parsePixelArtJSON`의 반환 타입(현재 123~131번째 줄)에 필드를 추가:

```ts
function parsePixelArtJSON(raw: unknown): {
  name: string;
  width: number;
  height: number;
  palette: string[];
  pixels: PixelValue[];
  layers?: PixelLayer[];
  activeLayerId?: string;
  layerMode?: "layers" | "frames";
} | null {
```

레이어 매핑(현재 160~170번째 줄) 안에 `locked` 다음 줄로 추가:

```ts
      locked: typeof l.locked === "boolean" ? l.locked : false,
      frameDurationMs:
        typeof l.frameDurationMs === "number" && l.frameDurationMs > 0
          ? l.frameDurationMs
          : undefined,
```

함수의 반환 객체(현재 176~187번째 줄) 끝에 추가:

```ts
    activeLayerId:
      typeof d.activeLayerId === "string" ? d.activeLayerId : undefined,
    layerMode:
      d.layerMode === "layers" || d.layerMode === "frames"
        ? d.layerMode
        : undefined,
  };
}
```

`handleImportJSONFile`의 `openNewTab({...})` 호출(현재 753~763번째 줄)에 한 줄 추가:

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
          layerMode: parsed.layerMode,
          createdAt: Date.now(),
        });
```

- [ ] **Step 8: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `<LayerPanel>` 두 곳이 아직 새 props(`layerMode` 등)를 안 넘겨서 나는 에러만 남는다(Task 8에서 해결). 그 외(재생 엔진·어니언스킨·JSON 파싱) 관련 에러는 없어야 한다.

Run: `npm run lint`
Expected: `react-hooks/exhaustive-deps` 관련해서는 Step 5에서 의도적으로 억제한 그 한 줄 외에 새 경고가 없어야 한다.

- [ ] **Step 9: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor에 프레임 모드 상태·재생 엔진·어니언 스킨 배선"
```

---

### Task 8: `Editor.tsx` (2/2) — 필름스트립·모드 토글 UI 배선 + GIF/스프라이트 내보내기

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 5의 `LayerPanel` 새 props, Task 6의 `FrameFilmstrip`, Task 4의 `exportAsGIF`/`exportAsSpriteSheet`, Task 7의 `layerMode`/`isPlaying`/재생 핸들러들.

- [ ] **Step 1: import 추가**

`import LayerPanel from "./LayerPanel";` 다음 줄에 추가:

```ts
import FrameFilmstrip from "./FrameFilmstrip";
```

`./exportPixelArt` import(현재 29~34번째 줄)를 다음으로 바꾼다:

```ts
import {
  exportAsGIF,
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSpriteSheet,
  exportAsSVG,
} from "./exportPixelArt";
```

- [ ] **Step 2: 프레임 지속시간 변경 핸들러 추가**

`handleFlattenLayers` 선언(현재 1663~1674번째 줄) 다음에 추가:

```ts
  const handleFrameDurationChange = useCallback(
    (id: string, ms: number) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, frameDurationMs: ms } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );
```

- [ ] **Step 3: 캔버스 열을 세로로 바꿔 필름스트립 자리를 만든다**

캔버스 열 컨테이너(현재 2080번째 줄) `<div className="relative flex flex-1 overflow-hidden">`를 `<div className="relative flex flex-1 flex-col overflow-hidden">`로 바꾸고, 그 안의 기존 내용(현재 2081~2191번째 줄, `<div ref={canvasViewportRef}...>`부터 `secondaryToolbarPortal` div까지)을 새 안쪽 `<div className="relative flex flex-1 overflow-hidden">`로 한 번 더 감싼다(들여쓰기만 한 단계 깊어질 뿐 그 안의 내용— `<PixelCanvas>`의 모든 props, 확대/축소 버튼, `secondaryToolbarPortal` div — 는 글자 하나 바꾸지 않는다). 그 다음, 원래 열의 닫는 태그 `</div>` 앞에 필름스트립을 조건부로 추가한다. 결과는 다음과 같다(현재 2080~2192번째 줄 전체를 아래로 교체):

```tsx
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div className="relative flex flex-1 overflow-hidden">
                <div
                  ref={canvasViewportRef}
                  // items-center/justify-center로 캔버스가 뷰포트보다 작을 때는
                  // 잘 가운데 놓이지만, 확대해 캔버스가 뷰포트보다 커지면 일반
                  // center 정렬은 넘치는 영역을 "시작 쪽"(왼쪽·위쪽)에서 스크롤로도
                  // 닿을 수 없게 잘라버린다(스크롤 위치는 0인데 실제로는 이미
                  // 가운데 어딘가를 보여주는 flex의 알려진 동작) — 그래서 확대
                  // 직후 캔버스 왼쪽·위쪽이 보이지 않았다. safe center는 내용이
                  // 넘칠 때만 자동으로 시작 정렬로 바뀌어 스크롤로 전체 영역에
                  // 닿을 수 있게 한다(들어갈 때는 그대로 가운데 정렬 유지).
                  className="flex flex-1 overflow-auto [align-items:safe_center] [justify-content:safe_center]"
                >
                  <PixelCanvas
                    width={doc.width}
                    height={doc.height}
                    pixels={history.present}
                    belowComposite={belowComposite}
                    aboveComposite={aboveComposite}
                    activeLayerOpacity={
                      activeLayer.visible ? activeLayer.opacity : 0
                    }
                    activeLayerLocked={activeLayer.locked || isPlaying}
                    tool={tool}
                    onToolChange={setTool}
                    activeColorHex={activeColorHex}
                    selectionMask={selection.mask}
                    selectMode={selectMode}
                    showGrid={showGrid}
                    showCrosshair={showCrosshair}
                    brushSize={brushSize}
                    filledShapes={filledShapes}
                    onSelectionChange={selection.setMask}
                    onStrokeEnd={handleStrokeEnd}
                    onPickColor={handlePickColor}
                    onTextToolClick={handleTextToolClick}
                    pendingText={
                      pendingText
                        ? { ...pendingText, colorHex: activeColorHex }
                        : null
                    }
                    onPendingTextChange={handlePendingTextChange}
                    onPendingTextMove={handlePendingTextMove}
                    onPendingTextToggleAA={handlePendingTextToggleAA}
                    onPendingTextToggleGradient={handlePendingTextToggleGradient}
                    onPendingTextSetAlign={handlePendingTextSetAlign}
                    onPendingTextRotate={handlePendingTextRotate}
                    onPendingTextCommit={handlePendingTextCommit}
                    onPendingTextCancel={handlePendingTextCancel}
                    onGradientToolEnd={handleGradientToolEnd}
                    shapeGradientFill={shapeGradientFill}
                    gradientStartHex={activeColorHex}
                    gradientEndHex={secondaryColorHex ?? "#00000000"}
                    gradientSteps={gradientSteps}
                    gradientAngleDeg={gradientAngleDeg}
                    onGradientStepsChange={setGradientSteps}
                    onGradientAngleChange={setGradientAngleDeg}
                    zoom={canvasZoom}
                    onZoomChange={setCanvasZoom}
                    viewportRef={canvasViewportRef}
                    wandGlobal={wandGlobal}
                    pendingImage={pendingImage}
                    onPendingImageMove={handlePendingImageMove}
                    onPendingImageResize={handlePendingImageResize}
                    onPendingImageRotate={handlePendingImageRotate}
                    onPendingImageCommit={handlePendingImageCommit}
                    onPendingImageCancel={handlePendingImageCancel}
                    pendingShape={pendingShape}
                    onShapeDragEnd={handleShapeDragEnd}
                    onPendingShapeUpdate={handlePendingShapeUpdate}
                    onPendingShapeCommit={handlePendingShapeCommit}
                    onPendingShapeCancel={handlePendingShapeCancel}
                    bottomToolbarPortalTarget={secondaryToolbarPortal}
                  />
                </div>
                {/* 캔버스를 스크롤하는 safe-center flex 컨테이너 밖(이 바깥 relative
                    래퍼)에 둔다 — 그 안에 있으면 확대되어 스크롤이 생길 때
                    align-items/justify-content:safe 조합에 따라 컨트롤 위치
                    계산이 흔들릴 수 있다. 여기서는 뷰포트 자체에 고정돼 확대·
                    스크롤과 무관하게 항상 같은 자리에 떠 있다. */}
                <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, -1))}
                    disabled={canvasZoom <= ZOOM_STEPS[0]}
                    title="축소"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                    {canvasZoom}x
                  </div>
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, 1))}
                    disabled={canvasZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="확대"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {/* DrawToolbar가 그리기/선택 도구의 하위 옵션을 포털로 그려 넣는
                    자리 — 캔버스 하단 중앙에 둬서 좌우 사이드바를 가리지 않는다.
                    전체 너비를 차지하는 빈 상자라 내용이 없는 양옆(배율 컨트롤
                    쪽 포함)까지 클릭을 가로챘다 — pointer-events-none으로 이
                    상자 자체는 클릭을 그대로 통과시키고, 실제로 그려 넣는
                    내용(DrawToolbar·PixelCanvas 쪽)에서만 pointer-events-auto로
                    되돌린다. */}
                <div
                  ref={setSecondaryToolbarPortal}
                  className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-3"
                />
              </div>
              {layerMode === "frames" && (
                <FrameFilmstrip
                  layers={history.presentLayers}
                  activeLayerId={history.activeLayerId}
                  width={doc.width}
                  height={doc.height}
                  isPlaying={isPlaying}
                  onSelect={handleSelectLayer}
                  onAdd={handleAddLayer}
                  onDuplicate={handleDuplicateLayer}
                  onDelete={handleDeleteLayer}
                  onMoveLeft={(id) => handleMoveLayer(id, -1)}
                  onMoveRight={(id) => handleMoveLayer(id, 1)}
                  onToggleVisible={handleToggleLayerVisible}
                  onDurationChange={handleFrameDurationChange}
                />
              )}
            </div>
```

`activeLayerLocked` prop이 `activeLayer.locked || isPlaying`로 바뀐 것 딱 한 군데를 빼면, `<PixelCanvas>`의 나머지 props·확대/축소 버튼·`secondaryToolbarPortal` div는 지금 파일과 완전히 동일하다(다음 Step 4는 이 문서에서 그 한 줄을 별도로 다시 언급하지 않는다 — 이미 여기 반영돼 있다).

- [ ] **Step 4: `<LayerPanel>` 두 곳에 새 props 전달**

넓은 화면용(현재 2238~2256번째 줄)과 좁은 화면용(현재 2277~2295번째 줄) `<LayerPanel>` 호출 둘 다에, `onFlatten={handleFlattenLayers}` 다음 줄로 추가한다(두 곳 모두 동일하게):

```tsx
                      onFlatten={handleFlattenLayers}
                      layerMode={layerMode}
                      onLayerModeChange={handleLayerModeChange}
                      isPlaying={isPlaying}
                      onTogglePlay={handleTogglePlay}
                      loopPlayback={loopPlayback}
                      onToggleLoop={handleToggleLoop}
                      onionSkin={onionSkin}
                      onToggleOnionSkin={handleToggleOnionSkin}
```

- [ ] **Step 5: 파일 메뉴 내보내기에 GIF·스프라이트 시트 추가(프레임 모드에서만)**

`openFileMenu`(현재 1679번째 줄부터) 안의 `exportDoc` 선언 다음, `setMenuAnchor({...})` 호출 이전에 추가:

```ts
      const exportSubmenu: ContextMenuItem[] = [
        { label: "PNG", onClick: () => exportAsPNG(exportDoc) },
        { label: "SVG", onClick: () => exportAsSVG(exportDoc) },
        {
          label: "JSON",
          title:
            "다른 기기에서도 그림을 그대로 이어 그리고 싶을 때 씁니다 — 저장된 이 파일을 그 기기의 파일 > JSON 불러오기로 열면 됩니다.",
          onClick: () => exportAsJSON(exportDoc),
        },
        { label: "JPG (손실 압축)", onClick: () => exportAsJPG(exportDoc) },
      ];
      if (layerMode === "frames") {
        exportSubmenu.push(
          {
            label: "GIF",
            title: "보이는 프레임을 순서대로 재생하는 GIF로 내보냅니다.",
            onClick: () => {
              void exportAsGIF(exportDoc);
            },
          },
          {
            label: "스프라이트 시트",
            title: "보이는 프레임을 가로로 이어붙인 PNG 한 장으로 내보냅니다.",
            onClick: () => exportAsSpriteSheet(exportDoc),
          },
        );
      }
```

그리고 `"내보내기"` 메뉴 항목의 `submenu:` 배열(현재 1715~1734번째 줄, PNG/SVG/JSON/JPG 4개가 인라인으로 있던 자리)을 위에서 만든 `exportSubmenu`로 통째로 바꾼다:

```ts
          {
            label: "내보내기",
            disabled: noActiveTab,
            submenu: exportSubmenu,
          },
```

`openFileMenu`의 `useCallback` 의존성 배열(현재 1739~1747번째 줄)에 `layerMode`를 추가한다.

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev`

`/nemo-nemo-beam`을 열고 다음을 확인한다:

1. 새 캔버스를 만들고 레이어를 2~3장 그린 뒤, 우측 사이드바 상단의 "레이어 | 프레임" 토글을 눌러 프레임 모드로 전환한다 — 사이드바가 재생/반복/어니언스킨 버튼만 남는 축약 UI로 바뀌고, 캔버스 아래에 필름스트립이 뜬다.
2. 필름스트립에서 프레임을 추가·복제·삭제하고, 지속시간(초) 입력을 바꿔본다.
3. 재생을 누르면 프레임이 순서대로(각자 지정한 지속시간만큼) 넘어가며 캔버스에 보인다. 정지를 누르면 멈춘다.
4. 반복을 끈 상태로 재생하면 마지막 프레임에서 자동으로 정지하는지, 켠 상태면 처음으로 돌아가 계속 재생되는지 확인한다.
5. 재생 중에는 캔버스에 그려지지 않는지(펜슬로 클릭해도 아무 반응 없음) 확인한다.
6. 정지 상태에서 어니언스킨을 켜고 프레임을 하나 그리면, 앞/뒤 프레임이 반투명하게 겹쳐 보이는지 확인한다. 끄면 현재 프레임만 보이는지 확인한다.
7. 필름스트립에서 프레임 하나의 눈 아이콘을 꺼서 숨기고 재생하면, 그 프레임이 재생에서 건너뛰어지는지 확인한다.
8. 파일 > 내보내기 메뉴에 "GIF"와 "스프라이트 시트"가 프레임 모드에서만 보이는지(레이어 모드로 돌아가면 사라지는지) 확인한다.
9. GIF로 내보내 실제로 애니메이션이 재생되는 GIF 파일이 받아지는지, 스프라이트 시트로 내보내 프레임 수만큼 가로로 이어붙은 PNG가 받아지는지 확인한다.
10. 저장 후 탭을 닫았다가 다시 열어 프레임 모드·지속시간·프레임 순서가 그대로 복원되는지 확인한다.
11. 레이어 모드로 다시 전환해 기존 레이어 기능(투명도·잠금·병합 등)이 전혀 영향받지 않았는지 확인한다.

Expected: 위 11가지 모두 설계 스펙(`docs/superpowers/specs/2026-08-05-nemo-nemo-beam-frame-mode-design.md`)대로 동작.

- [ ] **Step 8: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 필름스트립과 모드 토글을 편집기에 배선하고 GIF·스프라이트 내보내기 연결"
```

---

### Task 9: 전체 빌드 확인

**Files:** 없음(검증 전용 태스크).

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 2: 기존 저장 파일 하위 호환 확인(수동)**

`layerMode`가 없는(이번 세션 이전에 저장된) 기존 레이어 작품을 열어본다 — 자동으로 "레이어" 모드로 열리고 그림이 깨지지 않는지 확인한다. 저장해서 다시 열어도 정상인지 확인한다. 없다면 이 단계는 생략하고 그 사실을 기록한다.

- [ ] **Step 3: 커밋(변경 사항이 있는 경우에만)**

이 태스크에서 코드 변경이 없다면 커밋할 것이 없다.
