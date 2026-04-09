"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EASY_DRAFTS, HARD_DRAFTS, STITCH_COUNT } from "./data";
import { ChallengeLevel, Color, Mode, Screen, Stitch } from "./type";
import { useKnittingStats } from "./useKnittingStats";
import { useTimer } from "./useTimer";

const DEFAULT_THREAD_COLOR = Color.BLUE;

const DRAFT_MAP: Record<ChallengeLevel, Record<string, number[][]>> = {
  easy: EASY_DRAFTS,
  hard: HARD_DRAFTS,
};

export function useKnittingGame() {
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel | null>(
    null,
  );
  const [challengeDraftKey, setChallengeDraftKey] = useState<string | null>(
    null,
  );
  const [challengeDraft, setChallengeDraft] = useState<number[][]>(
    Object.values(EASY_DRAFTS)[0],
  );
  const [resetKey, setResetKey] = useState(0);
  const [elapsedOffset, setElapsedOffset] = useState(0);
  const [currentThread, setCurrentThread] =
    useState<Color>(DEFAULT_THREAD_COLOR);
  const [started, setStarted] = useState(false);
  const [knittedRows, setKnittedRows] = useState<Stitch[][]>([]);
  const [currentRow, setCurrentRow] = useState<Stitch[]>([]);
  const [currentStitch, setCurrentStitch] = useState(0);

  const rawElapsed = useTimer(started, resetKey);
  const elapsed = elapsedOffset + rawElapsed;

  const activeRows = useMemo(
    () => (currentRow.length > 0 ? [...knittedRows, currentRow] : knittedRows),
    [currentRow, knittedRows],
  );
  const finalRows = useMemo(
    () => (screen === "result" ? activeRows : knittedRows),
    [activeRows, knittedRows, screen],
  );
  const generatedDraft = useMemo(
    () =>
      finalRows.map((row) =>
        row.map((stitch) => (stitch.color ? (stitch.color as number) : 0)),
      ),
    [finalRows],
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
    setCurrentThread(DEFAULT_THREAD_COLOR);
    setStarted(false);
    setKnittedRows([]);
    setCurrentRow([]);
    setCurrentStitch(0);
    setElapsedOffset(0);
    setResetKey((prev) => prev + 1);
  }, []);

  const startMode = useCallback(
    (nextMode: Mode) => {
      resetKnitting();
      setMode(nextMode);
      setScreen("play");
    },
    [resetKnitting],
  );

  /** 특정 도안 키를 지정해서 챌린지 시작 */
  const startChallenge = useCallback(
    (level: ChallengeLevel, draftKey: string) => {
      resetKnitting();
      const draft = DRAFT_MAP[level][draftKey];
      if (!draft) return;
      setMode("challenge");
      setChallengeLevel(level);
      setChallengeDraftKey(draftKey);
      setChallengeDraft(draft);
      setScreen("play");
    },
    [resetKnitting],
  );

  /** 저장된 자유 모드 데이터를 로드해 플레이 화면으로 복귀 (자유 모드 전용) */
  const resumeFromFreeSave = useCallback(
    (rows: Stitch[][], savedElapsed: number) => {
      resetKnitting();
      setMode("free");
      setKnittedRows(rows);
      setCurrentStitch(0);
      setElapsedOffset(savedElapsed);
      setScreen("play");
    },
    [resetKnitting],
  );

  /** 저장된 자유 모드 데이터를 로드해 결과 화면으로 바로 진입 (자유 모드 전용) */
  const loadFreeSaveAsResult = useCallback(
    (rows: Stitch[][], savedElapsed: number) => {
      resetKnitting();
      setMode("free");
      setKnittedRows(rows);
      setElapsedOffset(savedElapsed);
      setScreen("result");
    },
    [resetKnitting],
  );

  const handleBackToSelect = useCallback(() => {
    resetKnitting();
    setMode(null);
    setScreen("select");
  }, [resetKnitting]);

  const handleInitialize = useCallback(() => {
    resetKnitting();
  }, [resetKnitting]);

  const finishSession = useCallback(() => {
    if (activeRows.length === 0) return;
    setStarted(false);
    setScreen("result");
  }, [activeRows.length]);

  const handleResumeFreeMode = useCallback(() => {
    if (mode !== "free") return;
    setScreen("play");
  }, [mode]);

  const handleKnit = useCallback(
    (colorOverride?: Color) => {
      if (screen !== "play") return;

      if (isChallengeComplete) {
        setScreen("result");
        return;
      }

      if (!started) setStarted(true);

      const nextStitch: Stitch = {
        color: colorOverride ?? currentThread,
        slipped:
          mode === "challenge" && challengeLevel === "hard"
            ? Math.random() < 0.2
            : false,
      };

      if (
        mode === "challenge" &&
        knittedRows.length === challengeDraft.length - 1 &&
        currentStitch === STITCH_COUNT
      ) {
        setKnittedRows((prev) => [...prev, currentRow]);
        setCurrentRow([]);
        setCurrentStitch(0);
        setStarted(false);
        setScreen("result");
        return;
      }

      if (currentStitch < STITCH_COUNT) {
        const nextRow = [...currentRow, nextStitch];
        setCurrentRow(nextRow);
        setCurrentStitch(nextRow.length);
        return;
      }

      setKnittedRows((prev) => [...prev, currentRow]);
      setCurrentRow([nextStitch]);
      setCurrentStitch(1);
    },
    [
      challengeDraft.length,
      challengeLevel,
      currentRow,
      currentStitch,
      currentThread,
      isChallengeComplete,
      knittedRows.length,
      mode,
      screen,
      started,
    ],
  );

  const handleUnravel = useCallback(() => {
    if (screen !== "play" || currentStitch === 0) return;

    if (mode === "free" && currentStitch === 1 && knittedRows.length > 0) {
      const previousRow = knittedRows[knittedRows.length - 1];
      setKnittedRows((prev) => prev.slice(0, -1));
      setCurrentRow(previousRow);
      setCurrentStitch(previousRow.length);
      return;
    }

    setCurrentRow((prev) => prev.slice(0, -1));
    setCurrentStitch((prev) => prev - 1);
  }, [currentStitch, knittedRows, mode, screen]);

  const handleSelectColorAndKnit = useCallback(
    (id: number) => {
      if (screen !== "play") return;
      const name = id as Color;
      if (!Object.values(Color).includes(name)) return;
      setCurrentThread(name);
      handleKnit(name);
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
    challengeLevel,
    challengeDraftKey,
    challengeDraft,
    currentThread,
    started,
    knittedRows,
    currentRow,
    currentStitch,
    activeRows,
    finalRows,
    generatedDraft,
    isChallengeComplete,
    elapsed,
    slipCount,
    colorAccuracy,
    progress,
    spm,
    startMode,
    startChallenge,
    resumeFromFreeSave,
    loadFreeSaveAsResult,
    handleBackToSelect,
    handleInitialize,
    finishSession,
    handleResumeFreeMode,
    handleKnit,
    handleUnravel,
    handleSelectColorAndKnit,
  };
}
