import { Color, ColorMode, StitchType, Width } from "./type";

export type ColorDef = {
  id: number;
  stroke: string;
  fill: string;
  text: string;
};
export type Draft = {
  id: number;
  name: string;
  width: Width;
  data: { type: StitchType; color: Color }[][];
};

export const PALETTES: Record<ColorMode, Record<Color, ColorDef>> = {
  normal: {
    [Color.BLUE]: { id: 1, stroke: "#6EA8B1", fill: "#ABDEE6", text: "#333" },
    [Color.VIOLET]: { id: 2, stroke: "#A583A5", fill: "#CBAACB", text: "#333" },
    [Color.YELLOW]: { id: 3, stroke: "#CDCD74", fill: "#FFFFB6", text: "#333" },
    [Color.APRICOT]: {
      id: 4,
      stroke: "#E59A7A",
      fill: "#FFCCB6",
      text: "#333",
    },
    [Color.PINK]: { id: 5, stroke: "#E4849F", fill: "#F3B0C3", text: "#333" },
    [Color.BLACK]: { id: 6, stroke: "#57638A", fill: "#293046", text: "#FFF" },
    [Color.GREEN]: { id: 7, stroke: "#9ACC98", fill: "#CCE2CB", text: "#333" },
    [Color.GRAY]: { id: 8, stroke: "#C3BFB3", fill: "#ECEAE4", text: "#333" },
    [Color.IVORY]: { id: 9, stroke: "#CEC5A8", fill: "#F6EAC2", text: "#333" },
    [Color.WHITE]: { id: 0, stroke: "#C3BFB3", fill: "#FFFFFF", text: "#333" },
  },
  // Wong palette 기반 색약 친화 팔레트
  weakness: {
    [Color.BLUE]: { id: 1, stroke: "#0072B2", fill: "#56B4E9", text: "#FFF" }, // Sky blue
    [Color.VIOLET]: { id: 2, stroke: "#994F8A", fill: "#CC79A7", text: "#FFF" }, // Reddish purple
    [Color.YELLOW]: { id: 3, stroke: "#C8B400", fill: "#F0E442", text: "#333" }, // Yellow
    [Color.APRICOT]: {
      id: 4,
      stroke: "#B87000",
      fill: "#E69F00",
      text: "#333",
    }, // Orange
    [Color.PINK]: { id: 5, stroke: "#A04000", fill: "#D55E00", text: "#FFF" }, // Vermillion
    [Color.BLACK]: { id: 6, stroke: "#333333", fill: "#000000", text: "#FFF" }, // Black
    [Color.GREEN]: { id: 7, stroke: "#007A58", fill: "#009E73", text: "#FFF" }, // Bluish green
    [Color.GRAY]: { id: 8, stroke: "#C3BFB3", fill: "#ECEAE4", text: "#333" }, // Gray
    [Color.IVORY]: { id: 9, stroke: "#CEC5A8", fill: "#F6EAC2", text: "#333" }, // Ivory
    [Color.WHITE]: { id: 0, stroke: "#C3BFB3", fill: "#FFFFFF", text: "#333" },
  },
};

// 1=BLUE 2=VIOLET 3=YELLOW 4=APRICOT 5=PINK 6=BLACK 7=GREEN 8=GRAY 9=IVORY

const toRow = (nums: number[]) =>
  nums.map((c) => ({ type: StitchType.V, color: c as Color }));

export const EASY_DRAFTS: Draft[] = [
  // 당근 — blue sky(1) + apricot(4) + green(7)
  {
    id: 1,
    name: "당근",
    width: 10,
    data: [
      toRow([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
      toRow([1, 1, 7, 1, 7, 1, 7, 1, 1, 1]),
      toRow([1, 1, 7, 7, 7, 7, 7, 1, 1, 1]),
      toRow([1, 1, 1, 4, 4, 4, 1, 1, 1, 1]),
      toRow([1, 1, 1, 4, 4, 4, 1, 1, 1, 1]),
      toRow([1, 1, 1, 1, 4, 4, 1, 1, 1, 1]),
      toRow([1, 1, 1, 1, 4, 4, 1, 1, 1, 1]),
      toRow([1, 1, 1, 1, 4, 1, 1, 1, 1, 1]),
      toRow([1, 1, 1, 1, 4, 1, 1, 1, 1, 1]),
      toRow([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
    ],
  },
  // 달 — blue sky(1) + pink cloud(5) + gray cloud(8) + green hill(7)
  {
    id: 2,
    name: "달",
    width: 10,
    data: [
      toRow([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
      toRow([1, 5, 5, 1, 1, 1, 1, 0, 0, 0]),
      toRow([1, 5, 5, 1, 1, 1, 0, 0, 0, 0]),
      toRow([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
      toRow([1, 1, 0, 0, 0, 0, 1, 1, 1, 1]),
      toRow([1, 1, 1, 0, 0, 0, 0, 1, 1, 1]),
      toRow([0, 0, 1, 1, 1, 1, 1, 7, 7, 7]),
      toRow([0, 0, 0, 7, 7, 7, 7, 7, 7, 7]),
      toRow([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
      toRow([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
    ],
  },
  // 하트 — yellow(3) + pink(5)
  {
    id: 3,
    name: "하트",
    width: 10,
    data: [
      toRow([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
      toRow([3, 5, 5, 3, 3, 3, 5, 5, 3, 3]),
      toRow([5, 5, 5, 5, 3, 5, 5, 5, 5, 3]),
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 3]),
      toRow([3, 5, 5, 5, 5, 5, 5, 5, 3, 3]),
      toRow([3, 3, 5, 5, 5, 5, 5, 3, 3, 3]),
      toRow([3, 3, 3, 5, 5, 5, 3, 3, 3, 3]),
      toRow([3, 3, 3, 3, 5, 3, 5, 3, 5, 3]),
      toRow([3, 3, 3, 3, 3, 3, 5, 5, 5, 3]),
      toRow([3, 3, 3, 3, 3, 3, 3, 5, 3, 3]),
    ],
  },
  // 벌 — pink sky(5) + yellow body(3) + black stripes/eyes(6) + blue wings(1)
  {
    id: 4,
    name: "벌",
    width: 10,
    data: [
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
      toRow([1, 1, 5, 6, 3, 3, 6, 5, 1, 1]),
      toRow([1, 1, 1, 3, 3, 3, 3, 1, 1, 1]),
      toRow([5, 5, 5, 6, 6, 6, 6, 5, 5, 5]),
      toRow([1, 1, 1, 3, 3, 3, 3, 1, 1, 1]),
      toRow([1, 1, 5, 6, 6, 6, 6, 5, 1, 1]),
      toRow([5, 5, 5, 5, 3, 3, 5, 5, 5, 5]),
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
    ],
  },
  // 꽃 — violet(2) + pink petals(5) + green stem(7)
  {
    id: 5,
    name: "꽃",
    width: 10,
    data: [
      toRow([2, 2, 2, 2, 5, 5, 2, 2, 2, 2]),
      toRow([2, 2, 2, 2, 5, 5, 2, 2, 2, 2]),
      toRow([2, 2, 5, 5, 5, 5, 5, 5, 2, 2]),
      toRow([2, 5, 5, 5, 5, 5, 5, 5, 5, 2]),
      toRow([2, 2, 5, 5, 5, 5, 5, 5, 2, 2]),
      toRow([2, 2, 2, 2, 5, 5, 2, 2, 2, 2]),
      toRow([2, 2, 2, 2, 5, 5, 2, 2, 2, 2]),
      toRow([2, 2, 2, 7, 7, 7, 2, 2, 2, 2]),
      toRow([2, 2, 2, 2, 7, 2, 2, 2, 2, 2]),
      toRow([2, 2, 2, 2, 7, 2, 2, 2, 2, 2]),
    ],
  },
];

export const NORMAL_DRAFTS: Draft[] = [
  // 토끼 — ivory(9) + gray body(8) + pink ears/nose(5) + dark eyes(6) + yellow ground(3)
  {
    id: 1,
    name: "토끼",
    width: 10,
    data: [
      toRow([8, 8, 0, 8, 8, 8, 0, 8, 8, 8]),
      toRow([8, 0, 0, 8, 8, 8, 0, 0, 8, 8]),
      toRow([8, 5, 0, 8, 8, 8, 0, 5, 8, 8]),
      toRow([8, 5, 0, 0, 0, 0, 0, 5, 8, 8]),
      toRow([8, 0, 0, 0, 0, 0, 0, 0, 8, 8]),
      toRow([8, 0, 6, 0, 0, 0, 6, 0, 8, 8]),
      toRow([8, 0, 0, 0, 5, 0, 0, 0, 8, 8]),
      toRow([8, 8, 0, 0, 0, 0, 0, 8, 8, 8]),
      toRow([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
      toRow([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
    ],
  },
  // 밤하늘 언덕 — dark sky(6) + yellow stars/moon(3) + green hills(7) + ivory snow(9)
  {
    id: 2,
    name: "밤하늘",
    width: 10,
    data: [
      toRow([6, 6, 6, 6, 6, 6, 3, 6, 6, 6]),
      toRow([6, 6, 3, 3, 6, 6, 6, 6, 6, 6]),
      toRow([6, 3, 3, 6, 6, 6, 6, 6, 3, 6]),
      toRow([6, 6, 3, 3, 6, 6, 6, 6, 6, 6]),
      toRow([6, 6, 6, 6, 6, 6, 3, 6, 6, 6]),
      toRow([6, 6, 3, 6, 6, 6, 6, 6, 6, 6]),
      toRow([6, 6, 6, 6, 6, 6, 6, 7, 7, 7]),
      toRow([6, 6, 6, 1, 1, 7, 7, 7, 7, 7]),
      toRow([7, 7, 7, 1, 1, 1, 7, 7, 7, 7]),
      toRow([7, 7, 7, 7, 1, 1, 1, 1, 7, 7]),
    ],
  },
  // 무지개 — 바깥(빨=5) → 주(4) → 노(3) → 초(7) → 파(1) → 안(보=2), 배경 ivory(9)
  {
    id: 3,
    name: "무지개",
    width: 10,
    data: [
      toRow([8, 8, 8, 8, 8, 8, 8, 8, 8, 0]),
      toRow([8, 8, 8, 8, 8, 8, 8, 8, 0, 5]),
      toRow([8, 8, 8, 8, 8, 8, 8, 0, 5, 5]),
      toRow([8, 8, 8, 8, 8, 8, 0, 5, 5, 3]),
      toRow([8, 8, 8, 8, 8, 0, 5, 5, 3, 3]),
      toRow([8, 8, 8, 8, 0, 5, 5, 3, 3, 7]),
      toRow([8, 8, 8, 0, 5, 5, 3, 3, 7, 7]),
      toRow([8, 8, 0, 5, 5, 3, 3, 7, 7, 1]),
      toRow([8, 0, 5, 5, 3, 3, 7, 7, 1, 1]),
      toRow([0, 5, 5, 3, 3, 7, 7, 1, 1, 1]),
    ],
  },
  // 수박 — white(0) + green rind(7) + pink flesh(5) + dark seeds(6)
  {
    id: 4,
    name: "수박",
    width: 10,
    data: [
      toRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      toRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      toRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      toRow([7, 5, 5, 6, 5, 5, 6, 5, 5, 7]),
      toRow([7, 5, 5, 5, 5, 6, 5, 5, 5, 7]),
      toRow([7, 5, 6, 5, 5, 5, 5, 6, 5, 7]),
      toRow([7, 7, 5, 5, 5, 5, 5, 5, 7, 7]),
      toRow([0, 7, 7, 7, 7, 7, 7, 7, 7, 0]),
      toRow([0, 0, 7, 7, 7, 7, 7, 7, 0, 0]),
      toRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ],
  },
  // 집 — yellow sky(3) + pink roof(5) + gray walls(8) + blue windows(1) + apricot door(4) + green garden(7)
  {
    id: 5,
    name: "집",
    width: 10,
    data: [
      toRow([1, 1, 1, 5, 5, 5, 5, 1, 1, 1]),
      toRow([1, 1, 5, 5, 5, 5, 5, 5, 1, 1]),
      toRow([1, 5, 5, 5, 5, 5, 5, 5, 5, 1]),
      toRow([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
      toRow([8, 8, 8, 8, 8, 8, 8, 8, 8, 8]),
      toRow([8, 1, 1, 8, 8, 8, 8, 1, 1, 8]),
      toRow([8, 1, 1, 8, 4, 4, 8, 1, 1, 8]),
      toRow([8, 8, 8, 8, 4, 4, 8, 8, 8, 8]),
      toRow([8, 8, 8, 8, 4, 4, 8, 8, 8, 8]),
      toRow([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
    ],
  },
];
