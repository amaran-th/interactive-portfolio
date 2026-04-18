# KnitMuffler — 모바일 레이아웃 개선, SPM 제거, 선택 화면 카드 정보 추가

## 모바일 레이아웃 — 도안 너비 20 대응

챌린지 모드에서 도안 너비가 20수일 경우, 모바일 화면에서 Status와 도안을 수직으로 쌓도록 변경했다.
기존에는 항상 `grid grid-cols-2`로 나란히 배치되었는데, 너비 20 도안은 가로 폭이 커서 두 컬럼 레이아웃이 너무 좁았다.

`challengeDraft?.width === 20` 조건으로 `flex flex-col` / `grid grid-cols-2`를 분기한다.

Status 컴포넌트에 `wrap` prop을 추가했다. `wrap=true`일 때는 `flex flex-col` 대신 `grid grid-cols-2`로 stat 항목을 2열 배치한다. 도안 컨테이너는 `w-full overflow-x-auto`로 전체 너비를 채운다.

## SPM 지표 전면 삭제

SPM(stitch per minute) 값이 의미 있는 피드백을 주지 못한다는 판단으로 전체 코드에서 제거했다.

- `ChallengeStat` 타입에서 `spm` 필드 삭제
- `useKnittingStats` 훅의 spm 계산 제거, `elapsed` 파라미터 제거 (spm 계산에만 쓰였으므로)
- `Status`, `PlayScreen`, `ResultModal`, `SelectScreen`, `useKnittingGame` 전 파일에서 참조 제거
- `SelectScreen`의 `StatBadge`에서 `Zap` 아이콘 제거 → `Clock` 아이콘으로 교체

기존 `localStorage`에 저장된 레코드에 `spm` 필드가 있어도 로드 시 무시되므로 하위 호환 문제는 없다.

## 선택 화면 카드 정보 추가

챌린지 도안 카드(`StatBadge`)에 정확도 외 걸린 시간을 추가했다. `formatElapsedResult(stat.elapsed, false)`로 분/초까지만 표시한다.

자유 슬롯 카드에는 저장된 줄 수(`save.rows.length줄`)를 배지로 추가했다. 시간과 줄 수 배지가 `flex-wrap`으로 배치된다.

## 결과 화면 도안 셀 크기 반응형 적용

`ResultPattern` 컴포넌트의 도안 셀 크기를 고정값 `20`에서 `20 / (draft.width / 10)` 공식으로 변경했다. `ResultMuffler`와 동일한 방식으로, 너비가 클수록 셀이 작아진다.

숫자 표시도 제거(`showNumbers={false}`)하여 색상만 보이는 깔끔한 도안으로 변경했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 모바일 레이아웃 분기
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/Status.tsx` — `wrap` prop 추가, spm 제거
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingStats.tsx` — spm·elapsed 제거
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/type.ts` — `ChallengeStat.spm` 필드 삭제
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — 카드 배지 개선
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx` — 도안 셀 크기 반응형, 숫자 제거
