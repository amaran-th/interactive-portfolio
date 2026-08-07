# 네모네모빔 — GIF·스프라이트 시트 내보내기를 ExportPanel로 통합

**목표:** GIF·스프라이트 시트 내보내기가 상단 파일 메뉴 서브메뉴에만(그것도 프레임 모드일 때만) 숨어 있어 찾기 어려운 문제를, 사이드바에 항상 떠 있는 "내보내기" 패널(`ExportPanel.tsx`)에도 조건부로 노출해 해결한다.

**배경:** GIF·스프라이트 시트 내보내기 자체는 이미 구현돼 있다(`exportPixelArt.ts`의 `exportAsGIF`/`exportAsSpriteSheet`, 프레임 모드 기능 설계에서 도입). 원래 설계는 프레임 모드의 축약 컨트롤 바에도 내보내기 버튼을 직접 두려 했지만 실제로는 구현되지 않았고, 지금은 상단 "파일" 메뉴의 "내보내기" 서브메뉴(프레임 모드일 때만 항목이 추가됨)에서만 접근 가능하다. 이 경로가 거의 발견되지 않는다는 게 이번 작업의 계기다. 파일 메뉴 서브메뉴는 그대로 두고, 더 눈에 띄는 사이드바 `ExportPanel`에도 같은 기능을 추가한다.

## `ExportPanel.tsx` 변경

`ExportPanel`은 이미 `doc: PixelArt` 전체를 prop으로 받고 있고, `PixelArt.layerMode?: "layers" | "frames"` 필드가 그 안에 포함돼 있다(`Editor.tsx`가 넘기는 `doc`은 항상 최신 `layerMode`를 반영한다 — `const layerMode = doc.layerMode ?? "layers"`가 이미 이 필드에서 파생된다). 따라서 `Editor.tsx`에 새 prop을 추가할 필요 없이, `ExportPanel.tsx` 내부에서 `doc.layerMode === "frames"` 여부만으로 GIF·스프라이트 시트 노출을 결정한다.

### `Format` 타입 확장

```ts
type Format = "png" | "svg" | "json" | "jpg" | "gif" | "spritesheet";
```

### 포맷 목록

기존 `FORMATS` 상수(PNG·JPG·SVG·JSON)는 그대로 두고, 컴포넌트 안에서 프레임 모드일 때만 GIF·스프라이트 시트를 이어붙인 목록을 계산해 렌더링에 쓴다:

```ts
const visibleFormats =
  doc.layerMode === "frames"
    ? [...FORMATS, { id: "gif" as const, label: "GIF" }, { id: "spritesheet" as const, label: "스프라이트" }]
    : FORMATS;
```

포맷 버튼을 감싸는 그리드는 항목 수에 따라 열 수를 바꾼다 — 레이어 모드(4개)는 지금처럼 `grid-cols-4`(한 줄), 프레임 모드(6개)는 `grid-cols-3`(2줄, 3+3으로 가지런히).

### 배율(해상도) 옵션

지금은 `format === "png" || format === "jpg"`일 때만 배율 선택 UI를 보여준다. GIF·스프라이트 시트도 `exportAsGIF(doc, scale)`/`exportAsSpriteSheet(doc, scale)`처럼 배율 인자를 받으므로, 이 조건에 두 포맷을 추가한다.

### 프레임 모드를 벗어나면 포맷 선택을 안전하게 되돌린다

프레임 모드에서 GIF나 스프라이트 시트를 선택해둔 채로 레이어 모드로 돌아가면, `visibleFormats`에는 그 두 항목이 더 이상 없어 버튼 그리드에서는 아무것도 선택되지 않은 것처럼 보이지만 `format` 상태 자체는 여전히 `"gif"`/`"spritesheet"`로 남는다 — 이 상태에서 "파일로 저장"을 누르면 화면에는 안 보이는데 여전히 GIF로 내보내지는 불일치가 생긴다. `useEffect`로 이 상태를 감지해 안전한 기본값(PNG)으로 되돌린다:

```ts
useEffect(() => {
  if ((format === "gif" || format === "spritesheet") && doc.layerMode !== "frames") {
    setFormat("png");
  }
}, [doc.layerMode, format]);
```

(`useEffect`를 새로 import해야 한다 — 지금은 `useCallback, useRef, useState`만 가져오고 있다.)

### 저장(`handleSave`)

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

(`exportAsGIF`는 비동기라 파일 메뉴와 같은 방식으로 `void`를 붙여 결과를 기다리지 않고 던진다 — 저장 자체는 함수 내부의 `triggerDownload`가 완료 시점에 알아서 처리한다.)

### 복사(`handleSecondary`)

- **GIF**: 클립보드 복사 버튼 자체를 숨긴다(JPG와 같은 이유 — 대부분 브라우저의 `ClipboardItem`이 `image/gif`를 신뢰성 있게 지원하지 않는다). `hasSecondary`를 `format !== "jpg" && format !== "gif"`로 바꾼다.
- **스프라이트 시트**: 결국 PNG 한 장이라 PNG와 같은 방식으로 이미지 클립보드 복사를 지원한다 — 새로 추가하는 `copySpriteSheetToClipboard(doc, scale)`(아래 참고)를 부른다.

```ts
} else if (format === "spritesheet") {
  flash(
    (await copySpriteSheetToClipboard(doc, scale))
      ? "스프라이트 시트를 클립보드에 복사했습니다"
      : "클립보드 복사 실패",
  );
}
```

`secondaryTitle`도 `format === "png" || format === "spritesheet"`일 때 "클립보드에 이미지로 복사"를 보여주도록 조건을 넓힌다.

## `exportPixelArt.ts` 변경 — `copySpriteSheetToClipboard` 추가

스프라이트 시트를 클립보드에 이미지로 복사할 방법이 지금 없다. 기존 `copyPngToClipboard`와 같은 시도/실패 패턴을 따르되, `exportAsSpriteSheet`가 이미 하는 "보이는 프레임을 가로로 이어붙인 캔버스 조립" 로직을 재사용한다(다운로드 대신 클립보드에 쓴다는 점만 다르다):

```ts
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

캔버스 조립 코드가 `exportAsSpriteSheet`와 거의 같아 보이지만, 하나는 캔버스를 만들어 곧장 다운로드로 넘기고 다른 하나는 클립보드로 넘기는 것뿐이라 별도 헬퍼로 뽑기보다 각자 완결된 함수로 둔다(`copyPngToClipboard`도 `exportAsPNG`와 마찬가지로 캔버스 조립을 공유하지 않고 독립적으로 `renderToCanvas`를 다시 부르는 기존 관례를 따른다).

## 영향받지 않는 것

- 파일 메뉴(`Editor.tsx`의 `openFileMenu`)의 GIF·스프라이트 시트 서브메뉴 — 그대로 유지, 접근 경로가 하나 더 늘어나는 것뿐이다.
- `exportAsGIF`/`exportAsSpriteSheet` 함수 자체와 그 안의 GIF 인코딩·전역 팔레트 로직 — 전혀 손대지 않는다.
- 데이터 모델(`PixelArt`/`PixelLayer`) — 변경 없음.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 임시 스크립트)로 다음을 확인한다:

1. 레이어 모드에서는 포맷 버튼이 4개(PNG·JPG·SVG·JSON)만 보이고, GIF·스프라이트 시트는 없다.
2. 프레임 모드로 전환하면 포맷 버튼이 6개로 늘고(2줄, 3+3), GIF·스프라이트 시트가 추가된다.
3. GIF 선택 시 배율 옵션이 보이고, 복사 버튼은 없다("파일로 저장" 버튼만).
4. 스프라이트 시트 선택 시 배율 옵션과 복사 버튼이 둘 다 보인다.
5. 스프라이트 시트 "복사" 클릭 → 성공 메시지("스프라이트 시트를 클립보드에 복사했습니다") 표시(클립보드 API가 헤드리스 브라우저에서 막힐 수 있어, 실패해도 최소한 `copySpriteSheetToClipboard` 함수가 올바른 인자로 호출되는지·실패 메시지 분기가 정상 동작하는지 확인).
6. GIF "파일로 저장" 클릭 → 다운로드 트리거 확인(`page.on("download")` 이벤트로 확인).
7. 레이어 모드로 되돌아가면 포맷 버튼이 다시 4개로 줄고, 그 사이 GIF/스프라이트 시트가 선택돼 있었다면 포맷 선택이 유효한 값(예: PNG)으로 안전하게 되돌아간다(선택된 포맷이 사라진 상태로 남지 않는지 확인).
