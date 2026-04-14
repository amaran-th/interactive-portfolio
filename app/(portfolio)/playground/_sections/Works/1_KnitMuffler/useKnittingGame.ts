"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Draft, EASY_DRAFTS, NORMAL_DRAFTS } from "./data";
import { ChallengeLevel, Color, Mode, Screen, Stitch, Width } from "./type";
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
  stitchCount: Width;
  knittedRows: Stitch[][];
  currentRow: Stitch[];
  currentRowEverKnitted: boolean;
};

const INITIAL_KNITTING: KnittingState = {
  stitchCount: 10,
  knittedRows: [],
  currentRow: [],
  currentRowEverKnitted: false,
};

type KnittingAction =
  | { type: "KNIT"; stitch: Stitch }
  | { type: "UNRAVEL"; mode: Mode }
  | { type: "RESET"; stitchCount?: Width }
  | { type: "LOAD_ROWS"; rows: Stitch[][]; stitchCount: Width };

function knittingReducer(
  state: KnittingState,
  action: KnittingAction,
): KnittingState {
  switch (action.type) {
    case "KNIT": {
      const nextRow = [...state.currentRow, action.stitch];
      if (nextRow.length === state.stitchCount) {
        return {
          ...state,
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
          ...state,
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
          ...state,
          knittedRows: state.knittedRows.slice(0, -1),
          currentRow: prev.slice(0, -1),
          currentRowEverKnitted: true,
        };
      }
      if (state.currentRow.length === 0) return state;
      return { ...state, currentRow: state.currentRow.slice(0, -1) };
    }
    case "RESET":
      return { ...INITIAL_KNITTING, stitchCount: action.stitchCount ?? INITIAL_KNITTING.stitchCount };
    case "LOAD_ROWS":
      return { ...INITIAL_KNITTING, stitchCount: action.stitchCount, knittedRows: action.rows };
  }
}

// ---

const DEFAULT_THREAD = Color.BLUE;


export function useKnittingGame() {
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
  const [freeSlotIndex, setFreeSlotIndex] = useState<number | null>(null);
  const [freeName, setFreeName] = useState("");
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

  const resetKnitting = useCallback((stitchCount?: Width) => {
    setCurrentThread(DEFAULT_THREAD);
    setStarted(false);
    dispatch({ type: "RESET", stitchCount });
    resetTimer();
  }, [resetTimer]);


  const startChallenge = useCallback(
    (level: ChallengeLevel, draftId: number) => {
      const levelDrafts = level === "easy" ? EASY_DRAFTS : NORMAL_DRAFTS;
      const draft = levelDrafts.find((d) => d.id === draftId);
      if (!draft) return;
      resetKnitting(draft.width);
      setChallengeCtx({ level, draftId, draft });
      setMode("challenge");
      setScreen("play");
    },
    [resetKnitting],
  );

  const resumeFromFreeSave = useCallback(
    (rows: Stitch[][], savedElapsed: number, stitchCount: Width) => {
      resetKnitting();
      setMode("free");
      dispatch({ type: "LOAD_ROWS", rows, stitchCount });
      resetTimer(savedElapsed);
      setScreen("play");
    },
    [resetKnitting, resetTimer],
  );


  // Free mode handlers — storage 접근은 hook 내부에서만

  /** 빈 슬롯에서 새 자유 모드 게임 시작 */
  const startFreeSlot = useCallback(
    (slotIndex: number, width: Width, name: string) => {
      resetKnitting(width);
      setFreeSlotIndex(slotIndex);
      setFreeName(name);
      setMode("free");
      setScreen("play");
    },
    [resetKnitting],
  );

  /** 저장된 슬롯 이어하기 (결과 화면 → 플레이) */
  const resumeFreeSlot = useCallback(
    (slotIndex: number) => {
      const saved = getFreeSave(slotIndex);
      if (!saved) return;
      setFreeSlotIndex(slotIndex);
      setFreeName(saved.name);
      resumeFromFreeSave(saved.rows, saved.elapsed, saved.width);
    },
    [resumeFromFreeSave],
  );

  /** 저장하기 버튼 — 현재 슬롯에 저장 후 결과 화면 */
  const finishFree = useCallback(() => {
    if (activeRows.length === 0 || freeSlotIndex === null) return;
    saveFreeMuffler(activeRows, elapsed, knitting.stitchCount, freeName, freeSlotIndex);
    setStarted(false);
    setScreen("result");
  }, [activeRows, elapsed, freeName, freeSlotIndex, knitting.stitchCount]);

  /** 결과 화면의 "이어 뜨기" 버튼 */
  const resumeFree = useCallback(() => {
    if (freeSlotIndex === null) return;
    const saved = getFreeSave(freeSlotIndex);
    if (saved) {
      resumeFromFreeSave(saved.rows, saved.elapsed, saved.width);
    } else if (mode === "free") {
      setScreen("play");
    }
  }, [freeSlotIndex, mode, resumeFromFreeSave]);

  /** 결과 화면의 "다시 시작" 버튼 — 같은 슬롯/너비/이름으로 재시작 */
  const restartFree = useCallback(() => {
    if (freeSlotIndex === null) return;
    clearFreeSave(freeSlotIndex);
    resetKnitting(knitting.stitchCount);
    setMode("free");
    setScreen("play");
  }, [freeSlotIndex, knitting.stitchCount, resetKnitting]);

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
    stitchCount: knitting.stitchCount,
    isChallengeComplete,
    elapsed,
    slipCount,
    colorAccuracy,
    progress,
    spm,
    startChallenge,
    startFreeSlot,
    resumeFreeSlot,
    finishFree,
    resumeFree,
    restartFree,
    handleBackToSelect,
    handleInitialize,
    handleUnravel,
    handleSelectColorAndKnit,
  };
}
