"use client";

import { toPng } from "html-to-image";
import { Download, House } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colors, EASY_DRAFTS, HARD_DRAFTS, STITCH_COUNT } from "./data";
import Status from "./Status";
import StitchBlock from "./StitchBlock";
import { Color, Stitch } from "./type";
import { useKnittingStats } from "./useKnittingStats";
import { useTimer } from "./useTimer";

type Mode = "challenge" | "free";
type Screen = "select" | "play" | "result";
type ChallengeLevel = "easy" | "hard";

const DEFAULT_THREAD_COLORS: (Color | null)[] = [
  Color.SKYBLUE,
  Color.VIOLET,
  Color.YELLOW,
];
const RESULT_EXPORT_PADDING = 40;
const EASY_CHALLENGE_DRAFTS = Object.values(EASY_DRAFTS);
const HARD_CHALLENGE_DRAFTS = Object.values(HARD_DRAFTS);

function formatElapsed(elapsed: number) {
  const minutes = Math.floor(elapsed / 6000);
  const seconds = Math.floor((elapsed / 100) % 60);
  const centiseconds = elapsed % 100;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}:${String(centiseconds).padStart(2, "0")}`;
}

function DraftPreview({
  draft,
  className = "",
  cellSize = 12,
  showNumbers = true,
}: {
  draft: number[][];
  className?: string;
  cellSize?: number;
  showNumbers?: boolean;
}) {
  return (
    <div
      className={`flex flex-col border border-gray-400 divide-y divide-gray-400 bg-white ${className}`}
    >
      {draft.map((row, ri) => (
        <div key={ri} className="flex divide-x divide-gray-400">
          {row.map((stitch, si) => (
            <div
              key={si}
              className="flex justify-center items-center text-[8px]"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor:
                  Object.values(colors).find((color) => color.id === stitch)
                    ?.fill ?? "transparent",
              }}
            >
              {showNumbers ? stitch || "" : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function padRows(rows: Stitch[][]) {
  return rows.map((row) => [
    ...row,
    ...Array.from({ length: STITCH_COUNT - row.length }, () => null),
  ]);
}

const StitchRow = memo(function StitchRow({
  row,
  stitchSize,
  emptyClassName,
}: {
  row: (Stitch | null)[];
  stitchSize: number;
  emptyClassName: string;
}) {
  const nextEmptyIndex = row.findIndex((stitch) => stitch === null);

  return (
    <div className="grid w-fit grid-cols-10">
      {row.map((thread, stitchIndex) =>
        thread ? (
          <div
            key={stitchIndex}
            className="relative"
            style={{
              width: stitchSize,
              height: stitchSize,
              zIndex: thread.slipped ? 50 : 1,
            }}
          >
            <StitchBlock
              color={thread.color}
              slipped={thread.slipped}
              size={stitchSize}
            />
          </div>
        ) : stitchIndex === nextEmptyIndex ? (
          <div
            key={stitchIndex}
            className={`${emptyClassName} rounded-sm border-2 border-dashed border-gray-300`}
          ></div>
        ) : (
          <div key={stitchIndex} className={emptyClassName}></div>
        ),
      )}
    </div>
  );
});

function ResultPattern({
  draft,
  title,
  showNumbers = false,
}: {
  draft: number[][];
  title: string;
  showNumbers?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-stone-600 text-center">{title}</p>
      <DraftPreview
        draft={[...draft].reverse()}
        cellSize={20}
        showNumbers={showNumbers}
        className="border-stone-300"
      />
    </div>
  );
}

function ResultMuffler({ rows, title }: { rows: Stitch[][]; title: string }) {
  const paddedRows = padRows(rows);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-stone-600 text-center">{title}</p>
      <div className="flex flex-col-reverse items-center">
        {paddedRows.map((row, rowIndex) => (
          <StitchRow
            key={rowIndex}
            row={row}
            stitchSize={20}
            emptyClassName="h-5 w-5"
          />
        ))}
      </div>
    </div>
  );
}

function ResultStats({
  rows,
  elapsed,
  mode,
  totalStitches,
  usedColorsCount,
  slipCount,
  colorAccuracy,
  spm,
}: {
  rows: Stitch[][];
  elapsed: number;
  mode: Mode;
  totalStitches: number;
  usedColorsCount: number;
  slipCount: number;
  colorAccuracy: number;
  spm: number;
}) {
  const getAccuracyColor = (value: number) => {
    if (value === 100) return "text-green-600";
    if (value > 70) return "text-yellow-600";
    return "text-red-600";
  };

  const stats =
    mode === "challenge"
      ? [
          {
            label: "걸린 시간",
            value: formatElapsed(elapsed),
            valueClassName: "text-stone-900",
          },
          {
            label: "실수",
            value: `${slipCount}회`,
            valueClassName: slipCount > 0 ? "text-red-600" : "text-gray-600",
          },
          {
            label: "정확도",
            value: `${colorAccuracy.toFixed(1)}%`,
            valueClassName: getAccuracyColor(colorAccuracy),
          },
          {
            label: "속도",
            value: `${spm.toFixed(1)} SPM`,
            valueClassName: "text-stone-900",
          },
        ]
      : [
          {
            label: "걸린 시간",
            value: formatElapsed(elapsed),
            valueClassName: "text-stone-900",
          },
          {
            label: "목도리 길이",
            value: `${rows.length}`,
            valueClassName: "text-stone-900",
          },
        ];

  return (
    <div
      className="grid w-full justify-center gap-x-6 gap-y-3 text-sm text-stone-700"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {stats.map(({ label, value, valueClassName }) => (
        <div
          key={label}
          className="flex items-center justify-center gap-2 rounded-xl bg-white/60 px-4 py-3"
        >
          <span className="text-stone-500">{label}</span>
          <span className={`font-medium ${valueClassName}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ResultModeLabel({
  mode,
  challengeLevel,
}: {
  mode: Mode;
  challengeLevel: ChallengeLevel | null;
}) {
  const label =
    mode === "challenge"
      ? `챌린지${challengeLevel ? ` · ${challengeLevel === "easy" ? "쉬움" : "어려움"}` : ""}`
      : "자유 모드";

  return (
    <p className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600">
      {label}
    </p>
  );
}

function MufflerPreview({
  rows,
  compact = false,
}: {
  rows: Stitch[][];
  compact?: boolean;
}) {
  const cellSize = compact ? 20 : 32;
  const emptyClassName = compact ? "w-5 h-5" : "w-8 h-8";
  const paddedRows = padRows(rows);

  return (
    <div className="px-6 py-4 text-gray-700 flex flex-col-reverse items-center relative">
      {paddedRows.map((row, rowIndex) => (
        <StitchRow
          key={rowIndex}
          row={row}
          stitchSize={cellSize}
          emptyClassName={emptyClassName}
        />
      ))}
    </div>
  );
}

export default function KnitMuffler() {
  const resultModalRef = useRef<HTMLDivElement>(null);
  const resultCaptureRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel | null>(
    null,
  );
  const [challengeDraft, setChallengeDraft] = useState<number[][]>(
    EASY_CHALLENGE_DRAFTS[0],
  );
  const [resetKey, setResetKey] = useState(0);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [currentThread, setCurrentThread] = useState<Color>(
    DEFAULT_THREAD_COLORS[0] as Color,
  );
  const [started, setStarted] = useState(false);
  const [knittedRows, setKnittedRows] = useState<Stitch[][]>([]);
  const [currentRow, setCurrentRow] = useState<Stitch[]>([]);
  const [currentStitch, setCurrentStitch] = useState<number>(0);
  const elapsed = useTimer(started, resetKey);

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
        row.map((stitch) => (stitch.color ? colors[stitch.color].id : 0)),
      ),
    [finalRows],
  );
  const totalStitches = useMemo(
    () => finalRows.reduce((sum, row) => sum + row.length, 0),
    [finalRows],
  );
  const isChallengeComplete = useMemo(
    () =>
      mode === "challenge" &&
      knittedRows.length === challengeDraft.length &&
      currentRow.length === 0,
    [challengeDraft.length, currentRow.length, knittedRows.length, mode],
  );
  const usedColors = useMemo(
    () =>
      Array.from(
        new Set(
          finalRows.flatMap((row) =>
            row
              .map((stitch) => stitch.color)
              .filter((color): color is Color => color !== null),
          ),
        ),
      ),
    [finalRows],
  );
  const { slipCount, colorAccuracy, progress, spm } = useKnittingStats({
    draft: challengeDraft,
    stitches: activeRows,
    elapsed,
  });

  const resetKnitting = useCallback(() => {
    setCurrentThread(DEFAULT_THREAD_COLORS[0] as Color);
    setStarted(false);
    setKnittedRows([]);
    setCurrentRow([]);
    setCurrentStitch(0);
    setChallengeLevel(null);
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

  const startChallenge = useCallback(
    (level: ChallengeLevel) => {
      resetKnitting();
      const drafts =
        level === "easy" ? EASY_CHALLENGE_DRAFTS : HARD_CHALLENGE_DRAFTS;
      const randomDraft = drafts[Math.floor(Math.random() * drafts.length)];

      setMode("challenge");
      setChallengeLevel(level);
      setChallengeDraft(randomDraft);
      setScreen("play");
    },
    [resetKnitting],
  );

  const handleBackToSelect = useCallback(() => {
    resetKnitting();
    setMode(null);
    setScreen("select");
  }, [resetKnitting]);

  const handleSaveResult = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      finalRows.length === 0 ||
      isSavingResult
    ) {
      return;
    }

    setIsSavingResult(true);

    try {
      if (!resultCaptureRef.current) {
        return;
      }

      const exportWidth = Math.ceil(
        Math.max(
          resultCaptureRef.current.scrollWidth,
          resultCaptureRef.current.clientWidth,
        ),
      );
      const exportHeight = Math.ceil(
        Math.max(
          resultCaptureRef.current.scrollHeight,
          resultCaptureRef.current.clientHeight,
        ),
      );

      const dataUrl = await toPng(resultCaptureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: exportWidth,
        height: exportHeight,
        style: {
          boxShadow: "none",
          borderRadius: "32px",
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
          maxHeight: "none",
          overflow: "visible",
          overflowY: "visible",
        },
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            node.dataset.htmlToImageIgnore === "true"
          ),
      });

      const image = new Image();
      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Failed to load generated image"));
      });
      image.src = dataUrl;
      await imageLoaded;

      const canvas = document.createElement("canvas");
      canvas.width = image.width + RESULT_EXPORT_PADDING * 2;
      canvas.height = image.height + RESULT_EXPORT_PADDING * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.fillStyle = "#f6f0e8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, RESULT_EXPORT_PADDING, RESULT_EXPORT_PADDING);

      const link = document.createElement("a");
      link.download =
        mode === "challenge"
          ? "knit-muffler-challenge-result.png"
          : "knit-muffler-free-result.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsSavingResult(false);
    }
  }, [finalRows, isSavingResult, mode]);

  const finishSession = useCallback(() => {
    if (activeRows.length === 0) {
      return;
    }

    setStarted(false);
    setScreen("result");
  }, [activeRows.length]);

  const handleResumeFreeMode = useCallback(() => {
    if (mode !== "free") {
      return;
    }

    setScreen("play");
  }, [mode]);

  const handleKnit = useCallback(() => {
    if (screen !== "play") {
      return;
    }

    if (isChallengeComplete) {
      setScreen("result");
      return;
    }

    if (!started) {
      setStarted(true);
    }

    const nextStitch: Stitch = {
      color: currentThread,
      slipped: mode === "challenge" ? Math.random() < 0.2 : false,
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
  }, [
    challengeDraft.length,
    currentRow,
    currentStitch,
    currentThread,
    isChallengeComplete,
    knittedRows.length,
    mode,
    screen,
    started,
  ]);

  const handleUnravel = useCallback(() => {
    if (screen !== "play" || currentStitch === 0) {
      return;
    }

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

  const handleSelectColor = useCallback(
    (id: number) => {
      if (screen !== "play") {
        return;
      }

      const name = id as Color;
      if (!colors[name]) {
        return;
      }
      setCurrentThread(name);
    },
    [screen],
  );

  useEffect(() => {
    if (screen !== "play") {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

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
          handleSelectColor(parseInt(e.code.replace("Digit", ""), 10));
          break;
        case "KeyF":
          handleKnit();
          break;
        case "KeyJ":
          handleUnravel();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKnit, handleSelectColor, handleUnravel, screen]);

  useEffect(() => {
    if (isChallengeComplete) {
      setStarted(false);
    }
  }, [isChallengeComplete]);

  if (screen === "select") {
    return (
      <div className="h-full max-h-full bg-[#f8f4ee] text-stone-900 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-4xl w-full flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-4xl font-semibold">목도리 뜨기</h2>
          </div>
          <div className="grid gap-6 md:grid-rows-3">
            <button
              onClick={() => startChallenge("easy")}
              className="text-left rounded-[28px] border-2 border-stone-300 bg-green-50 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
            >
              <p className="text-2xl font-semibold text-center">이지 모드</p>
            </button>
            <button
              onClick={() => startChallenge("hard")}
              className="text-left rounded-[28px] border-2 border-stone-300 bg-red-50 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
            >
              <p className="text-2xl font-semibold text-center">하드 모드</p>
            </button>
            <button
              onClick={() => startMode("free")}
              className="text-left rounded-[28px] border-2 border-stone-300 bg-stone-50 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
            >
              <p className="text-2xl font-semibold text-center">자유 모드</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-white text-black">
      <div
        className={`flex h-full w-full flex-col ${
          screen === "result" ? "blur-md pointer-events-none select-none" : ""
        }`}
      >
        <div className="relative flex min-h-0 flex-1 flex-col items-center">
          <div className="px-14 py-5 text-lg font-bold text-center md:p-6 md:text-xl">
            {mode === "challenge"
              ? `챌린지 모드${challengeLevel ? ` · ${challengeLevel === "easy" ? "Easy" : "Hard"}` : ""}`
              : "자유 모드"}
          </div>

          {mode === "challenge" && (
            <div className="w-full px-4 pb-3 md:hidden">
              <div className="grid grid-cols-2 gap-3 items-start">
                <Status
                  elapsed={elapsed}
                  slipCount={slipCount}
                  colorAccuracy={colorAccuracy}
                  progress={progress}
                  spm={spm}
                />
                <div className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-stone-500">도안</p>
                  <DraftPreview draft={challengeDraft} />
                </div>
              </div>
            </div>
          )}

          <div className="overflow-y-auto w-full pb-28 md:pb-0">
            <MufflerPreview rows={activeRows.length > 0 ? activeRows : [[]]} />
          </div>
        </div>

        {mode === "challenge" && (
          <div className="absolute left-4 top-20 hidden flex-col justify-center gap-4 md:flex">
            <Status
              elapsed={elapsed}
              slipCount={slipCount}
              colorAccuracy={colorAccuracy}
              progress={progress}
              spm={spm}
            />
          </div>
        )}

        {mode === "challenge" && (
          <div className="absolute right-4 top-20 hidden flex-col items-center justify-center gap-4 rounded-md bg-gray-50 p-4 shadow-md md:flex">
            <p>도안</p>
            <DraftPreview draft={challengeDraft} />
          </div>
        )}

        <div className="absolute bottom-24 left-1/2 z-70 w-full max-w-70 -translate-x-1/2 px-4 md:w-auto md:max-w-fit">
          <div className="grid grid-cols-5 justify-items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 px-3 py-3 shadow-md backdrop-blur-sm md:flex md:items-end md:gap-2 md:px-4">
            {Object.entries(colors).map(([, color]) => (
              <div key={color.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleSelectColor(color.id)}
                  className={`h-8 w-8 rounded-full text-xs text-gray-500 border border-stone-200 transition-all ${currentThread === color.id ? "ring-2 ring-stone-900 ring-offset-2" : "hover:ring-2 hover:ring-stone-300"}`}
                  style={{ backgroundColor: color.fill }}
                  aria-label={`${color.id}번 실 선택`}
                >
                  {color.id}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-4 left-4 z-70 flex gap-2">
          <button
            onClick={handleBackToSelect}
            className="rounded-full border border-gray-300 bg-white/90 p-2 text-sm shadow-sm"
          >
            <House />
          </button>
        </div>

        {mode === "free" && (
          <div className="absolute top-4 right-4 z-70 flex gap-2">
            <button
              onClick={finishSession}
              disabled={
                knittedRows.length === 0 && currentRow.length < STITCH_COUNT
                  ? true
                  : currentRow.length > 0 && currentRow.length < STITCH_COUNT
              }
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              완성하기
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-[70] flex items-center justify-center p-4">
          <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-2xl border border-stone-200 bg-white/90 p-3 shadow-md backdrop-blur-sm">
            <button
              onClick={handleKnit}
              className="rounded border border-stone-400 bg-stone-800 px-4 py-2 text-white transition-colors hover:bg-stone-900"
            >
              뜨기(F)
            </button>
            <button
              onClick={handleUnravel}
              disabled={currentStitch === 0}
              className="rounded border border-stone-300 bg-stone-100 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
            >
              풀기(J)
            </button>
          </div>
        </div>
      </div>

      {screen === "result" && mode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-stone-900/20 p-6 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-4xl flex-col items-center gap-4 bg-[#f6f0e8] rounded-4xl border border-stone-300">
            <div
              ref={resultModalRef}
              className="w-full overflow-y-auto rounded-4xl border-2 border-stone-300 bg-[#f6f0e8] px-8 py-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maxHeight: "min(820px, calc(100vh - 48px))",
                boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
              }}
            >
              <div
                ref={resultCaptureRef}
                className="flex flex-col items-center gap-4 bg-[#f6f0e8] pb-4 text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-4xl font-semibold text-stone-900">
                    목도리 완성!
                  </h2>
                  <ResultModeLabel
                    mode={mode}
                    challengeLevel={challengeLevel}
                  />
                </div>
                <ResultStats
                  rows={finalRows}
                  elapsed={elapsed}
                  mode={mode}
                  totalStitches={totalStitches}
                  usedColorsCount={usedColors.length}
                  slipCount={slipCount}
                  colorAccuracy={colorAccuracy}
                  spm={spm}
                />

                <div className="grid w-full justify-center gap-10 md:grid-cols-2">
                  <div className="hidden md:block">
                    <ResultPattern
                      title="도안"
                      draft={
                        mode === "challenge" ? challengeDraft : generatedDraft
                      }
                      showNumbers
                    />
                  </div>
                  <ResultMuffler title="완성품" rows={finalRows} />
                </div>
              </div>
              <div
                className="flex flex-wrap justify-center gap-3 pt-4"
                data-html-to-image-ignore="true"
              >
                {mode === "free" && (
                  <button
                    onClick={handleResumeFreeMode}
                    disabled={isSavingResult}
                    className="flex items-center gap-2 rounded-full border border-stone-400 px-4 py-2 text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    이어 뜨기
                  </button>
                )}
                <button
                  onClick={handleSaveResult}
                  disabled={isSavingResult}
                  className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download />
                  {isSavingResult ? "이미지 생성 중..." : "결과 저장하기"}
                </button>
                <button
                  onClick={handleBackToSelect}
                  disabled={isSavingResult}
                  className="flex gap-2 rounded-full border border-stone-400 p-2 text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <House />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
