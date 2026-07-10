export type Tool =
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "line"
  | "rect"
  | "circle"
  | "select"
  | "move"
  | "wand";

export type MirrorMode = "none" | "horizontal" | "vertical" | "both";

export const CANVAS_PRESETS = [
  { label: "16 × 16", width: 16, height: 16 },
  { label: "32 × 32", width: 32, height: 32 },
  { label: "64 × 64", width: 64, height: 64 },
  { label: "160 × 90", width: 160, height: 90 },
] as const;

export const MAX_PALETTE_COLORS = 16;

export type Point = { x: number; y: number };
