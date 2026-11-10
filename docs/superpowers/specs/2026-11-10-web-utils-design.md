# 웹 유틸 3종 설계 (문자 인코딩 변환기 · 색상 스포이트 · 팔레트 추출기)

- 날짜: 2026-11-10
- 대상: `apps/services`
- 범위: 새 도구 4종 요청 중 A 묶음(유틸 3종). B 묶음(3D 뒤집기 칩 모자이크)은 별도 설계.

## 목표

서비스 포털에 설치·가입 없이 쓰는 작은 유틸 3개를 추가한다. 모두 브라우저 안에서만 계산하고 아무것도 저장하지 않는다.

### 성공 기준

- 세 도구가 `/text-encoding`, `/color-picker`, `/palette-extractor`에서 열리고, 메인·카테고리 페이지·sitemap에 나온다.
- 텍스트, 개발·웹 카테고리가 활성화된다(도구가 생기므로 `activeCategories()`에 포함).
- 인코딩·색 변환 계산은 `node:test`로, 화면 동작은 Playwright로 확인한다.
- localStorage·IndexedDB 키를 새로 만들지 않는다(개인정보처리방침 변경 없음).

## 1. 문자 인코딩 변환기

- 경로 `/text-encoding`, 카테고리 `text`
- 컴포넌트 `components/works/7_TextEncoding/`

### 글자 → 코드

- 입력한 텍스트를 글자(코드포인트) 단위로 나눠 한 줄씩 표로 보여 준다.
- 열: 글자 · 유니코드(`U+AC00`) · UTF-8 · UTF-16(BE) · EUC-KR · ASCII
- 표현할 수 없으면 "없음": ASCII는 U+0000~U+007F만, EUC-KR은 표에 없는 글자.
- 공백·줄바꿈·제어 문자는 글자 칸에 `␣`, `↵`, `U+0009` 같은 기호로 보여 준다.
- 서로게이트 쌍(이모지 등)은 한 글자로 묶는다. UTF-16 칸에는 두 단위(`D83D DE00`)를 보여 준다.
- 표 아래에 인코딩별 전체 바이트열(공백 구분)과 바이트 수를 보여 준다.
- 입력이 2,000자를 넘으면 표는 앞 2,000자까지만 그리고 그렇다고 알린다. 전체 바이트열은 모두 계산한다.

### 코드 → 글자

- 입력 형식:
  - 바이트열: `EA B0 80`, `EAB080`, `0xEA 0xB0 0x80`, `\xEA\xB0\x80`. 구분자는 공백·쉼표·없음 모두 허용.
  - 코드포인트: `U+AC00`, `가`, `&#xAC00;`, `&#44032;`
- 인코딩 선택: UTF-8 · UTF-16(BE) · EUC-KR · ASCII. 코드포인트 형식이면 인코딩 선택을 무시한다.
- 잘못된 입력(홀수 자리 16진수, 잘못된 UTF-8 연속 바이트, 범위 밖 코드포인트)은 몇 번째 바이트·토큰에서 틀렸는지 알려 주고, 해독 가능한 앞부분까지는 보여 준다.

### 표기·복사

- 바이트 표기 진법: 16진수(기본) · 10진수 · 2진수. 두 모드에 공통으로 적용한다.
- 표의 각 칸과 전체 바이트열을 누르면 클립보드에 복사하고 "복사됨"을 잠깐 띄운다.

### 구현

- `encoding.ts`(순수 함수, DOM 없음):
  - `codePoints(text)`
  - `utf8Bytes(cp)`
  - `utf16Units(cp)`
  - `eucKrBytes(cp, table)`
  - `parseBytes(input)`
  - `parseCodePoints(input)`
  - `decode(bytes, encoding)`
  - `formatBytes(bytes, radix)`
- UTF-8·UTF-16 인코딩과 디코딩은 직접 구현한다. 오류 위치를 알려 줘야 해서 `TextDecoder`를 쓰지 않는다.
- EUC-KR:
  - 디코딩은 `new TextDecoder("euc-kr", { fatal: true })`로 한다.
  - 인코딩용 역방향 표는 처음 필요할 때 만든다. 첫 바이트 0xA1~0xFE × 둘째 바이트 0xA1~0xFE 조합을 `TextDecoder`로 풀어 `Map<codePoint, [b1, b2]>`에 담는다(KS X 1001 범위, 수천 개). 브라우저의 `euc-kr` 디코더는 실제로 CP949라 확장 영역도 풀지만, 역방향 표는 이 범위만 담으므로 "똠"처럼 KS X 1001에 없는 글자는 EUC-KR "없음"으로 나온다.
  - 표를 만드는 함수는 디코더를 인자로 받아 테스트할 수 있게 한다.
- 라이브러리를 추가하지 않는다.

## 2. 색상 스포이트

- 경로 `/color-picker`, 카테고리 `dev`
- 컴포넌트 `components/works/8_ColorPicker/`

### 이미지에서 뽑기

- 이미지를 넣는 방법: 파일 선택 버튼, 드래그해서 놓기, 페이지 어디서든 Ctrl/⌘+V 붙여넣기
- 이미지는 화면 영역에 맞춰 축소해 보여 주고, 원본 해상도 캔버스에서 색을 읽는다.
- 이미지 위에 포인터를 올리면 돋보기를 띄운다: 주변 11×11 픽셀 확대, 가운데 칸 강조, 현재 색 HEX.
- 클릭(터치는 탭)하면 그 픽셀 색을 현재 색으로 정한다.
- 투명 픽셀(알파 0)은 뽑지 않고 "투명한 곳"이라고 알린다.
- 반투명 픽셀은 알파를 무시하고 RGB만 쓴다.

### 화면에서 뽑기

- `"EyeDropper" in window`일 때만 '화면에서 뽑기' 버튼을 보여 준다(데스크톱 Chrome·Edge).
- 지원하지 않으면 그 자리에 "화면 어디서나 색을 뽑는 기능은 데스크톱 Chrome·Edge에서만 돼요"라고 한 줄 안내한다.
- 사용자가 취소(AbortError)하면 아무것도 바꾸지 않는다.

### 결과

- 현재 색 큰 견본, 그리고 세 줄:
  - HEX `#1e90ff`
  - RGB `rgb(30 144 255)`
  - HSL `hsl(210 100% 56%)`
- 각 줄을 누르면 그 문자열을 복사한다.
- 최근 뽑은 색: 최대 10개, 최근 것이 앞. 같은 색은 앞으로 옮긴다. 누르면 현재 색으로 다시 고른다.
- 최근 색은 메모리에만 두고 저장하지 않는다.

## 3. 팔레트 추출기

- 경로 `/palette-extractor`, 카테고리 `dev`
- 컴포넌트 `components/works/9_PaletteExtractor/`
- 이미지 입력 방식은 스포이트와 같다(공통 훅).
- 색 개수: 3~12, 기본 6. 바꾸면 바로 다시 계산한다.
- 계산:
  - 긴 변 최대 200px로 줄인 캔버스에서 픽셀을 읽는다.
  - 알파 128 미만 픽셀은 제외한다.
  - `quantizeMedianCut`으로 대표색을 고른다. 대표색은 실제로 이미지에 있던 색이다.
  - 결과는 픽셀 수가 많은 색부터 정렬하고, 각 색의 비율(%)을 함께 보여 준다.
- 이미지 색 수가 요청 개수보다 적으면 있는 만큼만 보여 준다.
- 내보내기:
  - 견본을 누르면 HEX를 복사한다.
  - 'CSS 변수 복사': `--color-1: #…;` 줄바꿈 목록
  - 'JSON 복사': `["#…", …]`

## 4. 공통 모듈

### `components/works/_shared/color.ts`

순수 함수만 둔다.

- `rgbToHex`, `hexToRgb`, `rgbToHsl`
- `formatHex`, `formatRgb`, `formatHsl`: CSS Color 4 공백 구문
- HSL은 정수로 반올림해 보여 준다.

### `components/works/_shared/useImageInput.ts`

- 파일 선택, 드래그해서 놓기, 붙여넣기를 한 훅으로 처리하고 `HTMLImageElement`(또는 오류)를 돌려준다.
- 이미지가 아닌 파일, 디코딩 실패는 오류 메시지로 돌려준다.
- 붙여넣기는 `window`의 `paste` 이벤트로 받는다. 단, 이벤트 대상이 입력칸이면 무시한다.
- 새 이미지를 받으면 이전 object URL을 해제한다.

### `quantizeMedianCut` 이동

- `5_PixelArtMaker/pixelate.ts`에서 `_shared/quantize.ts`로 옮긴다.
- `pixelate.ts`는 거기서 불러온다. 동작 변경 없음.

### 복사 피드백

- 세 도구 모두 복사하면 "복사됨"을 잠깐 띄운다.
- `navigator.clipboard`가 없거나 실패하면 "복사하지 못했어요"를 띄운다.

## 5. 등록·문서

- 도구마다 `app/<slug>/page.tsx`(`metadata` 포함, `ToolShell`로 감쌈)와 `guide.ts`(사용 방법·알아 두면 좋은 점·FAQ)를 만든다.
- `lib/tools.ts`의 `TOOLS`에 세 항목을 추가한다(`thumb: null` → 기본 썸네일).
- 텍스트·개발·웹 카테고리 `description`을 실제 도구에 맞게 고친다. 새 문구는 메인 페이지와 같은 해요체로 쓴다.
- 포트폴리오 플레이그라운드(`data.ts`)에는 추가하지 않는다.
- `CLAUDE.md`의 Services app structure 목록을 갱신한다(`works/` 번호 범위).

## 6. 검증

1. `node --test`:
   - `color.ts`: `#1e90ff` ↔ `rgb(30 144 255)` ↔ `hsl(210 100% 56%)`, 흑백 경계값
   - `encoding.ts`:
     - "가": UTF-8 `EA B0 80`, UTF-16 `AC00`, EUC-KR `B0 A1`, ASCII 없음
     - "A": 모든 인코딩 `41`
     - "😀": UTF-8 `F0 9F 98 80`, UTF-16 `D83D DE00`
     - 입력 파싱 형식 4종, 잘못된 UTF-8 오류 위치
2. `npm run lint`, `npm run build` 통과. 빌드 후 sitemap에 세 경로와 `/category/text`, `/category/dev`가 있다.
3. Playwright(데스크톱 1280px, 모바일 375px):
   - 인코딩: "가A😀" 입력 → 표 3줄. `EA B0 80` + UTF-8 → "가".
   - 스포이트: 테스트 이미지 붙여넣기 → 알려진 좌표 클릭 → HEX가 기대값과 같다.
   - 팔레트: 단색 4개로 나뉜 테스트 이미지 → 색 개수 4에서 그 4색이 나온다.
   - Chromium에서 '화면에서 뽑기' 버튼이 보인다(실제 화면 픽셀 추출은 수동 확인).

## 범위 밖

- HSV·CMYK·OKLCH·색 이름, 팔레트 이미지 저장, 네모네모빔 팔레트 연동
- Base64·URL 등 웹 개발용 변환, 깨진 글자 복구
- 최근 색 저장
- 전용 썸네일 이미지(나중에 따로)
