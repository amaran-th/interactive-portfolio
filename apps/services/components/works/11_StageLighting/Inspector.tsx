"use client";

// 오른쪽 속성 패널. 선택한 대상만 구독해서, 슬라이더를 움직여도 이 패널만 다시 그린다.
import { Trash2 } from "lucide-react";
import { ColorField, Segmented, Slider, TextField } from "./fields";
import { TIERS, type Tier } from "./quality";
import {
  BUILDS,
  BUILD_LABELS,
  FIXTURE_KINDS,
  FIXTURE_SPECS,
  type FixtureKind,
  POSES,
  POSE_LABELS,
  PROP_SPECS,
  STAGE_LABELS,
  STAGE_SHAPES,
  type Show,
  levelOf,
  removeEntity,
  updateActor,
  updateFixture,
  updateLevel,
  updateProp,
  updateStage,
} from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL, PANEL_TITLE } from "./ui";
import { useShow } from "./useShow";

const DEG = 180 / Math.PI;
const m = (v: number) => `${v.toFixed(1)}m`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${Math.round(v)}°`;
const toDeg = (rad: number) => ((Math.round(rad * DEG) % 360) + 360) % 360;

type Props = { store: Store; selectedId: string | null; tier: Tier; onBegin: () => void; onDeleted: () => void };

export default function Inspector({ store, selectedId, tier, onBegin, onDeleted }: Props) {
  const prop = useShow(store, (s) => s.props.find((p) => p.id === selectedId));
  const actor = useShow(store, (s) => s.actors.find((a) => a.id === selectedId));
  const fixture = useShow(store, (s) => s.fixtures.find((f) => f.id === selectedId));
  const level = useShow(store, (s) => (selectedId ? s.live.levels[selectedId] : undefined));
  const stage = useShow(store, (s) => s.stage);
  const shadowCount = useShow(store, (s) => s.fixtures.filter((f) => f.castShadow).length);

  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const remove = () => {
    if (!selectedId) return;
    onBegin();
    edit((s) => removeEntity(s, selectedId));
    onDeleted();
  };
  const del = (
    <button type="button" onClick={remove} className={`${BUTTON} self-start`}>
      <Trash2 aria-hidden className="size-4" /> 삭제
    </button>
  );

  if (prop) {
    const id = prop.id;
    return (
      <Panel title={PROP_SPECS[prop.kind].label}>
        <Slider label="좌우" value={prop.position.x} min={-15} max={15} step={0.1} format={m} onBegin={onBegin}
          onChange={(x) => edit((s) => updateProp(s, id, { position: { ...prop.position, x } }))} />
        <Slider label="앞뒤" value={prop.position.z} min={-20} max={10} step={0.1} format={m} onBegin={onBegin}
          onChange={(z) => edit((s) => updateProp(s, id, { position: { ...prop.position, z } }))} />
        <Slider label="회전" value={toDeg(prop.rotationY)} min={0} max={359} step={1} format={deg} onBegin={onBegin}
          onChange={(v) => edit((s) => updateProp(s, id, { rotationY: v / DEG }))} />
        <Slider label="폭" value={prop.scale.x} min={0.1} max={6} step={0.1} format={m} onBegin={onBegin}
          onChange={(x) => edit((s) => updateProp(s, id, { scale: { ...prop.scale, x } }))} />
        <Slider label="높이" value={prop.scale.y} min={0.1} max={6} step={0.1} format={m} onBegin={onBegin}
          onChange={(y) => edit((s) => updateProp(s, id, { scale: { ...prop.scale, y } }))} />
        <Slider label="깊이" value={prop.scale.z} min={0.1} max={6} step={0.1} format={m} onBegin={onBegin}
          onChange={(z) => edit((s) => updateProp(s, id, { scale: { ...prop.scale, z } }))} />
        <ColorField label="색" value={prop.color} onBegin={onBegin}
          onChange={(color) => edit((s) => updateProp(s, id, { color }))} />
        {del}
      </Panel>
    );
  }

  if (actor) {
    const id = actor.id;
    return (
      <Panel title="인물">
        <TextField label="이름" value={actor.name} maxLength={20} onBegin={onBegin}
          onChange={(name) => edit((s) => updateActor(s, id, { name }))} />
        <Slider label="키" value={actor.height} min={1} max={2.1} step={0.01} format={(v) => `${Math.round(v * 100)}cm`}
          onBegin={onBegin} onChange={(height) => edit((s) => updateActor(s, id, { height }))} />
        <Segmented label="체형" value={actor.build} options={BUILDS.map((b) => ({ value: b, label: BUILD_LABELS[b] }))}
          onPick={(build) => { onBegin(); edit((s) => updateActor(s, id, { build })); }} />
        <Segmented label="자세" value={actor.pose} options={POSES.map((p) => ({ value: p, label: POSE_LABELS[p] }))}
          onPick={(pose) => { onBegin(); edit((s) => updateActor(s, id, { pose })); }} />
        <ColorField label="옷" value={actor.clothColor} onBegin={onBegin}
          onChange={(clothColor) => edit((s) => updateActor(s, id, { clothColor }))} />
        <ColorField label="피부" value={actor.skinColor} onBegin={onBegin}
          onChange={(skinColor) => edit((s) => updateActor(s, id, { skinColor }))} />
        <Slider label="좌우" value={actor.position.x} min={-15} max={15} step={0.1} format={m} onBegin={onBegin}
          onChange={(x) => edit((s) => updateActor(s, id, { position: { ...actor.position, x } }))} />
        <Slider label="앞뒤" value={actor.position.z} min={-20} max={10} step={0.1} format={m} onBegin={onBegin}
          onChange={(z) => edit((s) => updateActor(s, id, { position: { ...actor.position, z } }))} />
        <Slider label="바라보는 방향" value={toDeg(actor.rotationY)} min={0} max={359} step={1} format={deg}
          onBegin={onBegin} onChange={(v) => edit((s) => updateActor(s, id, { rotationY: v / DEG }))} />
        {del}
      </Panel>
    );
  }

  if (fixture) {
    const id = fixture.id;
    const l = level ?? levelOf({ levels: {}, haze: 0 }, fixture);
    const [lo, hi] = FIXTURE_SPECS[fixture.kind].beam;
    const limit = TIERS[tier].shadows;
    const shadowLocked = !fixture.castShadow && shadowCount >= limit;
    return (
      <Panel title={FIXTURE_SPECS[fixture.kind].label}>
        <p className={PANEL_TITLE}>설정</p>
        <TextField label="이름" value={fixture.name} maxLength={20} onBegin={onBegin}
          onChange={(name) => edit((s) => updateFixture(s, id, { name }))} />
        <Segmented<FixtureKind> label="종류" value={fixture.kind}
          options={FIXTURE_KINDS.map((k) => ({ value: k, label: FIXTURE_SPECS[k].label }))}
          onPick={(kind) => { onBegin(); edit((s) => updateFixture(s, id, { kind })); }} />
        <Slider label="좌우" value={fixture.position.x} min={-15} max={15} step={0.1} format={m} onBegin={onBegin}
          onChange={(x) => edit((s) => updateFixture(s, id, { position: { ...fixture.position, x } }))} />
        <Slider label="높이" value={fixture.position.y} min={0} max={15} step={0.1} format={m} onBegin={onBegin}
          onChange={(y) => edit((s) => updateFixture(s, id, { position: { ...fixture.position, y } }))} />
        <Slider label="앞뒤" value={fixture.position.z} min={-20} max={10} step={0.1} format={m} onBegin={onBegin}
          onChange={(z) => edit((s) => updateFixture(s, id, { position: { ...fixture.position, z } }))} />
        <label className="flex items-center gap-2" title={shadowLocked ? `그림자는 지금 품질에서 최대 ${limit}대예요` : undefined}>
          <input type="checkbox" checked={fixture.castShadow} disabled={shadowLocked} className="accent-point"
            onChange={(e) => { onBegin(); edit((s) => updateFixture(s, id, { castShadow: e.target.checked })); }} />
          <span className={LABEL}>그림자</span>
          {shadowLocked && <span className="text-[11px] text-ink/60">최대 {limit}대</span>}
        </label>
        <hr className="border-point/20" />
        <p className={PANEL_TITLE}>현재 레벨</p>
        <Slider label="밝기" value={l.intensity} min={0} max={1} step={0.01} format={pct} onBegin={onBegin}
          onChange={(intensity) => edit((s) => updateLevel(s, id, { intensity }))} />
        <ColorField label="색" value={l.color} onBegin={onBegin}
          onChange={(color) => edit((s) => updateLevel(s, id, { color }))} />
        <Slider label="빔 각도" value={l.beamAngle} min={lo} max={hi} step={1} format={deg} onBegin={onBegin}
          onChange={(beamAngle) => edit((s) => updateLevel(s, id, { beamAngle }))} />
        <Slider label="가장자리 부드러움" value={l.softness} min={0} max={1} step={0.01} format={pct} onBegin={onBegin}
          onChange={(softness) => edit((s) => updateLevel(s, id, { softness }))} />
        <p className="text-[11px] text-ink/60">무대 위 노란 고리를 끌어 비출 곳을 정해요.</p>
        {del}
      </Panel>
    );
  }

  return (
    <Panel title="무대">
      <Segmented label="형태" value={stage.shape}
        options={STAGE_SHAPES.map((v) => ({ value: v, label: STAGE_LABELS[v] }))}
        onPick={(shape) => { onBegin(); edit((s) => updateStage(s, { shape })); }} />
      <Slider label="폭" value={stage.width} min={4} max={20} step={0.5} format={m} onBegin={onBegin}
        onChange={(width) => edit((s) => updateStage(s, { width }))} />
      <Slider label="깊이" value={stage.depth} min={3} max={15} step={0.5} format={m} onBegin={onBegin}
        onChange={(depth) => edit((s) => updateStage(s, { depth }))} />
      <Slider label="높이" value={stage.height} min={3} max={12} step={0.5} format={m} onBegin={onBegin}
        onChange={(height) => edit((s) => updateStage(s, { height }))} />
      <ColorField label="바닥" value={stage.floorColor} onBegin={onBegin}
        onChange={(floorColor) => edit((s) => updateStage(s, { floorColor }))} />
      {stage.shape !== "round" && (
        <ColorField label="배경막" value={stage.backdropColor} onBegin={onBegin}
          onChange={(backdropColor) => edit((s) => updateStage(s, { backdropColor }))} />
      )}
      <p className="text-[11px] text-ink/60">무대 위 인물·소품·조명기를 누르면 여기서 고칠 수 있어요.</p>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <h2 className="text-sm font-bold text-point">{title}</h2>
      {children}
    </div>
  );
}
