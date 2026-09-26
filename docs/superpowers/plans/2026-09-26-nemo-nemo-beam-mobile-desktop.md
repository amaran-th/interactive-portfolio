# 네모네모빔 모바일 바탕화면(갤러리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 폭(< 820px)에서 바탕화면(갤러리) 화면이 PC용 배경화면과 별개인 모바일용 배경화면을 열어 보여주고, 아이콘이 4열 격자에 자동 정렬되며(드래그로 순서 변경 가능), 흰 둥근 카드+그림자 모양이 되게 한다.

**Architecture:** `wallpaper.ts`에 데스크톱용과 나란한 모바일용 저장소를 추가하고, `Desktop.tsx`가 이미 갖고 있는 폭 감지를 `isMobile` state로 뽑아 (1) 배경화면 아이콘이 여는/보여주는 문서를 그 값으로 고르고, (2) 아이콘 배치를 자유 좌표(`positions`) 대신 순서 배열 기반 격자로 바꾸고, (3) 아이콘 그래픽을 흰 카드로 감싼다. `GRID_STEP`을 `useDesktopLayout.ts`에서 `iconMetrics.ts`로 옮겨 모바일 배율 계산과 공유한다. `Editor.tsx`는 두 배경화면 문서 중 어느 쪽을 열고 저장할지 `doc.id`로 판정하도록 넓힌다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4 (기존 스택 그대로, 새 의존성 없음).

**Spec:** `docs/superpowers/specs/2026-09-26-nemo-nemo-beam-mobile-desktop-design.md`

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 각 태스크는 `npx tsc --noEmit -p apps/services/tsconfig.json`, `npm run lint --workspace services`, 브라우저 수동 확인(DevTools 기기 에뮬레이션 390px, 데스크톱 회귀는 1280px)으로 검증한다. 전부 리포 루트(`/Users/seyeon/Documents/github_projects/interactive-portfolio`)에서 실행한다.
- 대상 앱: `apps/services/components/works/5_PixelArtMaker/`, dev 서버는 `npm run dev:services`(포트 3100), 접근 경로 `http://localhost:3100/nemo-nemo-beam`.
- desktop 폭(≥ 820px, `NARROW_BREAKPOINT`)에서 바탕화면의 동작·레이아웃은 이 작업 전체에서 **한 픽셀도 바뀌면 안 된다** — `isMobile`이 `false`일 때 지금과 100% 동일해야 한다.
- 커밋 메시지는 한국어, 이 리포의 기존 스타일(`feat : ...`, `refactor : ...` 등 접두사 + 한국어 설명)을 따른다.
- 파일 경로/줄 번호는 이 계획을 쓴 시점 기준이다 — 실제 줄이 어긋나 있으면 주변 코드(인용된 텍스트)로 정확한 위치를 다시 찾는다.

---

## Task 1: 배경화면을 PC용/모바일용으로 분리

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/wallpaper.ts`
- Modify: `apps/services/components/works/5_PixelArtMaker/Desktop.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: 없음.
- Produces: `export const WALLPAPER_ID_MOBILE = "__wallpaper_mobile__"`, `export function getMobileWallpaper(): PixelArt`, `export function saveMobileWallpaper(art: PixelArt): SaveResult`, `export function resetMobileWallpaper(): void` — 이후 태스크는 이 파일을 더 건드리지 않는다.

- [ ] **Step 1: `wallpaper.ts`에 모바일용 저장소 추가**

`export const WALLPAPER_NAME = "배경화면";` 바로 아래에 추가:

```ts
export const WALLPAPER_ID_MOBILE = "__wallpaper_mobile__";
```

`const WALLPAPER_HEIGHT = 18;` 바로 아래(기존 `WALLPAPER_WIDTH`/`WALLPAPER_HEIGHT` 선언 다음)에 추가:

```ts
// 모바일용 배경화면 규격 — 세로(9:16에 가까운 비율)로, 데스크톱용과 완전히
// 별개의 파일이다.
const WALLPAPER_MOBILE_WIDTH = 18;
const WALLPAPER_MOBILE_HEIGHT = 32;
```

`function defaultWallpaper(): PixelArt { ... }` 함수 바로 아래에 그 짝을 추가한다 — 그림 없이 데스크톱 기본값과 같은 하늘색(`#cbedff`) 단색으로 채운다:

```ts
function defaultMobileWallpaper(): PixelArt {
  return {
    id: WALLPAPER_ID_MOBILE,
    name: WALLPAPER_NAME,
    width: WALLPAPER_MOBILE_WIDTH,
    height: WALLPAPER_MOBILE_HEIGHT,
    palette: [],
    pixels: new Array<string | null>(
      WALLPAPER_MOBILE_WIDTH * WALLPAPER_MOBILE_HEIGHT,
    ).fill("#cbedff"),
    createdAt: Date.now(),
  };
}
```

- [ ] **Step 2: `getWallpaper`/`saveWallpaper`/`resetWallpaper`를 변형별 헬퍼로 재구성**

지금의 `export function getWallpaper(): PixelArt { ... }`, `export function saveWallpaper(art: PixelArt): SaveResult { ... }`, `export function resetWallpaper(): void { ... }`는 각각 `WALLPAPER_KEY`/`WALLPAPER_ID`/`WALLPAPER_NAME`/`defaultWallpaper`에 고정돼 있다. 이 세 함수의 본문을 각각 `key`/`id`/`buildDefault` 세 값을 받는 내부 헬퍼로 옮기고, 지금 이름은 그 헬퍼를 desktop 상수로 호출하는 얇은 래퍼로 남긴 뒤, 모바일용도 같은 헬퍼로 만든다:

```ts
function getWallpaperFor(
  key: string,
  id: string,
  buildDefault: () => PixelArt,
): PixelArt {
  if (typeof window === "undefined") return buildDefault();
  try {
    const raw = localStorage.getItem(key);
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
  const fresh = buildDefault();
  saveWallpaperFor(key, id, fresh);
  return fresh;
}

function saveWallpaperFor(key: string, id: string, art: PixelArt): SaveResult {
  const locked: PixelArt = { ...art, id, name: WALLPAPER_NAME };
  try {
    localStorage.setItem(key, JSON.stringify(encodeStored(locked)));
    return "ok";
  } catch (e) {
    return isQuotaExceededError(e) ? "quota" : "error";
  }
}

function resetWallpaperFor(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function getWallpaper(): PixelArt {
  return getWallpaperFor(WALLPAPER_KEY, WALLPAPER_ID, defaultWallpaper);
}

export function saveWallpaper(art: PixelArt): SaveResult {
  return saveWallpaperFor(WALLPAPER_KEY, WALLPAPER_ID, art);
}

export function resetWallpaper(): void {
  resetWallpaperFor(WALLPAPER_KEY);
}

const WALLPAPER_MOBILE_KEY = "pixel-art-desktop-wallpaper-mobile";

export function getMobileWallpaper(): PixelArt {
  return getWallpaperFor(
    WALLPAPER_MOBILE_KEY,
    WALLPAPER_ID_MOBILE,
    defaultMobileWallpaper,
  );
}

export function saveMobileWallpaper(art: PixelArt): SaveResult {
  return saveWallpaperFor(WALLPAPER_MOBILE_KEY, WALLPAPER_ID_MOBILE, art);
}

export function resetMobileWallpaper(): void {
  resetWallpaperFor(WALLPAPER_MOBILE_KEY);
}
```

기존 세 함수(`getWallpaper`/`saveWallpaper`/`resetWallpaper`)와 세 타입(`StoredWallpaperV3`/`StoredWallpaperV2`/`StoredWallpaperV1`)의 원래 본문을 지우고 위 내용으로 통째로 바꾼다 — 외부에서 보이는 이름·시그니처(`getWallpaper(): PixelArt`, `saveWallpaper(art): SaveResult`, `resetWallpaper(): void`)는 그대로다.

- [ ] **Step 2 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
```

- [ ] **Step 3: `Desktop.tsx` — 모바일용 배경화면 state와 폭 판정 추가**

`import { getWallpaper, resetWallpaper, WALLPAPER_ID } from "./wallpaper";`(42행 근처)를 아래로 바꾼다:

```tsx
import {
  getMobileWallpaper,
  getWallpaper,
  resetWallpaper,
  saveMobileWallpaper,
  WALLPAPER_ID,
  WALLPAPER_ID_MOBILE,
} from "./wallpaper";
```

(`saveMobileWallpaper`는 이 태스크에서 직접 쓰진 않지만, import 정리 관례상 `resetWallpaper`처럼 모듈에서 쓰는 이름은 명시적으로 가져온다 — 실제로 쓰지 않는다면 이 줄에서 빼도 무방하다. 반드시 필요한 것은 `getMobileWallpaper`/`WALLPAPER_ID_MOBILE`이다.)

`const [wallpaper, setWallpaper] = useState<PixelArt>(() => getWallpaper());`(101행 근처) 바로 아래에 추가:

```tsx
  const [mobileWallpaper, setMobileWallpaper] = useState<PixelArt>(() =>
    getMobileWallpaper(),
  );
```

`refresh` 콜백 안의 `setWallpaper(getWallpaper());`(167행 근처) 바로 아래에 추가:

```tsx
    setMobileWallpaper(getMobileWallpaper());
```

폭 감지 `useEffect`(133행 근처, `const compute = () => { const rect = ...`) 안의 `if (rect.width < NARROW_BREAKPOINT) {` 블록 시작에 `isMobile` state를 채우는 줄을 추가한다. 지금:

```tsx
    const compute = () => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width < NARROW_BREAKPOINT) {
        setFittedSize({ width: rect.width, height: rect.height });
        onFittedSizeChange?.({ width: rect.width, height: rect.height });
        return;
      }
```

이렇게 바꾼다:

```tsx
    const compute = () => {
      const rect = wrapper.getBoundingClientRect();
      setIsMobile(rect.width < NARROW_BREAKPOINT);
      if (rect.width < NARROW_BREAKPOINT) {
        setFittedSize({ width: rect.width, height: rect.height });
        onFittedSizeChange?.({ width: rect.width, height: rect.height });
        return;
      }
```

같은 `useEffect` 바로 위(`const [fittedSize, setFittedSize] = useState<...>(null);` 다음 줄, 121행 근처)에 state 선언을 추가한다:

```tsx
  const [isMobile, setIsMobile] = useState(false);
```

- [ ] **Step 4: "배경화면" 아이콘이 폭에 맞는 문서를 열고 보여주게 하기**

`<WallpaperBackground art={wallpaper} />`(455행 근처)를 아래로 바꾼다:

```tsx
        <WallpaperBackground art={isMobile ? mobileWallpaper : wallpaper} />
```

`<WallpaperIcon art={wallpaper} />`(589행 근처)를 아래로 바꾼다:

```tsx
              <WallpaperIcon art={isMobile ? mobileWallpaper : wallpaper} />
```

`onDoubleClick={() => onOpen(WALLPAPER_ID)}`(579행 근처, "배경화면" 아이콘 div 안)를 아래로 바꾼다:

```tsx
          onDoubleClick={() =>
            onOpen(isMobile ? WALLPAPER_ID_MOBILE : WALLPAPER_ID)
          }
```

(아이콘 자신의 위치·드래그 식별자는 그대로 `WALLPAPER_ID`를 쓴다 — `startIconDrag(WALLPAPER_ID, e)`, `positions[WALLPAPER_ID]`, `defaultSpecialCorner`의 `WALLPAPER_ID` 분기는 이 스텝에서 손대지 않는다.)

- [ ] **Step 5: `Editor.tsx` — 두 변형 모두 열고 저장할 수 있게 판정 넓히기**

`"./wallpaper"` import 블록(128-133행 근처)의

```tsx
import {
  getWallpaper,
  saveWallpaper,
  WALLPAPER_ID,
  WALLPAPER_NAME,
} from "./wallpaper";
```

을 아래로 바꾼다:

```tsx
import {
  getMobileWallpaper,
  getWallpaper,
  saveMobileWallpaper,
  saveWallpaper,
  WALLPAPER_ID,
  WALLPAPER_ID_MOBILE,
  WALLPAPER_NAME,
} from "./wallpaper";
```

`function resolveInitialDoc(docId: string | null): {...}`의 `if (docId === WALLPAPER_ID) return { doc: getWallpaper(), found: true };`(282행 근처) 바로 아래에 추가:

```tsx
  if (docId === WALLPAPER_ID_MOBILE)
    return { doc: getMobileWallpaper(), found: true };
```

`const isWallpaper = doc.id === WALLPAPER_ID;`(870행 근처)를 아래로 바꾼다:

```tsx
  const isWallpaper =
    doc.id === WALLPAPER_ID || doc.id === WALLPAPER_ID_MOBILE;
```

(이후 `isWallpaper`를 쓰는 모든 자리 — 파일명 표시·readOnly 처리 등 — 는 변경 없이 그대로 동작한다, 두 변형 모두 "배경화면"이라는 같은 이름을 쓰므로.)

`handleSave` 안의 `const ok = isWallpaper ? saveWallpaper(toSave) : savePixelArt(toSave);`(2036행 근처)를 아래로 바꾼다:

```tsx
    const ok =
      doc.id === WALLPAPER_ID_MOBILE
        ? saveMobileWallpaper(toSave)
        : isWallpaper
          ? saveWallpaper(toSave)
          : savePixelArt(toSave);
```

`saveTabSnapshot` 안의 두 줄(2220행, 2224행 근처):

```tsx
      const isWp = tab.doc.id === WALLPAPER_ID;
      const toSave: PixelArt = isWp
        ? { ...tab.doc, name: WALLPAPER_NAME }
        : tab.doc;
      const ok = isWp ? saveWallpaper(toSave) : savePixelArt(toSave);
```

를 아래로 바꾼다:

```tsx
      const isWp =
        tab.doc.id === WALLPAPER_ID || tab.doc.id === WALLPAPER_ID_MOBILE;
      const toSave: PixelArt = isWp
        ? { ...tab.doc, name: WALLPAPER_NAME }
        : tab.doc;
      const ok =
        tab.doc.id === WALLPAPER_ID_MOBILE
          ? saveMobileWallpaper(toSave)
          : isWp
            ? saveWallpaper(toSave)
            : savePixelArt(toSave);
```

- [ ] **Step 6: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

둘 다 0 errors여야 한다(기존 8개 경고는 무관, 그대로 있어도 된다).

- [ ] **Step 7: 브라우저 확인**

`npm run dev:services` 후 `http://localhost:3100/nemo-nemo-beam`:

1. 1280px 폭에서 "배경화면" 아이콘을 더블클릭 → 기존 32×18 그림(구름·산·캐릭터)이 열리는지. 아무거나 살짝 고쳐 저장 → 창을 닫았다 다시 열어도 그 변경이 남아있는지.
2. DevTools로 390px 폭으로 좁힌 뒤(또는 새로고침 후 좁은 폭으로 진입) "배경화면" 아이콘을 더블클릭 → 18×32 세로 캔버스, 하늘색(`#cbedff`) 단색으로 열리는지(구름·산 그림이 아님). 색을 하나 칠하고 저장 → 다시 열어도 남아있는지, 그리고 갤러리 화면 전체 배경(`WallpaperBackground`)에도 그 칠한 색이 반영되는지.
3. 모바일 폭에서 그린 내용이 1280px로 늘렸을 때 데스크톱용 배경화면(32×18)에는 영향을 주지 않는지(완전히 별개 파일인지) 확인.

- [ ] **Step 8: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/wallpaper.ts apps/services/components/works/5_PixelArtMaker/Desktop.tsx apps/services/components/works/5_PixelArtMaker/Editor.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 배경화면을 PC용/모바일용으로 분리

wallpaper.ts에 모바일용 저장소(18×32, 하늘색 단색 기본값)를 추가하고,
"배경화면" 아이콘 하나가 현재 창 폭에 맞는 쪽을 열고 보여주도록 했다.
Editor.tsx는 두 변형 모두 배경화면으로 인식·저장한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 2: 모바일 4열 격자 자동 정렬(기반 + 렌더링)

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/iconMetrics.ts`
- Modify: `apps/services/components/works/5_PixelArtMaker/useDesktopLayout.ts`
- Modify: `apps/services/components/works/5_PixelArtMaker/Desktop.tsx`

**Interfaces:**
- Consumes: Task 1의 `isMobile` state(Desktop.tsx에 이미 있음).
- Produces: `iconMetrics.ts`의 `export const GRID_STEP = 96`, `export const MOBILE_COLUMNS = 4`, `export function getMobileIconScale(containerWidth: number): number`. `useDesktopLayout.ts`의 `export function getMobileOrder(): string[]`, `export function setMobileOrder(ids: string[]): void`. Desktop.tsx의 `isMobile`·`mobileOrder`·`effectivePositions`·`effectiveScale` — Task 3(드래그 순서 변경)과 Task 4(아이콘 카드 스타일)가 이 값들을 그대로 쓴다.

- [ ] **Step 1: `GRID_STEP`을 `iconMetrics.ts`로 옮기고 모바일 배율 함수 추가**

`iconMetrics.ts`의 `export const ICON_CORNER_MARGIN = 16;` 바로 아래에 추가:

```ts
// 아이콘 격자 한 칸의 기준(배율 1.0) 크기 — px. useDesktopLayout.ts(자유
// 배치 스냅)와 모바일 격자 배치가 공유한다.
export const GRID_STEP = 96;

// 모바일 격자의 고정 열 수 — 실제 폰 홈스크린 관례에 맞춘 값.
export const MOBILE_COLUMNS = 4;

// 컨테이너 실제 폭(화면 px)을 4등분한 칸 하나가 GRID_STEP(기준 좌표계 칸
// 크기)이 되게 하는 배율 — desktop의 getIconScale과 같은 자리(기준 좌표
// × 배율 = 화면 좌표)에서 쓰인다.
export function getMobileIconScale(containerWidth: number): number {
  if (!containerWidth) return 1;
  return containerWidth / (MOBILE_COLUMNS * GRID_STEP);
}
```

- [ ] **Step 2: `useDesktopLayout.ts`가 `GRID_STEP`을 import하도록 바꾸고 모바일 순서 저장소 추가**

파일 맨 위의

```ts
const LAYOUT_KEY = "pixel-art-desktop-layout";
// 여기서 다루는 좌표는 전부 "기준(배율 1.0)" 좌표다 — 화면에 그릴 때 Desktop이
// getIconScale로 구한 배율을 곱한다. 저장된 값도 기준 좌표이므로, 창 크기가
// 달라져도(배율이 달라져도) 배치가 통째로 확대·축소될 뿐 서로 어긋나지 않는다.
const GRID_STEP = 96;
```

을 아래로 바꾼다(로컬 상수 선언을 지우고 `iconMetrics.ts`에서 import):

```ts
import { GRID_STEP } from "./iconMetrics";

const LAYOUT_KEY = "pixel-art-desktop-layout";
// 여기서 다루는 좌표는 전부 "기준(배율 1.0)" 좌표다 — 화면에 그릴 때 Desktop이
// getIconScale로 구한 배율을 곱한다. 저장된 값도 기준 좌표이므로, 창 크기가
// 달라져도(배율이 달라져도) 배치가 통째로 확대·축소될 뿐 서로 어긋나지 않는다.
```

파일 끝(`export function resetDesktopLayout(): void { ... }` 다음)에 모바일 순서 저장소를 추가한다:

```ts
// 모바일 격자는 좌표 대신 "순서"만 저장한다 — 격자 칸 위치는 이 배열의
// 인덱스에서 계산되므로 x/y를 따로 둘 필요가 없다.
const MOBILE_ORDER_KEY = "pixel-art-desktop-order-mobile";

export function getMobileOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MOBILE_ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setMobileOrder(ids: string[]): void {
  try {
    localStorage.setItem(MOBILE_ORDER_KEY, JSON.stringify(ids));
  } catch {}
}
```

- [ ] **Step 2 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
```

`GRID_STEP`을 쓰던 `cellKey`/`getIconPosition`/`setIconPosition`/`cleanUpLayout`(이 파일 안)은 import된 이름을 그대로 참조하므로 수정 없이 통과해야 한다.

- [ ] **Step 3: `Desktop.tsx` — import 정리 + 모바일 순서·격자 좌표 계산**

`import { getIconScale, ICON_BOX, ICON_GAP, ICON_PADDING } from "./iconMetrics";`(36-41행 근처)를 아래로 바꾼다:

```tsx
import {
  getIconScale,
  getMobileIconScale,
  GRID_STEP,
  ICON_BOX,
  ICON_GAP,
  ICON_PADDING,
  MOBILE_COLUMNS,
} from "./iconMetrics";
```

`import { cleanUpLayout, getIconPosition, getStoredPosition, removeIconPositions, resetDesktopLayout, setIconPosition, setIconPositions } from "./useDesktopLayout";`(27-35행 근처)를 아래로 바꾼다:

```tsx
import {
  cleanUpLayout,
  getIconPosition,
  getMobileOrder,
  getStoredPosition,
  removeIconPositions,
  resetDesktopLayout,
  setIconPosition,
  setIconPositions,
  setMobileOrder,
} from "./useDesktopLayout";
```

`const scale = getIconScale(fittedSize?.width);`(162행 근처) 바로 아래에 모바일 순서·좌표 계산을 추가한다:

```tsx
  // 모바일 격자 순서 — 저장된 순서 중 지금도 존재하는 id만 먼저 그 순서로
  // 쓰고, 저장된 적 없는 새 id(새 파일 등)는 기본 순서 그대로 뒤에 붙인다.
  // 삭제된 파일은 defaultMobileOrder에 없으므로 자동으로 걸러진다.
  const defaultMobileOrder = [
    LAUNCHER_ID,
    ...items.map((a) => a.id),
    WALLPAPER_ID,
    FORMAT_ID,
    TRASH_ID,
  ];
  const storedMobileOrder = getMobileOrder();
  const mobileOrder = [
    ...storedMobileOrder.filter((id) => defaultMobileOrder.includes(id)),
    ...defaultMobileOrder.filter((id) => !storedMobileOrder.includes(id)),
  ];
  const mobileScale = getMobileIconScale(fittedSize?.width ?? 0);
  const mobilePositions: Record<string, { x: number; y: number }> = {};
  mobileOrder.forEach((id, i) => {
    const col = i % MOBILE_COLUMNS;
    const row = Math.floor(i / MOBILE_COLUMNS);
    mobilePositions[id] = { x: col * GRID_STEP, y: row * GRID_STEP };
  });
  const effectivePositions = isMobile ? mobilePositions : positions;
  const effectiveScale = isMobile ? mobileScale : scale;
```

- [ ] **Step 4: 렌더링에서 `positions`/`scale` 대신 `effectivePositions`/`effectiveScale` 쓰기**

`items.map`으로 `<DesktopIcon>`을 그리는 블록(457행 근처)의

```tsx
        {items.map((art) => {
          const p = positions[art.id];
          if (!p) return null;
          return (
            <DesktopIcon
              key={art.id}
              art={art}
              x={p.x}
              y={p.y}
              scale={scale}
```

를 아래로 바꾼다(그 외 props는 그대로):

```tsx
        {items.map((art) => {
          const p = effectivePositions[art.id];
          if (!p) return null;
          return (
            <DesktopIcon
              key={art.id}
              art={art}
              x={p.x}
              y={p.y}
              scale={effectiveScale}
```

특수 아이콘 4개(휴지통 535행/포맷 559행/배경화면 577행/편집기 595행 근처)의 각 `className={...positions[ID] ? ... }` 와 `style={specialIconStyle(ID)}`를 아래처럼 바꾼다 — 넷 다 같은 패턴이므로 `TRASH_ID`를 예로 든다:

```tsx
          className={`absolute flex flex-col items-center ${effectivePositions[TRASH_ID] ? "" : "bottom-4 right-4"}`}
          style={
            isMobile
              ? {
                  left: effectivePositions[TRASH_ID].x * effectiveScale,
                  top: effectivePositions[TRASH_ID].y * effectiveScale,
                  width: ICON_BOX * effectiveScale,
                  padding: ICON_PADDING * effectiveScale,
                  gap: ICON_GAP * effectiveScale,
                }
              : specialIconStyle(TRASH_ID)
          }
```

(포맷·배경화면·편집기도 각자의 `ID`로 동일하게 바꾼다. `isMobile`일 때는 `effectivePositions[ID]`가 항상 값을 갖는다 — `mobileOrder`가 `LAUNCHER_ID`/`WALLPAPER_ID`/`FORMAT_ID`/`TRASH_ID` 넷을 전부 포함하므로. `specialIconStyle`은 desktop 전용으로 그대로 남긴다 — 모바일 분기는 그 함수를 타지 않는다.)

- [ ] **Step 5: 모바일에서 박스 선택 끄기**

`onPointerDown={startBoxSelect}`(442행 근처, 컨테이너 div)를 아래로 바꾼다:

```tsx
        onPointerDown={isMobile ? undefined : startBoxSelect}
```

- [ ] **Step 6: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

- [ ] **Step 7: 브라우저 확인**

`http://localhost:3100/nemo-nemo-beam`, 390px 폭:

1. 편집기·기존 파일들·배경화면·포맷·휴지통이 4열 격자로 순서대로(편집기 먼저, 그다음 파일들, 그다음 배경화면·포맷·휴지통) 배치되는지, 서로 겹치지 않는지.
2. 새 파일을 만들면 격자 끝(특수 아이콘들 앞)에 추가되는지, 파일을 삭제하면 격자에서 빠지고 나머지가 당겨지는지.
3. 빈 영역을 드래그해도(박스 선택) 아무 일도 일어나지 않는지.

1280px 폭에서 기존 자유 드래그 배치·박스 선택이 지금과 동일하게 동작하는지(회귀 없음) 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/iconMetrics.ts apps/services/components/works/5_PixelArtMaker/useDesktopLayout.ts apps/services/components/works/5_PixelArtMaker/Desktop.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 모바일 바탕화면 4열 격자 자동 정렬

GRID_STEP을 iconMetrics.ts로 옮겨 모바일 배율 계산과 공유하고, 모바일
폭에서는 자유 좌표 대신 순서 배열 기반 4열 격자로 아이콘을 배치한다.
데스크톱은 기존 자유 배치 그대로.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 3: 드래그로 격자 순서 변경

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/Desktop.tsx`

**Interfaces:**
- Consumes: Task 2의 `isMobile`/`mobileOrder`/`effectiveScale`/`GRID_STEP`/`MOBILE_COLUMNS`/`setMobileOrder`.
- Produces: 없음(이 계획의 마지막 소비자는 없음 — Task 4는 이 태스크의 산출물에 의존하지 않는다).

- [ ] **Step 1: 드래그 상태와 모바일 전용 드래그 핸들러 추가**

`const draggingSpecialRef = useRef<string | null>(null);`(125행 근처) 바로 아래에 추가:

```tsx
  const [mobileDrag, setMobileDrag] = useState<{
    id: string;
    dx: number;
    dy: number;
  } | null>(null);
```

`startIconDrag` 콜백 선언이 끝나는 지점(약 345행, `[selected, positions, scale],\n  );` 다음) 바로 아래에 새 콜백을 추가한다:

```tsx
  // 모바일 격자 전용 — 자유 좌표를 옮기는 대신, 놓은 위치가 속한 격자 칸의
  // 인덱스로 순서를 바꾼다. 드래그 중에는 집은 아이콘만 포인터를 따라
  // 보이고(다른 아이콘은 실시간 재배치 없이 그대로), 놓는 순간 한 번만
  // 순서를 계산해 저장한다.
  const startMobileIconDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const MOVE_THRESHOLD = 4;
      let moved = false;

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < MOVE_THRESHOLD) return;
        moved = true;
        setMobileDrag({ id, dx, dy });
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (moved) {
          const rect = containerRef.current?.getBoundingClientRect();
          const cellPx = effectiveScale * GRID_STEP;
          const relX = ev.clientX - (rect?.left ?? 0);
          const relY = ev.clientY - (rect?.top ?? 0);
          const col = Math.min(
            MOBILE_COLUMNS - 1,
            Math.max(0, Math.floor(relX / cellPx)),
          );
          const row = Math.max(0, Math.floor(relY / cellPx));
          const targetIndex = Math.min(
            mobileOrder.length - 1,
            row * MOBILE_COLUMNS + col,
          );
          const next = mobileOrder.filter((oid) => oid !== id);
          next.splice(targetIndex, 0, id);
          setMobileOrder(next);
        }
        setMobileDrag(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [mobileOrder, effectiveScale],
  );
```

- [ ] **Step 2: 아이콘 5곳의 포인터다운을 폭에 따라 분기**

`items.map`의 `onPointerDownIcon={(e) => startIconDrag(art.id, e)}`(469행 근처)를 아래로 바꾼다:

```tsx
              onPointerDownIcon={(e) =>
                isMobile
                  ? startMobileIconDrag(art.id, e)
                  : startIconDrag(art.id, e)
              }
```

특수 아이콘 4개의 `onPointerDown={(e) => startIconDrag(TRASH_ID, e)}` 형태(536/560/578/596행 근처)를 각각 아래로 바꾼다(`TRASH_ID`를 예로 — 나머지 셋도 자기 `ID`로 동일하게):

```tsx
          onPointerDown={(e) =>
            isMobile ? startMobileIconDrag(TRASH_ID, e) : startIconDrag(TRASH_ID, e)
          }
```

- [ ] **Step 3: 드래그 중인 아이콘에 시각적 오프셋 적용**

`items.map` 블록의 `<DesktopIcon key={art.id} .../>` 호출부에 새 prop을 추가한다(정확히는 Task 4에서 `DesktopIcon`에 `mobileLayout` prop을 추가하므로, 이 스텝에서는 `DesktopIcon`을 감싸는 자리에 style 오버레이만 얹는다 — `DesktopIcon`이 반환하는 최상위 엘리먼트가 `position: absolute; left/top` 인라인 style을 갖고 있으므로, 이 태스크에서는 `DesktopIcon`을 직접 수정하지 않고 `Desktop.tsx`가 넘기는 `x`/`y`에 드래그 오프셋을 더해 넘긴다):

`items.map`의 `x={p.x}` / `y={p.y}`(462-465행 근처)를 아래로 바꾼다:

```tsx
              x={
                mobileDrag?.id === art.id
                  ? p.x + mobileDrag.dx / effectiveScale
                  : p.x
              }
              y={
                mobileDrag?.id === art.id
                  ? p.y + mobileDrag.dy / effectiveScale
                  : p.y
              }
```

특수 아이콘 4개의 모바일 분기 style(Task 2 Step 4에서 추가한 `isMobile ? { left: effectivePositions[ID].x * effectiveScale, ... }` 블록)의 `left`/`top` 계산도 각각 드래그 오프셋을 더하도록 바꾼다 — `TRASH_ID`를 예로:

```tsx
                  left:
                    (effectivePositions[TRASH_ID].x +
                      (mobileDrag?.id === TRASH_ID
                        ? mobileDrag.dx / effectiveScale
                        : 0)) *
                    effectiveScale,
                  top:
                    (effectivePositions[TRASH_ID].y +
                      (mobileDrag?.id === TRASH_ID
                        ? mobileDrag.dy / effectiveScale
                        : 0)) *
                    effectiveScale,
```

(포맷·배경화면·편집기도 각자의 `ID`로 동일하게 — 나머지 `width`/`padding`/`gap`은 Task 2 그대로 둔다.)

- [ ] **Step 4: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

- [ ] **Step 5: 브라우저 확인 — 모바일 폭(390px)**

1. 아이콘 하나를 눌러 다른 칸 위로 끌면 그 아이콘이 포인터를 따라 움직이는지(다른 아이콘은 그 자리에 그대로), 놓으면 그 칸 순서로 들어가고 나머지가 밀리는지.
2. 새로고침(재마운트) 후에도 바뀐 순서가 유지되는지(localStorage 저장 확인 — DevTools Application 탭에서 `pixel-art-desktop-order-mobile` 키 확인 가능).
3. 짧게 탭만 하고 드래그하지 않으면(이동 거리 4px 미만) 순서가 안 바뀌고 정상적으로 더블탭 열기가 되는지.

1280px 폭에서 자유 드래그가 기존과 동일하게 동작하는지(회귀 없음) 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/Desktop.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 모바일 바탕화면 아이콘 드래그로 순서 변경

격자 자유 좌표 대신 놓은 위치의 칸 인덱스로 순서를 바꾸는 모바일
전용 드래그를 추가했다. 데스크톱 자유 드래그는 변경 없음.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Task 4: 아이콘을 흰 카드(둥근 모서리+그림자)로

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/iconMetrics.ts`
- Modify: `apps/services/components/works/5_PixelArtMaker/DesktopIcon.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/Desktop.tsx`

**Interfaces:**
- Consumes: Task 2의 `isMobile`.
- Produces: `iconMetrics.ts`의 `export const MOBILE_ICON_CARD` — 이 계획의 마지막 소비자(Desktop.tsx·DesktopIcon.tsx가 각자 씀, 더 이상 다른 태스크 없음).

- [ ] **Step 1: 공용 카드 클래스 추가**

`iconMetrics.ts`의 `getMobileIconScale` 함수 뒤에 추가:

```ts
// 모바일 전용 — 아이콘 그래픽(썸네일 캔버스/특수 아이콘 SVG)을 감싸는
// 흰 카드 배경. desktop은 이 클래스를 쓰지 않는다.
export const MOBILE_ICON_CARD =
  "flex items-center justify-center rounded-2xl bg-white shadow-md";
```

- [ ] **Step 2: `DesktopIcon.tsx`에 `mobileLayout` prop 추가**

props 구조분해(`export default function DesktopIcon({ ... })`, 14-26행 근처)의 `onRenameCancel,` 다음 줄에 추가:

```tsx
  mobileLayout,
```

타입 쪽(`onRenameCancel: () => void;` 다음 줄)에도 추가:

```tsx
  // 모바일 셸(바탕화면 격자) 전용 — true면 썸네일 캔버스를 흰 카드
  // 배경(MOBILE_ICON_CARD)으로 감싼다. desktop은 이 prop을 안 넘기므로
  // 지금과 동일하다.
  mobileLayout?: boolean;
```

파일 상단 import에 `MOBILE_ICON_CARD`를 추가한다:

```tsx
import {
  ICON_BOX,
  ICON_CANVAS_PX,
  ICON_GAP,
  ICON_LABEL_PX,
  ICON_PADDING,
  MOBILE_ICON_CARD,
} from "./iconMetrics";
```

`return (` 안의

```tsx
      <canvas
        ref={canvasRef}
        className="shadow-sm"
        style={{ imageRendering: "pixelated" }}
      />
```

를 아래로 바꾼다:

```tsx
      {mobileLayout ? (
        <div className={`${MOBILE_ICON_CARD} p-2`}>
          <canvas
            ref={canvasRef}
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="shadow-sm"
          style={{ imageRendering: "pixelated" }}
        />
      )}
```

- [ ] **Step 3: `Desktop.tsx`에서 `mobileLayout` 전달 + 특수 아이콘 4개 카드로 감싸기**

`items.map`의 `<DesktopIcon ...>` 호출부에 prop 추가(다른 prop들 사이 아무 곳):

```tsx
              mobileLayout={isMobile}
```

특수 아이콘 4개 각각(예: 휴지통, 553행 근처)의

```tsx
          <TrashIcon active={trashHover} />
```

를 아래로 바꾼다:

```tsx
          {isMobile ? (
            <div className={`${MOBILE_ICON_CARD} p-2`}>
              <TrashIcon active={trashHover} />
            </div>
          ) : (
            <TrashIcon active={trashHover} />
          )}
```

포맷(571행 근처 `<FormatIcon />`), 배경화면(589행 근처 `<WallpaperIcon art={...} />`), 편집기(607행 근처 `<LauncherIcon />`)도 각자 컴포넌트로 동일한 패턴을 적용한다. 파일 상단 import에 `MOBILE_ICON_CARD`를 추가한다(Task 2에서 이미 바꾼 `iconMetrics` import 블록에 이어서):

```tsx
import {
  getIconScale,
  getMobileIconScale,
  GRID_STEP,
  ICON_BOX,
  ICON_GAP,
  ICON_PADDING,
  MOBILE_COLUMNS,
  MOBILE_ICON_CARD,
} from "./iconMetrics";
```

- [ ] **Step 4: 정적 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

- [ ] **Step 5: 브라우저 확인 — 모바일 폭(390px)**

편집기·내 파일들·배경화면·포맷·휴지통 아이콘 전부가 흰 둥근 카드+그림자 배경 위에 그려지는지, 라벨은 카드 밖(아래)에 그대로 있는지, 드래그(Task 3 기능)와 더블클릭 열기가 여전히 정상 동작하는지.

1280px 폭에서 아이콘 모양이 지금과 동일한지(흰 카드 없음, 회귀 없음) 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/iconMetrics.ts apps/services/components/works/5_PixelArtMaker/DesktopIcon.tsx apps/services/components/works/5_PixelArtMaker/Desktop.tsx
git commit -m "$(cat <<'EOF'
feat : 네모네모빔 모바일 바탕화면 아이콘을 흰 카드(둥근 모서리+그림자)로

모바일 폭에서만 아이콘 그래픽을 MOBILE_ICON_CARD로 감싼다. 데스크톱은
변경 없음.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142A7VXzRmpPmTm1jdBw1Z9
EOF
)"
```

---

## Self-Review Notes

- **스펙 커버리지:** 배경화면 분리(Task 1), 모바일 판정 재사용(Task 2 Step 3의 `isMobile`), 4열 격자(Task 2), 드래그 순서 변경(Task 3), 흰 카드 아이콘(Task 4), 박스 선택 끄기(Task 2 Step 5) — 스펙의 모든 섹션에 대응하는 태스크가 있다.
- **타입 일관성:** `WALLPAPER_ID_MOBILE`/`getMobileWallpaper`/`saveMobileWallpaper`(Task 1에서 정의) 이름이 Editor.tsx 호출부와 정확히 일치. `GRID_STEP`/`MOBILE_COLUMNS`/`getMobileIconScale`/`MOBILE_ICON_CARD`(Task 2·4에서 `iconMetrics.ts`에 정의)를 가져다 쓰는 `Desktop.tsx`/`useDesktopLayout.ts`/`DesktopIcon.tsx`의 import 블록이 각 태스크에서 일치한다. `mobileOrder`/`effectivePositions`/`effectiveScale`(Task 2에서 정의)을 Task 3·4가 그대로 참조한다.
- **의존 순서:** Task 2가 Task 3·4보다 먼저 와야 한다(`isMobile`/`mobileOrder`/`effectiveScale`을 둘 다 필요로 함). Task 1은 다른 태스크와 파일은 겹치지만(Desktop.tsx) 상태·함수 이름이 겹치지 않아(각 태스크가 서로 다른 import·상태를 추가) 순서 무관 — 이 계획에서는 먼저 배치했다.
- **플레이스홀더 없음:** 모든 코드 스텝이 실제 함수/변수 이름과 위치를 그대로 썼다. Task 3 Step 3·Task 4 Step 3의 "나머지 셋도 자기 ID로 동일하게"는 반복되는 4개 특수 아이콘 각각에 대해 동일한 패턴을 적용하라는 명시적 지시이며(패턴 자체는 코드로 주어짐), 실행자가 임의로 채워야 할 빈칸이 아니다.
