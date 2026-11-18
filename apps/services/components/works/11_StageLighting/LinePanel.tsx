"use client";

// 조명기 탭에서 조명기를 고르지 않았을 때 보이는 라인 패널.
// 라인마다 앞뒤·높이(붐은 무대에서 떨어진 거리)를 바꾸고, 걸린 조명기를 펼치거나 한 번에 겨눈다.
import { useEffect, useRef } from "react";
import { NumberField, Section } from "./fields";
import {
  HANGS,
  HANG_LABELS,
  type HangId,
  LINE_DY,
  LINE_DZ,
  type Show,
  addPresetRig,
  aimFixtures,
  resetLine,
  setLineOffset,
  spreadLine,
} from "./show";
import type { Store } from "./store";
import { BUTTON, SEGMENT } from "./ui";
import { useShow } from "./useShow";

const isBoom = (h: HangId) => h === "boomL" || h === "boomR";

export default function LinePanel({ store, onBegin, selected }: { store: Store; onBegin: () => void; selected: HangId | null }) {
  // 3D에서 라인을 고르면 그 칸을 펼치고 보이게 굴린다
  const selRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) selRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  const rig = useShow(store, (s) => s.stage.rig);
  const counts = useShow(store, (s) => HANGS.map((h) => s.fixtures.filter((f) => f.hang === h).length).join(","));
  const full = useShow(store, (s) => s.fixtures.length);
  const count = counts.split(",").map(Number);
  const edit = (fn: (s: Show) => Show) => {
    onBegin();
    store.set(fn(store.get()));
  };
  const idsOn = (h: HangId) => store.get().fixtures.filter((f) => f.hang === h).map((f) => f.id);

  return (
    <div>
      <div className="flex flex-col gap-1.5 p-3">
        <button type="button" className={BUTTON} disabled={full >= 24} onClick={() => edit(addPresetRig)}
          title="앞조명 2, 윗조명 3, 역광 2, 호리존트 1을 지금 조명기에 더해 걸어요">
          기본 조명 배치 걸기
        </button>
        <p className="text-[11px] text-ink/60">
          3D 화면에서 라인(파이프)을 끌면 앞뒤로, Shift를 누른 채 끌면 높이(붐은 무대와의 거리)가 바뀌어요. 걸린 조명기는 함께 따라가요. 조명기를 고르면 그 속성이 나와요.
        </p>
      </div>
      {HANGS.map((h, i) => (
        <div key={`${h}-${selected === h}`} ref={selected === h ? selRef : undefined}
          className={selected === h ? "bg-[#ffb000]/15 shadow-[inset_3px_0_0_#ffb000]" : undefined}>
        <Section title={`${HANG_LABELS[h]} · ${count[i]}대${selected === h ? " · 고름" : ""}`} defaultOpen={selected === h}>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="앞뒤" title="기본 위치에서 앞뒤로 옮긴 거리(m, +가 객석 쪽)" value={rig[h].dz}
              min={LINE_DZ.min} max={LINE_DZ.max} step={0.25} digits={2} unit="m" onBegin={onBegin}
              onChange={(dz) => store.set(setLineOffset(store.get(), h, { ...store.get().stage.rig[h], dz }))} />
            <NumberField label={isBoom(h) ? "거리" : "높이"} title={isBoom(h) ? "무대에서 더 떨어진 거리(m)" : "기본 높이에서 올린 거리(m)"}
              value={rig[h].dy} min={LINE_DY.min} max={LINE_DY.max} step={0.25} digits={2} unit="m" onBegin={onBegin}
              onChange={(dy) => store.set(setLineOffset(store.get(), h, { ...store.get().stage.rig[h], dy }))} />
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={SEGMENT} disabled={count[i] < 2} onClick={() => edit((s) => spreadLine(s, h))}
              title="걸린 조명기를 라인 전체에 같은 간격으로 펼쳐요">
              고르게 펼치기
            </button>
            <button type="button" className={SEGMENT} disabled={count[i] === 0} onClick={() => edit((s) => aimFixtures(s, idsOn(h), "center"))}
              title="이 라인의 조명기를 모두 무대 가운데로 겨눠요">
              가운데 비추기
            </button>
            <button type="button" className={SEGMENT} disabled={rig[h].dz === 0 && rig[h].dy === 0} onClick={() => edit((s) => resetLine(s, h))}>
              기본 위치로
            </button>
          </div>
        </Section>
        </div>
      ))}
    </div>
  );
}
