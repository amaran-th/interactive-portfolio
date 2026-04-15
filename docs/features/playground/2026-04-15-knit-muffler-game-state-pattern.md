# KnitMuffler GameState 상태 패턴 적용

## 배경

`useKnittingGame`에는 화면·모드·컨텍스트를 표현하는 5개의 독립 상태가 있었다.

```typescript
const [screen, setScreen] = useState<Screen>("select");
const [mode, setMode] = useState<Mode | null>(null);
const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
const [freeSlotIndex, setFreeSlotIndex] = useState<number | null>(null);
const [freeName, setFreeName] = useState("");
```

이 구조에서는 `mode = "challenge"` 이면서 `challengeCtx = null`인 일관성 없는 상태가 타입 수준에서 허용됐다. 또한 화면 전환마다 여러 setter를 동기적으로 호출해야 했다.

## 해결: discriminated union GameState

```typescript
export type GameState =
  | { screen: "select" }
  | { screen: "play" | "result"; mode: "challenge"; level: ChallengeLevel; draftId: number; draft: Draft }
  | { screen: "play" | "result"; mode: "free"; slotIndex: number; name: string };
```

세 가지 상태만 존재하며, 각 상태에서 필요한 필드가 정확히 포함된다. 불가능한 상태 조합은 타입 수준에서 제거된다.

- `{ screen: "select" }` — 선택 화면, mode/level/slotIndex 없음
- challenge 분기 — `level`, `draftId`, `draft`가 항상 존재
- free 분기 — `slotIndex`, `name`이 항상 존재

## loadFreeRows 분리

기존 `resumeFromFreeSave`는 뜨개 상태 로드와 game state 설정을 한 함수에서 처리했다. 이를 분리해 `loadFreeRows`는 뜨개 상태(rows, elapsed, stitchCount)만 담당하게 했다.

```typescript
const loadFreeRows = useCallback(
  (rows: Stitch[][], savedElapsed: number, stitchCount: Width) => {
    setCurrentThread(DEFAULT_THREAD);
    setStarted(false);
    dispatch({ type: "LOAD_ROWS", rows, stitchCount });
    resetTimer(savedElapsed);
  },
  [resetTimer],
);
```

이를 통해 `startFreeSlot`, `resumeFreeSlot`, `viewFreeSave`, `resumeFree` 각각이 자신에게 맞는 `GameState`를 설정할 수 있게 됐다.

## 화면 전환

play → result 전환 시 mode/level/draft 정보를 유지해야 하므로 스프레드를 사용한다.

```typescript
setGameState((prev) =>
  prev.screen === "play" ? { ...prev, screen: "result" } : prev,
);
```

## 소비자(컴포넌트)에서의 타입 좁히기

`PlayScreen`은 `gameState`를 받아 필요한 값을 타입 좁히기로 도출한다.

```typescript
const mode = gameState.screen !== "select" ? gameState.mode : null;
const challengeDraft = gameState.screen !== "select" && gameState.mode === "challenge"
  ? gameState.draft : null;
const freeName = gameState.screen !== "select" && gameState.mode === "free"
  ? gameState.name : "";
```

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — GameState 정의 및 상태 통합
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler.tsx` — gameState.screen으로 화면 분기
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — gameState에서 값 도출
