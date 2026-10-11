# 서비스 페이지 공통 틀(ToolShell)과 메인 페이지 개편

[2026-10-04 AdSense 재심사 대응](./2026-10-04-adsense-review-content.md)에서 서비스 페이지 아래에 붙였던 안내 섹션이 서비스 이용을 방해한다는 문제가 있었다. 그래서 구조를 바꾸고, 메인 페이지 디자인과 광고 배치를 함께 정리했다.

## 서비스 페이지: 상단 바 + 사용 안내 드로어

- `ToolShell`이 `flex h-dvh flex-col`로 화면을 고정한다. 페이지는 스크롤하지 않는다.
  - 위: 40px 상단 바. 서비스 목록 링크, 서비스 이름, 개인정보처리방침, '사용 안내' 버튼이 있다.
  - 아래: 서비스 `<main className="min-h-0 flex-1">`이 남은 높이를 채운다.
- 안내 본문(`ToolGuide`)은 '사용 안내' 드로어(`GuideDialog`, `<dialog>`) 안에 서버 렌더링된다. 닫혀 있어도 초기 HTML에 들어 있다.
- 화면에 안 보이는 크롤러 전용 텍스트는 검토했지만 쓰지 않았다. Google 스팸 정책의 숨겨진 텍스트(hidden text)에 해당하고, AdSense 계정 정지 위험이 있다. 사용자가 버튼으로 여는 접이식 콘텐츠는 정상 콘텐츠로 다뤄진다.
- 서비스들은 `window`에서 keydown을 듣는다. 그래서 드로어에서 keydown/keyup 전파를 끊어, 열려 있는 동안 입력한 키가 서비스로 가지 않게 했다.
  - 닫힐 때 `<dialog>`가 트리거 버튼으로 포커스를 돌려준다. 그대로 두면 Space를 눌렀을 때 드로어가 다시 열리므로 포커스를 푼다.
- 상단 바는 무채색 다크(`neutral-900`)다. 서비스마다 배경색이 달라도 어울리게 하려는 것이다.

## 모바일 광고 칸(AdSlot)

- 자동 광고의 오버레이 형식(앵커·전면)과 본문 삽입은 고정 높이 화면에서 서비스를 덮는다. 그래서 광고를 레이아웃의 한 칸으로 두기로 했다.
- 배치는 헤더 바로 아래에 모바일 전용 320×50 칸이다. 서비스는 그 높이만큼 줄어든다.
- 실수 클릭 정책에 걸리지 않도록 다음을 지킨다.
  - 조작 UI가 몰린 하단을 피한다.
  - '광고' 라벨과 경계선으로 서비스와 구분한다.
  - 높이를 미리 예약해 광고가 늦게 떠도 화면이 밀리지 않게 한다.
  - `data-ad-status="unfilled"`이면 접고, 낮은 화면(≤560px)과 iframe 안에서는 숨긴다.
- 광고 단위 ID는 `NEXT_PUBLIC_ADSENSE_TOOL_SLOT`으로 받는다. 비어 있으면 렌더하지 않으며, 현재는 꺼져 있다.

## 메인 페이지

- 색은 amaran-th.github.io의 하늘색(hydrangea) 테마를 `globals.css`의 `@theme` 토큰으로 옮겼다. `main` `#79a2e0`, `point` `#0c3675`, `sub` `#a8cce3`, `shade` `#d9f0ff`, `ink` `#2e353f`다.
- 카드는 썸네일의 굵은 외곽선 톤에 맞춘 스티커 스타일이다. 2px 남색 테두리와 3px 어긋난 그림자를 쓰고, hover하면 그림자 쪽으로 눌린다.
- 서비스 유형 배지(게임·창작·생산성)를 이름 왼쪽에 붙였다. 썸네일은 1:1이다.
- 데스크톱(sm 이상 + `pointer-fine`)에서는 설명을 썸네일 위 오버레이로 hover나 포커스 때만 보여 준다. 모바일과 터치 기기에서는 썸네일과 이름 아래에 그대로 둔다.
  - 처음에는 `@custom-variant`를 썼는데, 개발 서버(Turbopack)가 `globals.css`의 이전 캐시를 계속 써서 개발 환경에서만 동작하지 않았다. Tailwind 기본 변형 조합(`sm:pointer-fine:`)으로 바꿔 해결했다.
- 썸네일 이미지가 없는 서비스는 공통 기본 썸네일(`ServiceThumbFallback`)을 쓴다. 테마 색의 브라우저 창 안에 서비스 이름을 넣은 SVG다.
- amaranth는 운영자 닉네임이라 사이트 이름으로 쓰지 않는다. 문구에서는 "도구" 대신 "서비스"라고 쓴다.
- 서비스 페이지 metadata의 description은 메인 `services` 배열의 `desc`와 같게 맞췄다.

## 관련 코드
- `apps/services/app/_components/ToolShell.tsx` — 서비스 페이지 공통 틀(상단 바 + 광고 칸 + 서비스)
- `apps/services/app/_components/GuideDialog.tsx` — 사용 안내 드로어(키 전파 차단, 포커스 해제)
- `apps/services/app/_components/AdSlot.tsx` — 모바일 광고 칸
- `apps/services/app/_components/ServiceThumbFallback.tsx` — 공통 기본 썸네일
- `apps/services/app/page.tsx` — 메인 페이지 카드
- `apps/services/app/globals.css` — 테마 색 토큰
