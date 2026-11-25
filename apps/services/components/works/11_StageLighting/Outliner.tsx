"use client";

// 요소 목록. 인물 / 소품으로 묶고, 조명기는 걸린 라인마다 폴더로 묶는다(채널 순, 줄마다 디머). 누르면 그 요소를 고른다.
// 조명기를 다른 라인 폴더로 끌어 놓으면 그 라인으로 옮겨 건다.
import { ChevronDown, Folder } from "lucide-react";
import { useState } from "react";
import { FixtureIcon, PersonIcon, PropIcon } from "./icons";
import { type Fixture, type HangId, PROP_SPECS, type Show, hangLabel, hangsOf, resolve, updateFixture, updateLevel } from "./show";
import type { Store } from "./store";
import { useShow } from "./useShow";

type Group = "people" | "props" | "fixtures";
type Props = {
  store: Store;
  selectedId: string | null;
  onPick: (id: string | null) => void;
  onBegin: () => void;
  /** 보여 줄 묶음. 무대 요소 탭은 인물·소품, 조명기 탭은 조명기만. */
  groups: Group[];
  /** 고른 라인(폴더 머리를 누르면 고른다) */
  selectedLine?: HangId | null;
  onPickLine?: (hang: HangId) => void;
};
const DRAG_TYPE = "application/x-stage-fixture";

const ROW = "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-ink hover:bg-white/10 aria-[current=true]:bg-point/20 aria-[current=true]:font-bold";

/** 소품은 이름이 없어 종류별 번호를 붙인다(의자 1, 의자 2…). */
export function propNames(props: Show["props"]): Map<string, string> {
  const n = new Map<string, number>();
  const out = new Map<string, string>();
  for (const p of props) {
    const k = (n.get(p.kind) ?? 0) + 1;
    n.set(p.kind, k);
    out.set(p.id, `${PROP_SPECS[p.kind].label} ${k}`);
  }
  return out;
}

export default function Outliner({ store, selectedId, onPick, onBegin, groups, selectedLine, onPickLine }: Props) {
  const props = useShow(store, (s) => s.props);
  const actors = useShow(store, (s) => s.actors);
  const fixtures = useShow(store, (s) => s.fixtures);
  const levels = useShow(store, (s) => s.live.levels);
  const stage = useShow(store, (s) => s.stage);
  const [closed, setClosed] = useState<Record<Group, boolean>>({ people: false, props: false, fixtures: false });
  const names = propNames(props);
  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const channels = [...fixtures].sort((a, b) => a.channel - b.channel);
  const [closedLines, setClosedLines] = useState<Record<HangId, boolean>>({});
  const [dropOn, setDropOn] = useState<HangId | null>(null);
  const moveTo = (id: string, hang: HangId) => {
    const f = store.get().fixtures.find((x) => x.id === id);
    if (!f || f.hang === hang) return;
    onBegin();
    edit((s) => updateFixture(s, id, { hang }));
  };

  const fixtureRow = (f: Fixture) => {
    const r = resolve(stage, f, levels[f.id]);
    const on = f.id === selectedId;
    return (
      <li key={f.id} className="flex items-center gap-1 pr-1 pl-3">
        {/* 이름 부분만 끌 수 있게 한다(디머 슬라이더를 끌 때 줄이 딸려 가지 않게) */}
        <button type="button" draggable title="다른 라인 폴더로 끌어 놓으면 그 라인으로 옮겨 걸어요"
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_TYPE, f.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          aria-current={on ? "true" : undefined} onClick={() => onPick(f.id)} className={`${ROW} cursor-grab active:cursor-grabbing`}>
          <span
            aria-hidden
            style={{ borderColor: r.color }}
            className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-white/10 text-[10px] font-bold tabular-nums text-ink"
          >
            {f.channel}
          </span>
          <FixtureIcon kind={f.kind} className="size-4 shrink-0" />
          <span className="truncate">{f.name}</span>
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={r.intensity}
          aria-label={`채널 ${f.channel} 디머`}
          onPointerDown={onBegin}
          onKeyDown={onBegin}
          onChange={(e) => edit((s) => updateLevel(s, f.id, { intensity: Number(e.target.value) }))}
          className="w-16 shrink-0 accent-point"
        />
        <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-ink/70">{Math.round(r.intensity * 100)}</span>
      </li>
    );
  };

  const head = (g: Group, title: string, count: number) => (
    <button
      type="button"
      aria-expanded={!closed[g]}
      onClick={() => setClosed((c) => ({ ...c, [g]: !c[g] }))}
      className="flex w-full items-center gap-1 px-2 pt-2 pb-0.5 text-[11px] font-bold text-ink/70"
    >
      <ChevronDown aria-hidden className={`size-3.5 transition-transform ${closed[g] ? "-rotate-90" : ""}`} />
      {title}
      <span className="font-normal text-ink/50">{count}</span>
    </button>
  );

  return (
    <nav aria-label="무대 요소" className="flex flex-col pb-1">
      {groups.includes("people") && head("people", "인물", actors.length)}
      {groups.includes("people") && !closed.people && (
        <ul>
          {actors.map((a) => (
            <li key={a.id}>
              <button type="button" aria-current={a.id === selectedId ? "true" : undefined} onClick={() => onPick(a.id)} className={ROW}>
                <PersonIcon gender={a.gender} className="size-4 shrink-0" />
                <span className="truncate">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {groups.includes("props") && head("props", "소품", props.length)}
      {groups.includes("props") && !closed.props && (
        <ul>
          {props.map((p) => (
            <li key={p.id}>
              <button type="button" aria-current={p.id === selectedId ? "true" : undefined} onClick={() => onPick(p.id)} className={ROW}>
                <PropIcon kind={p.kind} className="size-4 shrink-0" />
                <span className="truncate">{names.get(p.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 조명기 탭은 조명기만 보이므로 '조명기' 머리 없이 라인 폴더를 바로 늘어놓는다 */}
      {groups.includes("fixtures") &&
        hangsOf(stage).map((hang) => {
          const on = channels.filter((f) => f.hang === hang);
          const open = !closedLines[hang];
          const label = hangLabel(stage, hang);
          return (
            <section key={hang} aria-label={label}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropOn !== hang) setDropOn(hang);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOn((d) => (d === hang ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDropOn(null);
                const id = e.dataTransfer.getData(DRAG_TYPE);
                if (id) moveTo(id, hang);
              }}
              className={`rounded-md ${dropOn === hang ? "bg-shade ring-2 ring-point/60 ring-inset" : ""}`}>
              <div className={`flex items-center gap-0.5 px-1 pt-1.5 ${selectedLine === hang ? "rounded-md bg-point/15 text-point" : "text-ink/75"}`}>
                <button type="button" aria-expanded={open} aria-label={`${label} ${open ? "접기" : "펼치기"}`}
                  onClick={() => setClosedLines((c) => ({ ...c, [hang]: open }))}
                  className="rounded p-0.5 hover:bg-white/10">
                  <ChevronDown aria-hidden className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
                </button>
                <button type="button" onClick={() => onPickLine?.(hang)} title="이 라인 고르기"
                  className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-[11px] font-bold hover:bg-white/10">
                  <Folder aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  <span className="font-normal text-ink/50">{on.length}</span>
                </button>
              </div>
              {open && on.length > 0 && <ul aria-label={`${label} 조명기`}>{on.map(fixtureRow)}</ul>}
            </section>
          );
        })}
    </nav>
  );
}
