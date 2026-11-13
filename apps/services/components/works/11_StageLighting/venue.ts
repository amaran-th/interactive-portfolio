// 객석 배치(순수). 좌석 블록에서 좌석 좌표·계단 단·좌석 시점·극장 크기를 계산한다.
// node:test가 그대로 실행하도록 타입만 import한다.
import type { SeatBlock, Stage, Vec3, Venue } from "./show";

export type Seat = { x: number; y: number; z: number; rotationY: number; blockId: string; row: number; seat: number; width: number };
export type SeatRef = { blockId: string; row: number; seat: number };

export const ROW_GAP = 0.9;
export const SEAT_W = 0.55;
export const HOUSE_FLOOR = -0.6; // 객석 바닥(무대 바닥 y=0보다 낮다)
const EYE = 1.15;
const DEG = Math.PI / 180;

/** 블록 하나의 좌석. 줄·번호는 1부터, 번호는 객석에서 무대를 볼 때 왼쪽부터. */
export function blockSeats(b: SeatBlock): Seat[] {
  const n = b.seatsPerRow;
  const cos = Math.cos(b.rotationY);
  const sin = Math.sin(b.rotationY);
  const arc = b.curve * DEG;
  const r0 = arc > 1e-6 ? (n * SEAT_W) / arc : 0;
  const seats: Seat[] = [];
  for (let r = 0; r < b.rows; r++) {
    const y = HOUSE_FLOOR + r * b.rake;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      let lx: number;
      let lz: number;
      let yaw = Math.PI;
      let width = SEAT_W;
      if (r0 > 0) {
        const rr = r0 + r * ROW_GAP;
        const th = (k * SEAT_W) / r0;
        lx = rr * Math.sin(th);
        lz = -r0 + rr * Math.cos(th);
        yaw += th;
        width = (SEAT_W * rr) / r0;
      } else {
        lx = k * SEAT_W;
        lz = r * ROW_GAP;
      }
      seats.push({
        x: b.x + lx * cos + lz * sin,
        y,
        z: b.z - lx * sin + lz * cos,
        rotationY: yaw + b.rotationY,
        blockId: b.id,
        row: r + 1,
        seat: i + 1,
        width,
      });
    }
  }
  return seats;
}

export function seatLayout(venue: Venue): Seat[] {
  return venue.blocks.flatMap(blockSeats);
}

/** 좌석마다 그 아래 계단 단(객석 바닥에서 좌석 바닥까지). 높이가 0인 칸은 뺀다. */
export function riserBoxes(venue: Venue): { x: number; z: number; w: number; d: number; h: number; rotationY: number }[] {
  return seatLayout(venue)
    .filter((s) => s.y > HOUSE_FLOOR + 1e-6)
    .map((s) => ({ x: s.x, z: s.z, w: s.width, d: ROW_GAP, h: s.y - HOUSE_FLOOR, rotationY: s.rotationY }));
}

export function defaultSeat(venue: Venue): SeatRef | null {
  const b = venue.blocks[0];
  if (!b) return null;
  return { blockId: b.id, row: Math.min(5, b.rows), seat: Math.ceil(b.seatsPerRow / 2) };
}

/** 블록이 지워지거나 줄·좌석 수가 줄어도 고른 좌석이 남아 있게 맞춘다. */
export function clampSeat(venue: Venue, ref: SeatRef | null): SeatRef | null {
  const b = ref && venue.blocks.find((x) => x.id === ref.blockId);
  if (!ref || !b) return defaultSeat(venue);
  return {
    blockId: b.id,
    row: Math.min(b.rows, Math.max(1, Math.round(ref.row))),
    seat: Math.min(b.seatsPerRow, Math.max(1, Math.round(ref.seat))),
  };
}

export function seatLabel(venue: Venue, ref: SeatRef | null): string {
  const b = ref && venue.blocks.find((x) => x.id === ref.blockId);
  return ref && b ? `${b.name} ${ref.row}열 ${ref.seat}번` : "좌석 없음";
}

export function seatView(stage: Stage, venue: Venue, ref: SeatRef | null): { eye: Vec3; target: Vec3 } {
  const target = { x: 0, y: 1, z: -stage.depth / 2 };
  const r = clampSeat(venue, ref);
  const b = r && venue.blocks.find((x) => x.id === r.blockId);
  const seat = r && b ? blockSeats(b).find((s) => s.row === r.row && s.seat === r.seat) : undefined;
  if (!seat) return { eye: { x: 0, y: HOUSE_FLOOR + EYE + 1, z: 8 }, target };
  return { eye: { x: seat.x, y: seat.y + EYE, z: seat.z }, target };
}

export function venueBox(stage: Stage, venue: Venue): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
  const seats = seatLayout(venue);
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
