"use client";

// 조명기 탭에서 조명기를 고르지 않았을 때 보이는 패널. 라인을 골랐을 때만 그 라인 하나의
// 앞뒤·높이(붐은 무대에서 떨어진 거리)를 바꾸고, 걸린 조명기를 펼치거나 한 번에 겨눈다.
import { Folder } from "lucide-react";
import { NumberField } from "./fields";
import { Header } from "./Inspector";
import {
  type HangId,
  LINE_DY,
  LINE_DZ,
  type Show,
  addPresetRig,
  LINE_TYPE_LABELS,
  aimFixtures,
  boomSide,
  hangLabel,
  hangsOf,
  isBoomHang,
  isCustomLine,
  removeLine,
  renameLine,
  resetLine,
  setLineOffset,
  spreadLine,
} from "./show";
import type { Store } from "./store";
import { BUTTON, SEGMENT } from "./ui";
import { useShow } from "./useShow";

export default function LinePanel({ store, onBegin, selected }: { store: Store; onBegin: () => void; selected: HangId | null }) {
  const stage = useShow(store, (s) => s.stage);
  const full = useShow(store, (s) => s.fixtures.length);
  // 고른 라인(지워졌으면 고르지 않은 것으로 본다)
  const h = selected && hangsOf(stage).includes(selected) ? selected : null;
  const count = useShow(store, (s) => (h ? s.fixtures.filter((f) => f.hang === h).length : 0));
  const edit = (fn: (s: Show) => Show) => {
    onBegin();
    store.set(fn(store.get()));
  };

  // 라인을 고르지 않았으면 라인 정보 없이 기본 배치 단추와 안내만 둔다
  if (!h)
    return (
      <div className="flex flex-col gap-1.5 p-3">
        <button type="button" className={BUTTON} disabled={full >= 24} onClick={() => edit(addPresetRig)}
          title="앞조명 2, 윗조명 3, 역광 2, 호리존트 1을 지금 조명기에 더해 걸어요">
          기본 조명 배치 걸기
        </button>
        <p className="text-[11px] text-ink/60">
          목록의 라인 폴더 이름이나 3D 화면의 라인(파이프)을 누르면 그 라인의 위치와 도구가 여기에 나와요. 조명기를 고르면 그 속성이 나와요. 라인은 ‘추가’ 메뉴에서 더해요.
        </p>
      </div>
    );

  const boom = isBoomHang(stage, h);
  const custom = isCustomLine(stage, h);
  const off = stage.rig[h];
  const type = boom ? (boomSide(stage, h) < 0 ? "boomL" : "boomR") : "pipe";
  const idsOn = () => store.get().fixtures.filter((f) => f.hang === h).map((f) => f.id);

  return (
    <div>
      <Header icon={<Folder aria-hidden className="size-5" />} kind={`라인 · ${h === "floor" ? "바닥" : LINE_TYPE_LABELS[type]} · 조명기 ${count}대`}
        name={custom ? (stage.lines.find((l) => l.id === h)?.name ?? "") : hangLabel(stage, h)}
        onName={custom ? (v) => store.set(renameLine(store.get(), h, v)) : undefined}
        onBegin={onBegin}
        onDelete={custom ? () => edit((s) => removeLine(s, h)) : undefined} />
      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="앞뒤" title="기본 위치에서 앞뒤로 옮긴 거리(m, +가 객석 쪽)" value={off.dz}
            min={LINE_DZ.min} max={LINE_DZ.max} step={0.25} digits={2} unit="m" onBegin={onBegin}
            onChange={(dz) => store.set(setLineOffset(store.get(), h, { ...store.get().stage.rig[h], dz }))} />
          <NumberField label={boom ? "거리" : "높이"} title={boom ? "무대에서 더 떨어진 거리(m)" : "기본 높이에서 올린 거리(m)"}
            value={off.dy} min={LINE_DY.min} max={LINE_DY.max} step={0.25} digits={2} unit="m" onBegin={onBegin}
            onChange={(dy) => store.set(setLineOffset(store.get(), h, { ...store.get().stage.rig[h], dy }))} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={SEGMENT} disabled={count < 2} onClick={() => edit((s) => spreadLine(s, h))}
            title="걸린 조명기를 라인 전체에 같은 간격으로 펼쳐요">
            고르게 펼치기
          </button>
          <button type="button" className={SEGMENT} disabled={count === 0} onClick={() => edit((s) => aimFixtures(s, idsOn(), "center"))}
            title="이 라인의 조명기를 모두 무대 가운데로 겨눠요">
            가운데 비추기
          </button>
          <button type="button" className={SEGMENT} disabled={off.dz === 0 && off.dy === 0} onClick={() => edit((s) => resetLine(s, h))}>
            기본 위치로
          </button>
        </div>
        <p className="text-[11px] text-ink/60">
          3D 화면에서 이 라인을 끌면 앞뒤로, Shift를 누른 채 끌면 {boom ? "무대와의 거리" : "높이"}가 바뀌어요. 걸린 조명기는 함께 따라가요.
          {custom ? " 지우면 걸린 조명기는 가장 가까운 라인으로 옮겨 걸어요." : ""}
        </p>
      </div>
    </div>
  );
}
