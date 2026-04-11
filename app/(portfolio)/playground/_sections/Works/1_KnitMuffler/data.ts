import { Color, ColorMode } from "./type";

export const STITCH_COUNT = 10;

type ColorDef = { id: number; stroke: string; fill: string; text: string };

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

export const EASY_DRAFTS = {
  // 당근 — ivory(9) + orange(4) + green(7)
  carrot: [
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 9, 7, 9, 7, 9, 7, 9, 9, 9],
    [9, 9, 7, 7, 7, 7, 7, 9, 9, 9],
    [9, 9, 9, 4, 4, 4, 9, 9, 9, 9],
    [9, 9, 9, 4, 4, 4, 9, 9, 9, 9],
    [9, 9, 9, 9, 4, 4, 9, 9, 9, 9],
    [9, 9, 9, 9, 4, 4, 9, 9, 9, 9],
    [9, 9, 9, 9, 4, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 4, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  ],
  // 달 — blue sky(1) + yellow moon(3) + ivory cloud(9)
  moon: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 5, 5, 1, 1, 1, 1, 8, 1, 8],
    [1, 5, 5, 1, 1, 1, 8, 8, 8, 8],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 8, 8, 8, 8, 1, 1, 1, 1],
    [1, 1, 1, 8, 8, 8, 8, 1, 1, 1],
    [8, 8, 1, 1, 1, 1, 1, 7, 7, 7],
    [8, 8, 8, 1, 1, 7, 7, 7, 7, 7],
    [7, 7, 7, 1, 1, 1, 7, 7, 7, 7],
    [7, 7, 7, 7, 1, 1, 1, 1, 7, 7],
  ],
  // 하트 — ivory(9) + pink(5) + yellow(3)
  heart: [
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 5, 5, 9, 9, 9, 5, 5, 9, 9],
    [5, 5, 5, 5, 9, 5, 5, 5, 5, 9],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 9],
    [9, 5, 5, 5, 5, 5, 5, 5, 9, 9],
    [9, 9, 5, 5, 5, 5, 5, 9, 9, 9],
    [9, 9, 9, 5, 5, 5, 9, 9, 9, 9],
    [9, 9, 9, 9, 5, 9, 5, 9, 5, 9],
    [9, 9, 9, 9, 9, 9, 5, 5, 5, 9],
    [9, 9, 9, 9, 9, 9, 9, 5, 9, 9],
  ],
  // 벌 — ivory(9) + yellow body(3) + black stripes/eyes(6) + blue wings(1)
  bee: [
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [1, 1, 9, 6, 3, 3, 6, 9, 1, 1],
    [1, 1, 1, 3, 3, 3, 3, 1, 1, 1],
    [9, 9, 9, 6, 6, 6, 6, 9, 9, 9],
    [1, 1, 1, 3, 3, 3, 3, 1, 1, 1],
    [1, 1, 9, 6, 6, 6, 6, 9, 1, 1],
    [9, 9, 9, 9, 3, 3, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  ],
  // 꽃 — ivory(9) + pink petals(5) + green stem(7)
  flower: [
    [9, 9, 9, 9, 5, 5, 9, 9, 9, 9],
    [9, 9, 9, 9, 5, 5, 9, 9, 9, 9],
    [9, 9, 5, 5, 5, 5, 5, 5, 9, 9],
    [9, 5, 5, 5, 5, 5, 5, 5, 5, 9],
    [9, 9, 5, 5, 5, 5, 5, 5, 9, 9],
    [9, 9, 9, 9, 5, 5, 9, 9, 9, 9],
    [9, 9, 9, 9, 5, 5, 9, 9, 9, 9],
    [9, 9, 9, 7, 7, 7, 9, 9, 9, 9],
    [9, 9, 9, 9, 7, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 7, 9, 9, 9, 9, 9],
  ],
};

export const HARD_DRAFTS = {
  // 토끼 — ivory(9) + gray body(8) + pink ears/nose(5) + dark eyes(6) + yellow ground(3)
  rabbit: [
    [9, 9, 8, 9, 9, 9, 8, 9, 9, 9],
    [9, 9, 8, 9, 9, 9, 8, 9, 9, 9],
    [9, 5, 8, 9, 9, 9, 8, 5, 9, 9],
    [9, 9, 8, 8, 8, 8, 8, 9, 9, 9],
    [9, 8, 8, 8, 8, 8, 8, 8, 9, 9],
    [9, 8, 6, 8, 8, 8, 6, 8, 9, 9],
    [9, 8, 8, 8, 5, 8, 8, 8, 9, 9],
    [9, 9, 8, 8, 8, 8, 8, 9, 9, 9],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  ],
  // 밤하늘 언덕 — dark sky(6) + yellow stars/moon(3) + green hills(7) + ivory snow(9)
  night: [
    [6, 6, 6, 6, 6, 6, 3, 6, 6, 6],
    [6, 6, 3, 3, 6, 6, 6, 6, 6, 6],
    [6, 3, 3, 6, 6, 6, 6, 6, 3, 6],
    [6, 6, 3, 3, 6, 6, 6, 6, 6, 6],
    [6, 6, 6, 6, 6, 6, 3, 6, 6, 6],
    [6, 6, 3, 6, 6, 6, 6, 6, 6, 6],
    [6, 6, 6, 6, 6, 6, 6, 7, 7, 7],
    [6, 6, 6, 1, 1, 7, 7, 7, 7, 7],
    [7, 7, 7, 1, 1, 1, 7, 7, 7, 7],
    [7, 7, 7, 7, 1, 1, 1, 1, 7, 7],
  ],
  // 고양이 — ivory(9) + apricot body(4) + yellow eyes(3) + dark stripes(6) + pink nose(5)
  cat: [
    [4, 4, 9, 9, 9, 9, 9, 4, 4, 9],
    [4, 4, 4, 9, 9, 9, 4, 4, 4, 9],
    [9, 4, 4, 4, 4, 4, 4, 4, 9, 9],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 9],
    [4, 3, 4, 4, 4, 4, 3, 4, 4, 9],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 9],
    [4, 4, 6, 4, 5, 4, 6, 4, 4, 9],
    [9, 4, 4, 4, 4, 4, 4, 4, 9, 9],
    [9, 4, 4, 4, 4, 4, 4, 4, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  ],
  // 수박 — ivory(9) + green rind(7) + pink flesh(5) + dark seeds(6) + yellow border(3)
  watermelon: [
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    [7, 5, 5, 6, 5, 5, 6, 5, 5, 7],
    [7, 5, 5, 5, 5, 6, 5, 5, 5, 7],
    [7, 5, 6, 5, 5, 5, 5, 6, 5, 7],
    [7, 7, 5, 5, 5, 5, 5, 5, 7, 7],
    [9, 7, 7, 7, 7, 7, 7, 7, 7, 9],
    [9, 9, 7, 7, 7, 7, 7, 7, 9, 9],
    [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  ],
  // 집 — ivory(9) + orange roof(4) + gray walls(8) + dark windows/door(6) + green garden(7)
  house: [
    [9, 9, 9, 5, 5, 5, 5, 9, 9, 9],
    [9, 9, 5, 5, 5, 5, 5, 5, 9, 9],
    [9, 5, 5, 5, 5, 5, 5, 5, 5, 9],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    [8, 1, 1, 8, 8, 8, 8, 1, 1, 8],
    [8, 1, 1, 8, 4, 4, 8, 1, 1, 8],
    [8, 8, 8, 8, 4, 4, 8, 8, 8, 8],
    [8, 8, 8, 8, 4, 4, 8, 8, 8, 8],
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  ],
};
