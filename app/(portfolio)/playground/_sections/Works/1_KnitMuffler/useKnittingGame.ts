"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Draft, DRAFTS } from "./data";
import { ChallengeLevel, Color, Mode, Stitch, StitchType, Width } from "./type";
import { useKnittingStats } from "./useKnittingStats";
import {
  clearFreeSave,
  getFreeSave,
  saveFreeMuffler,
} from "./useKnittingStorage";
import { useTimer } from "./useTimer";

// --- Game state (discriminated union) ---
// screen + mode + mode별 컨텍스트를 하나의 상태로 관리.
// nullable 상태 조합(mode=null, challengeCtx=null 등)이 불가능해진다.
export type GameState =
  | { screen: "select" }
  | {
      screen: "play" | "result";
      mode: "challenge";
      level: ChallengeLevel;
      draftId: number;
      draft: Draft;
    }
  | {
      screen: "play" | "result";
      mode: "free";
      slotIndex: number;
      name: string;
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
      return {
        ...INITIAL_KNITTING,
        stitchCount: action.stitchCount ?? INITIAL_KNITTING.stitchCount,
      };
    case "LOAD_ROWS":
      return {
        ...INITIAL_KNITTING,
        stitchCount: action.stitchCount,
        knittedRows: action.rows,
      };
  }
}

// ---

const DEFAULT_THREAD = Color.BLUE;
const DEFAULT_STITCH_TYPE = StitchType.V;

export function useKnittingGame({ soundEnabled = true }: { soundEnabled?: boolean } = {}) {
  const [gameState, setGameState] = useState<GameState>({ screen: "select" });
  const [currentThread, setCurrentThread] = useState<Color>(DEFAULT_THREAD);
  const [currentStitchType, setCurrentStitchType] =
    useState<StitchType>(DEFAULT_STITCH_TYPE);
  const [started, setStarted] = useState(false);
  const [knitting, dispatch] = useReducer(knittingReducer, INITIAL_KNITTING);
  const { elapsed, reset: resetTimer } = useTimer(started);

  const failAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    failAudioRef.current = new Audio("/playground/fail.mp3");
  }, []);

  const { knittedRows, currentRow, currentRowEverKnitted } = knitting;

  // 자유 모드나 선택 화면에서 챌린지 draft가 없을 때의 fallback.
  // useKnittingStats에 전달되지만 자유 모드에서는 stats가 UI에 표시되지 않으므로 무해하다.
  const challengeDraft =
    gameState.screen !== "select" && gameState.mode === "challenge"
      ? gameState.draft
      : DRAFTS.easy[0];

  const activeRows = useMemo(
    () => (currentRow.length > 0 ? [...knittedRows, currentRow] : knittedRows),
    [currentRow, knittedRows],
  );

  const finalRows = useMemo(
    () => (gameState.screen === "result" ? activeRows : knittedRows),
    [activeRows, knittedRows, gameState.screen],
  );

  const isChallengeComplete = useMemo(
    () =>
      gameState.screen !== "select" &&
      gameState.mode === "challenge" &&
      knittedRows.length === challengeDraft.data.length &&
      currentRow.length === 0,
    [
      challengeDraft.data.length,
      currentRow.length,
      gameState,
      knittedRows.length,
    ],
  );

  const { slipCount, colorAccuracy, progress } = useKnittingStats({
    draft: challengeDraft.data,
    stitches: activeRows,
    checkStitchType:
      gameState.screen !== "select" &&
      gameState.mode === "challenge" &&
      gameState.level === "hard",
  });

  const handleSelectStitchType = useCallback((type: StitchType) => {
    setCurrentStitchType(type);
  }, []);

  const handleToggleStitchType = useCallback(() => {
    setCurrentStitchType((prev) =>
      prev === StitchType.V ? StitchType.Flower : StitchType.V,
    );
  }, []);

  const resetKnitting = useCallback(
    (stitchCount?: Width) => {
      setCurrentThread(DEFAULT_THREAD);
      setCurrentStitchType(DEFAULT_STITCH_TYPE);
      setStarted(false);
      dispatch({ type: "RESET", stitchCount });
      resetTimer();
    },
    [resetTimer],
  );

  /** 자유 모드 저장 데이터를 뜨개 상태에만 로드 (gameState는 호출자가 설정) */
  const loadFreeRows = useCallback(
    (rows: Stitch[][], savedElapsed: number, stitchCount: Width) => {
      setCurrentThread(DEFAULT_THREAD);
      setStarted(false);
      dispatch({ type: "LOAD_ROWS", rows, stitchCount });
      resetTimer(savedElapsed);
    },
    [resetTimer],
  );

  const startChallenge = useCallback(
    (level: ChallengeLevel, draftId: number) => {
      const levelDrafts = DRAFTS[level];
      const draft = levelDrafts.find((d) => d.id === draftId);
      if (!draft) return;
      resetKnitting(draft.width);
      setGameState({
        screen: "play",
        mode: "challenge",
        level,
        draftId,
        draft,
      });
    },
    [resetKnitting],
  );

  // Free mode handlers — storage 접근은 hook 내부에서만

  /** 저장된 슬롯을 결과 화면으로 바로 열기 */
  const viewFreeSave = useCallback(
    (slotIndex: number) => {
      const saved = getFreeSave(slotIndex);
      if (!saved) return;
      loadFreeRows(saved.rows, saved.elapsed, saved.width);
      setGameState({
        screen: "result",
        mode: "free",
        slotIndex,
        name: saved.name,
      });
    },
    [loadFreeRows],
  );

  /** 빈 슬롯에서 새 자유 모드 게임 시작 (너비는 플레이 화면에서 선택, 이름은 결과 화면에서 입력) */
  const startFreeSlot = useCallback(
    (slotIndex: number) => {
      resetKnitting(10);
      setGameState({ screen: "play", mode: "free", slotIndex, name: "" });
    },
    [resetKnitting],
  );

  /** 저장된 슬롯 이어하기 */
  const resumeFreeSlot = useCallback(
    (slotIndex: number) => {
      const saved = getFreeSave(slotIndex);
      if (!saved) return;
      loadFreeRows(saved.rows, saved.elapsed, saved.width);
      setGameState({
        screen: "play",
        mode: "free",
        slotIndex,
        name: saved.name,
      });
    },
    [loadFreeRows],
  );

  /** 저장하기 버튼 — 현재 슬롯에 저장 후 결과 화면 */
  const finishFree = useCallback(() => {
    if (gameState.screen !== "play" || gameState.mode !== "free") return;
    if (activeRows.length === 0) return;
    const { slotIndex, name } = gameState;
    saveFreeMuffler(activeRows, elapsed, knitting.stitchCount, name, slotIndex);
    setStarted(false);
    setGameState({ screen: "result", mode: "free", slotIndex, name });
  }, [gameState, activeRows, elapsed, knitting.stitchCount]);

  /** 결과 화면의 "이어 뜨기" 버튼 */
  const resumeFree = useCallback(() => {
    if (gameState.screen !== "result" || gameState.mode !== "free") return;
    const { slotIndex, name } = gameState;
    const saved = getFreeSave(slotIndex);
    if (saved) {
      loadFreeRows(saved.rows, saved.elapsed, saved.width);
      setGameState({
        screen: "play",
        mode: "free",
        slotIndex,
        name: saved.name,
      });
    } else {
      setGameState({ screen: "play", mode: "free", slotIndex, name });
    }
  }, [gameState, loadFreeRows]);

  /** 결과 화면의 "다시 시작" 버튼 — 같은 슬롯/너비로 재시작, 이름 초기화 */
  const restartFree = useCallback(() => {
    if (gameState.screen !== "result" || gameState.mode !== "free") return;
    const { slotIndex } = gameState;
    clearFreeSave(slotIndex);
    resetKnitting(knitting.stitchCount);
    setGameState({ screen: "play", mode: "free", slotIndex, name: "" });
  }, [gameState, knitting.stitchCount, resetKnitting]);

  /** 자유 모드 결과 화면에서 이름 저장 — storage 즉시 업데이트 */
  const handleSaveFreeName = useCallback(
    (name: string) => {
      if (gameState.screen === "select" || gameState.mode !== "free") return;
      const { slotIndex } = gameState;
      setGameState((prev) =>
        prev.screen !== "select" && prev.mode === "free"
          ? { ...prev, name }
          : prev,
      );
      const saved = getFreeSave(slotIndex);
      if (!saved) return;
      saveFreeMuffler(saved.rows, saved.elapsed, saved.width, name, slotIndex);
    },
    [gameState],
  );

  /** 자유 모드 플레이 화면에서 너비 전환 — 작업 내용 초기화 포함 */
  const handleChangeWidth = useCallback(
    (width: Width) => {
      resetKnitting(width);
    },
    [resetKnitting],
  );

  const handleBackToSelect = useCallback(() => {
    resetKnitting();
    setGameState({ screen: "select" });
  }, [resetKnitting]);

  /** 플레이 화면 초기화 버튼 — 현재 너비 유지, result 화면에서 호출 시 play로 복귀 */
  const handleInitialize = useCallback(() => {
    resetKnitting(knitting.stitchCount);
    setGameState((prev) =>
      prev.screen === "result" ? { ...prev, screen: "play" } : prev,
    );
  }, [knitting.stitchCount, resetKnitting]);

  const handleKnit = useCallback(
    (colorOverride?: Color) => {
      if (gameState.screen !== "play") return;

      if (isChallengeComplete) {
        setStarted(false);
        setGameState((prev) =>
          prev.screen === "play" ? { ...prev, screen: "result" } : prev,
        );
        return;
      }

      if (!started) setStarted(true);

      const slipped =
        gameState.mode === "challenge" && gameState.level !== "easy"
          ? Math.random() < 0.2
          : false;

      if (slipped && soundEnabled && failAudioRef.current) {
        failAudioRef.current.currentTime = 0;
        failAudioRef.current.play().catch(() => {});
      }

      const stitch: Stitch = {
        type: currentStitchType,
        color: colorOverride ?? currentThread,
        slipped,
      };

      dispatch({ type: "KNIT", stitch });
    },
    [currentStitchType, currentThread, gameState, isChallengeComplete, started, soundEnabled],
  );

  const handleUnravel = useCallback(() => {
    if (gameState.screen !== "play") return;
    dispatch({ type: "UNRAVEL", mode: gameState.mode });
  }, [gameState]);

  const handleSelectColorAndKnit = useCallback(
    (id: number) => {
      if (gameState.screen !== "play") return;
      const color = id as Color;
      if (!Object.values(Color).includes(color)) return;
      setCurrentThread(color);
      handleKnit(color);
    },
    [handleKnit, gameState.screen],
  );

  useEffect(() => {
    if (gameState.screen !== "play") return;

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
        case "Space":
          if (
            gameState.screen === "play" &&
            (gameState.mode === "free" ||
              (gameState.mode === "challenge" && gameState.level === "hard"))
          ) {
            e.preventDefault();
            handleToggleStitchType();
          }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleSelectColorAndKnit,
    handleToggleStitchType,
    handleUnravel,
    gameState,
  ]);

  return {
    gameState,
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
    startChallenge,
    startFreeSlot,
    viewFreeSave,
    resumeFreeSlot,
    finishFree,
    resumeFree,
    restartFree,
    handleSaveFreeName,
    handleChangeWidth,
    handleBackToSelect,
    handleInitialize,
    handleUnravel,
    handleSelectColorAndKnit,
    currentStitchType,
    handleSelectStitchType,
    handleToggleStitchType,
  };
}
