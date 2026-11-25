"use client";

import { Armchair, Lamp, Lightbulb, LightbulbOff, Redo2, Undo2, Users } from "lucide-react";
import type { Quality, Tier } from "./quality";
import type { Store } from "./store";
import type { ReactNode } from "react";
import { BUTTON, LABEL, SEG_GROUP, SEG_ITEM } from "./ui";
import { useHistory } from "./useShow";
import type { ViewMode } from "./useStageScene";

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "edit", label: "편집" },
  { value: "audience", label: "객석" },
  { value: "plot", label: "평면도" },
];
const QUALITIES: { value: Quality; label: string }[] = [
  { value: "auto", label: "자동" },
  { value: "high", label: "높음" },
  { value: "low", label: "낮음" },
];

type Props = {
  store: Store;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  workLight: boolean;
  onWorkLight: (on: boolean) => void;
  quality: Quality;
  tier: Tier;
  onQuality: (q: Quality) => void;
  haze: number;
  ambient: number;
  onAmbient: (v: number) => void;
  hazeStatus: "rising" | "falling" | null;
  houseLights: boolean;
  onHouseLights: (on: boolean) => void;
  audience: boolean;
  onAudience: (on: boolean) => void;
  seatLabel: string;
  onBegin: () => void;
  onHaze: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
};

/** 켜고 끄는 옵션: 모드 버튼과 다르게 테두리 없는 스위치로 보인다. */
function Switch({ on, onChange, title, children }: { on: boolean; onChange: (on: boolean) => void; title: string; children: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} title={title}
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-bold text-ink hover:bg-shade">
      {/* 라벨 다음에 스위치 */}
      {children}
      <span aria-hidden className={`relative h-4 w-7 shrink-0 rounded-full border border-white/15 transition-colors ${on ? "bg-point" : "bg-surface"}`}>
        <span className={`absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-[left] ${on ? "left-[14px] bg-surface" : "left-0.5 bg-ink/60"}`} />
      </span>
    </button>
  );
}

export default function Toolbar(p: Props) {
  const { canUndo, canRedo } = useHistory(p.store);

  const qualityLabel = (q: Quality, label: string) => (q === "auto" && p.quality === "auto" && p.tier > 0 ? "자동(낮춤)" : label);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/15 bg-surface px-3 py-2">
      <div role="group" aria-label="시점" className="flex items-center gap-1.5">
        <span className={LABEL}>시점</span>
        <div className={SEG_GROUP}>
        {VIEWS.map((v) => (
          <button key={v.value} type="button" aria-pressed={p.view === v.value} onClick={() => p.onView(v.value)} className={SEG_ITEM}>
            {v.label}
          </button>
        ))}
        </div>
      </div>

      {p.view === "audience" && (
        <p className="flex items-center gap-1 text-xs text-ink" aria-live="polite">
          <Armchair aria-hidden className="size-4 text-ink" />
          <span className={LABEL}>현재 좌석</span>
          <span className="font-bold">{p.seatLabel}</span>
        </p>
      )}

      <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
        <Switch on={p.workLight} onChange={p.onWorkLight} title="조명을 모두 꺼도 무대가 보이게 비추는 약한 불">
          {p.workLight ? <Lightbulb aria-hidden className="size-4" /> : <LightbulbOff aria-hidden className="size-4" />}
          작업등
        </Switch>
        <Switch on={p.houseLights} onChange={p.onHouseLights} title="객석 천장 불. 켜면 극장 전체 배치와 공간을 볼 수 있어요">
          <Lamp aria-hidden className="size-4" />
          객석등
        </Switch>
        <Switch on={p.audience} onChange={p.onAudience} title="객석 좌석마다 관객을 앉혀요. 관객 시점으로 보는 자리는 비워 둬요">
          <Users aria-hidden className="size-4" />
          관객
        </Switch>
      </div>

      <label className="flex items-center gap-1.5" title="유도등·통로등 같은 약한 불빛과, 무대에서 튕겨 나온 빛의 세기. 큐에는 들어가지 않아요">
        <span className={LABEL}>Ambient</span>
        <input type="range" min={0} max={1} step={0.01} value={p.ambient} aria-label="Ambient 세기"
          onPointerDown={p.onBegin} onKeyDown={p.onBegin} onChange={(e) => p.onAmbient(Number(e.target.value))}
          className="w-20 accent-point" />
        <span className="w-8 text-[11px] tabular-nums text-ink/70">{Math.round(p.ambient * 100)}%</span>
      </label>

      <label className="flex items-center gap-1.5">
        <span className={LABEL}>Haze</span>
        <input type="range" min={0} max={1} step={0.01} value={p.haze} aria-label="Haze 농도"
          onPointerDown={p.onBegin} onKeyDown={p.onBegin} onChange={(e) => p.onHaze(Number(e.target.value))}
          className="w-20 accent-point" />
        <span className="w-8 text-[11px] tabular-nums text-ink/70">{Math.round(p.haze * 100)}%</span>
        {p.hazeStatus && (
          <span role="status" className="text-[11px] text-ink/60">{p.hazeStatus === "rising" ? "채우는 중" : "빠지는 중"}</span>
        )}
      </label>

      <div role="group" aria-label="품질" className="flex items-center gap-1">
        <span className={LABEL}>품질</span>
        <div className={SEG_GROUP}>
        {QUALITIES.map((q) => (
          <button key={q.value} type="button" aria-pressed={p.quality === q.value} onClick={() => p.onQuality(q.value)} className={SEG_ITEM}>
            {qualityLabel(q.value, q.label)}
          </button>
        ))}
        </div>
      </div>

      <div className="ml-auto flex gap-1">
        <button type="button" onClick={p.onUndo} disabled={!canUndo} aria-label="되돌리기" title="되돌리기 (⌘/Ctrl+Z)" className={BUTTON}>
          <Undo2 aria-hidden className="size-4" />
        </button>
        <button type="button" onClick={p.onRedo} disabled={!canRedo} aria-label="다시 하기" title="다시 하기 (⌘/Ctrl+Shift+Z)" className={BUTTON}>
          <Redo2 aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
