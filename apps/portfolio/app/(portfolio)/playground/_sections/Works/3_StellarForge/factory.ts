// 방치형 핵합성 공장 설정.
// 반응로(공장 라인)는 실제 별의 핵연소 레시피를 그대로 따른다.
// 진행은 "업그레이드"가 아니라 "반응로를 더 짓는 것(쪽수)"으로만 이루어진다.

import { ELEMENTS } from "./elements";

export interface ResAmount {
  el: string;
  n: number;
}

export interface Reactor {
  id: string;
  name: string;
  /** 산출 원소의 단계(별 진화 단계와 연동) */
  tier: number;
  inputs: ResAmount[];
  outputs: ResAmount[];
  /** 반응 1회당 방출 에너지(빛) */
  energy: number;
  /** 반응로 1기당 초당 반응 횟수 */
  rate: number;
  baseCost: number;
  costMul: number;
  /** 해금 조건: 이 원소를 한 번이라도 생산해야 함 (null = 처음부터) */
  unlock: string | null;
  /** 점화 임계치: 첫 입력 연료가 이만큼 쌓이면 첫 반응로가 무료로 켜진다(중력 점화). */
  ignite?: number;
  /** 대표 반응식 */
  desc: string;
}

export const REACTORS: Reactor[] = [
  {
    id: "collector",
    name: "성운 수집기",
    tier: 1,
    inputs: [],
    outputs: [{ el: "H", n: 1 }],
    energy: 0,
    rate: 3,
    baseCost: 10,
    costMul: 1.15,
    unlock: null,
    desc: "성운에서 수소를 끌어모읍니다",
  },
  {
    id: "rHe",
    name: "수소 연소로",
    tier: 2,
    inputs: [{ el: "H", n: 4 }],
    outputs: [{ el: "He", n: 1 }],
    energy: 2,
    rate: 1,
    baseCost: 15,
    costMul: 1.16,
    unlock: null,
    ignite: 16,
    desc: "4 H → He · pp-연쇄",
  },
  {
    id: "rC",
    name: "헬륨 연소로",
    tier: 3,
    inputs: [{ el: "He", n: 3 }],
    outputs: [{ el: "C", n: 1 }],
    energy: 6,
    rate: 0.8,
    baseCost: 120,
    costMul: 1.17,
    unlock: "He",
    ignite: 12,
    desc: "3 He → C · 삼중 알파",
  },
  {
    id: "rO",
    name: "알파 포획로",
    tier: 4,
    inputs: [
      { el: "C", n: 1 },
      { el: "He", n: 1 },
    ],
    outputs: [{ el: "O", n: 1 }],
    energy: 9,
    rate: 0.8,
    baseCost: 600,
    costMul: 1.17,
    unlock: "C",
    ignite: 6,
    desc: "C + He → O",
  },
  {
    id: "rNe",
    name: "탄소 연소로",
    tier: 5,
    inputs: [{ el: "C", n: 2 }],
    outputs: [
      { el: "Ne", n: 1 },
      { el: "He", n: 1 },
    ],
    energy: 16,
    rate: 0.6,
    baseCost: 3000,
    costMul: 1.18,
    unlock: "O",
    ignite: 10,
    desc: "C + C → Ne + He",
  },
  {
    id: "rMg",
    name: "네온 연소로",
    tier: 6,
    inputs: [
      { el: "Ne", n: 1 },
      { el: "He", n: 1 },
    ],
    outputs: [{ el: "Mg", n: 1 }],
    energy: 24,
    rate: 0.6,
    baseCost: 12000,
    costMul: 1.18,
    unlock: "Ne",
    ignite: 4,
    desc: "Ne + He → Mg",
  },
  {
    id: "rSi",
    name: "산소 연소로",
    tier: 7,
    inputs: [{ el: "O", n: 2 }],
    outputs: [
      { el: "Si", n: 1 },
      { el: "He", n: 1 },
    ],
    energy: 40,
    rate: 0.5,
    baseCost: 60000,
    costMul: 1.19,
    unlock: "Mg",
    ignite: 10,
    desc: "O + O → Si + He",
  },
  {
    id: "rFe",
    name: "규소 연소로",
    tier: 8,
    inputs: [{ el: "Si", n: 2 }],
    outputs: [{ el: "Fe", n: 1 }],
    energy: 80,
    rate: 0.4,
    baseCost: 300000,
    costMul: 1.2,
    unlock: "Si",
    ignite: 10,
    desc: "Si + Si → Fe · ⁵⁶Ni→⁵⁶Fe",
  },
];

/** 자원 바에 항상 표시할 기본 원소 (수소→철) */
export const BASE_ELEMENTS = ["H", "He", "C", "O", "Ne", "Mg", "Si", "Fe"];

/** 초신성 r-과정으로 만들어지는 중원소 */
export interface HeavyMetal {
  sym: string;
  name: string;
  color: string;
}
export const HEAVY_METALS: HeavyMetal[] = [
  { sym: "Au", name: "금", color: "#ffd24a" },
  { sym: "Pt", name: "백금", color: "#dbe4ef" },
  { sym: "U", name: "우라늄", color: "#7ee787" },
];

/** 심볼 → 질량수 (누적 질량 계산용) */
export const SYM_MASS: Record<string, number> = Object.values(ELEMENTS).reduce(
  (acc, e) => {
    acc[e.symbol] = e.mass;
    return acc;
  },
  {} as Record<string, number>,
);

/** 심볼 → 원소 단계(별 진화 단계) */
export const SYM_LEVEL: Record<string, number> = Object.values(ELEMENTS).reduce(
  (acc, e) => {
    acc[e.symbol] = e.level;
    return acc;
  },
  {} as Record<string, number>,
);

export const START_ENERGY = 80;
export const TAP_H = 2;

// ===== 실시간 평형(중력 ↔ 복사압) =====
/** 철 코어가 이 양을 넘으면 자동으로 중력 붕괴(초신성) */
export const FE_CORE_LIMIT = 60;
/** 중력 = 별의 현재 질량 × GRAV_K (복사압=융합 출력과 비교) */
export const GRAV_K = 0.05;
/** 안정도 변화 속도(초당). 복사압이 중력보다 모자라면 안정도가 깎인다 */
export const STAB_RATE = 0.12;
/** 별 질량 → 태양질량(M☉) 환산(연출용) */
export const MASS_PER_SOLAR = 600;
/** 초신성 연출 지속 시간(ms) */
export const SUPERNOVA_MS = 3800;

/** 오프라인 보정 최대 시간(초) */
export const OFFLINE_CAP = 8 * 3600;

export const reactorCost = (r: Reactor, owned: number) =>
  r.baseCost * Math.pow(r.costMul, owned);
