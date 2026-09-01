# 네모네모빔 편집기 — 미리보기 패널·블렌드 드롭다운·레이어 스코프 조작

8-31 UI 폴리싱의 후속 묶음. 우상단 미리보기 패널 신설, 커스텀 블렌드 모드 드롭다운, 클립스튜디오식 불투명도 슬라이더, 그리고 "체크박스로 표시한 레이어" 기준으로 반전·회전·지우기·이동을 확장했다.

## 레이아웃 / 툴바 재구성

우측 사이드바를 툴바 상단부터 바닥까지 채우는 세로 열로 바꿨다(`[======]|=|` 형태). 툴바는 우측 패널 왼쪽 폭만 차지하고, 좌측 색상 패널·캔버스는 콘텐츠 행에 그대로 둔다. 우측 패널은 개념상 콘텐츠 행 밖으로 빼지 않고 `<div className="flex flex-1 overflow-hidden">` 안의 형제로 감쌌다.

툴바가 2줄이 되는 걸 막기 위해, 도구 일부를 "더보기" 뒤로 접는 기준을 `narrow`(820px) 브레이크포인트와 분리했다. 새 고정 상수 `TOOLBAR_COMPACT_WIDTH = 1140`(순수 `rootRef.clientWidth` 비교)만으로 판정하므로, 레이어 패널 폭은 그대로 두고 도구만 접힌다. `PREVIEW_MIN_WIDTH = 1280`, `CANVAS_PAN_PADDING = 320`도 `types.ts`에 함께 정의했다.

## 미리보기 패널 (`PreviewPanel.tsx`)

우측 사이드바 맨 위, 편집기 폭이 `PREVIEW_MIN_WIDTH`(1280px) 이상일 때만 렌더한다.

- **프레임 모드 자동 재생**: 자체 rAF 루프가 프레임별 지속시간을 지키며 항상 루프. 메인 재생 버튼과 독립. effect는 `[layerMode, framesSignature]`(보이는 프레임 id + 지속시간)에만 의존하고, `localIdx` 지역 변수를 rAF 안에서 올려 `setFrameIdx`만 비동기로 호출한다(`react-hooks/set-state-in-effect` 회피).
- **뷰파인더**: 지금 보고 있는 캔버스 영역을 보라색 테두리로만 표시. 패널 헤더의 `Frame` 아이콘 토글로 on/off(`showViewRect` 로컬 상태). `viewRect`는 `Editor`가 `canvasViewportRef`의 스크롤·크기에서 계산해 내려준다.
- **거의 실시간 반영**: `PixelCanvas`에 `onLiveEdit` prop 추가 — 드로잉 중(`drawingRef.current`) 합성 결과를 rAF 주기로 올리고, stroke가 끝나면 `null`을 보내 커밋된 픽셀로 되돌린다. 미리보기가 숨겨져 있으면(`showPreview` false) 아예 호출하지 않는다.

## 블렌드 모드 드롭다운 (`BlendModeDropdown.tsx`)

레이어 보정 패널의 네이티브 `<select>`를 커스텀 목록으로 교체했다. 항목에 마우스를 올리면 그 모드를 레이어에 임시 적용해 **캔버스에서** 미리 보이고, 목록을 벗어나거나 Escape·바깥 클릭으로 닫으면 열기 전 값으로 되돌린다. 클릭해야 확정된다.

미리보기는 `history.replacePresentLayers`(되돌리기 단계 없이 present 스냅숏만 교체)로 적용한다. `Editor.handleLayerBlendModePreview`가 이를 호출하고, `activeLayerBlendMode` prop이 `PixelCanvas.render`의 의존성에 있어 재합성된다.

### 복원 버그

hover 미리보기가 `presentLayers`를 바꾸므로 `activeLayer.blendMode`(= 드롭다운 `value` prop)도 미리보기 값이 된다. `committedRef`를 effect 안에서 갱신하고 있었는데, `onPreview` 참조가 바뀔 때마다 effect가 재실행되며 `committedRef`가 미리보기 값으로 덮여, 목록을 벗어나도 복원되지 않았다. → 여는 순간 `toggle()`에서 딱 한 번만 스냅샷하도록 고쳤다.

## 불투명도 슬라이더 (`OpacitySlider.tsx`)

트랙 자체가 체크무늬 위에 "왼쪽 투명 → 오른쪽 불투명" 그라데이션이라, 슬라이더 모양만으로 지금 얼마나 비치는지 감이 온다. 별도 "투명도" 라벨 없이 이것 하나로 뜻이 전달된다.

- 테두리 없음(왼쪽 끝에 검은 선처럼 보였다), 그라데이션은 96%에서 완전 불투명(오른쪽 끝 격자 여백 제거)
- 손잡이는 `left: calc(${v*100}% - ${v*8}px)`로 보간해 양 끝에서도 트랙 안에 유지
- 오른쪽 % 값은 버튼 클릭 → `<input type="number" className="w-7">`로 직접 입력

## 레이어 스코프(체크박스) 조작 확장

레이어 행 체크박스(`layerScope`)는 원래 스포이트·마법봉·페인트통 판정 범위와 `정렬` 대상, 4개에만 영향을 줬다.

### 정렬 → 툴바로 이동

`정렬` 버튼을 레이어 패널 헤더에서 캔버스 반전/회전 툴 옆(편집 카드 "더보기" 팝오버)으로 옮기고 `Focus` 아이콘으로 바꿨다. `canAlignContent`(= `layerMode === "layers" && layerScope.size > 0`)로 비활성 제어.

### 반전·회전·지우기

셋 다 `layerScope.has(l.id)`인 레이어에만 적용하고 안 체크된 레이어는 그대로 둔다.

- **90° 회전**은 캔버스 크기를 바꾸지 않는 중심 회전(`rotate90InPlace`). 정사각형이면 `rotate90`과 결과가 같고(무손실), 비정사각형이면 회전 뒤 경계 밖 픽셀은 잘린다. 일부 레이어만 회전하면서 캔버스 W↔H를 스왑하면 다른 레이어·캔버스 크기와 어긋나므로 크기 불변으로 갔다.
- **전체 지우기**는 원래 `pushHistory`(활성 레이어만)를 썼으므로 이름만 오해를 줬다 → 툴팁을 "체크된 레이어 지우기"로.

### 이동

선택 영역을 체크된 모든 레이어에서 같은 양만큼 함께 옮긴다.

- `PixelCanvas`는 드래그 중 활성 레이어만 실시간으로 옮기고(기존 미리보기 유지), pointer-up에서 마지막 이동량 `moveDelta`를 `onStrokeEnd`에 함께 실어 보낸다.
- `Editor.handleStrokeEnd`가 이동 커밋이면(`moveOriginalMask` + `moveDelta`) 체크된 나머지 레이어에 `shiftMaskedContent(pixels, w, h, mask, dx, dy)`를 적용하고 `pushHistoryAllLayers(nextLayers, undefined, moveOriginalMask)`로 한 번에 커밋한다 — 되돌리기 한 번에 전 레이어 + 선택 영역이 원위치.
- 잠긴 레이어는 제외. 체크 = 활성 레이어 1개(기본)면 기존과 동일.

드래그 중에 다른 레이어까지 실시간으로 보여주려면 `PixelCanvas` 렌더 경로(체크 레이어들의 개별 픽셀 배열 + z순서 합성)를 크게 고쳐야 해서, "손 뗄 때 스냅"으로 갔다.

## 자잘한 개선

- **창 메뉴 단축키**: 파일/편집 드롭다운 항목 오른쪽 끝에 옅은 작은 글씨로 단축키 조합 표시(`ContextMenu`에 `shortcut?`, `menuShortcut(key, shift)` 헬퍼가 플랫폼별 `⌘`/`Ctrl+` 생성).
- **JPG 클립보드 복사**: `copyJpgToClipboard`(검은 배경, `toBlob("image/jpeg", 0.92)`, `ClipboardItem` 실패 시 PNG 재인코딩) + `ExportPanel`에 복사 버튼.
- **애니메이션 SVG 내보내기**: 프레임 모드 SVG에 "애니메이션" 토글(기본 on). off면 현재 프레임 1장 정지 SVG. `buildAnimatedSvgString`이 프레임별 `<g opacity>` + `<animate attributeName="opacity" calcMode="discrete" repeatCount="indefinite">`(SMIL) 생성.
- 내보내기 아이콘 `Download` → `Share`(불러오기로 읽혔음).
- 배율 값 칩 고정 폭(`w-10`) — `1.5x`/`1x` 폭 차이로 +버튼이 흔들리던 것 제거.
- 색상환 대상색/배경색 스와치: 투명도가 낮아질수록 격자 비침(`transparencySwatchStyle` = 단색 그라데이션 위 `CHECKER_STYLE`).
- 캔버스 배경색 알파 제거 — `setCanvasBgColor`가 `#RRGGBB`(7자)로 잘라 저장(투명도 0으로 조작해도 순수 투명색으로 안 들어감).
- 레이어/프레임 패널 구조 통일: [스크롤 영역] → [border-t 라벨 섹션] → [border-t 아이콘 버튼 행].
- 숫자 input 위/아래 스피너 제거(`appearance: textfield` + webkit spin-button `none`).
- 레이어 보정: ±2 스냅투제로 + 숫자 직접 입력, 패널이 화면 밖으로 안 나가게 `bottom-full`(위로 열림).
- 프레임 패널: 숨김 버튼을 "현재 프레임" 섹션으로, 버튼 행 맨 앞에 "새 프레임 추가"(`Plus`).
- 아이콘화: 텍스트 도구 `AA` → `Spline`, `그라데이션` → `Blend`, `병합` → `Combine`, 선택 옵션 버튼(해제·채우기·새로/추가/제외·전역) 텍스트 → `X`·`PaintBucket`·`Square`·`SquarePlus`·`SquareMinus`·`Globe` + hover 툴팁.

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/PreviewPanel.tsx` — 미리보기 패널(신규)
- `apps/services/components/works/5_PixelArtMaker/BlendModeDropdown.tsx` — 커스텀 블렌드 드롭다운(신규)
- `apps/services/components/works/5_PixelArtMaker/OpacitySlider.tsx` — 클립스튜디오식 불투명도 슬라이더(신규)
- `apps/services/components/works/5_PixelArtMaker/Editor.tsx` — 레이아웃 재구성, 스코프 조작 핸들러, `onLiveEdit`·`artViewRect` 배선, `menuShortcut`
- `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx` — `TOOLBAR_COMPACT_WIDTH` 기반 더보기, `정렬` 버튼, 선택 옵션 아이콘화
- `apps/services/components/works/5_PixelArtMaker/LayerPanel.tsx` — `OpacitySlider`·`BlendModeDropdown` 통합, 보정 행, 프레임 패널 구조
- `apps/services/components/works/5_PixelArtMaker/PixelCanvas.tsx` — `onLiveEdit`, 이동 `moveDelta` 리포트
- `apps/services/components/works/5_PixelArtMaker/pixelGrid.ts` — `rotate90InPlace`, `shiftMaskedContent`
- `apps/services/components/works/5_PixelArtMaker/exportPixelArt.ts` — `buildAnimatedSvgString`, `exportAsAnimatedSVG`, `copyJpgToClipboard`
- `apps/services/components/works/5_PixelArtMaker/ExportPanel.tsx` — JPG 복사, 애니메이션 토글
- `apps/services/components/works/5_PixelArtMaker/ColorPicker.tsx` / `ColorWheel.tsx` — `transparencySwatchStyle`
- `apps/services/components/works/5_PixelArtMaker/ContextMenu.tsx` — 단축키 표시
- `apps/services/components/works/5_PixelArtMaker/types.ts` — `TOOLBAR_COMPACT_WIDTH`·`PREVIEW_MIN_WIDTH`·`CANVAS_PAN_PADDING`
