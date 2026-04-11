# 목도리 뜨기 — 지그재그 뜨기 방향 및 게임 규칙 개선

## 지그재그 표현

짝수 인덱스 행은 좌→우, 홀수 인덱스 행은 우→좌로 뜨이도록 `StitchRow`에서 `displayRow`를 반전한다.

```ts
const isReversed = rowIndex % 2 === 1;
const displayRow = isReversed ? [...row].reverse() : row;
```

다음 코 표시(`nextEmptyIndex`)도 방향에 따라 달리 계산한다.
- 짝수 행: `findIndex` (첫 번째 null)
- 홀수 행: `findLastIndex` (마지막 null — 채워진 코 바로 왼쪽)

`DraftPreview`의 안내 화살표도 홀수 행에서는 우측에 ← 방향으로 표시한다.

## 평가(colorAccuracy) 보정

`useKnittingStats`에서 홀수 행의 draft 비교 인덱스를 반전해 시각적 배치와 일치시킨다.

```ts
const draftX = isReversed ? row.length - 1 - x : x;
```

## 행 완성 자동 커밋

행이 `STITCH_COUNT`에 도달하면 즉시 `knittedRows`에 커밋하고 `currentRow = []`로 리셋한다. 다음 코 표시는 `[...knittedRows, currentRow]`를 MufflerPreview에 전달해 빈 행으로 노출한다.

챌린지 모드 완료 시 `isChallengeComplete`가 `true`가 되고, 다음 뜨기 동작에서 `setStarted(false)`와 함께 result 화면으로 전환된다.

## 풀기 규칙 (챌린지 모드)

`currentRowEverKnitted` 상태로 새 행에 한 번이라도 뜬 적이 있는지 추적한다.

| 상태 | 풀기 동작 |
|------|----------|
| `!currentRowEverKnitted` + 이전 행 있음 | 빈 새 행 삭제 + 이전 행 마지막 코 삭제 |
| `currentRowEverKnitted` + `currentStitch >= 1` | 현재 행 내 마지막 코만 삭제 |
| 그 외 | 비활성화 |

자유 모드는 제한 없이 이전 행으로 되돌아갈 수 있다.

## 기록 저장 자동화

`isBetterMedal(current, existing)` 헬퍼를 추가했다. `existing`이 `null`이면 항상 `true`를 반환해 신규 기록과 메달 향상 케이스를 단일 조건으로 처리한다.

```ts
export function isBetterMedal(current: Medal, existing: Medal | null): boolean {
  if (!existing) return true;
  return MEDAL_RANK[current ?? 0] > MEDAL_RANK[existing];
}
```

## 기록 초기화

`clearAllStats()`는 localStorage에서 `knitMuffler_` 접두사를 가진 모든 키를 삭제한다. `SelectScreen`에 초기화 버튼과 확인 모달을 추가했다.

## Hydration 수정

`SelectScreen`의 `DraftCard`에서 `getChallengeStat`(localStorage 읽기)를 `useEffect`로 이동해 SSR/클라이언트 불일치를 해소했다.

## 관련 코드

- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/MufflerPreview.tsx` — 지그재그 display, nextEmptyIndex 방향 처리
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingStats.tsx` — 홀수 행 draft 인덱스 반전
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/DraftPreview.tsx` — 행 방향별 화살표 위치
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — 행 자동 커밋, `currentRowEverKnitted`, 타이머 정지
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx` — 자동 저장 (`isBetterMedal`)
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — 기록 초기화 버튼, Hydration 수정
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/utils.ts` — `isBetterMedal` 헬퍼
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingStorage.ts` — `clearAllStats`
