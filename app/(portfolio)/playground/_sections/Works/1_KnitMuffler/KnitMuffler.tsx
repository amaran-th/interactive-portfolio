"use client";

import { House, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColorModeContext } from "./ColorModeContext";
import { PALETTES, STITCH_COUNT } from "./data";
import DraftPreview from "./DraftPreview";
import { MufflerPreview } from "./MufflerPreview";
import ResultModal from "./ResultModal";
import SelectScreen from "./SelectScreen";
import Status from "./Status";
import { ColorMode } from "./type";

import { useKnittingGame } from "./useKnittingGame";
import {
  clearFreeSave,
  getFreeSave,
  saveFreeMuffler,
} from "./useKnittingStorage";
import { useResultExport } from "./useResultExport";

export default function KnitMuffler() {
  const resultModalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("normal");

  const {
    screen,
    mode,
    challengeLevel,
    challengeDraftKey,
    challengeDraft,
    currentThread,
    knittedRows,
    currentRow,
    currentStitch,
    currentRowEverKnitted,
    isChallengeComplete,
    activeRows,
    finalRows,
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
    handleUnravel,
    handleSelectColorAndKnit,
  } = useKnittingGame();

  const { resultCaptureRef, isSavingResult, handleSaveResult } =
    useResultExport({
      finalRows,
      mode,
    });

  // 목도리 영역 스크롤: 항상 하단 유지
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeRows.length]);

  // 자유 모드 버튼 클릭: 저장 데이터 있으면 결과 화면, 없으면 새 게임
  const handleStartFree = () => {
    const saved = getFreeSave();
    if (saved) {
      loadFreeSaveAsResult(saved.rows, saved.elapsed);
    } else {
      startMode("free");
    }
  };

  // 자유 모드 저장하기: localStorage 저장 + result 화면
  const handleFinishFree = () => {
    if (activeRows.length === 0) return;
    saveFreeMuffler(activeRows, elapsed);
    finishSession();
  };

  // 자유 모드 이어뜨기 (result → play)
  const handleResumeFree = () => {
    const saved = getFreeSave();
    if (saved) {
      resumeFromFreeSave(saved.rows, saved.elapsed);
    } else {
      handleResumeFreeMode();
    }
  };

  // 자유 모드 다시 만들기 (result → 초기화 후 play)
  const handleRestartFree = () => {
    clearFreeSave();
    startMode("free");
  };

  const palette = useMemo(() => {
    const list = Object.values(PALETTES[colorMode]);
    list.push(list.shift()!);
    return list;
  }, [colorMode]);

  if (screen === "select") {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <SelectScreen
          onStartChallenge={startChallenge}
          onStartFree={handleStartFree}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />
      </ColorModeContext.Provider>
    );
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
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
                ? `챌린지 모드${challengeLevel ? ` · ${challengeLevel === "easy" ? "EASY" : "HARD"}` : ""}`
                : "자유 모드"}
            </div>

            {/* 자유 모드 저장하기 버튼 */}
            {mode === "free" && (
              <div className="absolute top-4 right-4 z-70 flex gap-2">
                <button
                  onClick={handleFinishFree}
                  disabled={
                    knittedRows.length === 0 && currentRow.length < STITCH_COUNT
                      ? true
                      : currentRow.length > 0 &&
                        currentRow.length < STITCH_COUNT
                  }
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
                    showSlipCount={challengeLevel === "hard"}
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
                  showSlipCount={challengeLevel === "hard"}
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
                    disabled={
                      mode === "free"
                        ? currentStitch === 0 && knittedRows.length === 0
                        : currentRowEverKnitted
                          ? currentStitch === 0
                          : knittedRows.length === 0
                    }
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
            resultModalRef={resultModalRef}
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
            onResumeFreeMode={handleResumeFree}
            onRestartFreeMode={handleRestartFree}
            onBackToSelect={handleBackToSelect}
            onInitialize={handleInitialize}
          />
        )}
      </div>
    </ColorModeContext.Provider>
  );
}
