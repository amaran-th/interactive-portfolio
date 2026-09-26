# 네모네모빔 모바일 셸 — 바탕화면(갤러리) 모바일 홈스크린화 + 배경화면 분리

**목표:** 모바일 폭(< 820px, `NARROW_BREAKPOINT`)에서 바탕화면(`Desktop.tsx`, 편집기 밖의 파일 갤러리 화면)이 지금은 데스크톱 자유 배치 아이콘을 letterbox 없이 뷰포트만 꽉 채운 상태다(이전 작업에서 완료) — 하지만 아이콘 배치·모양은 여전히 PC 파일탐색기 방식이다. 이 문서는 그 위에 (1) 모바일 전용 4열 격자 자동 정렬 + 드래그 순서 변경, (2) 아이콘을 흰 카드+둥근 모서리+그림자로 재구성, (3) "배경화면"을 PC용/모바일용 두 파일로 분리해 현재 폭에 맞는 쪽만 열고 보여주는 것을 더한다.

> 이 작업은 [`2026-09-18-nemo-nemo-beam-mobile-shell-design.md`](./2026-09-18-nemo-nemo-beam-mobile-shell-design.md)이 범위 밖으로 명시했던 "`Desktop.tsx`(편집기 밖 바탕화면/갤러리 화면) 자체의 레이아웃"을 다룬다. 데스크톱 폭(≥ 820px)에서는 이 문서의 세 가지 변경 모두 아무 영향이 없다.

## 현재 상태

- `Desktop.tsx`는 아이콘 위치를 `positions: Record<id, {x,y}>`(기준 배율 1.0 좌표, `useDesktopLayout.ts`가 `localStorage` 키 `pixel-art-desktop-layout`에 저장)로 관리한다. 일반 파일(`items.map`으로 `<DesktopIcon>`)과 특수 아이콘(휴지통·포맷·배경화면·편집기, `SPECIAL_ICON_IDS`) 모두 `startIconDrag`로 자유 드래그된다 — 저장된 위치가 없으면 코너 기본값(`defaultSpecialCorner`, CSS 클래스 `top-4 right-4` 등)을 쓴다.
- `getIconScale(desktopWidth)`(`iconMetrics.ts`)가 데스크톱 폭이 `BASE_DESKTOP_WIDTH`(1280px)보다 크면 아이콘·격자 간격(`GRID_STEP` = 96, `useDesktopLayout.ts`)을 균일하게 키운다 — 최소 배율 1.0, 최대 1.6.
- `DesktopIcon.tsx`는 `x·y·scale`을 받아 `left/top/width`에 직접 곱해 그리고, 내부에 픽셀아트를 그리는 `<canvas className="shadow-sm">` + 라벨을 담는다. 특수 아이콘 4개(`TrashIcon`/`FormatIcon`/`WallpaperIcon`/`LauncherIcon`)는 `Desktop.tsx`가 직접 `<div className="absolute ..." style={specialIconStyle(id)}>{아이콘}{라벨}</div>` 형태로 그린다 — 각 아이콘 컴포넌트 자신은 배경·둥근 모서리가 없다.
- "배경화면"은 `wallpaper.ts`의 단일 문서(`WALLPAPER_ID`, `getWallpaper`/`saveWallpaper`/`resetWallpaper`, `localStorage` 키 `pixel-art-desktop-wallpaper`, 32×18)다. `Desktop.tsx`가 이걸 읽어 `<WallpaperBackground art={wallpaper} />`(전체 배경, `object-fit: cover`)와 `<WallpaperIcon art={wallpaper} />`(아이콘 썸네일)에 그대로 넘기고, 더블클릭하면 `onOpen(WALLPAPER_ID)`로 그 하나의 문서를 연다. `Editor.tsx`는 `doc.id === WALLPAPER_ID`로 "이건 배경화면 편집이다"를 판정(`isWallpaper`)해 저장 시 `saveWallpaper`로 분기한다.
- `Desktop.tsx`는 이미 `NARROW_BREAKPOINT`로 폭을 재는 `useEffect`가 있다(`fittedSize` 계산용) — narrow면 `fittedSize`를 컨테이너 실제 크기로 그대로 설정해 letterbox를 끈다. 이 값 자체를 "모바일이다"라는 상태로 별도로 뽑아 쓴 적은 아직 없다.

## 새 상태 — 배경화면 분리

`wallpaper.ts`에 데스크톱용과 나란히 모바일용을 추가한다 — 마이그레이션 없이 순수 추가:

```ts
export const WALLPAPER_ID_MOBILE = "__wallpaper_mobile__";
const WALLPAPER_MOBILE_KEY = "pixel-art-desktop-wallpaper-mobile";
const WALLPAPER_MOBILE_WIDTH = 18;
const WALLPAPER_MOBILE_HEIGHT = 32;

function defaultMobileWallpaper(): PixelArt {
  return {
    id: WALLPAPER_ID_MOBILE,
    name: WALLPAPER_NAME,
    width: WALLPAPER_MOBILE_WIDTH,
    height: WALLPAPER_MOBILE_HEIGHT,
    palette: [],
    pixels: new Array(WALLPAPER_MOBILE_WIDTH * WALLPAPER_MOBILE_HEIGHT).fill(
      "#cbedff",
    ),
    createdAt: Date.now(),
  };
}
```

`getMobileWallpaper()`/`saveMobileWallpaper()`/`resetMobileWallpaper()`는 기존 `getWallpaper`/`saveWallpaper`/`resetWallpaper`와 완전히 같은 모양(같은 버전드 저장 포맷, 같은 잠금 로직)으로 짝을 이루되 `WALLPAPER_MOBILE_KEY`/`WALLPAPER_ID_MOBILE`/`defaultMobileWallpaper`를 쓴다 — 로직 중복을 줄이려면 두 쌍이 공유하는 부분(버전 파싱 등)을 `variant: { id, key, buildDefault }` 하나를 받는 내부 헬퍼로 뽑고 `getWallpaper`/`getMobileWallpaper`는 그 헬퍼를 각자의 상수로 호출하는 얇은 래퍼로 만든다(정확한 추출 형태는 구현 태스크에서 정한다 — 외부에 노출되는 함수 시그니처는 지금처럼 인자 없는 `get*()`/`save*(art)`/`reset*()` 그대로 유지).

**아이콘은 하나, 여는 파일만 폭에 따라 다르다.** `Desktop.tsx`가 이미 계산하는 폭 판정(아래 "모바일 판정" 참고)을 그대로 써서:
- `WallpaperBackground`/`WallpaperIcon`에 넘기는 `art`를 `isMobile ? mobileWallpaper : wallpaper`로 바꾼다(두 state를 각각 `getWallpaper()`/`getMobileWallpaper()`로 초기화하고, `refresh()`에서 둘 다 다시 읽는다 — 지금 `setWallpaper(getWallpaper())` 옆에 `setMobileWallpaper(getMobileWallpaper())` 한 줄 추가).
- "배경화면" 아이콘을 더블클릭하면 `onOpen(isMobile ? WALLPAPER_ID_MOBILE : WALLPAPER_ID)`.
- 아이콘 자신의 위치·드래그 식별자(`SPECIAL_ICON_IDS`, `defaultSpecialCorner`, `positions[WALLPAPER_ID]`)는 **폭과 무관하게 항상 `WALLPAPER_ID`(데스크톱 상수)로 고정** — 아이콘은 "하나의 자리"를 계속 차지하고, 그 자리에서 여는 *내용물*만 바뀌는 것이지 아이콘 자체가 두 개로 늘어나는 게 아니다.

`Editor.tsx`: `isWallpaper`를 `doc.id === WALLPAPER_ID || doc.id === WALLPAPER_ID_MOBILE`로 넓히고, 저장 분기(`handleSave`의 `isWallpaper ? saveWallpaper(toSave) : savePixelArt(toSave)`, 2036행 근처와 탭 닫기 저장의 2224행 근처 두 곳 모두)를 `doc.id === WALLPAPER_ID_MOBILE ? saveMobileWallpaper(toSave) : isWallpaper ? saveWallpaper(toSave) : savePixelArt(toSave)`로 바꾼다 — **연 순간의 창 폭이 아니라 그 문서 자신의 `id`로 저장 함수를 고른다**(열어 둔 채로 창 폭을 바꿔도 편집 중인 파일 자체는 안 바뀐다). 문서 조회(282행 근처 `if (docId === WALLPAPER_ID) return { doc: getWallpaper(), found: true };`)에도 같은 자리에 `if (docId === WALLPAPER_ID_MOBILE) return { doc: getMobileWallpaper(), found: true };`를 나란히 추가한다. 탭 이름 표시(`WALLPAPER_NAME`)는 두 변형 모두 "배경화면"으로 동일하게 유지한다.

## 새 상태 — 모바일 판정을 재사용 가능한 상태로

`Desktop.tsx`의 기존 `fittedSize` 계산 `useEffect`(폭을 재서 `rect.width < NARROW_BREAKPOINT`를 보는 부분) 안에 `isMobile` state를 하나 추가해, 그 판정을 이 컴포넌트의 다른 곳(격자 배치·아이콘 카드 스타일·배경화면 선택)에서도 그대로 쓸 수 있게 한다:

```tsx
const [isMobile, setIsMobile] = useState(false);
// ...compute() 안, rect.width < NARROW_BREAKPOINT 분기 맨 앞에 추가:
setIsMobile(rect.width < NARROW_BREAKPOINT);
```

## 새 상태 — 모바일 4열 격자 자동 정렬

`iconMetrics.ts`에 `MOBILE_COLUMNS = 4`를 추가한다. 모바일에서는 자유 좌표(`positions`) 대신 **순서 배열**로 배치를 관리한다 — 격자 칸 = 배열의 인덱스이므로 좌표를 따로 저장할 필요가 없다.

`useDesktopLayout.ts`에 기존 `positions` API와 나란히 추가:

```ts
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

`Desktop.tsx`에서 매 렌더마다 "지금 존재해야 하는 전체 순서"를 계산한다 — 기본 순서는 편집기 → 내 파일들(기존 `items` 목록 순서) → 배경화름·포맷·휴지통, 저장된 순서가 있으면 그중 지금도 존재하는 id만 먼저 그 순서대로 쓰고, 저장된 순서에 없는 새 id(새로 만든 파일 등)는 기본 순서대로 뒤에 이어붙인다(삭제된 파일은 `defaultOrder`에 없으므로 자동으로 걸러진다):

```tsx
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
```

**좌표는 기존 배율(scale) 체계를 그대로 재사용한다** — 모바일 전용 배율을 새로 만들지 않고, "격자 칸 크기가 컨테이너 폭 ÷ 4가 되도록 하는 배율"을 `GRID_STEP`(96, 기준 배율 1.0에서의 칸 크기) 기준으로 역산한다:

```tsx
// iconMetrics.ts에 추가
export function getMobileIconScale(containerWidth: number): number {
  return containerWidth / (MOBILE_COLUMNS * GRID_STEP);
}
```

(`GRID_STEP`은 지금 `useDesktopLayout.ts` 안에만 있는 상수인데, 본질적으로는 다른 아이콘 크기 상수들과 같은 종류(아이콘 관련 수치)라 `iconMetrics.ts`로 옮기고 `useDesktopLayout.ts`가 그걸 import해 쓰도록 방향을 바꾼다 — 그래야 `iconMetrics.ts`가 `useDesktopLayout.ts`를 거꾸로 import하는 순환을 피한다. `useDesktopLayout.ts`의 `GRID_STEP` 사용처(`cellKey`, `getIconPosition`, `setIconPosition`, `cleanUpLayout` 등)는 import만 바꾸고 그대로 둔다.)

인덱스 → 기준 좌표(`DesktopIcon`/특수 아이콘이 받는 `x, y`는 항상 "배율 곱하기 전" 기준 좌표라는 점은 데스크톱과 동일 — `scale`만 이 모바일 배율을 쓴다):

```tsx
function mobileIconPosition(index: number): { x: number; y: number } {
  const col = index % MOBILE_COLUMNS;
  const row = Math.floor(index / MOBILE_COLUMNS);
  return { x: col * GRID_STEP, y: row * GRID_STEP };
}
const mobilePositions: Record<string, { x: number; y: number }> = {};
mobileOrder.forEach((id, i) => {
  mobilePositions[id] = mobileIconPosition(i);
});
```

렌더링에 쓰는 `positions`/`scale`을 모바일에서는 이 값들로 바꿔치기한다:

```tsx
const effectivePositions = isMobile ? mobilePositions : positions;
const effectiveScale = isMobile
  ? getMobileIconScale(fittedSize?.width ?? 0)
  : scale;
```

`fittedSize`는 이미 같은 `useEffect`의 `ResizeObserver`로 갱신되는 state이므로(narrow일 때 `{width: rect.width, height: rect.height}`로 설정됨) 창 폭이 바뀔 때마다 `effectiveScale`도 함께 리렌더된다 — 새로 폭을 재는 코드를 추가하지 않는다. 기존에 `positions`/`scale`을 직접 참조하던 렌더 코드(`items.map` 안의 `const p = positions[art.id]`, 각 특수 아이콘 div의 `style={specialIconStyle(id)}` 등)를 `effectivePositions`/`effectiveScale` 참조로 바꾼다. `specialIconStyle`(코너 기본값 계산 포함) 자체는 데스크톱 전용으로 남기고, 모바일 렌더 경로는 `effectivePositions`에서 항상 값을 찾으므로(격자가 전체를 커버) 코너 기본값 분기를 타지 않는다.

**박스 선택(`startBoxSelect`)은 모바일에서 끈다** — 폰 홈스크린에 러버밴드 다중 선택은 없다. 컨테이너의 `onPointerDown={startBoxSelect}`를 `onPointerDown={isMobile ? undefined : startBoxSelect}`로 바꾼다.

## 새 상태 — 드래그로 순서 변경

`startIconDrag`(자유 좌표 이동)과 별도로 모바일 전용 `startMobileIconDrag(id, e)`를 추가한다. 자유 좌표를 저장하지 않고, 드래그하는 동안은 집은 아이콘만 포인터를 따라 시각적으로 옮겨 보이다가(다른 아이콘은 그 자리에 그대로 있음 — 실시간 재배치 애니메이션은 이번 범위 밖), 놓는 순간 포인터 위치가 속한 격자 칸을 계산해 그 인덱스로 순서를 바꾼다:

```tsx
const [mobileDrag, setMobileDrag] = useState<{
  id: string;
  dx: number;
  dy: number;
} | null>(null);

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

렌더 시 드래그 중인 아이콘에는 `transform: translate(mobileDrag.dx, mobileDrag.dy)`와 `zIndex`를 얹어 포인터를 따라다니게 한다(다른 아이콘 스타일은 그대로). `items.map`/특수 아이콘 4곳 모두 `onPointerDownIcon`/`onPointerDown`을 `isMobile ? (e) => startMobileIconDrag(id, e) : (e) => startIconDrag(id, e)`로 바꾼다. 특수 아이콘 4개의 `onPointerUp={handleTrashDrop}`(휴지통) 등 드래그-투-삭제 상호작용은 모바일 범위 밖(순서 변경만 지원) — 모바일에서 파일을 지우려면 기존 컨텍스트 메뉴("삭제")를 그대로 쓴다(이미 살아 있음, 변경 없음).

## 새 상태 — 아이콘을 흰 카드(둥근 모서리+그림자)로

`isMobile`일 때만 각 아이콘 그래픽(썸네일 캔버스 또는 특수 아이콘 SVG)을 감싸는 카드 배경을 추가한다. 공용 클래스 하나로 통일:

```ts
// iconMetrics.ts, 또는 Desktop.tsx 상단
export const MOBILE_ICON_CARD =
  "flex items-center justify-center rounded-2xl bg-white shadow-md";
```

`DesktopIcon.tsx`에 `mobileLayout?: boolean` prop을 추가해(다른 모바일 컴포넌트들과 같은 이름의 관례), true면 `<canvas>`를 `<div className={`${MOBILE_ICON_CARD} p-2`}><canvas .../></div>`로 감싼다(패딩을 둬 픽셀아트가 둥근 모서리에 바로 닿지 않게). 데스크톱 호출부는 이 prop을 안 넘기므로 지금과 동일하다. `Desktop.tsx`의 특수 아이콘 4곳(`TrashIcon`/`FormatIcon`/`WallpaperIcon`/`LauncherIcon`을 감싸는 각 div)에서도 `isMobile`이면 그 컴포넌트를 `<div className={`${MOBILE_ICON_CARD} p-2`}>{...}</div>`로 감싼 뒤 라벨을 그 바깥(카드 밖)에 둔다 — 라벨은 지금처럼 카드 바로 아래 텍스트로 남는다.

## 영향받지 않는 것

- 데스크톱 폭(≥ 820px)의 자유 배치·드래그·박스 선택·"정리하기"·아이콘 모양 — 전부 지금과 완전히 동일(`isMobile`이 항상 `false`이므로 모든 새 분기가 원래 경로로 돌아간다).
- `PixelArtMaker.tsx`/`Editor.tsx`의 편집창 자체 레이아웃(이미 완료된 별도 작업) — 이 문서는 편집창 *밖* 갤러리 화면만 다룬다.
- 컨텍스트 메뉴(이름 바꾸기·내보내기·복제·삭제)는 모바일에서도 지금과 동일하게 동작한다 — 변경 없음.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`로 정적 검증하고, 브라우저(390px 폭, 1280px 폭)로 다음을 확인한다:

1. 390px 폭에서 갤러리를 열면 편집기·기존 파일들·배경화면·포맷·휴지통이 흰 둥근 카드 아이콘으로 4열 격자에 순서대로 배치되는지(줄바꿈 정상, 겹침 없음).
2. 아이콘 하나를 드래그해 다른 칸 위에서 놓으면 그 자리로 순서가 바뀌고, 새로고침(재마운트) 후에도 그 순서가 유지되는지(localStorage 저장 확인).
3. 새 파일을 만들면 격자 끝에 추가되는지, 파일을 삭제하면 격자에서 사라지고 남은 아이콘들이 순서대로 당겨지는지.
4. "배경화면" 아이콘을 더블클릭하면 세로(18×32) 모바일용 배경화면이 열리는지, 그림을 그려 저장한 뒤 다시 열면 그 내용이 남아있는지, 배경 화면 전체(캔버스 뒤 `WallpaperBackground`)에도 즉시 반영되는지.
5. 창 폭을 1280px로 늘리면 같은 "배경화면" 아이콘을 더블클릭했을 때 기존 32×18 데스크톱용 배경화면이 열리는지(모바일용과 완전히 독립된 내용), 아이콘 모양·배치도 기존 자유 드래그 방식으로 돌아오는지.
6. 창 폭을 820px 위아래로 여러 번 오가며 갤러리가 깨지지 않고 전환되는지(격자 ↔ 자유 배치, 카드 아이콘 ↔ 일반 아이콘).
