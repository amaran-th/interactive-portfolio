# 네모네모빔 — 커스텀 커서 전면 도입

편집기 전용 SVG 커서를 버리고, 사용자가 제공한 32×32 PNG 커서 리소스(`public/playground/nemo-nemo-beam/cursor/`)를 기본 커서로 쓰도록 `cursors.ts`를 다시 짰다. 이후 여러 차례에 걸쳐 "커서가 안 바뀐다"는 신고가 이어졌는데, 매번 서로 다른 근본 원인이 있었다.

## 이미지 기반 커서 (`cursors.ts`)

`url("data:image/svg+xml,...") x y, fallback` 방식의 `svgCursor()` 대신, PNG 경로를 받아 같은 형태의 CSS 값을 만드는 `imageCursor()`로 교체했다. 제공된 PNG는 실제로 64×64(2배 해상도)라 `image-set(url(...) 2x) x y, fallback`으로 감싸야 브라우저가 의도한 32×32 크기로 그린다 — 단순 `url()`을 쓰면 원본 픽셀 그대로 렌더링돼 커서가 두 배로 커 보인다. grab/grabbing만 대응 이미지가 없어 기존 SVG 방식을 유지했다.

## 커버리지 확장 — 편집기 밖 바탕화면

기존 커서 규칙은 `.pam-editor`(편집기 내부)에만 있어, 편집기를 열기 전 바탕화면 아이콘 화면(`Desktop.tsx`)은 전혀 커버되지 않았다. `PixelArtMaker.tsx`에 `.pam-app` 기본 규칙을 신설하고, `Desktop.tsx`의 아이콘 4종(휴지통·포맷·배경화면·편집기)과 `DesktopIcon.tsx`의 아이콘·이름변경 입력칸에 커서를 연결했다.

## 비활성(disabled) 요소

브라우저는 `:disabled` 폼 요소의 `cursor` CSS를 아예 무시하고 항상 기본 화살표를 그린다 — CSS 우선순위로는 우회할 수 없는 UA 동작이다. `pointer-events: none`으로 호버 자체를 부모로 흘려보내 부모의 커스텀 커서가 대신 보이게 하는 방식으로 우회했고, 범위를 `button`에서 `:disabled` 전체로 넓히고 요소 자신의 cursor도 명시적으로 지정해 이중으로 방어했다.

## document.body 포털 이탈

`ImportPanel.tsx`의 팔레트 스와치 재색칠 팝오버가 `createPortal(..., document.body)`로 그려져 `.pam-editor` DOM 트리 자체를 벗어나 있었다 — CSS 상속이 그 지점에서 끊겨 안의 `ColorPicker`(스포이트 버튼·SV 사각형·슬라이더)가 전부 네이티브 커서로 보였다. `ColorPicker.tsx`의 스포이트 버튼에 명시적 커서를 박아 어디에 마운트되든 앰비언트 CSS에 의존하지 않게 하고, 포털 래퍼 자체에도 기본 커서를 걸었다.

## 네이티브 폼 컨트롤 UA 오버라이드

`input[type=file]`·`input[type=range]`·`input[type=checkbox]`·`select` 전부 브라우저 UA 스타일시트가 해당 요소에 직접 `cursor: default`를 박아둬서 상속만으로는 절대 뚫리지 않는 동일한 패턴이었다. `range`는 트랙과 실제로 잡는 thumb이 서로 다른 pseudo-element(`::-webkit-slider-thumb`/`::-webkit-slider-runnable-track`, Firefox는 `-moz-` 접두사)라 그것도 따로 지정해야 했고, `file` input도 `::file-selector-button`(표준)과 `::-webkit-file-upload-button`(구형 별칭) 둘 다 지정해야 실제 클릭 대상인 "파일 선택" 버튼까지 커버됐다. `input[type=number]`의 스핀 버튼은 별도 UA 오버라이드가 없어 이미 정상 상속되고 있었다.

## 알려진 한계

`ImportPanel.tsx`의 팔레트 스와치 병합 드래그는 HTML5 네이티브 `draggable` 속성을 쓴다 — 대기 상태 커서는 커스텀 이미지로 바뀌지만, 실제 드래그 중에 보이는 OS 드래그 고스트 커서는 스크롤바와 마찬가지로 CSS `cursor`로 건드릴 수 없는 브라우저/OS 영역이다.

## 부수 작업

"도형 채우기" 토글 버튼의 아이콘이 물방울(`Droplet`)이라 오해를 샀다 — 메인 채우기 도구와 같은 `PaintBucket`으로 교체했다(`DrawToolbar.tsx`).

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/cursors.ts` — `imageCursor()`, `CURSOR_*` 상수 전체
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx` — `.pam-app` 기본 커서 규칙
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx`, `DesktopIcon.tsx` — 바탕화면 커서 커버리지
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorPicker.tsx`, `ImportPanel.tsx` — 포털 이탈 수정
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`, `ReferenceWindow.tsx`, `ContextMenu.tsx`, `GradientDial.tsx` — 리사이즈 핸들·컨텍스트 메뉴·다이얼 커서
- `app/(services)/nemo-nemo-beam/page.tsx` — 페이지 최상단(`<main>`) 기본 커서
- `public/playground/nemo-nemo-beam/cursor/` — 커서 PNG 9종
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DrawToolbar.tsx` — 도형 채우기 아이콘 교체
