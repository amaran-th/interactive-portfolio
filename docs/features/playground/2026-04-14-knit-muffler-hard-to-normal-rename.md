# KnitMuffler 챌린지 레벨 HARD → NORMAL 명칭 변경

챌린지 모드의 두 번째 난이도 레벨 명칭을 `hard`에서 `normal`로 전면 변경했다.

## 변경 범위

타입 정의부터 UI 문자열까지 총 8개 파일에 걸쳐 일관되게 적용되었다.

| 파일 | 변경 내용 |
|------|----------|
| `type.ts` | `ChallengeLevel` 유니온 타입: `"hard"` → `"normal"` |
| `data.ts` | `HARD_DRAFTS` 상수 → `NORMAL_DRAFTS` |
| `utils.ts` | `calcMedal` 함수 시그니처 및 JSDoc 주석 |
| `SelectScreen.tsx` | import, `NORMAL_ENTRIES` 변수명, state 키, `label` prop, `level` prop |
| `KnitMuffler.tsx` | 타이틀 문자열, `showSlipCount` 조건 비교 |
| `ResultModal.tsx` | 레벨 레이블 표시, 실수 횟수 조건부 렌더링 |
| `useKnittingGame.ts` | import, `DRAFT_MAP` 키, slip 코 생성 조건 |
| `useKnittingStorage.ts` | import, `getChallengeProgress` 내 분기 |

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/type.ts` — `ChallengeLevel` 타입 정의
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/data.ts` — 도안 데이터 상수
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — 게임 로직 훅
