"use client";

import { KnitMufflerIcon } from "@/components/SVG";
import {
  CircleCheck,
  CircleStar,
  Eye,
  Share2,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Draft, EASY_DRAFTS, NORMAL_DRAFTS } from "./data";
import DraftPreview from "./DraftPreview";
import {
  ChallengeLevel,
  ChallengeProgress,
  ChallengeStat,
  ColorMode,
  FreeSave,
  Width,
} from "./type";
import {
  clearAllStats,
  clearFreeSave,
  FREE_SLOT_COUNT,
  getChallengeProgress,
  getChallengeStat,
  getFreeSaves,
} from "./useKnittingStorage";
import { calcMedal, formatElapsed, MEDAL_COLOR, Medal as MedalType } from "./utils";

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
        <div ref={contentRef}>
          <div className="border-t-2 border-stone-400 px-6">
            <div className="py-2 border-b border-stone-400">
              <p className="text-sm break-keep text-center text-stone-500 mt-2">
                {description}
              </p>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="p-3 flex overflow-x-auto gap-3">
              {drafts.map((entry) => (
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
  onResume,
  onDelete,
}: {
  index: number;
  save: FreeSave | null;
  onStart: (index: number, width: Width, name: string) => void;
  onResume: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState<Width>(10);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (save) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col min-w-0">
          <p className="font-semibold truncate">{save.name || `슬롯 ${index + 1}`}</p>
          <p className="text-xs text-stone-400">{save.width}코 · {formatElapsed(save.elapsed)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onResume(index)}
            className="rounded-full bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700 transition-colors"
          >
            이어하기
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(index)}
                className="rounded-full bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-stone-200 p-1.5 text-stone-400 hover:text-red-500 hover:border-red-300 transition-colors"
              aria-label="삭제"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="작품 이름"
        maxLength={20}
        className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-stone-400"
      />
      <div className="flex shrink-0 rounded-lg border border-stone-200 bg-white text-sm overflow-hidden">
        <button
          onClick={() => setWidth(10)}
          className={`px-3 py-1.5 transition-colors ${width === 10 ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
        >
          10코
        </button>
        <button
          onClick={() => setWidth(20)}
          className={`px-3 py-1.5 transition-colors ${width === 20 ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
        >
          20코
        </button>
      </div>
      <button
        onClick={() => onStart(index, width, name.trim() || `슬롯 ${index + 1}`)}
        className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700 transition-colors"
      >
        시작
      </button>
    </div>
  );
}

function FreeAccordion({
  freeSlots,
  onStartFreeSlot,
  onResumeFreeSlot,
  onDeleteSlot,
}: {
  freeSlots: (FreeSave | null)[];
  onStartFreeSlot: (index: number, width: Width, name: string) => void;
  onResumeFreeSlot: (index: number) => void;
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

  const filledCount = freeSlots.filter(Boolean).length;

  return (
    <div className="rounded-xl border-2 border-stone-400 bg-stone-50 overflow-hidden transition-transform hover:-translate-y-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="shrink-0 text-2xl font-semibold">🎨 자유 모드</span>
        {filledCount > 0 && (
          <span className="text-xl shrink-0 font-bold">{filledCount}/{FREE_SLOT_COUNT}</span>
        )}
      </button>
      <div style={{ height, transition: "height 300ms ease" }}>
        <div ref={contentRef}>
          <div className="border-t-2 border-stone-400 px-6">
            <div className="py-2 border-b border-stone-400">
              <p className="text-sm break-keep text-center text-stone-500 mt-2">
                자유롭게 나만의 목도리를 만들어보세요!
              </p>
            </div>
          </div>
          <div className="px-6 py-4 flex flex-col gap-3">
            {Array.from({ length: FREE_SLOT_COUNT }, (_, i) => (
              <FreeSlotCard
                key={i}
                index={i}
                save={freeSlots[i] ?? null}
                onStart={onStartFreeSlot}
                onResume={onResumeFreeSlot}
                onDelete={onDeleteSlot}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SelectScreen({
  onStartChallenge,
  onStartFreeSlot,
  onResumeFreeSlot,
  colorMode,
  onColorModeChange,
}: {
  onStartChallenge: (level: ChallengeLevel, draftId: number) => void;
  onStartFreeSlot: (index: number, width: Width, name: string) => void;
  onResumeFreeSlot: (index: number) => void;
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
        {!!progress.easy?.total &&
        !!progress.normal?.total &&
        progress.easy?.total === progress.easy?.perfect &&
        progress.normal?.total === progress.normal?.perfect ? (
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
            drafts={EASY_DRAFTS}
            bgClassName="bg-amber-50"
            progress={progress.easy}
            description="도안을 따라 알맞은 색상으로 작품을 완성해보세요!"
            onSelectDraft={onStartChallenge}
          />
          <ModeAccordion
            label="⭐️ NORMAL"
            level="normal"
            drafts={NORMAL_DRAFTS}
            bgClassName="bg-orange-100"
            progress={progress.normal}
            description="일정 확률로 잘못 뜬 코가 만들어집니다. 잘못 뜬 코를 풀고 다시 뜨면서 실수 없이 도안을 완성해보세요!"
            onSelectDraft={onStartChallenge}
          />
          <ModeAccordion
            label="🔥 HARD"
            level="hard"
            drafts={NORMAL_DRAFTS}
            bgClassName="bg-red-100"
            progress={progress.hard}
            description="뜰 수 있는 코의 종류가 늘어났습니다. 건투를 빕니다!"
            onSelectDraft={onStartChallenge}
          />
          <FreeAccordion
            freeSlots={freeSlots}
            onStartFreeSlot={onStartFreeSlot}
            onResumeFreeSlot={onResumeFreeSlot}
            onDeleteSlot={handleDeleteSlot}
          />
        </div>
      </div>
    </div>
  );
}
