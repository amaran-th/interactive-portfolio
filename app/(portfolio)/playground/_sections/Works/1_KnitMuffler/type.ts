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
}

export interface Stitch {
  color: Color | null;
  slipped: boolean;
}

export type ColorMode = "normal" | "weakness";
export type Mode = "challenge" | "free";
export type Screen = "select" | "play" | "result";
export type ChallengeLevel = "easy" | "hard";
