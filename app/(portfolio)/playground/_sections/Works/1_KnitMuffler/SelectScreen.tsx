"use client";

import { KnitMufflerIcon } from "@/components/SVG";
import {
  CircleCheck,
  CircleDashed,
  CircleStar,
  Eye,
  Share2,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EASY_DRAFTS, HARD_DRAFTS } from "./data";
import DraftPreview from "./DraftPreview";
import { ChallengeLevel, ColorMode } from "./type";
import {
  ChallengeProgress,
  ChallengeStat,
  clearAllStats,
  FreeSave,
  getChallengeProgress,
  getChallengeStat,
  getFreeSave,
} from "./useKnittingStorage";
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
      <span className="text-sm gap-2 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
        <Zap className="size-4" /> {stat.spm.toFixed(1)}{" "}
        <CircleCheck className="size-4" />
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
  const [stat, setStat] = useState<ChallengeStat | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStat(getChallengeStat(level, entry.key));
  }, [level, entry.key]);
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
        <span className="text-sm text-stone-400">미완료</span>
      )}
      <MedalIcon className="absolute -left-3 -top-3 size-8" medal={medal} />
    </button>
  );
}

function ModeAccordion({
  label,
  level,
  drafts,
  bgClassName,
  progress,
  onSelectDraft,
}: {
  label: string;
  level: ChallengeLevel;
  drafts: DraftEntry[];
  bgClassName: string;
  progress: ChallengeProgress | null;
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
      className={`rounded-xl border-2 border-stone-400 ${bgClassName} overflow-hidden transition-transform hover:-translate-y-1`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="shrink-0 text-2xl font-semibold">{label}</span>
        {progress ? (
          <div
            className={`text-xl shrink-0 font-bold ${
              progress.clear === progress.total ? "text-green-400" : ""
            }`}
          >
            {progress.clear}/{progress.total}
          </div>
        ) : (
          ""
        )}
      </button>
      <div style={{ height, transition: "height 300ms ease" }}>
        <div className="px-6">
          <div className="border-b border-stone-400"></div>
        </div>
        <div ref={contentRef} className="px-6 py-4">
          <div className="p-3 flex overflow-x-auto gap-3">
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

function ResetButton() {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    clearAllStats();
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        기록 초기화
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl text-stone-800">
            <p className="text-base break-keep text-center font-medium">
              지금까지 저장된 모든 기록을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 transition-colors"
              >
                아니오
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-full bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors"
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "뜨개뜨개", url });
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
  const [progress, setProgress] = useState<{
    easy: ChallengeProgress | null;
    hard: ChallengeProgress | null;
    free: FreeSave | null;
  }>({
    easy: null,
    hard: null,
    free: null,
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress({
      easy: getChallengeProgress("easy"),
      hard: getChallengeProgress("hard"),
      free: getFreeSave(),
    });
  }, []);

  return (
    <div className="font-knit-muffler h-full max-h-full bg-[#f8f4ee] text-stone-900 flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="max-w-xl w-full flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1 items-center border-y-4 border-dashed border-orange-200 w-full justify-between py-2">
            <KnitMufflerIcon size="40" />
            <h2 className="text-5xl font-bold">
              뜨<span className="text-4xl text-orange-400">개</span>뜨
              <span className="text-4xl text-orange-400">개</span>
            </h2>
            <KnitMufflerIcon size="40" />
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <ResetButton />
            <ShareButton />
            <button
              role="switch"
              aria-checked={colorMode === "weakness"}
              onClick={() =>
                onColorModeChange(
                  colorMode === "normal" ? "weakness" : "normal",
                )
              }
              className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-stone-500" />
              <span>색약 모드</span>
              {/* Switch track */}
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
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
        {!!progress.easy?.total &&
        !!progress.hard?.total &&
        progress.easy?.total === progress.easy?.perfect &&
        progress.hard?.total === progress.hard?.perfect ? (
          <div className="flex flex-col gap-1 items-center border border-stone-200 bg-white p-2 py-4 rounded-md">
            <p className="text-xl">🎉 축하합니다! 🎉</p>
            <p>모든 도안을 완벽하게 완성했습니다.</p>
            <p>이제 [자유모드]에서 나만의 도안을 만들어보세요!</p>
            <p>플레이해주셔서 감사합니다(_ _)</p>
            <p className="text-xs text-gray-400">
              이따금씩 새로운 도안이 업데이트될 예정이니 기대해주세요!
            </p>
          </div>
        ) : (
          ""
        )}
        <div className="flex flex-col gap-4">
          <ModeAccordion
            label="🌱 EASY"
            level="easy"
            drafts={EASY_ENTRIES}
            bgClassName="bg-amber-50"
            progress={progress.easy}
            onSelectDraft={onStartChallenge}
          />
          <ModeAccordion
            label="🔥 HARD"
            level="hard"
            drafts={HARD_ENTRIES}
            bgClassName="bg-orange-100"
            progress={progress.hard}
            onSelectDraft={onStartChallenge}
          />
          <button
            onClick={onStartFree}
            className="flex justify-between gap-2 items-center rounded-xl border-2 border-stone-400 bg-stone-50 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
          >
            <p className="text-2xl font-semibold shrink-0">🎨 자유 모드</p>
            {progress.free ? (
              <div className="flex gap-1 text-gray-400 break-keep items-center">
                <CircleDashed className="size-4" />
                <p className="shrink">작업하던 기록이 있습니다.</p>
              </div>
            ) : (
              ""
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
