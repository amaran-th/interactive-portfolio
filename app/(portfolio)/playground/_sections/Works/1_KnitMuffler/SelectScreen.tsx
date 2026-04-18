"use client";

import { KnitMufflerIcon } from "@/components/SVG";
import {
  CircleCheck,
  CircleStar,
  Clock,
  Eye,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Draft, DRAFTS } from "./data";
import DraftPreview from "./DraftPreview";
import { MufflerPreview } from "./MufflerPreview";
import {
  ChallengeLevel,
  ChallengeProgress,
  ChallengeStat,
  ColorMode,
  FreeSave,
  Medal,
} from "./type";
import {
  clearAllStats,
  clearFreeSave,
  FREE_SLOT_COUNT,
  getChallengeProgress,
  getChallengeStat,
  getFreeSaves,
} from "./useKnittingStorage";
import { calcMedal, formatElapsedResult, MEDAL_COLOR } from "./utils";

export function MedalIcon({
  medal,
  className,
}: {
  medal: Medal;
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
      <span className="text-sm gap-1.5 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
        <Clock className="size-3.5" />
        {formatElapsedResult(stat.elapsed, false)}
      </span>
      <span className="text-sm gap-1.5 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
        <CircleCheck className="size-3.5" />
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
  entry: Draft;
  level: ChallengeLevel;
  onClick: () => void;
}) {
  const [stat, setStat] = useState<ChallengeStat | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStat(getChallengeStat(level, entry.id));
  }, [level, entry.id]);
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
        draft={entry}
        cellSize={12 / (entry.width / 10)}
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
  description,
  onSelectDraft,
}: {
  label: string;
  level: ChallengeLevel;
  drafts: Draft[];
  bgClassName: string;
  progress: ChallengeProgress | null;
  description: string;
  onSelectDraft: (level: ChallengeLevel, draftId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const availableWidths = [...new Set(drafts.map((d) => d.width))].sort(
    (a, b) => a - b,
  );
  const [selectedWidth, setSelectedWidth] = useState<number>(
    availableWidths[0],
  );
  const filteredDrafts =
    availableWidths.length > 1
      ? drafts.filter((d) => d.width === selectedWidth)
      : drafts;

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [open, selectedWidth]);

  return (
    <div
      className={`rounded-xl border-2 border-gray-900 ${bgClassName} overflow-hidden transition-transform hover:-translate-y-1`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="shrink-0 text-2xl font-semibold">{label}</span>
        {progress ? (
          <div
            className={`text-xl shrink-0 font-bold ${
              progress.clear === drafts.length ? "text-green-400" : ""
            }`}
          >
            {progress.clear}/{drafts.length}
          </div>
        ) : (
          ""
        )}
      </button>
      <div style={{ height, transition: "height 300ms ease" }}>
        <div ref={contentRef}>
          <div className="border-t-2 border-gray-900 px-6">
            <div className="py-2 border-b border-stone-400">
              <p className="text-sm break-keep text-center text-stone-500 mt-2">
                {description}
              </p>
            </div>
          </div>

          {/* 코 수 필터 탭 */}
          <div className="px-6 pt-4 flex gap-2">
            {availableWidths.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWidth(w)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  selectedWidth === w
                    ? "bg-stone-800 text-white border-stone-800"
                    : "border-stone-400 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {w}수
              </button>
            ))}
          </div>

          <div className="px-6 py-4">
            <div className="p-3 flex overflow-x-auto gap-3">
              {filteredDrafts.map((entry) => (
                <DraftCard
                  key={entry.id}
                  entry={entry}
                  level={level}
                  onClick={() => onSelectDraft(level, entry.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(!!navigator.share);
  }, []);

  if (!canShare) return null;

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "뜨개뜨개",
        text: "색실로 목도리를 완성해보세요!",
        url: window.location.href,
      });
    } catch {
      // 사용자가 공유를 취소한 경우 등 — 아무 것도 하지 않음
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
    >
      <Share2 className="w-4 h-4" />
      공유하기
    </button>
  );
}

function FreeSlotCard({
  index,
  save,
  onStart,
  onView,
}: {
  index: number;
  save: FreeSave | null;
  onStart: (index: number) => void;
  onView: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  if (!save) {
    return (
      <button
        onClick={() => onStart(index)}
        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white px-8 py-6 shadow-sm transition-all hover:border-stone-400 hover:-translate-y-0.5 hover:shadow-md min-w-37"
      >
        <Plus className="size-7 text-stone-300" />
        <span className="text-sm text-stone-400">새 작품</span>
        <span className="text-xs text-stone-300">슬롯 {index + 1}</span>
      </button>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-stone-200 bg-white shadow-sm min-w-37 transition-all hover:border-stone-400 hover:-translate-y-0.5 hover:shadow-md">
      <button
        onClick={() => onView(index)}
        className="flex flex-col items-center gap-2 w-full"
      >
        <div className="min-h-15 relative w-full flex justify-center">
          <MufflerPreview
            rows={save.rows.slice(0, 5)}
            stitchCount={save.width}
            cellSize={12}
            compact
          />
          <div className="-inset-2 absolute z-80 from-transparent to-white from-50% bg-linear-to-b"></div>
        </div>
        <p className="text-sm font-medium text-center break-all line-clamp-2">
          {save.name || `슬롯 ${index + 1}`}
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          <span className="text-sm gap-1.5 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
            <Clock className="size-3.5" />
            {formatElapsedResult(save.elapsed, false)}
          </span>
          <span className="text-sm gap-1.5 flex items-center text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
            {save.rows.length}줄
          </span>
        </div>
      </button>
      <div className="absolute -left-3 -top-3 size-8 rounded-full flex justify-center items-center -rotate-20 bg-stone-800 text-white z-80 text-xs">
        {save.width}수
      </div>
    </div>
  );
}

function FreeAccordion({
  freeSlots,
  onStartFreeSlot,
  onViewFreeSave,
  onDeleteSlot,
}: {
  freeSlots: (FreeSave | null)[];
  onStartFreeSlot: (index: number) => void;
  onViewFreeSave: (index: number) => void;
  onDeleteSlot: (index: number) => void;
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
  }, [open, freeSlots]);

  return (
    <div className="rounded-xl border-2 border-gray-900 bg-stone-50 overflow-hidden transition-transform hover:-translate-y-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="shrink-0 text-2xl font-semibold">🎨 자유 모드</span>
      </button>
      <div style={{ height, transition: "height 300ms ease" }}>
        <div ref={contentRef}>
          <div className="border-t-2 border-gray-900 px-6">
            <div className="py-2 border-b border-stone-400">
              <p className="text-sm break-keep text-center text-stone-500 mt-2">
                자유롭게 나만의 작품을 만들어보세요!
              </p>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="p-3 flex overflow-x-auto gap-3">
              {Array.from({ length: FREE_SLOT_COUNT }, (_, i) => (
                <FreeSlotCard
                  key={i}
                  index={i}
                  save={freeSlots[i] ?? null}
                  onStart={onStartFreeSlot}
                  onView={onViewFreeSave}
                  onDelete={onDeleteSlot}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SelectScreen({
  onStartChallenge,
  onStartFreeSlot,
  onViewFreeSave,
  colorMode,
  onColorModeChange,
}: {
  onStartChallenge: (level: ChallengeLevel, draftId: number) => void;
  onStartFreeSlot: (index: number) => void;
  onViewFreeSave: (index: number) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}) {
  const [progress, setProgress] = useState<{
    easy: ChallengeProgress | null;
    normal: ChallengeProgress | null;
    hard: ChallengeProgress | null;
  }>({
    easy: null,
    normal: null,
    hard: null,
  });
  const [freeSlots, setFreeSlots] = useState<(FreeSave | null)[]>(
    Array.from({ length: FREE_SLOT_COUNT }, () => null),
  );

  const allPerfect =
    progress.easy?.perfect === DRAFTS.easy.length &&
    progress.normal?.perfect === DRAFTS.normal.length &&
    progress.hard?.perfect === DRAFTS.hard.length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress({
      easy: getChallengeProgress("easy"),
      normal: getChallengeProgress("normal"),
      hard: getChallengeProgress("hard"),
    });
    setFreeSlots(getFreeSaves());
  }, []);

  const handleDeleteSlot = (index: number) => {
    clearFreeSave(index);
    setFreeSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

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
        {allPerfect && (
          <div className="flex flex-col gap-1 items-center border border-stone-200 bg-white p-2 py-4 rounded-md">
            <p className="text-xl">🎉 축하합니다! 🎉</p>
            <p>모든 도안을 완벽하게 완성했습니다.</p>
            <p>이제 [자유모드]에서 나만의 도안을 만들어보세요!</p>
            <p>플레이해주셔서 감사합니다(_ _)</p>
            <p className="text-xs text-gray-400">
              이따금씩 새로운 도안이 업데이트될 예정이니 기대해주세요!
            </p>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <ModeAccordion
            label="🌱 EASY"
            level="easy"
            drafts={DRAFTS.easy}
            bgClassName="bg-amber-50"
            progress={progress.easy}
            description="도안을 따라 알맞은 색상으로 작품을 완성해보세요!"
            onSelectDraft={onStartChallenge}
          />
          <ModeAccordion
            label="⭐️ NORMAL"
            level="normal"
            drafts={DRAFTS.normal}
            bgClassName="bg-orange-100"
            progress={progress.normal}
            description="일정 확률로 잘못 뜬 코가 만들어집니다. 잘못 뜬 코를 풀고 다시 뜨면서 실수 없이 도안을 완성해보세요!"
            onSelectDraft={onStartChallenge}
          />
          <ModeAccordion
            label="🔥 HARD"
            level="hard"
            drafts={DRAFTS.hard}
            bgClassName="bg-red-100"
            progress={progress.hard}
            description="뜰 수 있는 코의 종류가 늘어났습니다. 건투를 빕니다!"
            onSelectDraft={onStartChallenge}
          />
          <FreeAccordion
            freeSlots={freeSlots}
            onStartFreeSlot={onStartFreeSlot}
            onViewFreeSave={onViewFreeSave}
            onDeleteSlot={handleDeleteSlot}
          />
        </div>
      </div>
    </div>
  );
}
