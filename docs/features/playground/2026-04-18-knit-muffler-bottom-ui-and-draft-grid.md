# KnitMuffler — 하단 조작 UI 개편 및 DraftPreview 그리드 선 방식 변경

## 하단 조작 영역 레이아웃 재구성

기존에는 색상 팔레트, 코 종류 선택기, 풀기 버튼이 각각 분리된 컨테이너로 수직 배치되어 있었다.
이를 하나의 통합 하단 바(`border-t border-stone-200 bg-white/90`)로 묶고, 내부를 수평 분할 구조로 변경했다.

- 코 종류 선택기(하드/자유 모드)를 팔레트 좌측에 세로 배치
- 기존 `Space` 텍스트 → "모양 바꾸기 (Space)" 버튼으로 교체, `handleToggleStitchType` 연결
- 풀기 버튼을 팔레트 하단에 인라인 배치, 별도 `rounded-2xl` 컨테이너 제거

## DraftPreview 그리드 선 방식 변경

기존 방식: `divide-y divide-gray-400` + 셀별 `border-r border-gray-400`

이 방식은 각 행에 `border-top: 1px`이 추가되어 행 수만큼 컴포넌트 총 높이가 누적되는 문제가 있었다.

변경 후: `gap-px bg-gray-400` (컨테이너·행 모두 적용), 셀 배경 폴백은 `white`

컨테이너와 행의 배경을 `gray-400`으로 설정하고, 셀 사이의 1px gap이 배경색으로 채워져 그리드 선처럼 보인다. 각 셀의 높이는 `cellSize`로 정확히 고정되며, border로 인한 누적 오차가 없다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 하단 조작 영역 레이아웃
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/DraftPreview.tsx` — gap 기반 그리드 선
