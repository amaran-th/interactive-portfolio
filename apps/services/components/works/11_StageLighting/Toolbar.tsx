"use client";

import { Armchair, Lamp, Lightbulb, LightbulbOff, Plus, Redo2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Quality, Tier } from "./quality";
import { FIXTURE_KINDS, FIXTURE_LABELS, type FixtureKind, LIMITS, PROP_KINDS, PROP_SPECS, type PropKind } from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL, SEGMENT } from "./ui";
import { useHistory, useShow } from "./useShow";
import type { ViewMode } from "./useStageScene";

export type AddItem = { type: "prop"; kind: PropKind } | { type: "actor" } | { type: "fixture"; kind: FixtureKind };

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "edit", label: "편집" },
  { value: "audience", label: "객석" },
  { value: "plot", label: "플롯" },
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
  seatLabel: string;
  onSeatMap: () => void;
  onBegin: () => void;
  onHaze: (v: number) => void;
  onAdd: (item: AddItem) => void;
  onUndo: () => void;
  onRedo: () => void;
};

export default function Toolbar(p: Props) {
  const { canUndo, canRedo } = useHistory(p.store);
  const counts = useShow(p.store, (s) => `${s.props.length}|${s.actors.length}|${s.fixtures.length}`);
  const [nProps, nActors, nFixtures] = counts.split("|").map(Number);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (item: AddItem) => {
    setOpen(false);
    p.onAdd(item);
  };
  const full = (n: number, max: number) => (n >= max ? `최대 ${max}개까지 둘 수 있어요` : undefined);
  const qualityLabel = (q: Quality, label: string) => (q === "auto" && p.quality === "auto" && p.tier > 0 ? "자동(낮춤)" : label);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-point bg-white px-3 py-2">
      <div ref={menuRef} className="relative">
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={BUTTON}>
          <Plus aria-hidden className="size-4" /> 추가
        </button>
        {open && (
          <div className="absolute top-full left-0 z-20 mt-1 grid w-max grid-cols-2 gap-x-4 gap-y-1 rounded-lg border-2 border-point bg-white p-2 shadow-[3px_3px_0_0_var(--color-point)]">
            <div className="flex flex-col gap-0.5">
              <p className={LABEL}>소품</p>
              {PROP_KINDS.map((k) => (
                <MenuItem key={k} label={PROP_SPECS[k].label} disabledReason={full(nProps, LIMITS.props)}
                  onClick={() => pick({ type: "prop", kind: k })} />
              ))}
              <p className={`${LABEL} mt-1`}>인물</p>
              <MenuItem label="인물" disabledReason={full(nActors, LIMITS.actors)} onClick={() => pick({ type: "actor" })} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className={LABEL}>조명기</p>
              {FIXTURE_KINDS.map((k) => (
                <MenuItem key={k} label={FIXTURE_LABELS[k]} disabledReason={full(nFixtures, LIMITS.fixtures)}
                  onClick={() => pick({ type: "fixture", kind: k })} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div role="group" aria-label="시점" className="flex gap-1">
        {VIEWS.map((v) => (
          <button key={v.value} type="button" aria-pressed={p.view === v.value} onClick={() => p.onView(v.value)} className={SEGMENT}>
            {v.label}
          </button>
        ))}
      </div>

      {p.view === "audience" && (
        <button type="button" onClick={p.onSeatMap} className={BUTTON} title="좌석 지도에서 다른 자리 고르기">
          <Armchair aria-hidden className="size-4" /> {p.seatLabel}
        </button>
      )}

      <button type="button" aria-pressed={p.workLight} onClick={() => p.onWorkLight(!p.workLight)} className={SEGMENT}
        title="조명을 모두 꺼도 무대가 보이게 비추는 약한 불">
        <span className="flex items-center gap-1">
          {p.workLight ? <Lightbulb aria-hidden className="size-4" /> : <LightbulbOff aria-hidden className="size-4" />}
          작업등
        </span>
      </button>

      <button type="button" aria-pressed={p.houseLights} onClick={() => p.onHouseLights(!p.houseLights)} className={SEGMENT}
        title="객석 천장 불. 켜면 극장 전체 배치와 공간을 볼 수 있어요">
        <span className="flex items-center gap-1">
          <Lamp aria-hidden className="size-4" />
          객석등
        </span>
      </button>

      <label className="flex items-center gap-1.5" title="유도등·통로등 같은 약한 불빛과, 무대에서 튕겨 나온 빛의 세기. 큐에는 들어가지 않아요">
        <span className={LABEL}>잔광</span>
        <input type="range" min={0} max={1} step={0.01} value={p.ambient} aria-label="잔광 세기"
          onPointerDown={p.onBegin} onKeyDown={p.onBegin} onChange={(e) => p.onAmbient(Number(e.target.value))}
          className="w-16 accent-point" />
        <span className="w-8 text-[11px] tabular-nums text-ink/70">{Math.round(p.ambient * 100)}%</span>
      </label>

      <label className="flex items-center gap-1.5">
        <span className={LABEL}>헤이즈</span>
        <input type="range" min={0} max={1} step={0.01} value={p.haze} aria-label="헤이즈 농도"
          onPointerDown={p.onBegin} onKeyDown={p.onBegin} onChange={(e) => p.onHaze(Number(e.target.value))}
          className="w-24 accent-point" />
        <span className="w-8 text-[11px] tabular-nums text-ink/70">{Math.round(p.haze * 100)}%</span>
        {p.hazeStatus && (
          <span role="status" className="text-[11px] text-ink/60">{p.hazeStatus === "rising" ? "채우는 중" : "빠지는 중"}</span>
        )}
      </label>

      <div role="group" aria-label="품질" className="flex items-center gap-1">
        <span className={LABEL}>품질</span>
        {QUALITIES.map((q) => (
          <button key={q.value} type="button" aria-pressed={p.quality === q.value} onClick={() => p.onQuality(q.value)} className={SEGMENT}>
            {qualityLabel(q.value, q.label)}
          </button>
        ))}
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

function MenuItem({ label, disabledReason, onClick }: { label: string; disabledReason?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!!disabledReason} title={disabledReason}
      className="rounded-md px-2 py-1 text-left text-xs font-bold text-point hover:bg-shade disabled:opacity-40">
      {label}
    </button>
  );
}
