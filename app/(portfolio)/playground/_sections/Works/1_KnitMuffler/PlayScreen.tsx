"use client";

import { House, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useColorPalette } from "./ColorModeContext";
import DraftPreview from "./DraftPreview";
import { MufflerPreview } from "./MufflerPreview";
import ResultModal from "./ResultModal";
import Status from "./Status";
import { Width } from "./type";
import { useKnittingGame } from "./useKnittingGame";
import { useResultExport } from "./useResultExport";

export default function PlayScreen({
  game,
}: {
  game: ReturnType<typeof useKnittingGame>;
}) {
  const {
    gameState,
    currentThread,
    knittedRows,
    currentRow,
    currentRowEverKnitted,
    stitchCount,
    isChallengeComplete,
    activeRows,
    finalRows,
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
    handleChangeWidth,
    handleSaveFreeName,
    handleUnravel,
    handleSelectColorAndKnit,
  } = game;

  // gameState에서 타입 좁히기로 도출
  const mode = gameState.screen !== "select" ? gameState.mode : null;
  const challengeLevel = gameState.screen !== "select" && gameState.mode === "challenge" ? gameState.level : null;
  const challengeDraftId = gameState.screen !== "select" && gameState.mode === "challenge" ? gameState.draftId : null;
  const challengeDraft = gameState.screen !== "select" && gameState.mode === "challenge" ? gameState.draft : null;
  const freeName = gameState.screen !== "select" && gameState.mode === "free" ? gameState.name : "";

  const resultModalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 너비 전환 경고 모달
  const [pendingWidth, setPendingWidth] = useState<Width | null>(null);

  const { resultCaptureRef, isSavingResult, handleSaveResult } =
    useResultExport({ finalRows, mode });

  // 목도리 영역 스크롤: 항상 하단 유지
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeRows.length]);

  const paletteMap = useColorPalette();
  const palette = useMemo(() => {
    const list = Object.values(paletteMap);
    list.push(list.shift()!);
    return list;
  }, [paletteMap]);

  const currentStitchCount = currentRow.length;
  const hasContent = knittedRows.length > 0 || currentRow.length > 0;

  const handleWidthChange = (newWidth: Width) => {
    if (newWidth === stitchCount) return;
    if (hasContent) {
      setPendingWidth(newWidth);
    } else {
      handleChangeWidth(newWidth);
    }
  };

  return (
    <div className="font-knit-muffler relative flex h-full overflow-hidden bg-white text-black">
      <div
        className={`flex h-full w-full flex-col ${
          gameState.screen === "result" ? "blur-md pointer-events-none select-none" : ""
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
              ? `챌린지 모드${challengeLevel ? ` · ${challengeLevel.toUpperCase()}` : ""}`
              : "자유 모드"}
          </div>

          {/* 자유 모드 - 너비 선택 + 저장하기 버튼 */}
          {mode === "free" && (
            <div className="absolute top-4 right-4 z-70 flex gap-2 items-center">
              <button
                onClick={finishFree}
                disabled={
                  knittedRows.length === 0 && currentStitchCount < stitchCount
                    ? true
                    : currentStitchCount > 0 && currentStitchCount < stitchCount
                }
                className="rounded-full bg-yellow-800 px-4 py-2 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                저장하기
              </button>
            </div>
          )}

          {/* 챌린지 모드 - 모바일 Status + 도안 */}
          <div className="w-full px-4 pb-3 md:hidden">
            <div className="grid grid-cols-2 gap-3 items-start">
              <Status
                level={challengeLevel}
                elapsed={elapsed}
                slipCount={slipCount}
                colorAccuracy={colorAccuracy}
                progress={progress}
                spm={spm}
                freeMode={mode === "free"}
              />
              {mode === "challenge" && challengeDraft ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-stone-500">도안</p>
                  <DraftPreview
                    draft={challengeDraft}
                    currentRowIndex={knittedRows.length}
                  />
                </div>
              ) : (
                <div className="flex rounded-full bg-white/90 text-sm shadow-sm overflow-hidden">
                  <button
                    onClick={() => handleWidthChange(10)}
                    className={`px-3 py-2 border rounded-l-full flex-1 transition-colors ${stitchCount === 10 ? "bg-yellow-600/25 text-yellow-600 border-yellow-600" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}
                  >
                    10수
                  </button>
                  <button
                    onClick={() => handleWidthChange(20)}
                    className={`px-3 py-2 border rounded-r-full flex-1 transition-colors ${stitchCount === 20 ? "bg-yellow-600/25 text-yellow-600 border-yellow-600" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}
                  >
                    20수
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 챌린지 모드 - 데스크탑 Status */}
          <div className="absolute left-4 top-20 hidden flex-col justify-center gap-4 md:flex">
            <Status
              level={challengeLevel}
              elapsed={elapsed}
              slipCount={slipCount}
              colorAccuracy={colorAccuracy}
              progress={progress}
              spm={spm}
              freeMode={mode === "free"}
            />
          </div>

          {/* 챌린지 모드 - 데스크탑 도안 */}
          {mode === "challenge" && challengeDraft ? (
            <div className="absolute right-4 top-20 hidden flex-col items-center justify-center gap-4 rounded-md bg-gray-50 p-4 shadow-md md:flex">
              <p>도안</p>
              <DraftPreview
                draft={challengeDraft}
                currentRowIndex={knittedRows.length}
              />
            </div>
          ) : (
            <div className="absolute right-4 top-20 hidden min-w-30 rounded-full bg-white/90 text-sm shadow-sm overflow-hidden md:flex">
              <button
                onClick={() => handleWidthChange(10)}
                className={`px-3 py-2 border rounded-l-full flex-1 transition-colors ${stitchCount === 10 ? "bg-yellow-600/25 text-yellow-600 border-yellow-600" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}
              >
                10수
              </button>
              <button
                onClick={() => handleWidthChange(20)}
                className={`px-3 py-2 border rounded-r-full flex-1 transition-colors ${stitchCount === 20 ? "bg-yellow-600/25 text-yellow-600 border-yellow-600" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}
              >
                20수
              </button>
            </div>
          )}

          {/* 목도리 영역 (하단 정렬) */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto w-full"
          >
            <div className="flex min-h-full flex-col justify-end w-full">
              <MufflerPreview
                stitchCount={stitchCount}
                rows={
                  isChallengeComplete
                    ? knittedRows
                    : [...knittedRows, currentRow]
                }
                cellSize={32}
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
                      ? currentStitchCount === 0 && knittedRows.length === 0
                      : currentRowEverKnitted
                        ? currentStitchCount === 0
                        : knittedRows.length === 0
                  }
                  className="w-full rounded border border-stone-300 bg-red-100 px-4 py-2 text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
                >
                  풀기(Backspace)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 너비 전환 경고 모달 */}
      {pendingWidth !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl text-stone-800">
            <p className="text-base break-keep text-center font-medium">
              지금까지 작업한 내용이 모두 사라집니다.
              <br />
              계속하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingWidth(null)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 transition-colors"
              >
                아니요
              </button>
              <button
                onClick={() => {
                  handleChangeWidth(pendingWidth);
                  setPendingWidth(null);
                }}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700 transition-colors"
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.screen === "result" && mode && (
        <ResultModal
          resultModalRef={resultModalRef}
          resultCaptureRef={resultCaptureRef}
          mode={mode}
          challengeLevel={challengeLevel}
          challengeDraftId={challengeDraftId}
          finalRows={finalRows}
          elapsed={elapsed}
          slipCount={slipCount}
          colorAccuracy={colorAccuracy}
          spm={spm}
          challengeDraft={challengeDraft}
          freeName={freeName}
          isSavingResult={isSavingResult}
          onSaveResult={handleSaveResult}
          onSaveFreeName={handleSaveFreeName}
          onResumeFreeMode={resumeFree}
          onRestartFreeMode={restartFree}
          onBackToSelect={handleBackToSelect}
          onInitialize={handleInitialize}
        />
      )}
    </div>
  );
}
