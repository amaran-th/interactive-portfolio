# 비주얼 노벨 스튜디오 리소스 선택 방식 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비주얼 노벨 스튜디오(Work #2)의 캐릭터/배경 이미지 등록에서 파일 업로드를 완전히 없애고, "기본 제공" 리소스 또는 "네모네모빔"(픽셀아트 메이커)에서 만든 저장 작품 중에서 선택하는 방식으로 바꾼다.

**Architecture:** `Character.images[].pixelArtId` / `Background.pixelArtId`가 공유 자산 라이브러리(`_shared/assetLibrary.ts`)의 `PixelArt.id` 또는 새로 만드는 기본 제공 세트(`_shared/builtinAssets.ts`)를 참조한다. 화면에 그릴 때 쓰는 `imageUrl`은 저장되지 않는 런타임 값으로, `pixelArtId`를 픽셀아트 메이커와 공유하는 캔버스 렌더링 유틸(`_shared/renderPixelArt.ts`)로 그 자리에서 동기적으로 data URL로 변환해 채운다(캔버스 렌더링은 동기 처리라 기존 IndexedDB 비동기 로딩보다 단순하다). 이미지 선택 UI는 새 컴포넌트 `ResourcePicker.tsx`(기본 제공/네모네모빔 탭 그리드) 하나로 캐릭터 표정 이미지·배경 등록에 공용으로 쓴다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. 테스트 스위트 없음(프로젝트 컨벤션) — 각 태스크는 `npm run lint && npx tsc --noEmit -p .` + 브라우저 수동 검증으로 마무리한다. 새 외부 의존성 추가 없음.

## Global Constraints

- 서버/DB/외부 인프라 사용 금지 — 저장은 `localStorage`/`IndexedDB`만, 기존 관행 유지 (`docs/superpowers/specs/2026-07-10-vn-asset-ecosystem-design.md`)
- 이번 범위는 이미지(캐릭터/배경)만 — 오디오(BGM/SFX)는 기존 파일 업로드 + IndexedDB 파이프라인 그대로 유지 (`docs/superpowers/specs/2026-07-18-vn-studio-asset-picker-design.md`)
- 기본 제공 리소스 id는 `builtin-` 접두사로 시작해 사용자 라이브러리 id(랜덤 7자, `Math.random().toString(36).slice(2, 9)`)와 절대 충돌하지 않게 한다
- `useVNStore.ts`의 `STORAGE_VERSION`을 4 → 5로 올리고, 구버전 슬롯은 기존과 동일한 방식(폐기, 빈 상태로 시작)으로 처리한다 — 기존 로컬 저장 캐릭터/배경/컷 데이터가 리셋되는 것은 사용자 확인 완료
- 다크 테마 글래스모피즘 톤(`bg-gray-950`, `text-white`, `white/5`·`white/10`) 유지 (`CLAUDE.md`)
- 새로 쓰는 UI 문구는 번역투 없이 명확한 한국어로 작성 (`CLAUDE.md` Writing Guidelines)
- 픽셀아트를 확대해서 보여줄 때는 항상 `style={{ imageRendering: "pixelated" }}`를 붙여 안티에일리어싱 없이 도트가 그대로 보이게 한다 (`5_PixelArtMaker/WallpaperBackground.tsx`의 기존 관행)

---

## File Map

| 파일 | 변화 |
| --- | --- |
| `Works/_shared/renderPixelArt.ts` | **신규** — `PixelArt` → 캔버스/data URL 렌더링 공유 유틸 (기존 `exportPixelArt.ts`·`WallpaperBackground.tsx`의 중복 로직 통합) |
| `Works/5_PixelArtMaker/exportPixelArt.ts` | 수정 — 자체 `renderToCanvas`를 지우고 공유 유틸 사용 |
| `Works/5_PixelArtMaker/WallpaperBackground.tsx` | 수정 — 자체 `renderDataUrl`을 지우고 공유 유틸 사용 |
| `Works/_shared/builtinAssets.ts` | **신규** — 기본 제공 캐릭터/배경 픽셀아트 세트(`BUILTIN_CHARACTER_IMAGES`, `BUILTIN_BACKGROUNDS`) + `findBuiltin` |
| `Works/_shared/assetLibrary.ts` | 수정 — `resolvePixelArt(id)` 추가(사용자 라이브러리 → 기본 제공 순으로 조회) |
| `Works/2_VisualNovelStudio/ResourcePicker.tsx` | **신규** — 기본 제공/네모네모빔 탭 썸네일 그리드 선택 모달 |
| `Works/2_VisualNovelStudio/types.ts` | 수정 — `CharacterImage`/`Background`에 `pixelArtId` 추가 |
| `Works/2_VisualNovelStudio/useVNStore.ts` | 수정 — 이미지 관련 IndexedDB 로직 제거, `pixelArtId` 기반 add 함수로 교체, `STORAGE_VERSION` 5로 상승 |
| `Works/2_VisualNovelStudio/imageStore.ts` | 수정 — 더 이상 쓰이지 않는 `deleteBlobs` 제거 |
| `Works/2_VisualNovelStudio/AssetUploader.tsx` | 수정 — `DropImageArea`(파일 업로드) 제거, `CharacterForm`/`CharacterCard`/`BackgroundForm`이 `ResourcePicker`로 이미지를 고르도록 교체 (오디오 탭은 그대로) |
| `Works/2_VisualNovelStudio/VNDisplay.tsx` | 수정 — `imageRendering: pixelated` 적용, 삭제된 리소스 플레이스홀더 처리 |
| `Works/2_VisualNovelStudio/EditorScreen.tsx` | 수정 — 배경 선택 썸네일에 `imageRendering: pixelated` 적용 |

---

## Task 1: 공유 픽셀아트 렌더링 유틸 추출

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/_shared/renderPixelArt.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts:1-28`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/WallpaperBackground.tsx`

**Interfaces:**
- Produces: `renderToCanvas(doc: PixelArt, scale?: number): HTMLCanvasElement`, `pixelArtToDataUrl(doc: PixelArt, scale?: number): string` (둘 다 `scale` 기본값 1)

- [ ] **Step 1: `renderPixelArt.ts` 작성**

```typescript
import { PixelArt } from "./assetLibrary";

// scale=1은 캔버스 픽셀 하나가 그림 픽셀 하나와 정확히 대응하는 원본 해상도
// 렌더링이다. 화면에 확대해서 보여줄 때는 소비하는 쪽에서
// <img style={{ imageRendering: "pixelated" }}>로 키워야 도트가 뭉개지지 않는다.
export function renderToCanvas(doc: PixelArt, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const color = doc.pixels[y * doc.width + x];
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function pixelArtToDataUrl(doc: PixelArt, scale = 1): string {
  return renderToCanvas(doc, scale).toDataURL();
}
```

- [ ] **Step 2: `exportPixelArt.ts` 전체 교체**

자체 `renderToCanvas` 정의를 지우고 공유 유틸을 import해서 쓴다. `renderToCanvas` 호출부는 이미 `scale`을 명시적으로 넘기고 있어 동작은 바뀌지 않는다.

```typescript
import { PixelArt } from "../_shared/assetLibrary";
import { renderToCanvas } from "../_shared/renderPixelArt";
import { hexToRgba, rgbToHex } from "./hsv";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsPNG(doc: PixelArt, scale = 8): void {
  renderToCanvas(doc, scale).toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}.png`);
  }, "image/png");
}

export function exportAsJPG(doc: PixelArt, scale = 8): void {
  const canvas = renderToCanvas(doc, scale);
  // JPG는 알파를 지원하지 않으므로 검은 배경을 먼저 채운다
  const ctx = canvas.getContext("2d")!;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, `${doc.name}.jpg`);
    },
    "image/jpeg",
    0.92,
  );
}

// 파일 다운로드와 "코드 복사"(클립보드에 텍스트로 복사) 양쪽에서 같은 SVG
// 문자열을 재사용한다.
export function buildSvgString(doc: PixelArt): string {
  const rects: string[] = [];
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const color = doc.pixels[y * doc.width + x];
      if (color === null) continue;
      // SVG의 fill 속성은 8자리(#rrggbbaa) hex를 신뢰성 있게 지원하지 않는 뷰어가
      // 있어, 알파가 있으면 fill-opacity로 분리해 내보낸다.
      const [r, g, b, a] = hexToRgba(color);
      const opacity = a < 1 ? ` fill-opacity="${a.toFixed(3)}"` : "";
      rects.push(
        `<rect x="${x}" y="${y}" width="1" height="1" fill="${rgbToHex(r, g, b)}"${opacity}/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.width} ${doc.height}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

export function exportAsSVG(doc: PixelArt): void {
  triggerDownload(
    new Blob([buildSvgString(doc)], { type: "image/svg+xml" }),
    `${doc.name}.svg`,
  );
}

export function exportAsJSON(doc: PixelArt): void {
  triggerDownload(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${doc.name}.json`,
  );
}

// PNG만 클립보드 이미지로 신뢰성 있게 지원된다(대부분 브라우저의 ClipboardItem은
// image/png만 받는다) — JPG는 파일 저장만 제공한다.
export async function copyPngToClipboard(
  doc: PixelArt,
  scale = 8,
): Promise<boolean> {
  try {
    const canvas = renderToCanvas(doc, scale);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: `WallpaperBackground.tsx`가 공유 유틸을 쓰도록 수정**

전체 파일을 아래 내용으로 교체한다.

```tsx
"use client";

import { useEffect, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";

export default function WallpaperBackground({ art }: { art: PixelArt }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(pixelArtToDataUrl(art));
  }, [art]);

  if (!url) return null;

  return (
    // <img>로 렌더링해야 object-fit(cover)으로 창 크기에 맞춰 비율을 유지하며
    // 확대할 수 있다(캔버스 자체는 object-fit을 지원하지 않는다).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
```

- [ ] **Step 4: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 5: 브라우저로 기존 기능 회귀 확인**

Run: `npm run dev`

1. `http://localhost:3000/pixel-art-maker` 접속
2. 저장된 그림이 있으면 바탕화면 배경(`WallpaperBackground`)이 픽셀 그대로(흐려지지 않고) 보이는지 확인
3. 아무 그림이나 열어 우클릭 → 내보내기 → PNG/SVG/JSON/JPG 각각 다운로드가 정상 동작하는지 확인

- [ ] **Step 6: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/_shared/renderPixelArt.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/WallpaperBackground.tsx"
git commit -m "refactor: 픽셀아트 캔버스 렌더링 로직을 공유 유틸로 통합"
```

---

## Task 2: 기본 제공 리소스 세트 + 리소스 조회 함수

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/_shared/builtinAssets.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`

**Interfaces:**
- Consumes: 없음 (독립적인 신규 로직)
- Produces: `BUILTIN_CHARACTER_IMAGES: PixelArt[]`, `BUILTIN_BACKGROUNDS: PixelArt[]`, `findBuiltin(id: string): PixelArt | undefined`, `resolvePixelArt(id: string): PixelArt | undefined`

- [ ] **Step 1: `builtinAssets.ts` 작성**

```typescript
import type { PixelArt } from "./assetLibrary";

// id는 "builtin-" 접두사로 시작한다 — 사용자 라이브러리 id(uid(), 랜덤 7자,
// 접두사 없음)와 절대 겹치지 않는다.
//
// 콘텐츠는 아직 비어 있다. 네모네모빔(픽셀아트 메이커)에서 대표 캐릭터/배경을
// 완성한 뒤 "내보내기 → JSON"으로 받은 결과를 아래 배열에 리터럴로 붙여넣으면
// 바로 반영된다. 비어 있어도 기능은 정상 동작한다(선택 화면에 "기본 제공
// 리소스 없음"으로 표시될 뿐).
export const BUILTIN_CHARACTER_IMAGES: PixelArt[] = [];

export const BUILTIN_BACKGROUNDS: PixelArt[] = [];

export function findBuiltin(id: string): PixelArt | undefined {
  return [...BUILTIN_CHARACTER_IMAGES, ...BUILTIN_BACKGROUNDS].find(
    (art) => art.id === id,
  );
}
```

- [ ] **Step 2: `assetLibrary.ts`에 `resolvePixelArt` 추가**

`assetLibrary.ts`의 첫 줄(파일 맨 위)을 찾는다:

```typescript
const LIBRARY_KEY = "playground-asset-library";
```

아래 내용으로 교체한다(import를 파일 맨 위에 추가):

```typescript
import { findBuiltin } from "./builtinAssets";

const LIBRARY_KEY = "playground-asset-library";
```

다음으로 `getPixelArt` 함수를 찾는다:

```typescript
export function getPixelArt(id: string): PixelArt | undefined {
  return loadLibrary().pixelArt.find((p) => p.id === id);
}
```

바로 아래에 `resolvePixelArt`를 추가한다:

```typescript
export function getPixelArt(id: string): PixelArt | undefined {
  return loadLibrary().pixelArt.find((p) => p.id === id);
}

// 사용자 라이브러리에서 먼저 찾고, 없으면 기본 제공 세트에서 찾는다.
// 둘 다 없으면 undefined — 호출부는 참조가 끊긴(삭제된) 리소스로 처리해야 한다.
export function resolvePixelArt(id: string): PixelArt | undefined {
  return getPixelArt(id) ?? findBuiltin(id);
}
```

파일의 나머지 타입/함수(`savePixelArt`, `renamePixelArt`, `deletePixelArt`, `duplicatePixelArt`, `BeatTrack`, `BeatPattern` 등)는 그대로 둔다.

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/_shared/builtinAssets.ts" "app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts"
git commit -m "feat: 기본 제공 픽셀아트 세트와 통합 리소스 조회 함수 추가"
```

---

## Task 3: 리소스 선택 모달 (`ResourcePicker.tsx`)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx`

**Interfaces:**
- Consumes: `PixelArt`, `listPixelArt()` (`_shared/assetLibrary.ts`), `pixelArtToDataUrl()` (`_shared/renderPixelArt.ts`), `BUILTIN_CHARACTER_IMAGES`/`BUILTIN_BACKGROUNDS` (`_shared/builtinAssets.ts`)
- Produces: `ResourcePicker` 컴포넌트, props `{ open: boolean; kind: "character" | "background"; onClose: () => void; onSelect: (art: PixelArt) => void }`

- [ ] **Step 1: `ResourcePicker.tsx` 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { PixelArt, listPixelArt } from "../_shared/assetLibrary";
import { BUILTIN_BACKGROUNDS, BUILTIN_CHARACTER_IMAGES } from "../_shared/builtinAssets";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";

type Tab = "builtin" | "library";

interface Props {
  open: boolean;
  kind: "character" | "background";
  onClose: () => void;
  onSelect: (art: PixelArt) => void;
}

function Thumb({ art, onClick }: { art: PixelArt; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(pixelArtToDataUrl(art));
  }, [art]);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 text-left transition-colors hover:border-white/30 hover:bg-white/10"
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-black/20">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={art.name}
            className="h-full w-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </div>
      <span className="w-full truncate text-center text-xs text-gray-300">
        {art.name}
      </span>
    </button>
  );
}

export default function ResourcePicker({ open, kind, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>("builtin");
  const [libraryArt, setLibraryArt] = useState<PixelArt[]>([]);

  useEffect(() => {
    if (open) setLibraryArt(listPixelArt());
  }, [open]);

  if (!open) return null;

  const builtinArt = kind === "character" ? BUILTIN_CHARACTER_IMAGES : BUILTIN_BACKGROUNDS;
  const items = tab === "builtin" ? builtinArt : libraryArt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-white/10">
          {(["builtin", "library"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-white text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "builtin" ? "기본 제공" : "네모네모빔 리소스"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs italic text-gray-600">
              {tab === "builtin"
                ? "기본 제공 리소스가 없습니다."
                : "네모네모빔에서 만든 그림이 없습니다. 먼저 그림을 그려서 저장해보세요."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((art) => (
                <Thumb key={art.id} art={art} onClick={() => onSelect(art)} />
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-white/10 p-2">
          <button
            onClick={onClose}
            className="w-full rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음 (아직 아무 곳에서도 import하지 않으므로 미사용 파일이지만, 타입 자체는 검증된다)

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx"
git commit -m "feat: 픽셀아트 리소스 선택 모달 컴포넌트 추가"
```

---

## Task 4: 캐릭터/배경 데이터 모델과 등록 화면을 리소스 참조 방식으로 전환

이 태스크는 `types.ts` → `useVNStore.ts` → `AssetUploader.tsx`가 같은 타입 계약(`pixelArtId`)을 공유하므로 한 번에 바꾼다(하나만 바꾸면 나머지 두 파일에서 타입 오류가 난다).

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/types.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/useVNStore.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/imageStore.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx`

**Interfaces:**
- Consumes: `resolvePixelArt()` (Task 2), `pixelArtToDataUrl()` (Task 1), `ResourcePicker` (Task 3)
- Produces: `CharacterImage { id, label, pixelArtId, imageUrl }`, `Background { id, name, pixelArtId, imageUrl }`, `useVNStore().addCharacter(name, images: {label, pixelArtId}[])`, `.addCharacterImage(charId, label, pixelArtId)`, `.addBackground(name, pixelArtId)` — 이 시그니처들을 `VisualNovelStudio.tsx`가 그대로 `AssetUploader`에 전달하므로 이후 태스크에서도 이 이름/타입을 그대로 쓴다

- [ ] **Step 1: `types.ts` 전체 교체**

```typescript
export type CharacterImage = {
  id: string;
  label: string;
  pixelArtId: string;
  imageUrl: string; // 저장되지 않는 런타임 값 — pixelArtId를 렌더링한 결과
};

export type Character = {
  id: string;
  name: string;
  images: CharacterImage[];
};

export type Background = {
  id: string;
  name: string;
  pixelArtId: string;
  imageUrl: string; // 저장되지 않는 런타임 값 — pixelArtId를 렌더링한 결과
};

export type AudioTrackType = "bgm" | "sfx";

export type AudioTrack = {
  id: string;
  name: string;
  type: AudioTrackType;
  audioUrl: string;
};

export type CharacterPosition = "left" | "right";

export type TextEffect = "default" | "whisper" | "shout";

export const BGM_STOP = "__stop__";

export type Cut = {
  id: string;
  backgroundId: string | null;
  visibleCharacterIds: string[];
  characterPositions: Record<string, CharacterPosition>;
  characterImageIds: Record<string, string>; // charId → imageId
  speakerIds: string[]; // character IDs and/or "narrator"; empty = no speaker
  textEffect: TextEffect;
  text: string;
  bgmId: string | null; // null = no change, BGM_STOP = stop, trackId = switch BGM
  sfxId: string | null; // null = none, trackId = play once on cut load
};
```

- [ ] **Step 2: `useVNStore.ts` 전체 교체**

```typescript
import { useCallback, useEffect, useState } from "react";
import { resolvePixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";
import { deleteBlob, loadBlobUrls, saveBlob } from "./imageStore";
import { AudioTrack, AudioTrackType, Background, Character, Cut } from "./types";

const STORAGE_VERSION = 5;

const uid = () => Math.random().toString(36).slice(2, 9);
const blankCut = (): Cut => ({
  id: uid(),
  backgroundId: null,
  visibleCharacterIds: [],
  characterPositions: {},
  characterImageIds: {},
  speakerIds: [],
  textEffect: "default",
  text: "",
  bgmId: null,
  sfxId: null,
});

function resolveImageUrl(pixelArtId: string): string {
  const art = resolvePixelArt(pixelArtId);
  return art ? pixelArtToDataUrl(art) : "";
}

type StoredImage = { id: string; label: string; pixelArtId: string };
type StoredCharacter = { id: string; name: string; images: StoredImage[] };
type StoredBackground = { id: string; name: string; pixelArtId: string };
type StoredAudioTrack = { id: string; name: string; type: AudioTrackType };
type StoredState = {
  version: number;
  characters: StoredCharacter[];
  backgrounds: StoredBackground[];
  audioTracks: StoredAudioTrack[];
  cuts: Cut[];
};

function loadMeta(key: string): StoredState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState> & { version: number };
    if (parsed.version < STORAGE_VERSION) return null;
    return {
      version: STORAGE_VERSION,
      characters: parsed.characters ?? [],
      backgrounds: parsed.backgrounds ?? [],
      audioTracks: parsed.audioTracks ?? [],
      cuts: parsed.cuts ?? [],
    };
  } catch {
    return null;
  }
}

function saveMeta(
  characters: Character[],
  backgrounds: Background[],
  audioTracks: AudioTrack[],
  cuts: Cut[],
  key: string,
) {
  const meta: StoredState = {
    version: STORAGE_VERSION,
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      images: c.images.map((img) => ({
        id: img.id,
        label: img.label,
        pixelArtId: img.pixelArtId,
      })),
    })),
    backgrounds: backgrounds.map((bg) => ({
      id: bg.id,
      name: bg.name,
      pixelArtId: bg.pixelArtId,
    })),
    audioTracks: audioTracks.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    cuts,
  };
  try {
    localStorage.setItem(key, JSON.stringify(meta));
  } catch {}
}

export function useVNStore(slotId: string) {
  const storageKey = `vn-studio-slot-${slotId}`;
  const [initialMeta] = useState(() => loadMeta(storageKey));

  const [characters, setCharacters] = useState<Character[]>(
    () =>
      initialMeta?.characters.map((c) => ({
        ...c,
        images: c.images.map((img) => ({
          ...img,
          imageUrl: resolveImageUrl(img.pixelArtId),
        })),
      })) ?? [],
  );
  const [backgrounds, setBackgrounds] = useState<Background[]>(
    () =>
      initialMeta?.backgrounds.map((bg) => ({
        ...bg,
        imageUrl: resolveImageUrl(bg.pixelArtId),
      })) ?? [],
  );
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(
    () => initialMeta?.audioTracks.map((a) => ({ ...a, audioUrl: "" })) ?? [],
  );
  const [cuts, setCuts] = useState<Cut[]>(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialMeta?.cuts.map((c: any) => ({
        ...c,
        textEffect: c.textEffect ?? ("default" as const),
        bgmId: c.bgmId ?? null,
        sfxId: c.sfxId ?? null,
      })) ?? [blankCut()],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // 오디오만 IndexedDB에서 blob URL을 비동기로 복원한다 — 이미지는 이제
  // pixelArtId를 동기적으로 렌더링하므로 위 useState 초기화에서 이미 끝났다.
  useEffect(() => {
    const audioIds = initialMeta?.audioTracks.map((a) => a.id) ?? [];
    if (audioIds.length === 0) return;
    loadBlobUrls(audioIds).then((urlMap) => {
      setAudioTracks((prev) =>
        prev.map((a) => ({ ...a, audioUrl: urlMap.get(a.id) ?? "" })),
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    saveMeta(characters, backgrounds, audioTracks, cuts, storageKey);
  }, [characters, backgrounds, audioTracks, cuts, storageKey]);

  const addCharacter = useCallback(
    (name: string, images: { label: string; pixelArtId: string }[]) => {
      const newImages = images.map(({ label, pixelArtId }) => ({
        id: uid(),
        label,
        pixelArtId,
        imageUrl: resolveImageUrl(pixelArtId),
      }));
      setCharacters((prev) => [...prev, { id: uid(), name, images: newImages }]);
    },
    [],
  );

  const addCharacterImage = useCallback(
    (charId: string, label: string, pixelArtId: string) => {
      const id = uid();
      const imageUrl = resolveImageUrl(pixelArtId);
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? { ...c, images: [...c.images, { id, label, pixelArtId, imageUrl }] }
            : c,
        ),
      );
    },
    [],
  );

  const removeCharacterImage = useCallback((charId: string, imageId: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId || c.images.length <= 1) return c;
        return { ...c, images: c.images.filter((i) => i.id !== imageId) };
      }),
    );
    setCuts((prev) =>
      prev.map((cut) => {
        if (cut.characterImageIds[charId] !== imageId) return cut;
        const characterImageIds = { ...cut.characterImageIds };
        delete characterImageIds[charId];
        return { ...cut, characterImageIds };
      }),
    );
  }, []);

  const renameCharacter = useCallback((charId: string, name: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, name } : c)),
    );
  }, []);

  const relabelCharacterImage = useCallback(
    (charId: string, imageId: string, label: string) => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? {
                ...c,
                images: c.images.map((img) =>
                  img.id === imageId ? { ...img, label } : img,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  const removeCharacter = useCallback((charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    setCuts((prev) =>
      prev.map((cut) => {
        const characterPositions = { ...cut.characterPositions };
        const characterImageIds = { ...cut.characterImageIds };
        delete characterPositions[charId];
        delete characterImageIds[charId];
        return {
          ...cut,
          visibleCharacterIds: cut.visibleCharacterIds.filter((id) => id !== charId),
          speakerIds: cut.speakerIds.filter((id) => id !== charId),
          characterPositions,
          characterImageIds,
        };
      }),
    );
  }, []);

  const addBackground = useCallback((name: string, pixelArtId: string) => {
    const id = uid();
    const imageUrl = resolveImageUrl(pixelArtId);
    setBackgrounds((prev) => [...prev, { id, name, pixelArtId, imageUrl }]);
  }, []);

  const removeBackground = useCallback((bgId: string) => {
    setBackgrounds((prev) => prev.filter((b) => b.id !== bgId));
    setCuts((prev) =>
      prev.map((cut) => ({
        ...cut,
        backgroundId: cut.backgroundId === bgId ? null : cut.backgroundId,
      })),
    );
  }, []);

  const addAudioTrack = useCallback(
    async (name: string, type: AudioTrackType, file: File) => {
      const id = uid();
      await saveBlob(id, file);
      const audioUrl = URL.createObjectURL(file);
      setAudioTracks((prev) => [...prev, { id, name, type, audioUrl }]);
    },
    [],
  );

  const removeAudioTrack = useCallback((trackId: string) => {
    setAudioTracks((prev) => {
      const track = prev.find((a) => a.id === trackId);
      if (track?.audioUrl) URL.revokeObjectURL(track.audioUrl);
      deleteBlob(trackId);
      return prev.filter((a) => a.id !== trackId);
    });
  }, []);

  const updateCut = useCallback((index: number, patch: Partial<Cut>) => {
    setCuts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const addCutAfter = useCallback(
    (index: number) => {
      const source = cuts[index];
      const next: Cut = {
        id: uid(),
        backgroundId: source.backgroundId,
        visibleCharacterIds: [...source.visibleCharacterIds],
        characterPositions: { ...source.characterPositions },
        characterImageIds: { ...source.characterImageIds },
        speakerIds: [...source.speakerIds],
        textEffect: source.textEffect,
        text: "",
        bgmId: null,
        sfxId: null,
      };
      setCuts((prev) => {
        const arr = [...prev];
        arr.splice(index + 1, 0, next);
        return arr;
      });
      setCurrentIndex(index + 1);
    },
    [cuts],
  );

  const duplicateCut = useCallback(
    (index: number) => {
      const copy: Cut = { ...cuts[index], id: uid() };
      setCuts((prev) => {
        const arr = [...prev];
        arr.splice(index + 1, 0, copy);
        return arr;
      });
      setCurrentIndex(index + 1);
    },
    [cuts],
  );

  const reorderCuts = useCallback((from: number, to: number) => {
    if (from === to) return;
    setCuts((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setCurrentIndex(to);
  }, []);

  const deleteCut = useCallback(
    (index: number) => {
      if (cuts.length <= 1) return;
      setCuts((prev) => prev.filter((_, i) => i !== index));
      setCurrentIndex((i) => Math.min(i, cuts.length - 2));
    },
    [cuts.length],
  );

  return {
    characters,
    backgrounds,
    audioTracks,
    cuts,
    currentIndex,
    setCurrentIndex,
    addCharacter,
    addCharacterImage,
    removeCharacterImage,
    renameCharacter,
    relabelCharacterImage,
    removeCharacter,
    addBackground,
    removeBackground,
    addAudioTrack,
    removeAudioTrack,
    updateCut,
    addCutAfter,
    duplicateCut,
    reorderCuts,
    deleteCut,
  };
}
```

- [ ] **Step 3: `imageStore.ts`에서 더 이상 쓰이지 않는 `deleteBlobs` 제거**

`imageStore.ts` 끝의 `deleteBlobs` 함수(기존 54~63번째 줄)를 통째로 지운다. `deleteBlob`(단수)는 오디오 트랙 삭제에 계속 쓰이므로 그대로 둔다.

```typescript
export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

(`deleteBlob` 다음에 있던 `deleteBlobs` export를 삭제하면 파일이 여기서 끝난다.)

- [ ] **Step 4: `AssetUploader.tsx` 전체 교체**

```tsx
"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";
import ResourcePicker from "./ResourcePicker";
import { AudioTrack, AudioTrackType, Background, Character } from "./types";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  audioTracks: AudioTrack[];
  onAddCharacter: (
    name: string,
    images: { label: string; pixelArtId: string }[],
  ) => void;
  onAddCharacterImage: (charId: string, label: string, pixelArtId: string) => void;
  onRemoveCharacterImage: (charId: string, imageId: string) => void;
  onRenameCharacter: (charId: string, name: string) => void;
  onRelabelCharacterImage: (
    charId: string,
    imageId: string,
    label: string,
  ) => void;
  onRemoveCharacter: (id: string) => void;
  onAddBackground: (name: string, pixelArtId: string) => void;
  onRemoveBackground: (id: string) => void;
  onAddAudioTrack: (name: string, type: AudioTrackType, file: File) => void;
  onRemoveAudioTrack: (id: string) => void;
}

type Tab = "characters" | "backgrounds" | "music";

function InlineInput({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-white outline-none ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`text-left hover:opacity-70 ${className ?? ""}`}
      title="클릭해서 수정"
    >
      {value || "—"}
    </button>
  );
}

function CharacterCard({
  char,
  onAddImage,
  onRemoveImage,
  onRename,
  onRelabel,
  onRemove,
}: {
  char: Character;
  onAddImage: (label: string, pixelArtId: string) => void;
  onRemoveImage: (imageId: string) => void;
  onRename: (name: string) => void;
  onRelabel: (imageId: string, label: string) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <InlineInput
          value={char.name}
          onCommit={onRename}
          className="text-sm font-medium text-white"
        />
        <button
          onClick={onRemove}
          className="text-xs text-gray-600 transition-colors hover:text-red-400"
        >
          삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {char.images.map((img) => (
          <div
            key={img.id}
            className="relative flex flex-col items-center gap-1"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
              {img.imageUrl && (
                <img
                  src={img.imageUrl}
                  alt={img.label}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              {char.images.length > 1 && (
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
            <InlineInput
              value={img.label}
              onCommit={(label) => onRelabel(img.id, label)}
              className="max-w-12 truncate text-center text-xs text-gray-500"
            />
          </div>
        ))}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-gray-600 hover:border-white/30 hover:text-gray-400"
        >
          <span className="text-lg">+</span>
        </button>
      </div>
      <ResourcePicker
        open={pickerOpen}
        kind="character"
        onClose={() => setPickerOpen(false)}
        onSelect={(art) => {
          onAddImage(art.name || "표정", art.id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

type PendingImage = {
  id: string;
  label: string;
  pixelArtId: string;
  previewUrl: string;
};

function CharacterForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, images: { label: string; pixelArtId: string }[]) => void;
}) {
  const [name, setName] = useState(() => `캐릭터${count + 1}`);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (art: PixelArt) => {
    setPending((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        label: art.name || `유형${prev.length + 1}`,
        pixelArtId: art.id,
        previewUrl: pixelArtToDataUrl(art),
      },
    ]);
    setPickerOpen(false);
  };

  const updateLabel = (id: string, label: string) =>
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, label } : p)));

  const removeImage = (id: string) =>
    setPending((prev) => prev.filter((p) => p.id !== id));

  const handleAdd = () => {
    if (!name.trim() || pending.length === 0) return;
    onAdd(
      name.trim(),
      pending.map(({ label, pixelArtId }) => ({ label, pixelArtId })),
    );
    setName(`캐릭터${count + 2}`);
    setPending([]);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <input
        type="text"
        placeholder="캐릭터 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/30"
      />
      <div className="flex flex-wrap gap-2 rounded-xl p-1.5">
        {pending.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <img
                src={p.previewUrl}
                alt=""
                className="h-32 w-14 rounded-lg bg-white/5 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <button
                onClick={() => removeImage(p.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-xs text-gray-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="유형"
              value={p.label}
              onChange={(e) => updateLabel(p.id, e.target.value)}
              className="w-12 rounded-md border border-white/10 bg-white/5 px-1 py-1 text-center text-xs text-white placeholder:text-gray-600 outline-none focus:border-white/30"
            />
          </div>
        ))}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-32 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-gray-600 hover:border-white/30 hover:text-gray-400"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px]">
            {pending.length === 0 ? "이미지" : "추가"}
          </span>
        </button>
      </div>
      <p className="text-xs text-gray-600">권장 비율 2:5</p>

      <button
        onClick={handleAdd}
        disabled={!name.trim() || pending.length === 0}
        className="rounded-lg bg-white/10 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
      >
        등록
      </button>
      <ResourcePicker
        open={pickerOpen}
        kind="character"
        onClose={() => setPickerOpen(false)}
        onSelect={handlePick}
      />
    </div>
  );
}

function BackgroundForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, pixelArtId: string) => void;
}) {
  const [name, setName] = useState(() => `배경${count + 1}`);
  const [picked, setPicked] = useState<{ art: PixelArt; previewUrl: string } | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !picked) return;
    onAdd(name.trim(), picked.art.id);
    setName(`배경${count + 2}`);
    setPicked(null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="배경 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/30 sm:col-start-1 sm:row-start-1"
        />
        <button
          onClick={() => setPickerOpen(true)}
          className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/8 sm:col-span-2 sm:col-start-1 sm:row-start-2"
        >
          {picked ? (
            <img
              src={picked.previewUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 text-center">
              <span className="text-xl opacity-40">🖼️</span>
              <span className="text-xs text-gray-500">클릭해서 리소스 선택</span>
            </div>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600">권장 이미지 비율: 16:9</p>
      <button
        onClick={handleAdd}
        disabled={!name.trim() || !picked}
        className="order-last rounded-lg bg-white/10 py-2 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:order-none sm:col-start-2 sm:row-start-1 sm:self-stretch"
      >
        등록
      </button>
      <ResourcePicker
        open={pickerOpen}
        kind="background"
        onClose={() => setPickerOpen(false)}
        onSelect={(art) => {
          setPicked({ art, previewUrl: pixelArtToDataUrl(art) });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function AudioTrackItem({
  track,
  onRemove,
}: {
  track: AudioTrack;
  onRemove: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!track.audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
        {track.name}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-gray-600 hover:text-red-400"
      >
        삭제
      </button>
    </div>
  );
}

function AudioSection({
  type,
  label,
  tracks,
  count,
  onAdd,
  onRemove,
}: {
  type: AudioTrackType;
  label: string;
  tracks: AudioTrack[];
  count: number;
  onAdd: (name: string, type: AudioTrackType, file: File) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, "") || `${label}${count + 1}`;
    onAdd(name, type, file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          {label}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-400 hover:border-white/30 hover:text-white"
        >
          + 추가
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {tracks.length === 0 ? (
        <p className="text-xs italic text-gray-700">없음</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((t) => (
            <AudioTrackItem
              key={t.id}
              track={t}
              onRemove={() => onRemove(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  characters: "캐릭터",
  backgrounds: "배경",
  music: "사운드",
};

export default function AssetUploader({
  characters,
  backgrounds,
  audioTracks,
  onAddCharacter,
  onAddCharacterImage,
  onRemoveCharacterImage,
  onRenameCharacter,
  onRelabelCharacterImage,
  onRemoveCharacter,
  onAddBackground,
  onRemoveBackground,
  onAddAudioTrack,
  onRemoveAudioTrack,
}: Props) {
  const [tab, setTab] = useState<Tab>("characters");

  const bgm = audioTracks.filter((a) => a.type === "bgm");
  const sfx = audioTracks.filter((a) => a.type === "sfx");

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-white/10">
        {(["characters", "backgrounds", "music"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-white text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "characters" &&
              characters.length > 0 &&
              ` (${characters.length})`}
            {t === "backgrounds" &&
              backgrounds.length > 0 &&
              ` (${backgrounds.length})`}
            {t === "music" &&
              audioTracks.length > 0 &&
              ` (${audioTracks.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 p-4 min-h-0 flex flex-col">
        {tab === "characters" && (
          <>
            <CharacterForm count={characters.length} onAdd={onAddCharacter} />
            <div className="overflow-auto min-h-0 flex flex-col gap-2">
              {characters.map((char) => (
                <CharacterCard
                  key={char.id}
                  char={char}
                  onAddImage={(label, pixelArtId) =>
                    onAddCharacterImage(char.id, label, pixelArtId)
                  }
                  onRemoveImage={(imageId) =>
                    onRemoveCharacterImage(char.id, imageId)
                  }
                  onRename={(name) => onRenameCharacter(char.id, name)}
                  onRelabel={(imageId, label) =>
                    onRelabelCharacterImage(char.id, imageId, label)
                  }
                  onRemove={() => onRemoveCharacter(char.id)}
                />
              ))}
            </div>
          </>
        )}
        {tab === "backgrounds" && (
          <>
            <BackgroundForm
              count={backgrounds.length}
              onAdd={onAddBackground}
            />
            <div className="overflow-auto min-h-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {backgrounds.map((bg) => (
                <div
                  key={bg.id}
                  className="relative flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  {bg.imageUrl && (
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      className="h-16 w-full object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                  <span className="text-xs text-gray-300">{bg.name}</span>
                  <button
                    onClick={() => onRemoveBackground(bg.id)}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-gray-500 hover:bg-red-900/50 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "music" && (
          <div className="overflow-auto min-h-0 flex flex-col gap-6">
            <AudioSection
              type="bgm"
              label="배경음악"
              tracks={bgm}
              count={bgm.length}
              onAdd={onAddAudioTrack}
              onRemove={onRemoveAudioTrack}
            />
            <AudioSection
              type="sfx"
              label="효과음"
              tracks={sfx}
              count={sfx.length}
              onAdd={onAddAudioTrack}
              onRemove={onRemoveAudioTrack}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 6: 브라우저로 리소스 등록 화면 확인**

Run: `npm run dev`

먼저 픽셀아트 메이커(`/pixel-art-maker`)에서 아무 그림이나 하나 그려서 저장해둔다.

1. `/visual-novel-studio`(또는 실제 라우트) 접속 → 새 슬롯 생성 → "리소스 편집" 화면 진입
2. 캐릭터 탭: "이미지" 버튼 클릭 → 모달의 "네모네모빔 리소스" 탭에서 방금 저장한 그림이 보이는지, 클릭하면 미리보기에 추가되는지 확인. "기본 제공" 탭은 빈 상태 문구가 보이는지 확인
3. 캐릭터 이름 입력 후 "등록" → 캐릭터 카드가 리스트에 나타나고 썸네일이 픽셀 그대로(흐려지지 않고) 보이는지 확인
4. 등록된 캐릭터 카드에서 "+" 버튼으로 표정 이미지 추가 → 정상 반영되는지, 라벨을 클릭해 이름을 바꿀 수 있는지 확인
5. 배경 탭: 이름 입력 후 이미지 영역 클릭 → 리소스 선택 → 등록 → 그리드에 썸네일이 뜨는지 확인
6. 사운드 탭이 기존과 동일하게(파일 업로드로) 동작하는지 확인 — 이번 변경의 영향을 받지 않아야 함

- [ ] **Step 7: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/types.ts" "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/useVNStore.ts" "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/imageStore.ts" "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx"
git commit -m "feat: VN 스튜디오 캐릭터·배경 이미지를 파일 업로드 대신 리소스 선택으로 전환"
```

---

## Task 5: 화면 렌더링 — 픽셀 선명도 유지 및 삭제된 리소스 처리

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VNDisplay.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx:246-250`

**Interfaces:**
- Consumes: `CharacterImage.imageUrl`, `Background.imageUrl` (Task 4에서 이미 pixelArtId 기반으로 채워짐 — 이 태스크는 소비하는 쪽 렌더링만 손본다)

**추가 수정 사항 (Task 4 수동 검증 중 발견):** 원래 캐릭터 `<img>`는 `maxHeight`/`maxWidth`(상한선일 뿐 실제 크기 지정이 아님)만 쓰고 `height`를 지정하지 않았다. 업로드된 사진처럼 원본 픽셀 크기가 큰 이미지에서는 문제가 안 됐지만, 픽셀아트는 16×16처럼 원본이 아주 작을 수 있어 이 경우 `<img>`가 확대되지 않고 원본 픽셀 크기 그대로(예: 16×16 CSS px) 렌더링되는 게 실제로 확인됐다(`getBoundingClientRect()`로 측정). 배경은 `h-full w-full`로 크기를 강제해서 문제없었다. 아래 Step 1 코드에서는 `maxHeight`를 `height`로 바꿔 이 문제를 해결한다(`maxWidth`는 그대로 유지 — 가로세로 비율이 이상한 이미지가 캐릭터로 쓰였을 때 폭이 과도하게 넓어지지 않도록 하는 안전장치).

**추가 수정 사항 2 (Task 5 실제 구현 중 발견 — 위 `height` 변경만으로는 부족했다):** `height: 88%` 같은 퍼센트 높이는 부모(containing block)가 확정된 높이를 가질 때만 계산된다. 캐릭터 `<img>`의 부모인 "side" div(아래 코드의 `flex flex-1 items-end ...`)는 그 위 "Characters" 행 div가 `items-end`이기 때문에 stretch되지 않고 자기 콘텐츠 크기만큼만(auto) 높이를 갖는다 — 즉 부모 높이가 미확정 상태라 `height: 88%`가 다시 `auto` 취급되어 무시되고, 결국 `<img>`가 원본 픽셀 크기 그대로 렌더링된다("삭제된 리소스" 플레이스홀더도 부모를 공유하므로 동일 문제). 해결책은 side div에 `self-stretch`를 추가해 그 자신을 "Characters" 행(이미 `aspect-video` 부모 아래 `flex-1`로 확정 높이를 가짐)의 전체 높이로 채우는 것이다 — `self-stretch`는 개별 flex 아이템에서 부모의 `items-end`를 오버라이드하므로, side div 자신은 꽉 채워지면서도 side div의 `items-end`는 그대로 남아 그 안의 캐릭터 이미지를 바닥에 붙여 정렬한다. 이렇게 하면 `height: 88%`가 확정된 부모를 갖게 되어 실제로 계산되고, 캐릭터가 원본 이미지 크기와 무관하게 항상 배율껏(88%/75%) 표시된다.

- [ ] **Step 1: `VNDisplay.tsx` 전체 교체**

```tsx
"use client";

import { Background, Character, Cut } from "./types";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  cut: Cut;
  compact?: boolean;
  displayedText?: string;
  showNextIndicator?: boolean;
}

export default function VNDisplay({
  characters,
  backgrounds,
  cut,
  compact,
  displayedText,
  showNextIndicator,
}: Props) {
  const bg = backgrounds.find((b) => b.id === cut.backgroundId);
  const visibleChars = characters.filter((c) =>
    cut.visibleCharacterIds.includes(c.id),
  );

  const getCharImage = (charId: string) => {
    const char = characters.find((c) => c.id === charId)!;
    const selectedId = cut.characterImageIds?.[charId];
    return (
      (selectedId ? char.images.find((img) => img.id === selectedId) : null) ??
      char.images[0]
    );
  };
  const isNarrator = cut.speakerIds.includes("narrator");
  const speakerNames = isNarrator
    ? null
    : characters
        .filter((c) => cut.speakerIds.includes(c.id))
        .map((c) => c.name)
        .join(" & ") || null;
  const hasText = cut.text.trim().length > 0;

  return (
    <div className="relative flex w-full aspect-video flex-col overflow-hidden bg-gray-900">
      {/* Background */}
      {bg ? (
        bg.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg.imageUrl}
            alt={bg.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-white/10 bg-gray-900">
            <span className="text-xs text-white/20">삭제된 리소스</span>
          </div>
        )
      ) : (
        <div className="absolute inset-0 bg-linear-to-b from-gray-800 to-gray-950" />
      )}

      {/* Characters */}
      <div className="relative flex flex-1 items-end px-2 pb-2">
        {visibleChars.length === 0 && !bg && (
          <span className="mb-8 w-full text-center text-xs text-white/20">
            캐릭터 없음
          </span>
        )}
        {(["left", "right"] as const).map((side) => {
          const sideChars = visibleChars.filter(
            (c) => (cut.characterPositions?.[c.id] ?? "left") === side,
          );
          const overlapML = compact ? "-54%" : "-63%";
          return (
            <div
              key={side}
              className={`flex flex-1 self-stretch items-end ${side === "left" ? "justify-start" : "justify-end"}`}
            >
              {sideChars.map((char, idx) => {
                const isSpeaker = cut.speakerIds.includes(char.id);
                const hasSpeakers = cut.speakerIds.length > 0;
                const dimmed = isNarrator || (hasSpeakers && !isSpeaker);
                const imageUrl = getCharImage(char.id).imageUrl;
                return imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={char.id}
                    src={imageUrl}
                    alt={char.name}
                    className="object-contain transition-opacity duration-300"
                    style={{
                      height: compact ? "75%" : "88%",
                      maxWidth: compact ? "67.5%" : "79%",
                      opacity: dimmed ? 0.35 : 1,
                      marginLeft: idx === 0 ? 0 : overlapML,
                      zIndex: idx,
                      imageRendering: "pixelated",
                    }}
                  />
                ) : (
                  <div
                    key={char.id}
                    className="flex items-center justify-center border border-dashed border-white/10 text-center text-[9px] text-white/20"
                    style={{
                      height: compact ? "75%" : "88%",
                      width: compact ? "40%" : "45%",
                      opacity: dimmed ? 0.35 : 1,
                      marginLeft: idx === 0 ? 0 : overlapML,
                      zIndex: idx,
                    }}
                  >
                    삭제된 리소스
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Text box — absolute, hidden when no speaker */}
      {cut.speakerIds.length > 0 && (
        <div className="absolute bottom-0 inset-x-0 z-10 p-1 sm:px-3 sm:pb-3">
          {speakerNames && (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-t-lg bg-black/60 px-2 py-1 sm:px-3.5 sm:py-1.5 text-[9px] sm:text-sm font-bold tracking-wide text-white border border-white/20 ring-1 ring-inset ring-white/5 rounded-b-none">
                {speakerNames}
              </span>
            </div>
          )}
          <div
            className={`relative flex h-15 sm:h-24 flex-col justify-start rounded-lg sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-3 backdrop-blur-md ${
              isNarrator
                ? "border border-white/10 bg-gray-900/60"
                : "border border-white/20 bg-black/60 shadow-xl ring-1 ring-inset ring-white/5 rounded-tl-none"
            }`}
          >
            {(() => {
              const raw = displayedText ?? (hasText ? cut.text : "");
              const effect = cut.textEffect ?? "default";
              const content = effect === "whisper" && raw ? `(${raw})` : raw;
              return (
                <p className={`line-clamp-3 ${
                  effect === "whisper"
                    ? "leading-relaxed text-[7px] sm:text-[11px] italic text-gray-400/70"
                    : effect === "shout"
                      ? "leading-tight text-[14px] sm:text-[30px] font-black tracking-wide text-white"
                      : `leading-relaxed text-[9px] sm:text-sm ${isNarrator ? "italic text-gray-400" : "text-white"}`
                }`}>
                  {content || <span className="text-white/20">...</span>}
                </p>
              );
            })()}
            {showNextIndicator && (
              <span className="absolute bottom-1.5 right-3 animate-bounce text-white/40 text-[8px] sm:text-xs">▼</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `EditorScreen.tsx`의 배경 선택 썸네일에 픽셀 스타일 추가**

`EditorScreen.tsx`의 배경 선택 버튼 안에 있는 다음 블록을 찾는다(246~250번째 줄):

```tsx
                <img
                  src={bg.imageUrl}
                  alt={bg.name}
                  className="h-4 w-4 rounded object-cover"
                />
```

아래 내용으로 교체한다(`style` 속성 한 줄 추가):

```tsx
                <img
                  src={bg.imageUrl}
                  alt={bg.name}
                  className="h-4 w-4 rounded object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 4: 브라우저로 전체 플로우 통합 검증**

Run: `npm run dev`

Task 4에서 만든 캐릭터/배경이 있는 슬롯을 이어서 사용한다.

1. 편집 화면에서 배경/캐릭터를 컷에 배정 → 상단 미리보기(`VNDisplay`, compact)에 픽셀 그대로(흐려지지 않고) 표시되는지 확인
2. "플레이" 진입 → 큰 화면에서도 동일하게 선명하게 보이는지, 좌/우 배치·발화자 강조(밝기)가 정상 동작하는지 확인
3. 캐릭터에 표정 이미지가 2개 이상이면 편집 화면의 표정 드롭다운으로 바꿔가며 플레이 화면에 반영되는지 확인
4. 픽셀아트 메이커로 돌아가 방금 VN 스튜디오에서 쓴 그림을 삭제 → VN 스튜디오로 돌아와 해당 캐릭터/배경이 있던 컷을 열어보면 "삭제된 리소스" 플레이스홀더가 뜨고 화면이 깨지지 않는지 확인
5. 새로고침 후 편집 중이던 슬롯에 캐릭터/배경이 정상적으로 남아있는지(즉, 이번 세션에서 만든 데이터가 STORAGE_VERSION 5로 정상 저장/복원되는지) 확인

- [ ] **Step 5: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VNDisplay.tsx" "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx"
git commit -m "feat: VN 스튜디오 화면에 픽셀아트 선명도 유지 및 삭제된 리소스 표시 추가"
```

---

## 남은 작업 (이 플랜 범위 밖)

- `_shared/builtinAssets.ts`의 `BUILTIN_CHARACTER_IMAGES`/`BUILTIN_BACKGROUNDS` 실제 콘텐츠 채우기 — 네모네모빔에서 대표 캐릭터/배경을 만들어 JSON으로 내보낸 뒤 리터럴로 붙여넣는 작업(사람이 직접 그림을 그려야 하므로 별도 진행)
- 오디오(BGM/SFX)를 공유 자산 라이브러리로 옮기는 작업 — 비트 음악 메이커가 아직 없어 범위 밖 (`docs/superpowers/specs/2026-07-10-vn-asset-ecosystem-design.md` 빌드 순서 2번)
- 리소스 선택 모달의 검색/필터, 정렬 등 UX 고도화
