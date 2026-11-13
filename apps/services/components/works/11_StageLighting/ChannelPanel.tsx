"use client";

// 채널 패널. 조명 콘솔처럼 채널 번호 순으로 늘어놓고 디머를 바로 올리고 내린다.
import { FIXTURE_LABELS, HANG_LABELS, type Show, resolve, updateLevel } from "./show";
import type { Store } from "./store";
import { useShow } from "./useShow";

type Props = { store: Store; selectedId: string | null; onPick: (id: string) => void; onBegin: () => void };

export default function ChannelPanel({ store, selectedId, onPick, onBegin }: Props) {
  const fixtures = useShow(store, (s) => s.fixtures);
  const levels = useShow(store, (s) => s.live.levels);
  const stage = useShow(store, (s) => s.stage);
  const rows = [...fixtures].sort((a, b) => a.channel - b.channel);
  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));

  if (rows.length === 0) return <p className="p-3 text-[11px] text-ink/60">조명기가 없어요. 위 추가 메뉴에서 걸어 보세요.</p>;

  return (
    <ul aria-label="채널" className="flex flex-col">
      {rows.map((f) => {
        const r = resolve(stage, f, levels[f.id]);
        const selected = f.id === selectedId;
        return (
          <li key={f.id} className={`border-b border-point/15 ${selected ? "bg-shade" : ""}`}>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <button
                type="button"
                onClick={() => onPick(f.id)}
                aria-current={selected ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  aria-hidden
                  style={{ borderColor: r.color }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] bg-point text-[11px] font-bold tabular-nums text-white"
                >
                  {f.channel}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-point">{f.name}</span>
                  <span className="truncate text-[10px] text-ink/60">
                    {FIXTURE_LABELS[f.kind]} · {HANG_LABELS[f.hang]}
                  </span>
                </span>
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
                className="w-20 accent-point"
              />
              <span className="w-8 text-right text-[11px] tabular-nums text-ink/70">{Math.round(r.intensity * 100)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
