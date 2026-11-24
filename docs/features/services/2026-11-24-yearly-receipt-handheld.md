# 올해의 영수증 — 휴대용 게임기 편집 화면

편집 화면을 휴대용 게임기 모양으로 감싸고, 십자키·A/B·SELECT/START로 조작하게 했다. 사용법은 게임기 뒤에 끼운 종이 설명서로 옮겼다.

## 조작
- 커서: `Handheld`가 액정 안의 포커스 가능 요소 가운데 방향에 맞는 가장 가까운 것을 고르고 `data-pad-cursor`를 칠한다. 상하는 다음 행, 좌우는 같은 행에서 찾는다.
  - 줄 끝에서 좌우를 누르면 `onEdge`로 목표 장을 넘긴다.
- 키보드: 방향키·WASD는 십자키, Enter는 A, Esc는 B, Q는 SELECT, E는 START다.
  - 한글 IME에서도 동작하도록 `e.code`로 판별한다.
  - 한 번 등록한 keydown 핸들러가 오래된 상태를 읽지 않도록, 최신 핸들러는 `live` ref로 넘긴다.
- 화면 우선 처리: `onDir`·`onCancel`·`onConfirm`을 화면이 먼저 받는다. 집은 목표가 있으면 Enter·A는 포커스와 상관없이 '놓기'다.
- 입력칸: 커서가 입력칸으로 옮겨 가면 이전 버튼의 포커스를 풀어, Enter가 그 버튼을 누르지 않고 입력을 시작하게 한다.

## 목표 캐러셀
- 목표는 한 장씩 보인다. 목표 위에 넘김 줄(◀ · 쪽 표시 · NN/NN · ▶)을 고정했고, 목록만 스크롤한다. 터치에서는 좌우로 밀어 넘긴다.
- 새 목표는 맨 뒤에 붙고 그 장으로 이동한다. 8개(`MAX_GOALS`)가 차면 추가 버튼을 비활성화한다.
- 번호 탭을 집은 뒤 ◀ ▶로 목표 순서를 바꾼다. 하위 항목은 번호를 끌거나 A로 집어 위·아래로 옮긴다.
- 달성률은 하위 항목 달성 비율의 평균을 '50% 달성'처럼 상자 없이 보여 준다.

## 설명서 종이
- `Manual`을 `<dialog>`에 넣었다. 닫혀 있을 때는 게임기 뒤로 6° 기울어진 종이 윗부분만 보인다.
- 열 때는 위에서 내려오며 펼쳐진다(0.65s). 닫을 때는 `data-closing` 속성으로 거꾸로 돌린 뒤 `animationend`에서 `close()`한다(0.5s).
  - '알겠어요'(접힌 귀퉁이, `form method="dialog"`), Esc, 바깥 클릭 모두 같은 닫힘 경로를 탄다.

## 도구 페이지 여백
- `ShellBackdrop`은 `<main>`에 배경이 없는 도구 페이지에서 쓴다.
  - main 가운데의 가장 바깥에 있는 불투명 요소를 찾아, 그 배경색과 바둑판 무늬를 main에 복사한다. 그래서 양옆 여백이 검게 남지 않는다.
  - dialog가 열려 있으면 동기화를 건너뛴다.
- 영수증 데스크 바탕은 액정의 올리브색과 겹치지 않도록 남보라(#7f84a3)로 바꿨다.

## 관련 코드
- `apps/services/components/works/4_YearlyReceipt/Handheld.tsx` — 게임기 본체, 커서·키보드, 설명서 다이얼로그
- `apps/services/components/works/4_YearlyReceipt/EditView.tsx` — 캐러셀, 목표·항목 집기, 8개 제한
- `apps/services/components/works/4_YearlyReceipt/Manual.tsx` — 종이 설명서
- `apps/services/components/works/4_YearlyReceipt/retro.module.css` — 게임기·신청서·종이·애니메이션 스타일
- `apps/services/app/_components/ShellBackdrop.tsx` — 도구 페이지 여백 배경 동기화
