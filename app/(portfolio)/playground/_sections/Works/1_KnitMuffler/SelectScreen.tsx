"use client";

import { CircleCheck, CircleStar, Eye, Gauge, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EASY_DRAFTS, HARD_DRAFTS } from "./data";
import DraftPreview from "./DraftPreview";
import { ChallengeLevel, ColorMode } from "./type";
import { ChallengeStat, getChallengeStat } from "./useKnittingStorage";
import { calcMedal, MEDAL_COLOR, Medal as MedalType } from "./utils";

type DraftEntry = { key: string; draft: number[][] };

export function MedalIcon({
  medal,
  className,
}: {
  medal: MedalType;
  className?: string;
}) {
  if (!medal) return null;
  return (
    <CircleStar
      className={className}
      stroke={MEDAL_COLOR[medal].stroke}
      fill={MEDAL_COLOR[medal].fill}
    />
  );
}

function StatBadge({ stat }: { stat: ChallengeStat }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] gap-1 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
        <Gauge className="size-2" /> {stat.spm.toFixed(1)}{" "}
        <CircleCheck className="size-2" />
        {stat.colorAccuracy.toFixed(0)}%
      </span>
    </div>
  );
}

function DraftCard({
  entry,
  level,
  onClick,
}: {
  entry: DraftEntry;
  level: ChallengeLevel;
  onClick: () => void;
}) {
  const stat = getChallengeStat(level, entry.key);
  const medal = stat
    ? calcMedal(level, stat.colorAccuracy, stat.slipCount)
    : null;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 border-stone-200 bg-white p-3 shadow-sm transition-all hover:border-stone-400 hover:-translate-y-0.5 hover:shadow-md`}
      style={medal ? { borderColor: MEDAL_COLOR[medal].stroke } : {}}
    >
      <DraftPreview
        draft={entry.draft}
        cellSize={12}
        showNumbers={false}
        className="pointer-events-none"
      />
      {stat ? (
        <StatBadge stat={stat} />
      ) : (
        <span className="text-[10px] text-stone-400">미완료</span>
      )}
      <MedalIcon className="absolute -left-3 -top-3 size-8" medal={medal} />
    </button>
  );
}

function Accordion({
  label,
  level,
  drafts,
  bgClassName,
  onSelectDraft,
}: {
  label: string;
  level: ChallengeLevel;
  drafts: DraftEntry[];
  bgClassName: string;
  onSelectDraft: (level: ChallengeLevel, draftKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [open]);

  return (
    <div
      className={`rounded-[28px] border-2 border-stone-300 ${bgClassName} shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden transition-transform hover:-translate-y-1`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center px-7 py-7"
      >
        <span className="text-2xl font-semibold">{label}</span>
      </button>
      <div style={{ height, transition: "height 300ms ease" }}>
        <div ref={contentRef} className="px-7 pb-7 pt-0">
          <div className="p-3 flex overflow-x-auto  gap-3">
            {drafts.map((entry) => (
              <DraftCard
                key={entry.key}
                entry={entry}
                level={level}
                onClick={() => onSelectDraft(level, entry.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const EASY_ENTRIES: DraftEntry[] = Object.entries(EASY_DRAFTS).map(
  ([key, draft]) => ({ key, draft }),
);
const HARD_ENTRIES: DraftEntry[] = Object.entries(HARD_DRAFTS).map(
  ([key, draft]) => ({ key, draft }),
);

function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "목도리 뜨기", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
    >
      <Share2 className="w-4 h-4" />
      {copied ? "복사됐어요!" : "공유하기"}
    </button>
  );
}

export default function SelectScreen({
  onStartChallenge,
  onStartFree,
  colorMode,
  onColorModeChange,
}: {
  onStartChallenge: (level: ChallengeLevel, draftKey: string) => void;
  onStartFree: () => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}) {
  return (
    <div className="h-full max-h-full bg-[#f8f4ee] text-stone-900 flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-4xl font-bold">목도리 뜨기</h2>
          <div className="flex items-center gap-3">
            <ShareButton />
            <button
              role="switch"
              aria-checked={colorMode === "weakness"}
              onClick={() => onColorModeChange(colorMode === "normal" ? "weakness" : "normal")}
              className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-stone-500" />
              <span>색약 모드</span>
              {/* Switch track */}
              <span
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                  colorMode === "weakness" ? "bg-stone-700" : "bg-stone-200"
                }`}
              >
                {/* Switch thumb */}
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    colorMode === "weakness" ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Accordion
            label="이지 모드"
            level="easy"
            drafts={EASY_ENTRIES}
            bgClassName="bg-green-50"
            onSelectDraft={onStartChallenge}
          />
          <Accordion
            label="하드 모드"
            level="hard"
            drafts={HARD_ENTRIES}
            bgClassName="bg-red-50"
            onSelectDraft={onStartChallenge}
          />
          <button
            onClick={onStartFree}
            className="text-left rounded-[28px] border-2 border-stone-300 bg-stone-50 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
          >
            <p className="text-2xl font-semibold text-center">자유 모드</p>
          </button>
        </div>
      </div>
    </div>
  );
}
