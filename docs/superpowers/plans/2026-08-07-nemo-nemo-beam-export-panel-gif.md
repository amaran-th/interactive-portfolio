# GIF·스프라이트 시트 내보내기 ExportPanel 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파일 메뉴 서브메뉴에만(그것도 프레임 모드일 때만) 숨어 있던 GIF·스프라이트 시트 내보내기를, 사이드바에 항상 떠 있는 "내보내기" 패널(`ExportPanel.tsx`)에도 조건부로 노출한다.

**Architecture:** `ExportPanel`이 이미 받는 `doc: PixelArt`에 `layerMode` 필드가 포함돼 있으므로 새 prop 없이 `doc.layerMode === "frames"` 여부로 포맷 목록을 조건부 확장한다. 기존 `exportAsGIF`/`exportAsSpriteSheet`(이미 구현됨)는 그대로 재사용하고, 스프라이트 시트 클립보드 복사를 위한 함수 하나만 새로 추가한다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `gifenc`(이미 의존성으로 있음).

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 필요한 경우 Playwright 임시 스크립트를 통한 브라우저 확인이다.
- GIF는 클립보드 복사를 지원하지 않는다(파일 저장만) — 스프라이트 시트는 PNG 한 장이라 클립보드 복사를 지원한다.
- 파일 메뉴(`Editor.tsx`의 `openFileMenu`)의 GIF·스프라이트 시트 서브메뉴는 그대로 둔다 — 손대지 않는다.
- `exportAsGIF`/`exportAsSpriteSheet` 함수 자체(GIF 인코딩·전역 팔레트 로직)는 변경하지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 이 저장소에는 이 작업과 무관한, 세션 내내 있어 온 사전 수정 파일들이 있다(`app/(portfolio)/playground/_sections/Works/4_YearlyReceipt/EditView.tsx`, `app/robots.ts`, `docs/blog/pretext.md`, `next-sitemap.config.js`, 그리고 untracked `docs/superpowers/specs/2026-08-05-nemo-nemo-beam-tracing-mode-design.md`) — 절대 스테이징하지 않는다. `git add -A`/`git add .` 대신 항상 정확한 파일 경로만 스테이징한다.

---

### Task 1: `exportPixelArt.ts` — `copySpriteSheetToClipboard` 추가

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts`

**Interfaces:**
- Consumes: 기존 `visibleFrames(doc)`(모듈 내부 함수), `renderToCanvas`(`../_shared/renderPixelArt`에서 이미 import됨).
- Produces: `export async function copySpriteSheetToClipboard(doc: PixelArt, scale?: number): Promise<boolean>` — Task 2가 `ExportPanel.tsx`에서 그대로 가져다 쓴다.

- [ ] **Step 1: `copySpriteSheetToClipboard` 함수 추가**

`exportAsGIF` 함수(파일 맨 끝) 다음에 추가한다:

```ts
// 스프라이트 시트를 파일 대신 클립보드에 이미지로 복사한다 — exportAsSpriteSheet와
// 같은 방식으로 보이는 프레임을 가로로 이어붙인 캔버스를 조립하지만, 다운로드
// 대신 navigator.clipboard.write로 넘긴다(copyPngToClipboard와 같은 시도/실패
// 패턴).
export async function copySpriteSheetToClipboard(
  doc: PixelArt,
  scale = 8,
): Promise<boolean> {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = doc.width * scale * frames.length;
    canvas.height = doc.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    frames.forEach((frame, i) => {
      const frameCanvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
      ctx.drawImage(frameCanvas, i * doc.width * scale, 0);
    });
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
```

- [ ] **Step 2: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음(아직 아무도 이 함수를 안 쓰지만, export된 함수라 미사용 경고는 안 뜬다).

Run: `npm run lint`
Expected: 새 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts
git commit -m "feat: 스프라이트 시트 클립보드 복사 함수 추가"
```

---

### Task 2: `ExportPanel.tsx` — GIF·스프라이트 시트 조건부 노출 + 배선 + 전체 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ExportPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `copySpriteSheetToClipboard(doc: PixelArt, scale?: number): Promise<boolean>`, 이미 있는 `exportAsGIF(doc, scale?): Promise<void>`·`exportAsSpriteSheet(doc, scale?): void`(둘 다 `exportPixelArt.ts`에 이미 구현돼 있음, import만 추가하면 됨).
- Produces: 없음(이 계획의 마지막 태스크).

- [ ] **Step 1: import 추가**

`./exportPixelArt` import(현재 6~14번째 줄)를 다음으로 바꾼다:

```ts
import {
  buildSvgString,
  copyPngToClipboard,
  copySpriteSheetToClipboard,
  copyTextToClipboard,
  exportAsGIF,
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSpriteSheet,
  exportAsSVG,
} from "./exportPixelArt";
```

`import { useCallback, useRef, useState } from "react";`(현재 4번째 줄)를 다음으로 바꾼다:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
```

- [ ] **Step 2: `Format` 타입 확장**

`type Format = "png" | "svg" | "json" | "jpg";`(현재 16번째 줄)를 다음으로 바꾼다:

```ts
type Format = "png" | "svg" | "json" | "jpg" | "gif" | "spritesheet";
```

- [ ] **Step 3: `visibleFormats` 계산 추가**

컴포넌트 함수 안, `const [format, setFormat] = useState<Format>("png");`(현재 31번째 줄) 다음 줄에 추가:

```ts
  const [format, setFormat] = useState<Format>("png");
  // 프레임 모드일 때만 GIF·스프라이트 시트를 목록에 더한다 — 레이어 모드에는
  // "프레임"이라는 개념이 없어 애초에 애니메이션 내보내기가 성립하지 않는다.
  const visibleFormats =
    doc.layerMode === "frames"
      ? [
          ...FORMATS,
          { id: "gif" as const, label: "GIF" },
          { id: "spritesheet" as const, label: "스프라이트" },
        ]
      : FORMATS;
```

- [ ] **Step 4: 프레임 모드를 벗어나면 포맷 선택을 PNG로 되돌리는 가드 추가**

`flash` 함수(현재 36~40번째 줄) 다음에 추가:

```ts
  // 프레임 모드에서 GIF·스프라이트 시트를 골라둔 채로 레이어 모드로 돌아가면
  // 버튼 목록에서는 사라지는데 format 상태는 그대로 남아, "파일로 저장"을
  // 누르면 화면에 안 보이는 포맷으로 여전히 내보내지는 불일치가 생긴다 —
  // 그런 상황이 되면 안전한 기본값(PNG)으로 되돌린다.
  useEffect(() => {
    if ((format === "gif" || format === "spritesheet") && doc.layerMode !== "frames") {
      setFormat("png");
    }
  }, [doc.layerMode, format]);
```

- [ ] **Step 5: `handleSave`에 GIF·스프라이트 시트 분기 추가**

`handleSave`(현재 42~47번째 줄)를 다음으로 바꾼다:

```ts
  const handleSave = useCallback(() => {
    if (format === "png") exportAsPNG(doc, scale);
    else if (format === "svg") exportAsSVG(doc);
    else if (format === "json") exportAsJSON(doc);
    else if (format === "gif") void exportAsGIF(doc, scale);
    else if (format === "spritesheet") exportAsSpriteSheet(doc, scale);
    else exportAsJPG(doc, scale);
  }, [format, doc, scale]);
```

- [ ] **Step 6: `handleSecondary`에 스프라이트 시트 분기 추가**

`handleSecondary`(현재 51~71번째 줄) 안, `} else if (format === "json") { ... }` 블록 다음, 함수를 닫는 `}, [format, doc, scale, flash]);` 이전에 추가:

```ts
    } else if (format === "spritesheet") {
      flash(
        (await copySpriteSheetToClipboard(doc, scale))
          ? "스프라이트 시트를 클립보드에 복사했습니다"
          : "클립보드 복사 실패",
      );
    }
```

- [ ] **Step 7: `hasSecondary`·`secondaryTitle` 조건 확장**

`const hasSecondary = format !== "jpg";`와 그 다음 `secondaryTitle` 선언(현재 73~75번째 줄)을 다음으로 바꾼다:

```ts
  const hasSecondary = format !== "jpg" && format !== "gif";
  const secondaryTitle =
    format === "png" || format === "spritesheet"
      ? "클립보드에 이미지로 복사"
      : "코드 복사";
```

- [ ] **Step 8: 포맷 버튼 그리드가 `visibleFormats`를 쓰도록, 열 수가 항목 수에 맞게 바뀌도록 수정**

```tsx
      <div className={`grid gap-1 ${doc.layerMode === "frames" ? "grid-cols-3" : "grid-cols-4"}`}>
        {visibleFormats.map((f) => (
```

(현재 79~80번째 줄, `<div className="grid grid-cols-4 gap-1">`와 `{FORMATS.map((f) => (`를 위 두 줄로 바꾼다 — `.map` 안쪽 내용은 그대로 둔다.)

- [ ] **Step 9: 배율 옵션 노출 조건 확장**

`{(format === "png" || format === "jpg") && (`(현재 95번째 줄)을 다음으로 바꾼다:

```tsx
      {(format === "png" ||
        format === "jpg" ||
        format === "gif" ||
        format === "spritesheet") && (
```

- [ ] **Step 10: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음. `PixelCanvas.tsx`의 기존 `react-hooks/exhaustive-deps` 경고, 다른 파일들의 `no-img-element` 경고는 이 작업과 무관한 사전 존재 경고이므로 그대로 남아 있어도 된다.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 11: 브라우저 수동 확인**

`npm run dev`를 백그라운드로 띄우고, MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 확인한다. `localStorage`에 레이어 2장짜리 작은 캔버스(`PixelArt`, V3 포맷, `layerMode: "layers"`)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 열면 손으로 그릴 필요 없이 빠르게 검증할 수 있다(이전 작업들에서 쓴 것과 같은 방식).

1. 레이어 모드로 연 직후: "내보내기" 아코디언(또는 좁은 화면이면 해당 플로팅 패널)을 펼치면 포맷 버튼이 4개(PNG·JPG·SVG·JSON)만 보인다.
2. 레이어 패널에서 "프레임" 모드로 전환하면, 같은 내보내기 패널에서 포맷 버튼이 6개로 늘고(2줄, 3+3 배치) GIF·스프라이트 시트가 추가된다.
3. GIF를 선택하면 배율(해상도) 옵션 행이 보이고, 복사(클립보드) 버튼은 없다 — "파일로 저장" 버튼만 있다.
4. 스프라이트 시트를 선택하면 배율 옵션과 복사 버튼이 둘 다 보인다.
5. 스프라이트 시트에서 "복사" 버튼을 클릭하면 `copySpriteSheetToClipboard`가 호출되고(클립보드 API 자체가 헤드리스 환경에서 거부돼도 무방 — 실패 시 "클립보드 복사 실패" 메시지가 뜨는 분기까지 확인하면 된다) 상태 메시지가 표시된다.
6. GIF에서 "파일로 저장"을 클릭하면 다운로드가 트리거된다(Playwright의 `page.on("download")` 이벤트로 확인).
7. GIF를 선택한 채로 레이어 모드로 되돌아가면, 포맷 버튼이 다시 4개로 줄고 선택된 포맷이 PNG로 안전하게 되돌아간다(4번째 버튼 "PNG"가 강조 표시되는지 확인).

각 시나리오는 실제 DOM 상태(버튼 개수, 강조 클래스, disabled 여부, 다운로드 이벤트)를 `page.evaluate`나 Playwright의 locator API로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷·백그라운드 dev 서버를 모두 정리하고 `git status`로 깨끗한지 확인한다.

- [ ] **Step 12: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/ExportPanel.tsx
git commit -m "feat: 내보내기 패널에 프레임 모드용 GIF·스프라이트 시트 조건부 노출"
```

---
