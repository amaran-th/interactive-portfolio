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
  | "wand"
  | "text"
  | "gradient";

export type MirrorMode = "none" | "horizontal" | "vertical" | "both";

export const CANVAS_PRESETS = [
  { label: "16 × 16", width: 16, height: 16 },
  { label: "32 × 32", width: 32, height: 32 },
  { label: "64 × 64", width: 64, height: 64 },
  { label: "128 × 128", width: 128, height: 128 },
  { label: "256 × 256", width: 256, height: 256 },
  { label: "512 × 512", width: 512, height: 512 },
] as const;

// 새 캔버스·캔버스 크기 수정 모두에서 쓰는 한 변의 최댓값.
export const MAX_CANVAS_SIZE = 512;

export const MAX_PALETTE_COLORS = 64;

export type Point = { x: number; y: number };
