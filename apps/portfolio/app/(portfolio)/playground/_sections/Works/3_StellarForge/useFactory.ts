"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_ELEMENTS,
  FE_CORE_LIMIT,
  GRAV_K,
  MASS_PER_SOLAR,
  OFFLINE_CAP,
  REACTORS,
  Reactor,
  reactorCost,
  STAB_RATE,
  START_ENERGY,
  SUPERNOVA_MS,
  SYM_LEVEL,
  SYM_MASS,
  TAP_H,
} from "./factory";

export type Phase = "living" | "supernova";
export type Fate = "ns" | "bh";

export interface OfflineSummary {
  seconds: number;
  energy: number;
}

export interface FactoryState {
  energy: number;
  res: Record<string, number>;
  owned: Record<string, number>;
  /** 한 번이라도 만들어 해금된 반응로(세대가 바뀌어도 유지) */
  tech: Record<string, boolean>;
  /** 이번 세대에 생산한 원소(별 단계·붕괴 판정용, 환생 시 초기화) */
  produced: Record<string, boolean>;
  mass: number; // 별의 현재 질량(누자수)
  power: number; // 융합 출력(복사압) EMA
  stability: number; // 0~1
  phase: Phase;
  fate: Fate | null;
  solarMass: number | null;
  reason: "iron" | "collapse" | null;
  phaseUntil: number;
  generation: number;
  /** 모든 세대에 걸쳐 우주로 흩뿌린 중원소 누적 */
  cosmic: Record<string, number>;
  lastTs: number;
}

const SAVE_KEY = "stellar-sim-v2";

const newState = (now: number): FactoryState => ({
  energy: START_ENERGY,
  res: {},
  owned: { collector: 1 }, // 시작 시 성운 수집기 1기 무료
  tech: {},
  produced: {},
  mass: 0,
  power: 0,
  stability: 1,
  phase: "living",
  fate: null,
  solarMass: null,
  reason: null,
  phaseUntil: 0,
  generation: 1,
  cosmic: {},
  lastTs: now,
});

const isUnlocked = (r: Reactor, tech: Record<string, boolean>) =>
  r.unlock === null || !!tech[r.unlock];

function starMass(s: FactoryState): number {
  let m = 0;
  for (const sym of BASE_ELEMENTS) m += (s.res[sym] ?? 0) * (SYM_MASS[sym] ?? 0);
  return m;
}

// 점화: 연료가 충분히 쌓이면 그 단계의 첫 반응로가 무료로 켜진다(중력 점화).
function ignite(s: FactoryState) {
  for (const r of REACTORS) {
    if (r.ignite == null) continue;
    if ((s.owned[r.id] ?? 0) > 0) continue;
    if (!isUnlocked(r, s.tech)) continue;
    if ((s.res[r.inputs[0].el] ?? 0) >= r.ignite) s.owned[r.id] = 1;
  }
}

// 한 스텝 시뮬레이션. offline=true면 안정도 동역학은 건너뛴다(방치 중 붕괴 방지).
function simulate(s: FactoryState, dt: number, offline = false) {
  if (s.phase !== "living") return;
  ignite(s);

  let energyAdded = 0;
  for (const r of REACTORS) {
    const count = s.owned[r.id] ?? 0;
    if (count <= 0) continue;
    if (!isUnlocked(r, s.tech)) continue;

    let reactions = count * r.rate * dt;
    for (const inp of r.inputs) {
      const have = s.res[inp.el] ?? 0;
      reactions = Math.min(reactions, have / inp.n);
    }
    if (reactions <= 0) continue;

    for (const inp of r.inputs)
      s.res[inp.el] = (s.res[inp.el] ?? 0) - reactions * inp.n;
    for (const out of r.outputs) {
      s.res[out.el] = (s.res[out.el] ?? 0) + reactions * out.n;
      s.produced[out.el] = true;
      s.tech[out.el] = true;
    }
    const e = reactions * r.energy;
    s.energy += e;
    energyAdded += e;
  }

  s.mass = starMass(s);
  const inst = dt > 0 ? energyAdded / dt : 0;
  const k = Math.min(1, dt * 4);
  s.power += (inst - s.power) * k;

  // 안정도: 중력 대비 복사압. 점화(헬륨 생성) 후에만 작동한다.
  if (!offline && s.produced.He) {
    const gravity = s.mass * GRAV_K;
    const balance = s.power / Math.max(gravity, 1e-6);
    let delta = balance - 1;
    if (delta > 0) delta = Math.min(delta, 1) * 0.5;
    s.stability = Math.max(0, Math.min(1, s.stability + STAB_RATE * dt * delta));
  }
}

function triggerSupernova(
  s: FactoryState,
  reason: "iron" | "collapse",
  now: number,
) {
  const solar = Math.max(8, Math.round(s.mass / MASS_PER_SOLAR));
  s.solarMass = solar;
  s.fate = solar >= 25 ? "bh" : "ns";
  s.reason = reason;

  const fe = s.res.Fe ?? 0;
  s.cosmic.Au = (s.cosmic.Au ?? 0) + fe * 0.4;
  s.cosmic.Pt = (s.cosmic.Pt ?? 0) + fe * 0.22;
  s.cosmic.U = (s.cosmic.U ?? 0) + fe * 0.08;

  s.phase = "supernova";
  s.phaseUntil = now + SUPERNOVA_MS;
}

// 환생: 별의 물질은 흩어지고 새 성운에서 다음 세대가 태어난다.
// 반응로(공장)·에너지·해금(tech)·누적 중원소는 유지된다.
function rebirth(s: FactoryState) {
  s.res = {};
  s.produced = {};
  s.mass = 0;
  s.power = 0;
  s.stability = 1;
  s.fate = null;
  s.solarMass = null;
  s.reason = null;
  s.phase = "living";
  s.generation += 1;
}

export function maxTierOf(produced: Record<string, boolean>): number {
  let t = 1;
  for (const sym of Object.keys(produced)) {
    if (produced[sym]) t = Math.max(t, SYM_LEVEL[sym] ?? 1);
  }
  return t;
}

export function useFactory() {
  const ref = useRef<FactoryState>(newState(0));
  const [view, setView] = useState<FactoryState>(() => newState(0));
  const sync = useCallback(() => setView({ ...ref.current }), []);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrame = useRef<number>(0);

  const save = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(ref.current));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    let s = newState(now);
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FactoryState>;
        s = { ...newState(now), ...parsed };
        s.res = parsed.res ?? {};
        s.owned = parsed.owned ?? { collector: 1 };
        s.tech = parsed.tech ?? {};
        s.produced = parsed.produced ?? {};
        s.cosmic = parsed.cosmic ?? {};
      }
    } catch {
      s = newState(now);
    }
    if (s.phase === "supernova") rebirth(s);

    if (s.lastTs) {
      const elapsed = Math.min(OFFLINE_CAP, (now - s.lastTs) / 1000);
      if (elapsed > 1) {
        const beforeE = s.energy;
        const steps = Math.min(2000, Math.max(1, Math.ceil(elapsed)));
        const sdt = elapsed / steps;
        for (let i = 0; i < steps; i++) simulate(s, sdt, true);
        if (elapsed > 30) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setOffline({ seconds: elapsed, energy: s.energy - beforeE });
        }
      }
    }
    s.lastTs = now;
    ref.current = s;
    sync();

    lastFrame.current = now;
    const loop = () => {
      const t = Date.now();
      const dt = Math.min(0.25, (t - lastFrame.current) / 1000);
      lastFrame.current = t;
      const st = ref.current;
      simulate(st, dt);
      if (st.phase === "living" && st.produced.He) {
        if ((st.res.Fe ?? 0) >= FE_CORE_LIMIT) triggerSupernova(st, "iron", t);
        else if (st.stability <= 0) triggerSupernova(st, "collapse", t);
      } else if (st.phase === "supernova" && t >= st.phaseUntil) {
        rebirth(st);
      }
      st.lastTs = t;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const ui = setInterval(() => sync(), 90);
    const saver = setInterval(save, 2000);
    const onHide = () => save();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(ui);
      clearInterval(saver);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      save();
    };
  }, [save, sync]);

  const tap = useCallback(() => {
    const s = ref.current;
    if (s.phase !== "living") return;
    s.res.H = (s.res.H ?? 0) + TAP_H;
    s.produced.H = true;
    s.tech.H = true;
    sync();
  }, [sync]);

  const build = useCallback(
    (id: string) => {
      const s = ref.current;
      if (s.phase !== "living") return;
      const r = REACTORS.find((x) => x.id === id);
      if (!r || !isUnlocked(r, s.tech)) return;
      const cost = reactorCost(r, s.owned[id] ?? 0);
      if (s.energy < cost) return;
      s.energy -= cost;
      s.owned[id] = (s.owned[id] ?? 0) + 1;
      sync();
    },
    [sync],
  );

  const reset = useCallback(() => {
    ref.current = newState(Date.now());
    setOffline(null);
    save();
    sync();
  }, [save, sync]);

  const dismissOffline = useCallback(() => setOffline(null), []);

  return {
    s: view,
    offline,
    tap,
    build,
    reset,
    dismissOffline,
  };
}
