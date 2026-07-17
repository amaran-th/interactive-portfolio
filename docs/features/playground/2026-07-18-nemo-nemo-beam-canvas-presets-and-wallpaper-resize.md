# 네모네모빔 — 기본 배경화면, VN 스튜디오용 캔버스 규격, 비율 유지 리사이즈

네모네모빔(`5_PixelArtMaker/`) 편집기에 남아 있던 마무리 작업들을 처리했다. 기본 배경화면 반영, 비주얼 노벨 스튜디오에서 바로 쓰기 좋은 캔버스 규격 추가, 캔버스 크기 입력의 비율 유지 기능, 배경화면 문서의 리사이즈 제한 완화를 다뤘다.

## 기본 배경화면 (`wallpaper.ts`)

기존에는 `defaultWallpaper()`가 절차적으로 만든 두 색 체크무늬를 기본값으로 썼다. 사용자가 직접 그려 `public/배경화면.json`에 저장한 32×18(576픽셀) 그림을 `WALLPAPER_PIXELS` 배열로 하드코딩해 반영했다. 값 576개를 손으로 옮겨 적으면 전사 실수가 나기 쉬워(실제로 앞선 세션에서 두 번 다 개수가 어긋났다), JSON을 파이썬으로 직접 읽어 TS 배열 리터럴을 생성하는 스크립트를 써서 정확히 옮겼다. 더 이상 쓰지 않는 `createGrid` import는 제거했다.

## 캔버스 규격 그룹 (`types.ts`)

`CANVAS_PRESETS`(평탄한 배열)를 `CANVAS_PRESET_GROUPS`(그룹 배열)로 재구성했다.

- **일반**: 기존 정사각형 프리셋 6종(16×16 ~ 512×512)
- **배경 (16:9)**: 160×90, 256×144, 320×180, 480×270 — `VNDisplay`의 장면 프레임(`aspect-video`)과 같은 비율
- **캐릭터 (2:5)**: 64×160, 96×240, 128×320, 160×400 — 세로로 긴 서 있는 인물 실루엣 비율

`CANVAS_PRESETS`는 `CANVAS_PRESET_GROUPS.flatMap(...)`으로 평탄화해 그대로 export하므로, 그룹 구분이 필요 없는 기존 코드(기본값 등)는 그대로 동작한다. `NewCanvasDialog.tsx`(빈 캔버스 탭)와 `ImportPanel.tsx`(이미지 불러오기 탭의 캔버스 크기 선택) 둘 다 그룹 헤더가 있는 레이아웃으로 프리셋을 보여준다.

## 가로세로 비율 유지 토글 (`NewCanvasDialog.tsx`)

직접 입력 칸(너비×높이) 옆에 체인 아이콘 토글(`Link2`/`Link2Off`)을 추가했다. 켜져 있으면 `aspectRatioRef`에 저장된 비율을 기준으로, 너비를 고치면 높이가·높이를 고치면 너비가 자동으로 따라온다. 이 비율은 프리셋을 고르거나(그 프리셋의 비율로 갱신) 토글을 켜는 순간(그때 너비/높이 비율로 갱신) 새로 잡히고, 잠긴 동안에는 고정된다.

## 마지막 캔버스 크기 기억

"생성" 버튼을 누른 크기를 `localStorage`(`pixel-art-last-canvas-size`)에 저장해 두고, 다이얼로그를 다시 열 때 그 값을 너비·높이 기본값으로 쓴다. 비슷한 규격(예: 캐릭터 여러 장)을 연달아 만들 때 매번 16×16부터 다시 고르지 않아도 된다.

## 배경화면 리사이즈 — 비율 고정 완화 (`ResizeCanvasDialog.tsx`, `Editor.tsx`)

배경화면(`WALLPAPER_ID`) 문서는 지금까지 "캔버스 크기 수정" 메뉴 자체가 비활성화돼 있었다("데스크탑 전체를 채우는 용도라 크기가 고정이어야 한다"는 이유). 하지만 `WallpaperBackground.tsx`가 `object-cover`로 렌더링한다는 걸 다시 확인해보니, 해상도가 달라져도 비율만 같으면 잘리기만 할 뿐 왜곡되지는 않는다 — 즉 완전히 막을 필요 없이 비율만 지키면 됐다.

- `Editor.tsx`의 "캔버스 크기 수정" 메뉴 항목에서 `isWallpaper` 비활성화 조건을 제거
- `ResizeCanvasDialog`에 `lockAspectRatio?: boolean` prop을 추가하고, `Editor.tsx`가 `lockAspectRatio={isWallpaper}`로 넘김
- 잠겨 있으면(배경화면) 너비/높이 입력이 `NewCanvasDialog`의 토글과 같은 방식으로 서로를 따라가고, 일반 캔버스는 기존처럼 자유 입력 유지
- 다이얼로그 안내 문구에 배경화면일 때만 보이는 비율 유지 설명을 덧붙임

리사이즈 자체는 여전히 크롭/패딩 방식(`resizeGrid`, 왼쪽 위 기준)이라 픽셀을 다시 늘리거나 줄이지 않는다 — 이번 변경은 다이얼로그의 입력값 제약(비율 고정)만 추가한 것이고, 리사이즈 연산 자체의 의미는 바뀌지 않았다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/wallpaper.ts` — `WALLPAPER_PIXELS`, `defaultWallpaper()`
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts` — `CANVAS_PRESET_GROUPS`, `CANVAS_PRESETS`
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/NewCanvasDialog.tsx` — 그룹 프리셋 UI, 비율 유지 토글, 마지막 크기 저장/복원
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx` — 그룹 프리셋 UI(캔버스 크기 선택)
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ResizeCanvasDialog.tsx` — `lockAspectRatio` prop
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx` — 배경화면 리사이즈 메뉴 활성화, `lockAspectRatio` 전달
