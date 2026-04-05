export enum Color {
  SKYBLUE = 1,
  VIOLET = 2,
  YELLOW = 3,
  APRICOT = 4,
  PINK = 5,
  MINT = 6,
  GREEN = 7,
  GRAY = 8,
  IVORY = 9,
}

export interface Stitch {
  color: Color | null;
  slipped: boolean;
}
