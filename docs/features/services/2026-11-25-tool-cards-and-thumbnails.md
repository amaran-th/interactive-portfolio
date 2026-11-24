# 서비스 카드 정리와 썸네일 보강

## 카드
- `Tool` 타입에서 `about`을 없앴다. 카드에는 썸네일, 제목, 한 줄 설명(`desc`)만 남고, hover 때 썸네일 위에 뜨던 설명과 모바일 설명 줄도 사라졌다.
- 검색(`searchTools`)은 제목, `desc`, `tags`, 카테고리 라벨만 본다.
  - 설명에서만 걸리던 단어는 `tags`로 옮긴다. 예: 색상 추출기의 "PNG".
- 메인 페이지 카테고리 라벨은 기울기와 단색 그림자 없이 똑바로 둔다.
- `science` 카테고리의 라벨은 '스토리'다. id와 `/category/science` 경로는 바뀌지 않는다.

## 썸네일
- 카드 썸네일 타일에는 이미 굵은 테두리와 그림자(`STICKER`)가 있다. 그래서 썸네일 안에 카드나 앱 타일 틀을 또 그리지 않고, 내용이 640×640 전체를 채우게 한다.
- 새로 만든 썸네일:
  - 자산 시뮬레이터: 남보라 그라데이션 위에 도넛·막대·영역 차트. 글자는 없다.
  - 문자 인코딩 변환기: 번역기 앱 아이콘 형식을 빌려, '가' 말풍선과 UTF-8 바이트 `EA B0 80` 말풍선을 남색 바탕에 겹쳤다.
  - 색상 추출기: 줄 노트 바탕에 노을 사진, 스포이트, 뽑은 색 5개와 HEX(Nanum Pen Script).
- 썸네일은 `apps/services/public/playground/`와 `apps/portfolio/public/playground/` 양쪽에 둔다.

## 네모네모빔 배경
- `<main>`에 `bg-gray-950`을 지정해 `ShellBackdrop`이 이 페이지를 건너뛰게 했다.
- `ShellBackdrop`의 불투명 판정은 `lab()`·`oklch()` 같은 비-rgb 계산값도 읽는다.

## 관련 코드
- `apps/services/lib/tools.ts` — `about` 제거, `desc`·라벨·썸네일
- `apps/services/app/_components/ToolCard.tsx` — 설명 오버레이 제거
- `apps/services/app/page.tsx` — 카테고리 라벨 스타일
- `apps/services/app/_components/ShellBackdrop.tsx` — 색 형식에 상관없는 불투명 판정
- `apps/services/app/nemo-nemo-beam/page.tsx` — 검은 배경 고정
