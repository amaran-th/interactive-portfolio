"use client";

import { Download, House, RotateCcw } from "lucide-react";
import { RefObject, useState } from "react";
import DraftPreview from "./DraftPreview";
import { ResultMuffler } from "./MufflerPreview";
import { MedalIcon } from "./SelectScreen";
import { ChallengeLevel, Mode, Stitch } from "./type";
import {
  ChallengeStat,
  getChallengeStat,
  saveChallengeStat,
} from "./useKnittingStorage";
import { calcMedal, formatElapsed, isBetterMedal } from "./utils";

function ResultModeLabel({
  mode,
  challengeLevel,
}: {
  mode: Mode;
  challengeLevel: ChallengeLevel | null;
}) {
  if (mode === "challenge") {
    return (
      <p
        className={`rounded-full border border-stone-300 px-3 py-1 text-xs font-medium ${challengeLevel === "easy" ? "text-green-400 bg-green-50" : "text-red-400 bg-red-50"}`}
      >
        {challengeLevel === "easy" ? "EASY" : "HARD"}
      </p>
    );
  }

  return (
    <p className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600">
      자유 모드
    </p>
  );
}

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
        draft={draft}
        cellSize={20}
        showNumbers={showNumbers}
        className="border-stone-300"
      />
    </div>
  );
}

function ResultStats({
  rows,
  elapsed,
  mode,
  challengeLevel,
  slipCount,
  colorAccuracy,
  spm,
}: {
  rows: Stitch[][];
  elapsed: number;
  mode: Mode;
  challengeLevel: ChallengeLevel | null;
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
          ...(challengeLevel === "hard"
            ? [
                {
                  label: "실수",
                  value: `${slipCount}회`,
                  valueClassName:
                    slipCount > 0 ? "text-red-600" : "text-gray-600",
                },
              ]
            : []),
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
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
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

/** 기존 성과가 있을 때 비교해서 저장 여부를 물어보는 UI */
function ChallengeStatSaver({
  level,
  draftKey,
  current,
}: {
  level: ChallengeLevel;
  draftKey: string;
  current: Omit<ChallengeStat, "savedAt">;
}) {
  const existing = getChallengeStat(level, draftKey);
  const existingMedal = existing
    ? calcMedal(level, existing.colorAccuracy, existing.slipCount)
    : null;
  const currentMedal = calcMedal(
    level,
    current.colorAccuracy,
    current.slipCount,
  );
  const [saved, setSaved] = useState(() => {
    if (isBetterMedal(currentMedal, existingMedal)) {
      saveChallengeStat(level, draftKey, current);
      return true;
    }
    return false;
  });

  const save = () => {
    saveChallengeStat(level, draftKey, current);
    setSaved(true);
  };

  if (saved) {
    return (
      <p className="text-sm text-green-600 font-medium">기록이 저장됐어요!</p>
    );
  }

  if (!existing) return null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-5 py-4 text-sm text-stone-700">
      <p className="font-medium text-stone-600">이전 기록이 있어요</p>
      <div className="flex gap-6 text-xs text-stone-500">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-stone-400">이전</span>
          {existingMedal && <MedalIcon medal={existingMedal} />}
          <span>{formatElapsed(existing.elapsed)}</span>
          <span>{existing.colorAccuracy.toFixed(1)}%</span>
          {level === "hard" && <span>{existing.spm.toFixed(1)} SPM</span>}
        </div>
        <div className="w-px bg-stone-200" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-stone-800">이번</span>
          {currentMedal && <MedalIcon medal={currentMedal} />}
          <span
            className={
              current.elapsed < existing.elapsed ? "text-green-600" : ""
            }
          >
            {formatElapsed(current.elapsed)}
          </span>
          <span
            className={
              current.colorAccuracy > existing.colorAccuracy
                ? "text-green-600"
                : ""
            }
          >
            {current.colorAccuracy.toFixed(1)}%
          </span>
          {level === "hard" && (
            <span
              className={current.spm > existing.spm ? "text-green-600" : ""}
            >
              {current.spm.toFixed(1)} SPM
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={save}
          className="rounded-full break-keep bg-stone-900 px-4 py-1.5 text-xs text-white hover:bg-stone-800 transition-colors"
        >
          이번 기록으로 덮어쓰기
        </button>
        <button
          onClick={() => setSaved(true)}
          className="rounded-full border shrink-0 border-stone-300 px-4 py-1.5 text-xs text-stone-600 hover:bg-stone-100 transition-colors"
        >
          유지
        </button>
      </div>
    </div>
  );
}

export default function ResultModal({
  resultModalRef,
  resultCaptureRef,
  mode,
  challengeLevel,
  challengeDraftKey,
  finalRows,
  elapsed,
  slipCount,
  colorAccuracy,
  spm,
  challengeDraft,
  isSavingResult,
  onSaveResult,
  onResumeFreeMode,
  onBackToSelect,
  onInitialize,
}: {
  resultModalRef: RefObject<HTMLDivElement | null>;
  resultCaptureRef: RefObject<HTMLDivElement | null>;
  mode: Mode;
  challengeLevel: ChallengeLevel | null;
  challengeDraftKey: string | null;
  finalRows: Stitch[][];
  elapsed: number;
  slipCount: number;
  colorAccuracy: number;
  spm: number;
  challengeDraft: number[][];
  isSavingResult: boolean;
  onSaveResult: () => void;
  onResumeFreeMode: () => void;
  onBackToSelect: () => void;
  onInitialize: () => void;
}) {
  const medal =
    mode === "challenge" && challengeLevel
      ? calcMedal(challengeLevel, colorAccuracy, slipCount)
      : null;

  return (
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
              <div className="flex items-center gap-2">
                <ResultModeLabel mode={mode} challengeLevel={challengeLevel} />
                <MedalIcon medal={medal} />
              </div>
            </div>
            <ResultStats
              rows={finalRows}
              elapsed={elapsed}
              mode={mode}
              challengeLevel={challengeLevel}
              slipCount={slipCount}
              colorAccuracy={colorAccuracy}
              spm={spm}
            />

            <div
              className={`grid w-full justify-center gap-10 ${mode === "challenge" ? "md:grid-cols-2" : ""}`}
            >
              {mode === "challenge" && (
                <div className="hidden md:block">
                  <ResultPattern
                    title="도안"
                    draft={challengeDraft}
                    showNumbers
                  />
                </div>
              )}
              <ResultMuffler title="완성품" rows={finalRows} />
            </div>
          </div>

          <div
            className="flex flex-col items-center gap-3 pt-4"
            data-html-to-image-ignore="true"
          >
            {/* 챌린지 기록 저장 */}
            {mode === "challenge" && challengeLevel && challengeDraftKey && (
              <ChallengeStatSaver
                level={challengeLevel}
                draftKey={challengeDraftKey}
                current={{ elapsed, slipCount, colorAccuracy, spm }}
              />
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={onSaveResult}
                disabled={isSavingResult}
                className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download />
                {isSavingResult ? "이미지 생성 중..." : "결과 저장하기"}
              </button>
              {mode === "free" && (
                <button
                  onClick={onResumeFreeMode}
                  disabled={isSavingResult}
                  className="flex items-center rounded-full border border-gray-300 bg-white/90 px-4 py-2 text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  이어 뜨기
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onBackToSelect}
                  disabled={isSavingResult}
                  className="rounded-full border border-gray-300 bg-white/90 p-2 text-sm"
                >
                  <House />
                </button>
                <button
                  onClick={onInitialize}
                  className="rounded-full border border-gray-300 bg-white/90 p-2 text-sm"
                >
                  <RotateCcw />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
