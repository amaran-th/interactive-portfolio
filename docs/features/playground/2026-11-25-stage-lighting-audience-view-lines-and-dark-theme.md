# 조명 연습실 — 객석 시점 둘러보기, 라인 폴더·라인 추가, 다크 테마

## 객석 시점
- 좌석에 앉아 고개를 돌리는 시점으로 바꿨다. `OrbitControls`의 회전 중심을 눈 바로 앞(1cm)에 두고 `minDistance = maxDistance = 0.01`로 고정해 카메라가 제자리에서 돈다. `rotateSpeed = -0.15`로 끄는 방향을 따라 무대가 거의 1:1로 움직인다.
- 범위는 무대 가운데 방위각 기준 좌우 75°, 아래 35°·위 25°. 휠은 화각 줌(20–60°)이다. 좌석을 바꾸면 다시 무대 가운데를 본다.
- W·A·S·D를 누르는 동안 고개를 돌린다(좌우 초당 60°, 위아래 40°). `e.code`로 받아 한글 입력 상태에서도 동작하고, keyup·blur에서 멈춘다. 방위각 한계가 ±180°를 넘나드는 자리(원형·돌출 객석)를 위해 범위 가운데 기준 상대각으로 자른다.
- 보기 전용: 3D 화면과 평면도에서 요소를 끌지 않고(평면도는 고르기만), Delete·복제 단축키를 막는다.

## 라인 폴더와 라인 추가
- 데이터: `HangId`를 `string`으로 넓히고 `Stage.lines: CustomLine[]`(`{ id, name, type: "pipe" | "boomL" | "boomR", at }`)을 더했다. `at`은 무대 앞(0)~뒤(1) 기본 위치이고 옮긴 거리는 기존 라인처럼 `rig`에 둔다. 최대 8개(`LIMITS.lines`).
- 도우미: `hangsOf`, `hangLabel`, `boomSide`/`isBoomHang`, `addLine`(같은 종류와 가장 먼, 가운데에 가까운 빈자리), `renameLine`, `removeLine`(걸린 조명기는 가장 가까운 라인으로). 3D 파이프·하이라이트·피킹, 평면도, 라인 스냅, 저장·불러오기 모두 `hangsOf`를 쓴다. `lines`가 없는 예전 저장본은 빈 목록으로 읽는다.
- 조명기 탭 목록은 '조명기' 머리 없이 라인별 폴더(채널 순)로 보인다. 폴더 이름을 누르면 라인을 고르고, 조명기 이름을 다른 폴더로 끌어 놓으면 그 라인으로 옮겨 건다.
- 라인 패널은 라인을 골랐을 때만 그 라인 하나를 보여 준다(Inspector와 같은 `Header`). 더한 라인은 헤더에서 이름을 바꾸고 삭제(또는 Delete 키)한다. 지운 라인을 고른 상태는 `selectedLine` 파생값에서 걸러낸다.

## 툴바·패널 정리
- 시점·품질은 붙은 세그먼트(`SEG_GROUP`/`SEG_ITEM`), 작업등·객석등·관객은 `role="switch"` 스위치로 나눴다. 객석 모드의 현재 좌석은 정보 텍스트로 바꿨다. 잔광·헤이즈 슬라이더 폭을 맞췄다.
- 좌석 미리보기: 방향 단추를 왼쪽, 구역·열·번호를 오른쪽에 두고 라벨과 필드를 한 줄에 놓았다.
- 솔로를 조명기 헤더의 복제·삭제 줄로 옮겼다.

## 다크 테마
- 조명 연습실 루트에 `DARK_THEME` inline style로 사이트 색 토큰(`--color-point`, `--color-ink`, `--color-shade`, `--color-main`)과 새 토큰 `--color-surface`·`--color-on-point`를 덮어쓰고 `color-scheme: dark`를 준다. Tailwind v4 유틸리티가 `var(--color-*)`를 참조하므로 클래스 대부분은 그대로 두고, `bg-white`→`bg-surface`, 강조 바탕 위 `text-white`→`text-on-point`만 바꿨다. `globals.css`의 기본값은 흰색이라 다른 도구는 영향이 없다.
- `@theme` 변경은 실행 중인 Turbopack 개발 서버에 반영되지 않았다. 개발 서버를 재시작해야 새 토큰 유틸리티가 생긴다.

## 관련 코드
- `apps/services/components/works/11_StageLighting/useStageScene.ts` — 객석 카메라, 휠 화각 줌, W·A·S·D 둘러보기
- `apps/services/components/works/11_StageLighting/show.ts` — `CustomLine`, 라인 도우미, 저장·불러오기
- `apps/services/components/works/11_StageLighting/Outliner.tsx` — 라인 폴더·끌어 옮기기
- `apps/services/components/works/11_StageLighting/LinePanel.tsx` — 고른 라인 패널
- `apps/services/components/works/11_StageLighting/Toolbar.tsx`, `ui.ts` — 모드/스위치 구분, `DARK_THEME`
- `apps/services/components/works/11_StageLighting/SeatSelect.tsx` — 좌석 미리보기 배치
- `apps/services/app/globals.css` — `surface`·`on-point` 토큰
