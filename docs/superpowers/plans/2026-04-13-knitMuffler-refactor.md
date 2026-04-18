# KnitMuffler Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능 변경 없이 KnitMuffler 게임의 데이터 구조(reducer, challenge ctx 통합, timer API)와 컴포넌트 구조(PlayScreen 분리)를 개선한다.

**Architecture:** `useTimer`를 `{ elapsed, reset }` 반환 방식으로 변경하고, `useKnittingGame`에서 knitting state를 `useReducer`로 통합하며 challenge state 3개를 단일 객체로 묶는다. Play UI를 `PlayScreen.tsx`로 분리하고 `KnitMuffler.tsx`는 화면 전환 shell로 축소한다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript

---

## File Map

| 파일                   | 변화                                           |
| ---------------------- | ---------------------------------------------- |
| `useTimer.tsx`         | 수정 — `reset(base?)` 함수 반환 방식으로 변경  |
| `useKnittingGame.ts`   | 수정 — reducer + ChallengeCtx + free 로직 흡수 |
| `PlayScreen.tsx`       | **신규** — play/result UI 전담                 |
| `KnitMuffler.tsx`      | 수정 — thin shell로 축소                       |
| `ResultModal.tsx`      | 수정 — `resultModalRef` prop 제거 (미사용)     |
| `SelectScreen.tsx`     | 변경 없음                                      |
| `useKnittingStats.tsx` | 변경 없음                                      |
| `useResultExport.ts`   | 변경 없음                                      |

---

## Task 1: `useTimer.tsx` — reset 함수 반환 방식으로 변경

**Files:**

- Modify: `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useTimer.tsx`

현재 `resetKey` 증가 트릭과 `elapsedOffset` 분리 관리 방식을 제거하고,
`reset(base?)` 함수를 반환해 호출 측에서 직접 제어한다.

- [ ] **Step 1: `useTimer.tsx` 전체 교체**

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer(running: boolean): {
  elapsed: number;
  reset: (base?: number) => void;
} {
  const [elapsed, setElapsed] = useState(0);
  const baseRef = useRef(0);
  const countRef = useRef(0);

  const reset = useCallback((base = 0) => {
    baseRef.current = base;
    countRef.current = 0;
    setElapsed(base);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      countRef.current += 1;
      setElapsed(baseRef.current + countRef.current);
    }, 10);
    return () => clearInterval(id);
  }, [running]);

  return { elapsed, reset };
}
```

- [ ] **Step 2: lint 확인**

```bash
npm run lint
```

타입/lint 오류가 있으면 수정한다. `useKnittingGame.ts`는 아직 수정 전이라 오류가 날 수 있음 — Task 2에서 해결.

- [ ] **Step 3: commit**

```bash
git add app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useTimer.tsx
git commit -m "refactor: useTimer returns { elapsed, reset } instead of resetKey pattern"
```

---

## Task 2: `useKnittingGame.ts` — reducer + ChallengeCtx + free 로직 통합

**Files:**

- Modify: `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts`

변경 목록:

- `ChallengeCtx` 타입으로 challenge state 3개 통합
- `KnittingState` + `knittingReducer`로 knitting state 통합, `currentStitch` 제거
- `useTimer` 새 API 적용 (`started`, `resetKey`, `elapsedOffset` 제거)
- free 모드 저장 로직 4개 handler를 hook 내부로 이동
- `generatedDraft` dead code 제거

- [ ] **Step 1: `useKnittingGame.ts` 전체 교체**

```typescript
"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { EASY_DRAFTS, NORMAL_DRAFTS, STITCH_COUNT } from "./data";
import { ChallengeLevel, Color, Mode, Screen, Stitch } from "./type";
import { useKnittingStats } from "./useKnittingStats";
import { useTimer } from "./useTimer";
import {
  clearFreeSave,
  getFreeSave,
  saveFreeMuffler,
} from "./useKnittingStorage";

// --- Challenge context ---
export type ChallengeCtx = {
  level: ChallengeLevel;
  draftKey: string;
  draft: number[][];
};

// --- Knitting reducer ---
type KnittingState = {
  knittedRows: Stitch[][];
  currentRow: Stitch[];
  currentRowEverKnitted: boolean;
};

const INITIAL_KNITTING: KnittingState = {
  knittedRows: [],
  currentRow: [],
  currentRowEverKnitted: false,
};

type KnittingAction =
  | { type: "KNIT"; stitch: Stitch }
  | { type: "UNRAVEL"; mode: Mode }
  | { type: "RESET" }
  | { type: "LOAD_ROWS"; rows: Stitch[][] };

function knittingReducer(
  state: KnittingState,
  action: KnittingAction,
): KnittingState {
  switch (action.type) {
    case "KNIT": {
      const nextRow = [...state.currentRow, action.stitch];
      if (nextRow.length === STITCH_COUNT) {
        return {
          knittedRows: [...state.knittedRows, nextRow],
          currentRow: [],
          currentRowEverKnitted: false,
        };
      }
      return { ...state, currentRow: nextRow, currentRowEverKnitted: true };
    }
    case "UNRAVEL": {
      if (action.mode === "free") {
        if (state.currentRow.length > 0) {
          return { ...state, currentRow: state.currentRow.slice(0, -1) };
        }
        if (state.knittedRows.length === 0) return state;
        const prev = state.knittedRows[state.knittedRows.length - 1];
        return {
          knittedRows: state.knittedRows.slice(0, -1),
          currentRow: prev,
          currentRowEverKnitted: true,
        };
      }
      // challenge mode
      if (!state.currentRowEverKnitted) {
        if (state.knittedRows.length === 0) return state;
        const prev = state.knittedRows[state.knittedRows.length - 1];
        return {
          knittedRows: state.knittedRows.slice(0, -1),
          currentRow: prev.slice(0, -1),
          currentRowEverKnitted: true,
        };
      }
      if (state.currentRow.length === 0) return state;
      return { ...state, currentRow: state.currentRow.slice(0, -1) };
    }
    case "RESET":
      return INITIAL_KNITTING;
    case "LOAD_ROWS":
      return { ...INITIAL_KNITTING, knittedRows: action.rows };
  }
}

// ---

const DEFAULT_THREAD = Color.BLUE;

const DRAFT_MAP: Record<ChallengeLevel, Record<string, number[][]>> = {
  easy: EASY_DRAFTS,
  normal: NORMAL_DRAFTS,
};

export function useKnittingGame() {
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
  const [currentThread, setCurrentThread] = useState<Color>(DEFAULT_THREAD);
  const [started, setStarted] = useState(false);
  const [knitting, dispatch] = useReducer(knittingReducer, INITIAL_KNITTING);
  const { elapsed, reset: resetTimer } = useTimer(started);

  const { knittedRows, currentRow, currentRowEverKnitted } = knitting;
  const challengeDraft = challengeCtx?.draft ?? Object.values(EASY_DRAFTS)[0];

  const activeRows = useMemo(
    () => (currentRow.length > 0 ? [...knittedRows, currentRow] : knittedRows),
    [currentRow, knittedRows],
  );

  const finalRows = useMemo(
    () => (screen === "result" ? activeRows : knittedRows),
    [activeRows, knittedRows, screen],
  );

  const isChallengeComplete = useMemo(
    () =>
      mode === "challenge" &&
      knittedRows.length === challengeDraft.length &&
      currentRow.length === 0,
    [challengeDraft.length, currentRow.length, knittedRows.length, mode],
  );

  const { slipCount, colorAccuracy, progress, spm } = useKnittingStats({
    draft: challengeDraft,
    stitches: activeRows,
    elapsed,
  });

  const resetKnitting = useCallback(() => {
    setCurrentThread(DEFAULT_THREAD);
    setStarted(false);
    dispatch({ type: "RESET" });
    resetTimer();
  }, [resetTimer]);

  const startMode = useCallback(
    (nextMode: Mode) => {
      resetKnitting();
      setMode(nextMode);
      setScreen("play");
    },
    [resetKnitting],
  );

  const startChallenge = useCallback(
    (level: ChallengeLevel, draftKey: string) => {
      const draft = DRAFT_MAP[level][draftKey];
      if (!draft) return;
      resetKnitting();
      setChallengeCtx({ level, draftKey, draft });
      setMode("challenge");
      setScreen("play");
    },
    [resetKnitting],
  );

  const resumeFromFreeSave = useCallback(
    (rows: Stitch[][], savedElapsed: number) => {
      resetKnitting();
      setMode("free");
      dispatch({ type: "LOAD_ROWS", rows });
      resetTimer(savedElapsed);
      setScreen("play");
    },
    [resetKnitting, resetTimer],
  );

  const loadFreeSaveAsResult = useCallback(
    (rows: Stitch[][], savedElapsed: number) => {
      resetKnitting();
      setMode("free");
      dispatch({ type: "LOAD_ROWS", rows });
      resetTimer(savedElapsed);
      setScreen("result");
    },
    [resetKnitting, resetTimer],
  );

  // Free mode handlers — storage 접근은 hook 내부에서만
  const startFree = useCallback(() => {
    const saved = getFreeSave();
    if (saved) {
      loadFreeSaveAsResult(saved.rows, saved.elapsed);
    } else {
      startMode("free");
    }
  }, [loadFreeSaveAsResult, startMode]);

  const finishFree = useCallback(() => {
    if (activeRows.length === 0) return;
    saveFreeMuffler(activeRows, elapsed);
    setStarted(false);
    setScreen("result");
  }, [activeRows, elapsed]);

  const resumeFree = useCallback(() => {
    const saved = getFreeSave();
    if (saved) {
      resumeFromFreeSave(saved.rows, saved.elapsed);
    } else if (mode === "free") {
      setScreen("play");
    }
  }, [mode, resumeFromFreeSave]);

  const restartFree = useCallback(() => {
    clearFreeSave();
    startMode("free");
  }, [startMode]);

  const handleBackToSelect = useCallback(() => {
    resetKnitting();
    setMode(null);
    setChallengeCtx(null);
    setScreen("select");
  }, [resetKnitting]);

  const handleInitialize = useCallback(() => {
    resetKnitting();
  }, [resetKnitting]);

  const handleKnit = useCallback(
    (colorOverride?: Color) => {
      if (screen !== "play") return;

      if (isChallengeComplete) {
        setStarted(false);
        setScreen("result");
        return;
      }

      if (!started) setStarted(true);

      const stitch: Stitch = {
        color: colorOverride ?? currentThread,
        slipped:
          mode === "challenge" && challengeCtx?.level === "normal"
            ? Math.random() < 0.2
            : false,
      };

      dispatch({ type: "KNIT", stitch });
    },
    [
      challengeCtx?.level,
      currentThread,
      isChallengeComplete,
      mode,
      screen,
      started,
    ],
  );

  const handleUnravel = useCallback(() => {
    if (screen !== "play" || mode === null) return;
    dispatch({ type: "UNRAVEL", mode });
  }, [mode, screen]);

  const handleSelectColorAndKnit = useCallback(
    (id: number) => {
      if (screen !== "play") return;
      const color = id as Color;
      if (!Object.values(Color).includes(color)) return;
      setCurrentThread(color);
      handleKnit(color);
    },
    [handleKnit, screen],
  );

  useEffect(() => {
    if (screen !== "play") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.code) {
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
        case "Digit0":
          handleSelectColorAndKnit(parseInt(e.code.replace("Digit", ""), 10));
          break;
        case "Backspace":
          handleUnravel();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSelectColorAndKnit, handleUnravel, screen]);

  return {
    screen,
    mode,
    challengeCtx,
    currentThread,
    knittedRows,
    currentRow,
    currentRowEverKnitted,
    activeRows,
    finalRows,
    isChallengeComplete,
    elapsed,
    slipCount,
    colorAccuracy,
    progress,
    spm,
    startChallenge,
    startFree,
    finishFree,
    resumeFree,
    restartFree,
    handleBackToSelect,
    handleInitialize,
    handleUnravel,
    handleSelectColorAndKnit,
  };
}
```

- [ ] **Step 2: lint 확인 — 타입 오류는 Task 3/4에서 해결됨**

```bash
npm run lint
```

`KnitMuffler.tsx`에서 이전 반환값(`challengeLevel`, `challengeDraftKey`, `finishSession` 등)을 참조하는 오류가 나타날 수 있다. Task 4에서 해결하므로 여기서는 `useKnittingGame.ts`와 `useTimer.tsx` 자체 오류만 없으면 된다.

- [ ] **Step 3: commit**

```bash
git add app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts
git commit -m "refactor: useKnittingGame — useReducer for knitting state, ChallengeCtx, free mode handlers"
```

---

## Task 3: `PlayScreen.tsx` — play/result UI 신규 파일

**Files:**

- Create: `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx`

현재 `KnitMuffler.tsx`의 play UI 전체를 이동. `useResultExport`도 여기서 호출한다.
`ResultModal`도 이 파일에서 렌더한다.

- [ ] **Step 1: `PlayScreen.tsx` 생성**

```typescript
"use client";

import { House, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PALETTES, STITCH_COUNT } from "./data";
import DraftPreview from "./DraftPreview";
import { MufflerPreview } from "./MufflerPreview";
import ResultModal from "./ResultModal";
import Status from "./Status";
import { ColorMode } from "./type";
import { useKnittingGame } from "./useKnittingGame";
import { useResultExport } from "./useResultExport";

type Props = {
  game: ReturnType<typeof useKnittingGame>;
  colorMode: ColorMode;
};

export function PlayScreen({ game, colorMode }: Props) {
  const {
    screen,
    mode,
    challengeCtx,
    currentThread,
    knittedRows,
    currentRow,
    currentRowEverKnitted,
    activeRows,
    finalRows,
    isChallengeComplete,
    elapsed,
    slipCount,
    colorAccuracy,
    progress,
    spm,
    finishFree,
    resumeFree,
    restartFree,
    handleBackToSelect,
    handleInitialize,
    handleUnravel,
    handleSelectColorAndKnit,
  } = game;

  const scrollRef = useRef<HTMLDivElement>(null);
  const { resultCaptureRef, isSavingResult, handleSaveResult } =
    useResultExport({ finalRows, mode });

  const challengeLevel = challengeCtx?.level ?? null;
  const challengeDraftKey = challengeCtx?.draftKey ?? null;
  const challengeDraft = challengeCtx?.draft ?? [];

  // 목도리 영역 스크롤: 항상 하단 유지
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeRows.length]);

  const palette = useMemo(() => {
    const list = Object.values(PALETTES[colorMode]);
    list.push(list.shift()!);
    return list;
  }, [colorMode]);

  const isUnravelDisabled =
    mode === "free"
      ? currentRow.length === 0 && knittedRows.length === 0
      : currentRowEverKnitted
        ? currentRow.length === 0
        : knittedRows.length === 0;

  const isSaveDisabled =
    (knittedRows.length === 0 && currentRow.length < STITCH_COUNT) ||
    (currentRow.length > 0 && currentRow.length < STITCH_COUNT);

  return (
    <div className="font-knit-muffler relative flex h-full overflow-hidden bg-white text-black">
      <div
        className={`flex h-full w-full flex-col ${
          screen === "result" ? "blur-md pointer-events-none select-none" : ""
        }`}
      >
        {/* 상단 좌측 버튼 */}
        <div className="absolute top-4 left-4 z-70 flex gap-1 sm:gap-2">
          <button
            onClick={handleBackToSelect}
            className="rounded-full border border-gray-300 bg-white/90 p-2 text-sm shadow-sm"
          >
            <House className="size-5 sm:size-6" />
          </button>
          <button
            onClick={handleInitialize}
            className="rounded-full border border-gray-300 bg-white/90 p-2 text-sm shadow-sm"
          >
            <RotateCcw className="size-5 sm:size-6" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center">
          {/* 타이틀 */}
          <div className="px-14 py-5 text-lg font-bold text-center md:p-6 md:text-xl">
            {mode === "challenge"
              ? `챌린지 모드${challengeLevel ? ` · ${challengeLevel === "easy" ? "EASY" : "NORMAL"}` : ""}`
              : "자유 모드"}
          </div>

          {/* 자유 모드 저장하기 버튼 */}
          {mode === "free" && (
            <div className="absolute top-4 right-4 z-70 flex gap-2">
              <button
                onClick={finishFree}
                disabled={isSaveDisabled}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                저장하기
              </button>
            </div>
          )}

          {/* 챌린지 모드 - 모바일 Status + 도안 */}
          {mode === "challenge" && (
            <div className="w-full px-4 pb-3 md:hidden">
              <div className="grid grid-cols-2 gap-3 items-start">
                <Status
                  elapsed={elapsed}
                  slipCount={slipCount}
                  colorAccuracy={colorAccuracy}
                  progress={progress}
                  spm={spm}
                  showSlipCount={challengeLevel === "normal"}
                />
                <div className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-stone-500">도안</p>
                  <DraftPreview
                    draft={challengeDraft}
                    currentRowIndex={knittedRows.length}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 챌린지 모드 - 데스크탑 Status */}
          {mode === "challenge" && (
            <div className="absolute left-4 top-20 hidden flex-col justify-center gap-4 md:flex">
              <Status
                elapsed={elapsed}
                slipCount={slipCount}
                colorAccuracy={colorAccuracy}
                progress={progress}
                spm={spm}
                showSlipCount={challengeLevel === "normal"}
              />
            </div>
          )}

          {/* 챌린지 모드 - 데스크탑 도안 */}
          {mode === "challenge" && (
            <div className="absolute right-4 top-20 hidden flex-col items-center justify-center gap-4 rounded-md bg-gray-50 p-4 shadow-md md:flex">
              <p>도안</p>
              <DraftPreview
                draft={challengeDraft}
                currentRowIndex={knittedRows.length}
              />
            </div>
          )}

          {/* 목도리 영역 (하단 정렬) */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto w-full"
          >
            <div className="flex min-h-full flex-col justify-end w-full">
              <MufflerPreview
                rows={
                  isChallengeComplete
                    ? knittedRows
                    : [...knittedRows, currentRow]
                }
              />
            </div>
          </div>

          {/* 색상 팔레트 + 풀기 버튼 */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-full max-w-70 px-4 md:w-auto md:max-w-fit">
              <div className="grid grid-cols-5 justify-items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 px-3 py-3 shadow-md backdrop-blur-sm md:flex md:items-end md:gap-2 md:px-4">
                {palette.map((color) => (
                  <div
                    key={color.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <button
                      onClick={() => handleSelectColorAndKnit(color.id)}
                      className={`select-none h-8 w-8 rounded-full text-xs border border-stone-200 transition-all ${currentThread === color.id ? "ring-2 ring-stone-900 ring-offset-2" : "hover:ring-2 hover:ring-stone-300"}`}
                      style={{
                        backgroundColor: color.fill,
                        color: color.text,
                      }}
                      aria-label={`${color.id}번 실 선택`}
                    >
                      {color.id}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white/90 p-3 shadow-md backdrop-blur-sm">
                <button
                  onClick={handleUnravel}
                  disabled={isUnravelDisabled}
                  className="w-full rounded border border-stone-300 bg-stone-100 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
                >
                  풀기(Backspace)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {screen === "result" && mode && (
        <ResultModal
          resultCaptureRef={resultCaptureRef}
          mode={mode}
          challengeLevel={challengeLevel}
          challengeDraftKey={challengeDraftKey}
          finalRows={finalRows}
          elapsed={elapsed}
          slipCount={slipCount}
          colorAccuracy={colorAccuracy}
          spm={spm}
          challengeDraft={challengeDraft}
          isSavingResult={isSavingResult}
          onSaveResult={handleSaveResult}
          onResumeFreeMode={resumeFree}
          onRestartFreeMode={restartFree}
          onBackToSelect={handleBackToSelect}
          onInitialize={handleInitialize}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: lint 확인**

```bash
npm run lint
```

오류가 있으면 수정한다. `ResultModal`의 `resultModalRef` prop 관련 타입 오류는 Task 4에서 해결.

- [ ] **Step 3: commit**

```bash
git add app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx
git commit -m "feat: extract PlayScreen from KnitMuffler"
```

---

## Task 4: `KnitMuffler.tsx` thin shell + `ResultModal.tsx` prop 정리

**Files:**

- Modify: `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx`

`resultModalRef`는 `KnitMuffler`에서 생성되어 `ResultModal`로 전달되지만 아무데서도 읽히지 않는 dead code다. 제거한다.

- [ ] **Step 1: `ResultModal.tsx`에서 `resultModalRef` prop 제거**

`ResultModal` 컴포넌트의 props 타입과 구현에서 `resultModalRef` 제거.
내부 div의 `ref={resultModalRef}`도 제거.

```typescript
// 변경 전 props
{
  resultModalRef: RefObject<HTMLDivElement | null>;
  resultCaptureRef: RefObject<HTMLDivElement | null>;
  // ...
}

// 변경 후 props — resultModalRef 삭제
{
  resultCaptureRef: RefObject<HTMLDivElement | null>;
  // ...
}
```

[ResultModal.tsx:261-278](<app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx>)의 props 타입 블록에서 `resultModalRef: RefObject<HTMLDivElement | null>;` 줄 삭제.
[ResultModal.tsx:289](<app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx>)의 `ref={resultModalRef}` 속성 삭제.
[ResultModal.tsx:243](<app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx>)의 함수 파라미터에서 `resultModalRef,` 삭제.
파일 상단 `import { RefObject, useState }` 에서 RefObject가 resultCaptureRef에도 쓰이므로 유지.

- [ ] **Step 2: `KnitMuffler.tsx` thin shell로 교체**

```typescript
"use client";

import { useState } from "react";
import { ColorModeContext } from "./ColorModeContext";
import { PlayScreen } from "./PlayScreen";
import SelectScreen from "./SelectScreen";
import { ColorMode } from "./type";
import { useKnittingGame } from "./useKnittingGame";

export default function KnitMuffler() {
  const [colorMode, setColorMode] = useState<ColorMode>("normal");
  const game = useKnittingGame();

  return (
    <ColorModeContext.Provider value={colorMode}>
      {game.screen === "select" ? (
        <SelectScreen
          onStartChallenge={game.startChallenge}
          onStartFree={game.startFree}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />
      ) : (
        <PlayScreen game={game} colorMode={colorMode} />
      )}
    </ColorModeContext.Provider>
  );
}
```

- [ ] **Step 3: lint + build 확인**

```bash
npm run lint && npm run build
```

오류가 없어야 한다. 있으면 수정한다.

- [ ] **Step 4: 수동 동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 다음 시나리오 확인:

1. **EASY 챌린지**: 도안 선택 → 뜨기(숫자 키) → Backspace 풀기 → 완성 → 결과 화면 확인 → 기록 저장 확인 → 홈 버튼
2. **NORMAL 챌린지**: 선택 → 뜨기 → 실수(슬립) 발생 확인 → 결과 화면
3. **자유 모드**: 뜨기 → 저장하기 → 결과 화면 → 이어뜨기 → 다시 만들기
4. **색약 모드 토글**: SelectScreen에서 toggle → 색상 변경 확인
5. **기록 초기화**: SelectScreen에서 초기화 → 기록 사라짐 확인
6. **키보드**: 1~9, 0, Backspace 동작 확인

- [ ] **Step 5: commit**

```bash
git add app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler.tsx \
        app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ResultModal.tsx
git commit -m "refactor: KnitMuffler thin shell, remove resultModalRef dead code"
```
