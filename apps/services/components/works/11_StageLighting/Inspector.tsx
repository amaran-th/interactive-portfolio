"use client";

// 속성 패널(사이드바 아래쪽). 머리줄(아이콘·이름·복제·삭제) 아래에 접히는 구역을 둔다.
// 선택한 대상만 구독해서, 값을 바꿔도 이 패널만 다시 그린다.
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { ColorField, NumberField, Section, Segmented, Slider, Vec3Field } from "./fields";
import GelPicker from "./GelPicker";
import { FixtureIcon, PersonIcon, PropIcon, StageIcon } from "./icons";
import { propNames } from "./Outliner";
import { TIERS, type Tier } from "./quality";
import { SeatPicker, VenueFields } from "./SeatMap";
import {
  BUILDS,
  BUILD_LABELS,
  CUE_PARAMS,
  FIXTURE_KINDS,
  FIXTURE_LABELS,
  type FixtureKind,
  GENDERS,
  GENDER_LABELS,
  HAIRS,
  HAIR_LABELS,
  HANGS,
  HANG_LABELS,
  HEIGHT_RANGE,
  type HangId,
  KNOBS,
  PAR_LAMPS,
  PAR_LAMP_KEYS,
  POSES,
  POSE_LABELS,
  PROP_SPECS,
  type ParLamp,
  type Pose,
  STAGE_LABELS,
  STAGE_SHAPES,
  type Show,
  hangRange,
  resolve,
  setActorGender,
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
import { LABEL, SEGMENT } from "./ui";
import { useShow } from "./useShow";
import type { SeatRef } from "./venue";

const DEG = 180 / Math.PI;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const toDeg = (rad: number) => ((Math.round(rad * DEG) % 360) + 360) % 360;
const POS_AXES = {
  x: { min: -15, max: 15, title: "좌우(m)" },
  y: { min: 0, max: 6, title: "높이(m)" },
  z: { min: -20, max: 10, title: "앞뒤(m)" },
};
const SIZE_AXES = {
  x: { min: 0.1, max: 10, title: "폭(m)" },
  y: { min: 0.1, max: 10, title: "높이(m)" },
  z: { min: 0.1, max: 10, title: "깊이(m)" },
};
const SKIN_TONES = ["#f1c9a5", "#d9a88a", "#b5835f", "#7d5236"];
const HAIR_TONES = ["#1a1512", "#4a3424", "#9a6b3f", "#c9c4bc"];

type Props = {
  store: Store;
  selectedId: string | null;
  tier: Tier;
  solo: boolean;
  seat: SeatRef | null;
  onSeat: (ref: SeatRef) => void;
  onSolo: () => void;
  onBegin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

/** 선택한 조명기를 뺀 나머지가 쓰는 채널. 문자열이라 참조가 안정적이다. */
function channelKey(s: Show, selectedId: string | null): string {
  return s.fixtures.filter((f) => f.id !== selectedId).map((f) => f.channel).join(",");
}

const ICON_BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded-md text-point hover:bg-point/10 disabled:opacity-40";

function Header({
  icon,
  kind,
  name,
  onName,
  onBegin,
  onDuplicate,
  onDelete,
}: {
  icon: React.ReactNode;
  kind: string;
  name?: string;
  onName?: (v: string) => void;
  onBegin: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-point text-white">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-bold text-point/70">{kind}</span>
        {onName ? (
          <input
            type="text"
            aria-label="이름"
            value={name}
            maxLength={20}
            onFocus={onBegin}
            onChange={(e) => onName(e.target.value)}
            className="min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-ink hover:border-point/30 focus:border-point focus:bg-white/80 focus:outline-none"
          />
        ) : (
          <span className="truncate px-1 text-sm font-bold text-ink">{name}</span>
        )}
      </div>
      {onDuplicate && (
        <button type="button" onClick={onDuplicate} aria-label="복제" title="복제 (⌘/Ctrl+D)" className={ICON_BUTTON}>
          <Copy aria-hidden className="size-4" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label="삭제" title="삭제 (Delete)" className={ICON_BUTTON}>
          <Trash2 aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

export default function Inspector({ store, selectedId, tier, solo, seat, onSeat, onSolo, onBegin, onDuplicate, onDelete }: Props) {
  const prop = useShow(store, (s) => s.props.find((p) => p.id === selectedId));
  const propName = useShow(store, (s) => (prop ? propNames(s.props).get(prop.id) : undefined));
  const actor = useShow(store, (s) => s.actors.find((a) => a.id === selectedId));
  const fixture = useShow(store, (s) => s.fixtures.find((f) => f.id === selectedId));
  const level = useShow(store, (s) => (selectedId ? s.live.levels[selectedId] : undefined));
  const stage = useShow(store, (s) => s.stage);
  const shadowCount = useShow(store, (s) => s.fixtures.filter((f) => f.castShadow).length);
  const takenChannels = useShow(store, (s) => channelKey(s, selectedId));

  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const rot = (rad: number, apply: (r: number) => void) => (
    <NumberField label="방향" title="바라보는 방향(°)" value={toDeg(rad)} min={0} max={359} step={1} digits={0} unit="°"
      onBegin={onBegin} onChange={(v) => apply(v / DEG)} />
  );

  if (prop) {
    const id = prop.id;
    return (
      <div>
        <Header icon={<PropIcon kind={prop.kind} className="size-5" />} kind={`소품 · ${PROP_SPECS[prop.kind].label}`} name={propName}
          onBegin={onBegin} onDuplicate={onDuplicate} onDelete={onDelete} />
        <Section title="위치">
          <Vec3Field label="X 좌우 · Y 높이 · Z 앞뒤" value={prop.position} axes={POS_AXES} onBegin={onBegin}
            onChange={(position) => edit((s) => updateProp(s, id, { position }))} />
          {rot(prop.rotationY, (rotationY) => edit((s) => updateProp(s, id, { rotationY })))}
        </Section>
        <Section title="크기">
          <Vec3Field label="X 폭 · Y 높이 · Z 깊이" value={prop.scale} axes={SIZE_AXES} onBegin={onBegin}
            onChange={(scale) => edit((s) => updateProp(s, id, { scale }))} />
        </Section>
        <Section title="색">
          <ColorField label="색" value={prop.color} onBegin={onBegin} onChange={(color) => edit((s) => updateProp(s, id, { color }))} />
        </Section>
      </div>
    );
  }

  if (actor) {
    const id = actor.id;
    const range = HEIGHT_RANGE[actor.gender];
    const set = (patch: Parameters<typeof updateActor>[2]) => edit((s) => updateActor(s, id, patch));
    return (
      <div>
        <Header icon={<PersonIcon gender={actor.gender} className="size-5" />} kind={`인물 · ${GENDER_LABELS[actor.gender]}`}
          name={actor.name} onName={(name) => set({ name })} onBegin={onBegin} onDuplicate={onDuplicate} onDelete={onDelete} />
        <Section title="위치">
          <Vec3Field label="X 좌우 · Y 높이 · Z 앞뒤" value={actor.position} axes={POS_AXES} onBegin={onBegin}
            onChange={(position) => set({ position })} />
          <p className="text-[11px] text-ink/60">단·계단·탁자·상자 위로 끌면 그 위에 올라서요.</p>
          {rot(actor.rotationY, (rotationY) => set({ rotationY }))}
        </Section>
        <Section title="사람">
          <Segmented label="성별" value={actor.gender} options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
            onPick={(g) => { onBegin(); edit((s) => setActorGender(s, id, g)); }} />
          <NumberField label="키" title={`키(cm, ${Math.round(range.min * 100)}–${Math.round(range.max * 100)})`}
            value={Math.round(actor.height * 100)} min={range.min * 100} max={range.max * 100} step={1} digits={0} unit="cm"
            onBegin={onBegin} onChange={(cm) => set({ height: cm / 100 })} />
          <Segmented label="체형" value={actor.build} options={BUILDS.map((b) => ({ value: b, label: BUILD_LABELS[b] }))}
            onPick={(build) => { onBegin(); set({ build }); }} />
          <label className="flex flex-col gap-0.5">
            <span className={LABEL}>자세</span>
            <select value={actor.pose} onFocus={onBegin} onChange={(e) => set({ pose: e.target.value as Pose })}
              className="rounded-md border border-point/40 bg-white/80 px-2 py-1 text-xs text-ink">
              {POSES.map((p) => <option key={p} value={p}>{POSE_LABELS[p]}</option>)}
            </select>
          </label>
          <Segmented label="머리" value={actor.hair} options={HAIRS.map((h) => ({ value: h, label: HAIR_LABELS[h] }))}
            onPick={(hair) => { onBegin(); set({ hair }); }} />
        </Section>
        <Section title="색">
          <ColorField label="피부" value={actor.skinColor} presets={SKIN_TONES} onBegin={onBegin} onChange={(skinColor) => set({ skinColor })} />
          {actor.hair !== "none" && (
            <ColorField label="머리" value={actor.hairColor} presets={HAIR_TONES} onBegin={onBegin} onChange={(hairColor) => set({ hairColor })} />
          )}
          <ColorField label="상의" value={actor.topColor} onBegin={onBegin} onChange={(topColor) => set({ topColor })} />
          <ColorField label="하의" value={actor.bottomColor} onBegin={onBegin} onChange={(bottomColor) => set({ bottomColor })} />
          <ColorField label="신발" value={actor.shoeColor} onBegin={onBegin} onChange={(shoeColor) => set({ shoeColor })} />
        </Section>
      </div>
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
      <div>
        <Header icon={<FixtureIcon kind={kind} className="size-5" />} kind={`조명기 · ${FIXTURE_LABELS[kind]}`} name={fixture.name}
          onName={(name) => edit((s) => updateFixture(s, id, { name }))} onBegin={onBegin} onDuplicate={onDuplicate} onDelete={onDelete} />
        <Section title="큐 값">
          <Slider label="디머" value={level?.intensity ?? 0} min={0} max={1} step={0.01} format={pct} onBegin={onBegin}
            onChange={(intensity) => edit((s) => updateLevel(s, id, { intensity }))} />
          {cueParams.includes("zoom") && knobs.zoom && (
            <Slider label={knobs.zoom[0]} value={zoomValue} min={0} max={1} step={0.01} format={zoomDeg(knobs.zoom)}
              onBegin={onBegin} onChange={(zoom) => edit((s) => updateLevel(s, id, { zoom }))} />
          )}
          {cueAim && <p className="text-[11px] text-ink/60">고리를 끌어 대상을 따라가요.</p>}
          {cueColor && (
            <ColorField label="색" value={res.color} onBegin={onBegin} onChange={(color) => edit((s) => updateLevel(s, id, { color }))} />
          )}
          <button type="button" aria-pressed={solo} onClick={onSolo} className={`${SEGMENT} self-start`}
            title="이 조명기만 100%로 켜고 나머지는 잠시 꺼요. 저장된 값은 바뀌지 않아요.">
            솔로
          </button>
        </Section>
        <Section title="위치·채널">
          <ChannelField key={`${id}-${fixture.channel}`} channel={fixture.channel} taken={takenChannels} onBegin={onBegin}
            onCommit={(c) => edit((s) => setChannel(s, id, c))} />
          <Segmented<FixtureKind> label="종류" value={kind}
            options={FIXTURE_KINDS.map((k) => ({ value: k, label: FIXTURE_LABELS[k] }))}
            onPick={(k) => { onBegin(); edit((s) => updateFixture(s, id, { kind: k })); }} />
          <label className="flex flex-col gap-0.5">
            <span className={LABEL}>라인</span>
            <select value={fixture.hang} onFocus={onBegin}
              onChange={(e) => edit((s) => updateFixture(s, id, { hang: e.target.value as HangId }))}
              className="rounded-md border border-point/40 bg-white/80 px-2 py-1 text-xs text-ink">
              {HANGS.map((h) => <option key={h} value={h}>{HANG_LABELS[h]}</option>)}
            </select>
          </label>
          <NumberField label={boom ? "높이" : "좌우"} title={boom ? "붐 위 높이(m)" : "라인 위 좌우(m)"}
            value={Math.min(hi, Math.max(lo, fixture.along))} min={lo} max={hi} step={0.1} digits={1} unit="m"
            onBegin={onBegin} onChange={(along) => edit((s) => updateFixture(s, id, { along }))} />
          <p className="text-[11px] text-ink/60">3D에서 몸체를 끌면 라인을 따라 움직이고, 다른 라인 가까이 끌면 그 라인으로 옮겨 걸려요.</p>
          <label className="flex items-center gap-2" title={shadowLocked ? `그림자는 지금 품질에서 최대 ${limit}대예요` : undefined}>
            <input type="checkbox" checked={fixture.castShadow} disabled={shadowLocked} className="accent-point"
              onChange={(e) => { onBegin(); edit((s) => updateFixture(s, id, { castShadow: e.target.checked })); }} />
            <span className={LABEL}>그림자</span>
            {shadowLocked && <span className="text-[11px] text-ink/60">최대 {limit}대</span>}
          </label>
        </Section>
        <Section title="포커스">
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
            <p className="text-[11px] text-ink/60">색은 큐마다 바꿔요. 위 큐 값에서 골라요.</p>
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
        </Section>
      </div>
    );
  }

  return (
    <div>
      <Header icon={<StageIcon className="size-5" />} kind="무대·객석" name="무대와 객석" onBegin={onBegin} />
      <Section title="무대">
        <Segmented label="형태" value={stage.shape}
          options={STAGE_SHAPES.map((v) => ({ value: v, label: STAGE_LABELS[v] }))}
          onPick={(shape) => { onBegin(); edit((s) => updateStage(s, { shape })); }} />
        <div className="grid grid-cols-3 gap-1.5">
          <NumberField label="폭" title="무대 폭(m)" value={stage.width} min={4} max={20} step={0.5} digits={1} onBegin={onBegin}
            onChange={(width) => edit((s) => updateStage(s, { width }))} />
          <NumberField label="깊이" title="무대 깊이(m)" value={stage.depth} min={3} max={15} step={0.5} digits={1} onBegin={onBegin}
            onChange={(depth) => edit((s) => updateStage(s, { depth }))} />
          <NumberField label="높이" title="무대 높이(m)" value={stage.height} min={3} max={12} step={0.5} digits={1} onBegin={onBegin}
            onChange={(height) => edit((s) => updateStage(s, { height }))} />
        </div>
        <ColorField label="바닥" value={stage.floorColor} onBegin={onBegin} onChange={(floorColor) => edit((s) => updateStage(s, { floorColor }))} />
        {stage.shape !== "round" && (
          <ColorField label="배경막" value={stage.backdropColor} onBegin={onBegin}
            onChange={(backdropColor) => edit((s) => updateStage(s, { backdropColor }))} />
        )}
      </Section>
      <Section title="객석">
        <VenueFields store={store} onBegin={onBegin} />
      </Section>
      {/* 넓은 화면에서는 사이드바 왼쪽 '좌석 미리보기' 패널에 따로 보여 준다 */}
      <div className="md:hidden">
        <Section title="좌석 지도">
          <SeatPicker store={store} seat={seat} onSeat={onSeat} />
        </Section>
      </div>
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
        className="w-20 rounded-md border border-point/40 bg-white/80 px-2 py-1 text-xs text-ink tabular-nums aria-invalid:border-red-600"
      />
      {error && <span id="fixture-channel-error" role="alert" className="text-[11px] font-bold text-red-600">{error}</span>}
    </div>
  );
}
