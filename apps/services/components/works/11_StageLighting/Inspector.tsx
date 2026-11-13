"use client";

// 오른쪽 속성 패널. 선택한 대상만 구독해서, 슬라이더를 움직여도 이 패널만 다시 그린다.
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ColorField, Segmented, Slider, TextField } from "./fields";
import GelPicker from "./GelPicker";
import { TIERS, type Tier } from "./quality";
import {
  BUILDS,
  BUILD_LABELS,
  CUE_PARAMS,
  FIXTURE_KINDS,
  FIXTURE_LABELS,
  type FixtureKind,
  HANGS,
  HANG_LABELS,
  type HangId,
  KNOBS,
  PAR_LAMPS,
  PAR_LAMP_KEYS,
  POSES,
  POSE_LABELS,
  PROP_SPECS,
  type ParLamp,
  STAGE_LABELS,
  STAGE_SHAPES,
  type Show,
  hangRange,
  removeEntity,
  resolve,
  setChannel,
  updateActor,
  updateFixture,
  updateFocus,
  updateLevel,
  updateProp,
  updateStage,
  usesCueColor,
} from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL, PANEL_TITLE, SEGMENT } from "./ui";
import { useShow } from "./useShow";

const DEG = 180 / Math.PI;
const m = (v: number) => `${v.toFixed(1)}m`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${Math.round(v)}°`;
const toDeg = (rad: number) => ((Math.round(rad * DEG) % 360) + 360) % 360;

type Props = {
  store: Store;
  selectedId: string | null;
  tier: Tier;
  solo: boolean;
  onSolo: () => void;
  onBegin: () => void;
  onDeleted: () => void;
};

/** 선택한 조명기를 뺀 나머지가 쓰는 채널. 문자열이라 참조가 안정적이다. */
function channelKey(s: Show, selectedId: string | null): string {
  return s.fixtures.filter((f) => f.id !== selectedId).map((f) => f.channel).join(",");
}

export default function Inspector({ store, selectedId, tier, solo, onSolo, onBegin, onDeleted }: Props) {
  const prop = useShow(store, (s) => s.props.find((p) => p.id === selectedId));
  const actor = useShow(store, (s) => s.actors.find((a) => a.id === selectedId));
  const fixture = useShow(store, (s) => s.fixtures.find((f) => f.id === selectedId));
  const level = useShow(store, (s) => (selectedId ? s.live.levels[selectedId] : undefined));
  const stage = useShow(store, (s) => s.stage);
  const shadowCount = useShow(store, (s) => s.fixtures.filter((f) => f.castShadow).length);
  const takenChannels = useShow(store, (s) => channelKey(s, selectedId));

  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const remove = () => {
    if (!selectedId) return;
    onBegin();
    edit((s) => removeEntity(s, selectedId));
    onDeleted();
  };
  const del = (
    <button type="button" onClick={remove} className={BUTTON}>
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
    const kind = fixture.kind;
    const knobs = KNOBS[kind];
    const cueParams = CUE_PARAMS[kind];
    const cueColor = usesCueColor(kind);
    const cueAim = cueParams.includes("target");
    const res = resolve(stage, fixture, level);
    const [lo, hi] = hangRange(stage, fixture.hang);
    const boom = fixture.hang === "boomL" || fixture.hang === "boomR";
    const limit = TIERS[tier].shadows;
    const shadowLocked = !fixture.castShadow && shadowCount >= limit;
    const dx = res.target.x - res.position.x;
    const dy = res.position.y - res.target.y;
    const dz = res.target.z - res.position.z;
    const pan = Math.round(Math.atan2(dx, -dz) * DEG);
    const tilt = Math.round(Math.atan2(Math.hypot(dx, dz), dy) * DEG);
    const zoomDeg = (k: [string, number, number]) => (v: number) => `${Math.round(k[1] + (k[2] - k[1]) * v)}°`;
    const zoomValue = cueParams.includes("zoom") ? (level?.zoom ?? fixture.focus.zoom) : fixture.focus.zoom;
    return (
      <Panel title={FIXTURE_LABELS[kind]}>
        <p className={PANEL_TITLE}>걸기</p>
        <ChannelField key={`${id}-${fixture.channel}`} channel={fixture.channel} taken={takenChannels} onBegin={onBegin}
          onCommit={(c) => edit((s) => setChannel(s, id, c))} />
        <TextField label="이름" value={fixture.name} maxLength={20} onBegin={onBegin}
          onChange={(name) => edit((s) => updateFixture(s, id, { name }))} />
        <Segmented<FixtureKind> label="종류" value={kind}
          options={FIXTURE_KINDS.map((k) => ({ value: k, label: FIXTURE_LABELS[k] }))}
          onPick={(k) => { onBegin(); edit((s) => updateFixture(s, id, { kind: k })); }} />
        <label className="flex flex-col gap-0.5">
          <span className={LABEL}>걸 위치</span>
          <select value={fixture.hang} onFocus={onBegin}
            onChange={(e) => edit((s) => updateFixture(s, id, { hang: e.target.value as HangId }))}
            className="rounded-md border-2 border-point bg-white px-2 py-1 text-xs text-ink">
            {HANGS.map((h) => <option key={h} value={h}>{HANG_LABELS[h]}</option>)}
          </select>
        </label>
        <Slider label={boom ? "높이" : "좌우"} value={Math.min(hi, Math.max(lo, fixture.along))} min={lo} max={hi} step={0.1}
          format={m} onBegin={onBegin} onChange={(along) => edit((s) => updateFixture(s, id, { along }))} />
        <label className="flex items-center gap-2" title={shadowLocked ? `그림자는 지금 품질에서 최대 ${limit}대예요` : undefined}>
          <input type="checkbox" checked={fixture.castShadow} disabled={shadowLocked} className="accent-point"
            onChange={(e) => { onBegin(); edit((s) => updateFixture(s, id, { castShadow: e.target.checked })); }} />
          <span className={LABEL}>그림자</span>
          {shadowLocked && <span className="text-[11px] text-ink/60">최대 {limit}대</span>}
        </label>

        <hr className="border-point/20" />
        <p className={PANEL_TITLE}>포커스</p>
        {knobs.zoom && !cueParams.includes("zoom") && (
          <Slider label={knobs.zoom[0]} value={fixture.focus.zoom} min={0} max={1} step={0.01} format={zoomDeg(knobs.zoom)}
            onBegin={onBegin} onChange={(zoom) => edit((s) => updateFocus(s, id, { zoom }))} />
        )}
        {knobs.sharp && (
          <Slider label={knobs.sharp[0]} value={fixture.focus.sharpness} min={0} max={1} step={0.01}
            format={(v) => (v >= 0.67 ? "선명" : v <= 0.33 ? "흐림" : "중간")}
            onBegin={onBegin} onChange={(sharpness) => edit((s) => updateFocus(s, id, { sharpness }))} />
        )}
        {kind === "par" && (
          <Segmented<ParLamp> label="램프" value={fixture.focus.lamp}
            options={PAR_LAMP_KEYS.map((k) => ({ value: k, label: `${PAR_LAMPS[k].label} ${PAR_LAMPS[k].angle}°` }))}
            onPick={(lamp) => { onBegin(); edit((s) => updateFocus(s, id, { lamp })); }} />
        )}
        {cueColor ? (
          <p className="text-[11px] text-ink/60">색은 큐마다 바꿔요. 아래 큐 값에서 골라요.</p>
        ) : (
          <GelPicker value={fixture.focus.gel} onBegin={onBegin} onChange={(gel) => edit((s) => updateFocus(s, id, { gel }))} />
        )}
        {cueAim ? (
          <p className="text-[11px] text-ink/60">조준과 아이리스는 큐마다 바꿔요.</p>
        ) : (
          <>
            <p className="text-[11px] text-ink/60">무대 위 노란 고리를 끌어 비출 곳을 정해요.</p>
            <p className="flex gap-3 text-[11px] tabular-nums text-ink/70">
              <span>팬 {pan}°</span>
              <span>틸트 {tilt}°</span>
            </p>
          </>
        )}

        <hr className="border-point/20" />
        <p className={PANEL_TITLE}>큐 값</p>
        <Slider label="디머" value={level?.intensity ?? 0} min={0} max={1} step={0.01} format={pct} onBegin={onBegin}
          onChange={(intensity) => edit((s) => updateLevel(s, id, { intensity }))} />
        {cueParams.includes("zoom") && knobs.zoom && (
          <Slider label={knobs.zoom[0]} value={zoomValue} min={0} max={1} step={0.01} format={zoomDeg(knobs.zoom)}
            onBegin={onBegin} onChange={(zoom) => edit((s) => updateLevel(s, id, { zoom }))} />
        )}
        {cueAim && <p className="text-[11px] text-ink/60">고리를 끌어 대상을 따라가요.</p>}
        {cueColor && (
          <ColorField label="색" value={res.color} onBegin={onBegin}
            onChange={(color) => edit((s) => updateLevel(s, id, { color }))} />
        )}

        <div className="flex gap-2">
          <button type="button" aria-pressed={solo} onClick={onSolo} className={SEGMENT}
            title="이 조명기만 100%로 켜고 나머지는 잠시 꺼요. 저장된 값은 바뀌지 않아요.">
            솔로
          </button>
          {del}
        </div>
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
      <p className="text-[11px] text-ink/60">무대 위 인물·소품·조명기를 누르면 여기서 고칠 수 있어요. 객석은 객석 탭에서 고쳐요.</p>
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

/** 채널 번호 입력. Enter나 칸을 떠날 때 저장하고, 이미 쓰는 번호면 저장하지 않고 입력칸에 알려 준다. */
function ChannelField({
  channel,
  taken,
  onBegin,
  onCommit,
}: {
  channel: number;
  taken: string;
  onBegin: () => void;
  onCommit: (c: number) => void;
}) {
  const [draft, setDraft] = useState(String(channel));
  const n = Number(draft);
  const valid = Number.isInteger(n) && n >= 1 && n <= 99;
  const dup = valid && taken.split(",").includes(String(n));
  const error = draft === "" ? null : !valid ? "1부터 99까지 쓸 수 있어요" : dup ? `채널 ${n}번은 이미 써요` : null;
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor="fixture-channel" className={LABEL}>채널</label>
      <input
        id="fixture-channel"
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={draft}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "fixture-channel-error" : undefined}
        onFocus={onBegin}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        // 입력하는 동안에는 저장하지 않는다(저장하면 입력칸이 다시 그려져 포커스를 잃는다). 칸을 떠날 때 한 번 저장한다.
        onBlur={() => {
          if (error === null && draft !== "" && n !== channel) onCommit(n);
          else setDraft(String(channel));
        }}
        className="w-20 rounded-md border-2 border-point px-2 py-1 text-xs text-ink tabular-nums aria-invalid:border-red-600"
      />
      {error && <span id="fixture-channel-error" role="alert" className="text-[11px] font-bold text-red-600">{error}</span>}
    </div>
  );
}
