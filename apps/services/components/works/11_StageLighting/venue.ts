// 객석 배치(순수). 무대 형태별 계단식 좌석과 좌석 시점을 계산한다.
// node:test가 그대로 실행하도록 타입만 import한다.
import type { Stage, Vec3 } from "./show";

export type Seat = { x: number; y: number; z: number; rotationY: number; row: number; side: "front" | "left" | "right" | "back" };
export type SeatSide = "left" | "center" | "right";

export const ROW_GAP = 0.9;
export const RISE = 0.25;
export const SEAT_W = 0.55;
export const HOUSE_FLOOR = -0.6; // 객석 바닥(무대 바닥 y=0보다 무대 높이만큼 낮다)
const EYE = 1.15;

const floorAt = (row: number) => HOUSE_FLOOR + row * RISE;

/** 길이 span 안에 좌석 폭 간격으로 가운데 정렬한 좌표들. */
function spread(span: number): number[] {
  const n = Math.max(1, Math.floor(span / SEAT_W));
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * SEAT_W);
}

export function seatLayout(stage: Stage, rows: number): Seat[] {
  const { width: w, depth: d } = stage;
  const seats: Seat[] = [];
  if (stage.shape === "round") {
    const cz = -d / 2;
    for (let r = 0; r < rows; r++) {
      const R = Math.min(w, d) / 2 + 1.5 + r * ROW_GAP;
      const n = Math.floor((2 * Math.PI * R) / SEAT_W);
      for (let i = 0; i < n; i++) {
        const phi = (i / n) * Math.PI * 2;
        const c = Math.cos(phi);
        const x = R * Math.sin(phi);
        const side = c > 0.5 ? "front" : c < -0.5 ? "back" : x < 0 ? "left" : "right";
        seats.push({ x, y: floorAt(r), z: cz + R * c, rotationY: phi + Math.PI, row: r, side });
      }
    }
    return seats;
  }
  const frontZ = stage.shape === "thrust" ? d * 0.4 + 1.5 : 1.5;
  const frontXs = spread(w + 4);
  for (let r = 0; r < rows; r++) {
    for (const x of frontXs) seats.push({ x, y: floorAt(r), z: frontZ + r * ROW_GAP, rotationY: Math.PI, row: r, side: "front" });
  }
  if (stage.shape === "thrust") {
    const zs = spread(d * 0.4 + 1).map((z) => z + (d * 0.4) / 2);
    for (let r = 0; r < rows; r++) {
      const off = w / 4 + 1.5 + r * ROW_GAP;
      for (const z of zs) {
        seats.push({ x: -off, y: floorAt(r), z, rotationY: Math.PI / 2, row: r, side: "left" });
        seats.push({ x: off, y: floorAt(r), z, rotationY: -Math.PI / 2, row: r, side: "right" });
      }
    }
  }
  return seats;
}

/** 좌석마다 그 아래 계단 단(객석 바닥에서 좌석 바닥까지). 첫 줄처럼 높이가 0인 칸은 뺀다. */
export function riserBoxes(
  stage: Stage,
  rows: number,
): { x: number; z: number; w: number; d: number; h: number; rotationY: number }[] {
  return seatLayout(stage, rows)
    .filter((s) => s.y > HOUSE_FLOOR + 1e-6)
    .map((s) => ({ x: s.x, z: s.z, w: SEAT_W, d: ROW_GAP, h: s.y - HOUSE_FLOOR, rotationY: s.rotationY }));
}

export function seatView(stage: Stage, rows: number, row: number, side: SeatSide): { eye: Vec3; target: Vec3 } {
  const r = Math.min(Math.max(1, Math.round(row)), rows) - 1;
  const front = seatLayout(stage, rows).filter((s) => s.row === r && s.side === "front");
  const target = { x: 0, y: 1, z: -stage.depth / 2 };
  if (front.length === 0) return { eye: { x: 0, y: floorAt(r) + EYE, z: 2 }, target };
  const xs = front.map((s) => s.x).sort((a, b) => a - b);
  const z = front.reduce((m, s) => Math.max(m, s.z), -Infinity);
  const x = side === "center" ? 0 : side === "left" ? xs[Math.floor(xs.length / 6)] : xs[xs.length - 1 - Math.floor(xs.length / 6)];
  return { eye: { x, y: floorAt(r) + EYE, z }, target };
}

export function venueBox(stage: Stage, rows: number): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
  const seats = seatLayout(stage, rows);
  const xs = seats.map((s) => s.x);
  const zs = seats.map((s) => s.z);
  const m = 2;
  return {
    minX: Math.min(-stage.width / 2 - 2, ...xs) - m,
    maxX: Math.max(stage.width / 2 + 2, ...xs) + m,
    minZ: Math.min(-stage.depth - 1, ...zs) - m,
    maxZ: Math.max(5, ...zs) + m,
    height: stage.height + 4,
  };
}
