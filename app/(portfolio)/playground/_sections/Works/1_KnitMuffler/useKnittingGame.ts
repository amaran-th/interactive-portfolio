"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Draft, EASY_DRAFTS, NORMAL_DRAFTS, STITCH_COUNT } from "./data";
import { ChallengeLevel, Color, Mode, Screen, Stitch } from "./type";
import { useKnittingStats } from "./useKnittingStats";
import {
  clearFreeSave,
  getFreeSave,
  saveFreeMuffler,
} from "./useKnittingStorage";
import { useTimer } from "./useTimer";

// --- Challenge context ---
export type ChallengeCtx = {
  level: ChallengeLevel;
  draftId: number;
  draft: Draft;
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
      // 챌린지 모드: currentRowEverKnitted가 true이면 현재 행 내에서만 풀기.
      // currentRow가 빈 상태에서 더 이상 풀기를 허용하지 않는 것은 의도된 동작이며,
      // UI에서 버튼을 비활성화하여 이 상태를 처리한다.
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


export function useKnittingGame() {
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
  const [currentThread, setCurrentThread] = useState<Color>(DEFAULT_THREAD);
  const [started, setStarted] = useState(false);
  const [knitting, dispatch] = useReducer(knittingReducer, INITIAL_KNITTING);
  const { elapsed, reset: resetTimer } = useTimer(started);

  const { knittedRows, currentRow, currentRowEverKnitted } = knitting;
  // 자유 모드나 선택 화면에서 challengeCtx가 null일 때의 fallback.
  // 이 값은 useKnittingStats에 전달되지만, 자유 모드에서는 stats가 UI에 표시되지 않으므로 무해하다.
  const challengeDraft = challengeCtx?.draft ?? EASY_DRAFTS[0];

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
      knittedRows.length === challengeDraft.data.length &&
      currentRow.length === 0,
    [challengeDraft.data.length, currentRow.length, knittedRows.length, mode],
  );

  const { slipCount, colorAccuracy, progress, spm } = useKnittingStats({
    draft: challengeDraft.data,
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
    (level: ChallengeLevel, draftId: number) => {
      const levelDrafts = level === "easy" ? EASY_DRAFTS : NORMAL_DRAFTS;
      const draft = levelDrafts.find((d) => d.id === draftId);
      if (!draft) return;
      resetKnitting();
      setChallengeCtx({ level, draftId, draft });
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
        type: "V",
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
