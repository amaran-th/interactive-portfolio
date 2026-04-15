export type ColorMode = "normal" | "weakness";
export type Mode = "challenge" | "free";
export type Screen = "select" | "play" | "result";
export type ChallengeLevel = "easy" | "normal" | "hard";
export type Width = 10 | 20;
export type StitchType = "V" | "Flower";

export enum Color {
  BLUE = 1,
  VIOLET = 2,
  YELLOW = 3,
  APRICOT = 4,
  PINK = 5,
  BLACK = 6,
  GREEN = 7,
  GRAY = 8,
  IVORY = 9,
  WHITE = 0,
}

export interface Stitch {
  type: StitchType;
  color: Color | null;
  slipped: boolean;
}

export type ChallengeProgress = {
  clear: number;
  perfect: number;
};

export type ChallengeStat = {
  id: number;
  elapsed: number;
  slipCount: number;
  colorAccuracy: number;
  spm: number;
  savedAt: number;
};

export type FreeSave = {
  name: string;
  width: Width;
  rows: Stitch[][];
  elapsed: number;
  savedAt: number;
};

export type KnitMufflerHistory = {
  [level in ChallengeLevel]: ChallengeStat[];
} & { free: (FreeSave | null)[] };

export type Medal = "gold" | "silver" | "bronze" | null;
