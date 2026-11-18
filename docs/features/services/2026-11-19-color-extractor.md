# 색상 추출기: 스포이트·팔레트 추출기 통합, 색 조합 카드와 내 팔레트

색상 스포이트(`/color-picker`)와 팔레트 추출기(`/palette-extractor`)를 '색상 추출기' 하나로 합쳤다.

## 통합
- 라우트는 `/color-picker`만 남긴다. `next.config.ts`의 `redirects()`가 `/palette-extractor`를 영구(308) 리다이렉트한다.
- `components/works/9_PaletteExtractor/`는 지웠고, `9_` 번호는 비워 둔다. `lib/tools.ts`에서도 항목을 하나로 합쳤다.

## 화면 (`ColorPicker.tsx`)
- **왼쪽: 색 조합 카드**
  - 이미지 아래에 컬러 팔레트 막대를 붙인 흰 카드다.
  - 바깥 여백, 이미지와 막대 사이, 막대 사이를 모두 `CARD_GAP`(10px)로 맞춘다.
  - 세로가 가로의 `TALL_RATIO`(1.25)배보다 긴 이미지는 막대를 오른쪽에 위아래로 쌓는다.
- **이미지 크기**
  - `ResizeObserver`로 남은 칸 크기를 재고, 카드 여백과 막대 높이를 뺀 자리에 이미지를 contain으로 맞춘다. 작은 이미지도 칸을 채운다.
  - 막대 줄 폭은 이 이미지 폭을 따른다.
- **HEX 글자**: 막대 크기에 맞춰 줄인다(`labelPx`). 8px로도 안 들어가면 숨긴다.
- **오른쪽 위: 고른 색**
  - '화면에서 색상 추출'(EyeDropper API)이 남색으로 채운 주 버튼이다.
  - 그 아래 동그란 견본과 HEX·RGB·HSL 세 줄이 있고, 줄을 누르면 복사된다. 높이를 고정해 색이 생겨도 아래가 밀리지 않는다.
  - 그 아래 '내 팔레트에 담기'와 '최근 고른 색'이 온다.
- **오른쪽 아래: 내 팔레트**
  - 고른 색을 최대 10개 담는 막대 카드다. 저장하지 않는다.
  - 막대를 누르면 그 색을 다시 고르고, ×로 뺀다.
  - 옆으로 끌면 순서가 바뀐다. 끄는 동안은 막대를 그대로 두고, 포인터에 가장 가까운 틈에 보조선만 그린다. 놓을 때 옮긴다.
  - 5px 넘게 움직여야 끌기로 보고, 끌기 직후의 클릭은 막는다. 키보드는 Alt+←/→로 옮긴다.

## PNG 저장
- 화면을 캡처하지 않고 원본 이미지에서 캔버스로 다시 그린다.
  - 이미지 폭은 800~1600px이고, 여백·막대·HEX 글자는 같은 배율(`k`)로 키운다.
  - 화면의 남색 테두리와 고른 막대 표시는 넣지 않는다.
- 컬러 팔레트는 `palette.png`, 내 팔레트는 막대만 있는 `my-palette.png`(폭 1200px)로 저장한다.
- CSS 변수·JSON 복사는 버튼이 비슷해 헷갈려서 뺐다.

## 팔레트 추출 기준 (`_shared/quantize.ts`)
1. 이미지를 긴 변 200px로 줄이고, 알파 128 미만 픽셀은 뺀다.
2. median cut으로 묶는다.
   - luma 가중 RGB 범위가 가장 넓은 축에서, 픽셀 수 중앙값 지점으로 묶음을 나눈다.
   - 정한 색 수만큼 묶음이 생길 때까지 반복한다.
3. 묶음마다 빈도 가중 무게중심에 가장 가까운 실제 색을 대표로 고른다.
4. 픽셀 수가 많은 순서로 늘어놓는다.

## 이미지 붙여넣기 (`_shared/useImageInput.ts`)
- 두 길을 함께 쓴다.
  - **paste 이벤트**: `files`, `items`, HTML `<img src>`·이미지 URL 순서로 찾는다. Finder에서 복사한 파일은 이 길로만 온다.
  - **클립보드 읽기 API**: 이벤트에 이미지가 없으면 `navigator.clipboard.read()`로 다시 읽는다. Safari처럼 입력칸 밖에서 paste 이벤트가 오지 않으면, Ctrl/⌘+V 뒤 200ms 안에 이벤트가 없을 때 직접 읽는다.
- '붙여넣기' 버튼도 클립보드 읽기 API를 쓴다.
- 이미지가 계속 안 붙던 문제는 코드가 아니라 외부 앱(앱 내장 브라우저)이 클립보드 이미지를 넘기지 않아서였다. Chrome에서는 정상이다.

## 관련 코드
- `apps/services/components/works/8_ColorPicker/ColorPicker.tsx` — 화면·카드·PNG 저장·내 팔레트
- `apps/services/components/works/_shared/useImageInput.ts`, `imageInput.ts`, `ImageDropZone.tsx` — 이미지 입력·붙여넣기
- `apps/services/app/color-picker/page.tsx`, `guide.ts` — 라우트·사용 안내
- `apps/services/next.config.ts` — `/palette-extractor` 리다이렉트
