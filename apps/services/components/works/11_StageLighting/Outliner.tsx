"use client";

// 요소 목록. 무대·객석 / 인물 / 소품 / 조명기(채널 순, 줄마다 디머)로 묶고, 누르면 그 요소를 고른다.
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FixtureIcon, PersonIcon, PropIcon, StageIcon } from "./icons";
import { PROP_SPECS, type Show, resolve, updateLevel } from "./show";
import type { Store } from "./store";
import { useShow } from "./useShow";

type Props = { store: Store; selectedId: string | null; onPick: (id: string | null) => void; onBegin: () => void };
type Group = "people" | "props" | "fixtures";

const ROW = "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-ink hover:bg-point/10 aria-[current=true]:bg-point aria-[current=true]:text-white";

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

export default function Outliner({ store, selectedId, onPick, onBegin }: Props) {
  const props = useShow(store, (s) => s.props);
  const actors = useShow(store, (s) => s.actors);
  const fixtures = useShow(store, (s) => s.fixtures);
  const levels = useShow(store, (s) => s.live.levels);
  const stage = useShow(store, (s) => s.stage);
  const [closed, setClosed] = useState<Record<Group, boolean>>({ people: false, props: false, fixtures: false });
  const names = propNames(props);
  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const channels = [...fixtures].sort((a, b) => a.channel - b.channel);

  const head = (g: Group, title: string, count: number) => (
    <button
      type="button"
      aria-expanded={!closed[g]}
      onClick={() => setClosed((c) => ({ ...c, [g]: !c[g] }))}
      className="flex w-full items-center gap-1 px-2 pt-2 pb-0.5 text-[11px] font-bold text-point/80"
    >
      <ChevronDown aria-hidden className={`size-3.5 transition-transform ${closed[g] ? "-rotate-90" : ""}`} />
      {title}
      <span className="font-normal text-ink/50">{count}</span>
    </button>
  );

  return (
    <nav aria-label="무대 요소" className="flex flex-col pb-1">
      <button type="button" aria-current={selectedId === null ? "true" : undefined} onClick={() => onPick(null)} className={ROW}>
        <StageIcon className="size-4 shrink-0" />
        <span className="truncate font-bold">무대·객석</span>
      </button>

      {head("people", "인물", actors.length)}
      {!closed.people && (
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

      {head("props", "소품", props.length)}
      {!closed.props && (
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

      {head("fixtures", "조명기", fixtures.length)}
      {!closed.fixtures && (
        <ul aria-label="채널">
          {channels.map((f) => {
            const r = resolve(stage, f, levels[f.id]);
            const on = f.id === selectedId;
            return (
              <li key={f.id} className="flex items-center gap-1 pr-1">
                <button type="button" aria-current={on ? "true" : undefined} onClick={() => onPick(f.id)} className={ROW}>
                  <span
                    aria-hidden
                    style={{ borderColor: r.color }}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-point text-[10px] font-bold tabular-nums text-white"
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
          })}
        </ul>
      )}
    </nav>
  );
}
