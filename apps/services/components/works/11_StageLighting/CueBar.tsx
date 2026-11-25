"use client";

import { ChevronDown, Play, Save, SkipBack, Trash2 } from "lucide-react";
import { type RefObject, useState } from "react";
import { LIMITS, type Show, removeCue, saveCue, sortedCues, updateCue } from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL } from "./ui";
import type { Playback } from "./useCuePlayback";
import { useShow } from "./useShow";

type Props = {
  store: Store;
  playback: Playback;
  progressRef: RefObject<HTMLDivElement | null>;
  onBegin: () => void;
  onGo: () => void;
  audienceOnGo: boolean;
  onAudienceOnGo: (v: boolean) => void;
};

export default function CueBar({ store, playback, progressRef, onBegin, onGo, audienceOnGo, onAudienceOnGo }: Props) {
  const cues = useShow(store, (s) => s.cues);
  const sorted = sortedCues({ cues } as Show);
  const current = cues.find((c) => c.id === playback.currentCueId);
  // 바텀시트처럼 접고 편다. 접으면 큐 목록·편집 줄은 숨기고 현재 큐와 BACK·GO만 남긴다.
  const [open, setOpen] = useState(true);

  const saveNew = () => {
    onBegin();
    const next = saveCue(store.get());
    store.set(next);
    if (next.cues.length > cues.length) playback.jump(next.cues[next.cues.length - 1].id);
  };
  const overwrite = () => {
    if (!current) return;
    onBegin();
    store.set(saveCue(store.get(), current.id));
  };
  const remove = () => {
    if (!current) return;
    onBegin();
    store.set(removeCue(store.get(), current.id));
  };
  const meta = (patch: { name?: string; fadeSec?: number }) => {
    if (!current) return;
    store.set(updateCue(store.get(), current.id, patch));
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-white/15 bg-surface px-3 pb-2">
      <button type="button" aria-expanded={open} aria-controls="cue-sheet" onClick={() => setOpen((v) => !v)}
        aria-label={open ? "큐 패널 접기" : "큐 패널 펴기"} title={open ? "큐 패널 접기" : "큐 패널 펴기"}
        className="group flex h-4 w-full items-center justify-center">
        <span aria-hidden className="h-1 w-10 rounded-full bg-white/20 transition-colors group-hover:bg-white/40" />
      </button>
      <div id="cue-sheet" className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="min-h-0 overflow-hidden" inert={!open}>
      <div className="flex items-center gap-2 pb-2">
        <span className={LABEL}>Cue</span>
        <ol aria-label="큐 목록" className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">
          {sorted.map((c) => (
            <li key={c.id}>
              <button type="button" aria-current={c.id === playback.currentCueId ? "true" : undefined}
                onClick={() => playback.jump(c.id)} title={`${c.name} · 페이드 ${c.fadeSec}초`}
                className="flex max-w-40 items-center gap-1 rounded-md border border-white/15 bg-surface px-2 py-1 text-xs font-bold whitespace-nowrap text-ink hover:bg-shade aria-[current]:bg-point aria-[current]:text-on-point">
                <span className="tabular-nums">{c.number}</span>
                <span className="truncate font-normal">{c.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 items-center gap-1.5 text-xs text-ink" title="큐 패널 펴기">
            <ChevronDown aria-hidden className="size-4 rotate-180 text-ink/60" />
            <span className={LABEL}>Cue</span>
            {current ? (
              <span className="truncate"><span className="font-bold tabular-nums">{current.number}</span> {current.name}</span>
            ) : (
              <span className="text-ink/60">고른 큐 없음</span>
            )}
          </button>
        ) : current ? (
          <>
            <input type="text" aria-label="큐 이름" value={current.name} maxLength={30}
              onFocus={() => store.checkpoint()} onChange={(e) => meta({ name: e.target.value })}
              className="w-32 rounded-md border border-white/15 px-2 py-1 text-xs text-ink" />
            <label className="flex items-center gap-1">
              <span className={LABEL}>페이드</span>
              <input type="number" min={0} max={60} step={0.5} value={current.fadeSec}
                onFocus={() => store.checkpoint()} onChange={(e) => meta({ fadeSec: Number(e.target.value) || 0 })}
                className="w-16 rounded-md border border-white/15 px-2 py-1 text-xs text-ink" />
              <span className="text-[11px] text-ink/70">초</span>
            </label>
          </>
        ) : (
          <span className="text-[11px] text-ink/60">큐를 고르면 이름과 페이드 시간을 고칠 수 있어요.</span>
        )}
        {open && (
          <>
        <button type="button" onClick={saveNew} disabled={cues.length >= LIMITS.cues} className={BUTTON}
          title={cues.length >= LIMITS.cues ? `큐는 최대 ${LIMITS.cues}개예요` : "지금 무대 상태를 새 큐로 저장"}>
          <Save aria-hidden className="size-4" /> Record
        </button>
        <button type="button" onClick={overwrite} disabled={!current} className={BUTTON} title="지금 무대 상태로 고른 큐를 덮어써요">
          Update
        </button>
        <button type="button" onClick={remove} disabled={!current} className={BUTTON} aria-label="큐 삭제">
          <Trash2 aria-hidden className="size-4" />
        </button>
        <label className="flex items-center gap-1 text-[11px] text-ink/80">
          <input type="checkbox" checked={audienceOnGo} onChange={(e) => onAudienceOnGo(e.target.checked)} className="accent-point" />
          재생 때 객석 시점
        </label>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={playback.back} className={BUTTON} title="이전 큐로 바로 이동">
            <SkipBack aria-hidden className="size-4" /> BACK
          </button>
          <button type="button" onClick={onGo} title="다음 큐로 페이드 (Space)"
            className="relative flex items-center gap-1 overflow-hidden rounded-md border border-point bg-point px-3 py-1 text-xs font-bold text-on-point hover:bg-point/90">
            <div ref={progressRef} aria-hidden className="absolute inset-0 origin-left bg-main/70" style={{ transform: "scaleX(0)" }} />
            <span className="relative flex items-center gap-1">
              <Play aria-hidden className="size-4" /> {playback.playing ? "재생 중" : "GO"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
