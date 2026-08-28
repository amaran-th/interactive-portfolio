// 항성 핵합성(Stellar Nucleosynthesis) 사다리.
// 별 내부에서 실제로 일어나는 핵융합 연소 단계 순서를 그대로 따른다.
// level 1(수소)에서 시작해 같은 원소 둘이 융합할 때마다 다음 단계로 진행하며,
// level 8(철)에서 핵융합이 멈춘다 — 철보다 무거운 원소는 융합으로 에너지를 낼 수 없기 때문.

export interface ElementInfo {
  level: number;
  symbol: string;
  name: string;
  /** 대표 질량수 */
  mass: number;
  /** 이 원소가 만들어지는 대표 핵융합 반응 (교육용 플레이버) */
  reaction: string;
  /** 한 줄 설명 */
  note: string;
  /** 코어(orb) 색 */
  color: string;
  /** 글로우(빛 번짐) 색 */
  glow: string;
  /** 심볼/텍스트 색 */
  text: string;
}

export const ELEMENTS: Record<number, ElementInfo> = {
  1: {
    level: 1,
    symbol: "H",
    name: "수소",
    mass: 1,
    reaction: "원시 성운에서 응축",
    note: "빅뱅이 남긴 가장 가벼운 원소. 별의 연료입니다.",
    color: "#ff5e62",
    glow: "rgba(255,94,98,0.55)",
    text: "#fff5f5",
  },
  2: {
    level: 2,
    symbol: "He",
    name: "헬륨",
    mass: 4,
    reaction: "4 ¹H → ⁴He  (양성자–양성자 연쇄)",
    note: "수소 연소. 태양이 지금 하고 있는 일입니다.",
    color: "#ff9f43",
    glow: "rgba(255,159,67,0.55)",
    text: "#fff7ed",
  },
  3: {
    level: 3,
    symbol: "C",
    name: "탄소",
    mass: 12,
    reaction: "3 ⁴He → ¹²C  (삼중 알파 과정)",
    note: "헬륨 연소. 생명의 뼈대가 되는 원소가 태어납니다.",
    color: "#ffd166",
    glow: "rgba(255,209,102,0.55)",
    text: "#fffbeb",
  },
  4: {
    level: 4,
    symbol: "O",
    name: "산소",
    mass: 16,
    reaction: "¹²C + ⁴He → ¹⁶O",
    note: "탄소가 알파 입자를 흡수해 산소가 됩니다.",
    color: "#fde047",
    glow: "rgba(253,224,71,0.5)",
    text: "#1a1a1a",
  },
  5: {
    level: 5,
    symbol: "Ne",
    name: "네온",
    mass: 20,
    reaction: "¹²C + ¹²C → ²⁰Ne + ⁴He  (탄소 연소)",
    note: "별이 더 뜨거워져 탄소를 태우기 시작합니다.",
    color: "#5eead4",
    glow: "rgba(94,234,212,0.5)",
    text: "#042f2e",
  },
  6: {
    level: 6,
    symbol: "Mg",
    name: "마그네슘",
    mass: 24,
    reaction: "²⁰Ne + ⁴He → ²⁴Mg + γ  (네온 연소)",
    note: "네온 연소 단계. 네온이 광분해되며 나온 알파 입자가 마그네슘을 쌓습니다.",
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.55)",
    text: "#082f49",
  },
  7: {
    level: 7,
    symbol: "Si",
    name: "규소",
    mass: 28,
    reaction: "¹⁶O + ¹⁶O → ²⁸Si + ⁴He  (산소 연소)",
    note: "산소 연소 단계. 뒤이은 규소 연소는 하루 남짓 만에 끝납니다.",
    color: "#818cf8",
    glow: "rgba(129,140,248,0.6)",
    text: "#1e1b4b",
  },
  8: {
    level: 8,
    symbol: "Fe",
    name: "철",
    mass: 56,
    reaction: "²⁸Si 연소 → ⁵⁶Ni → ⁵⁶Fe  (핵융합의 종착점)",
    note: "철은 더 이상 융합으로 에너지를 낼 수 없습니다. 코어가 붕괴하며 초신성이 폭발합니다.",
    color: "#e0e7ff",
    glow: "rgba(199,210,254,0.9)",
    text: "#312e81",
  },
};

export const MAX_LEVEL = 8;
export const FE_LEVEL = 8;

export const elementOf = (level: number): ElementInfo =>
  ELEMENTS[level] ?? ELEMENTS[1];
