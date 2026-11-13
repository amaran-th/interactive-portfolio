// 객석 배치(순수). 극장 템플릿에서 좌석 블록을 계산하고, 블록에서 좌석 좌표·계단 단·좌석 시점·극장 크기를 계산한다.
// 좌석 블록은 저장하지 않는다. 템플릿 수치가 같으면 항상 같은 블록이 나온다.
// node:test가 그대로 실행하도록 타입만 import한다.
import type { SeatBlock, Stage, Vec3, Venue, VenueTemplate } from "./show";

export type Seat = { x: number; y: number; z: number; rotationY: number; blockId: string; row: number; seat: number; width: number };
export type SeatRef = { blockId: string; row: number; seat: number };

export const ROW_GAP = 0.9;
export const SEAT_W = 0.55;
export const HOUSE_FLOOR = -0.6; // 객석 바닥(무대 바닥 y=0보다 낮다)
const EYE = 1.15;
const DEG = Math.PI / 180;
const SIDE_TURN = 15; // 중극장 양옆 블록이 가운데를 향해 도는 각도(°)
const BALCONY_OVERHANG = 2; // 발코니가 1층 뒷줄 위로 나오는 거리(m)
const BALCONY_CLEAR = 3; // 1층 마지막 줄에서 발코니 바닥까지(m)
const SLAB = 0.3; // 발코니 받침 두께(m)

/** n번째 줄(1부터) 좌석 수. */
export function rowSeats(b: SeatBlock, row: number): number {
  return b.seatsPerRow + Math.floor((row - 1) * b.widen + 1e-9);
}

/** 블록 하나의 좌석. 줄·번호는 1부터, 번호는 객석에서 무대를 볼 때 왼쪽부터. */
export function blockSeats(b: SeatBlock): Seat[] {
  const n0 = b.seatsPerRow;
  const cos = Math.cos(b.rotationY);
  const sin = Math.sin(b.rotationY);
  const arc = b.curve * DEG;
  const r0 = arc > 1e-6 ? (n0 * SEAT_W) / arc : 0;
  const seats: Seat[] = [];
  for (let r = 0; r < b.rows; r++) {
    const y = HOUSE_FLOOR + b.elevation + r * b.rake;
    const n = r0 > 0 ? n0 : rowSeats(b, r + 1); // 휜 블록은 좌석 폭이 늘어나 뒷줄을 채운다
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

const r2 = (v: number) => Math.round(v * 1000) / 1000;

function mk(id: string, name: string, x: number, z: number, rotDeg: number, rows: number, seats: number, o: Partial<SeatBlock> = {}): SeatBlock {
  return { id, name, x: r2(x), z: r2(z), rotationY: rotDeg * DEG, rows, seatsPerRow: seats, rake: 0.25, curve: 0, widen: 0, elevation: 0, ...o };
}

/** 프로시니엄 양옆 블록: 앞줄을 첫 줄 높이에 맞추고, 가운데 블록과 가까운 줄끼리 통로 폭(+좌석 폭)만큼 떨어지게 왼쪽으로 민다. */
function sideBlock(center: SeatBlock, rows: number, seats: number, tpl: VenueTemplate): SeatBlock {
  const draft = mk("b-left", "왼쪽", 0, tpl.gap, -SIDE_TURN, rows, seats, { rake: tpl.rake });
  const ds = blockSeats(draft);
  const dz = tpl.gap - Math.min(...ds.map((s) => s.z));
  const cs = blockSeats(center);
  let dx = Infinity;
  for (const s of ds) {
    for (const c of cs) {
      if (Math.abs(c.z - (s.z + dz)) < ROW_GAP) dx = Math.min(dx, c.x - tpl.aisle - SEAT_W - s.x);
    }
  }
  if (!Number.isFinite(dx)) dx = Math.min(...cs.map((c) => c.x)) - tpl.aisle - SEAT_W - Math.max(...ds.map((s) => s.x));
  return { ...draft, x: r2(dx), z: r2(tpl.gap + dz) };
}

/** 극장 템플릿 → 좌석 블록. 위치·방향은 규칙으로만 정한다(블록끼리·무대와 겹치지 않음). */
export function templateBlocks(stage: Stage, tpl: VenueTemplate): SeatBlock[] {
  const { width: w, depth: d } = stage;
  const { rows: R, width: W, rake, gap: g, aisle } = tpl;
  if (tpl.kind === "arena") {
    const r = Math.min(w, d) / 2 + g;
    const n = Math.max(1, Math.min(W, Math.floor(((Math.PI / 2) * r - aisle) / SEAT_W)));
    const curve = Math.round(((n * SEAT_W) / r / DEG) * 10) / 10;
    const cz = -d / 2;
    const o = { rake, curve };
    return [
      mk("b-front", "앞", 0, cz + r, 0, R, n, o),
      mk("b-left", "왼쪽", -r, cz, -90, R, n, o),
      mk("b-back", "뒤", 0, cz - r, 180, R, n, o),
      mk("b-right", "오른쪽", r, cz, 90, R, n, o),
    ];
  }
  if (tpl.kind === "thrust") {
    const front = d * 0.4 + g; // 돌출 무대 앞 끝에서 gap만큼
    const center = mk("b-center", "가운데", 0, front, 0, R, W, { rake, widen: tpl.widen });
    const z0 = 0.6; // 본무대 앞 끝(z=0)보다 조금 앞
    const S = Math.max(1, Math.floor((front - aisle - SEAT_W - z0) / SEAT_W + 1e-9) + 1);
    const zc = z0 + ((S - 1) * SEAT_W) / 2;
    const sx = w / 4 + g;
    return [
      center,
      mk("b-left", "왼쪽", -sx, zc, -90, R, S, { rake }),
      mk("b-right", "오른쪽", sx, zc, 90, R, S, { rake }),
    ];
  }
  const center = mk("b-center", "가운데", 0, g, 0, R, W, { rake, widen: tpl.widen });
  if (tpl.kind === "studio") return [center];
  const left = sideBlock(center, R, Math.max(4, Math.round(W * 0.35)), tpl);
  const right = { ...left, id: "b-right", name: "오른쪽", x: -left.x, rotationY: SIDE_TURN * DEG };
  const blocks = [center, left, right];
  if (tpl.kind === "grand") {
    const lastZ = center.z + (R - 1) * ROW_GAP;
    const seats = rowSeats(center, R) + 2 * left.seatsPerRow;
    blocks.push(
      mk("b-balcony", "발코니", 0, lastZ - BALCONY_OVERHANG, 0, tpl.balconyRows, seats, {
        rake: Math.min(0.5, rake * 1.6),
        elevation: r2((R - 1) * rake + BALCONY_CLEAR),
      }),
    );
  }
  return blocks;
}

// 같은 템플릿을 여러 곳(씬·좌석 지도·좌석 라벨)이 읽으므로 마지막 결과 하나를 기억한다.
let memo: { stage: Stage; tpl: VenueTemplate; blocks: SeatBlock[] } | null = null;
export function venueBlocks(stage: Stage, venue: Venue): SeatBlock[] {
  if (memo && memo.stage === stage && memo.tpl === venue.template) return memo.blocks;
  memo = { stage, tpl: venue.template, blocks: templateBlocks(stage, venue.template) };
  return memo.blocks;
}

export function seatLayout(stage: Stage, venue: Venue): Seat[] {
  return venueBlocks(stage, venue).flatMap(blockSeats);
}

/** 좌석마다 그 아래 계단 단. 1층은 객석 바닥부터, 발코니는 받침 두께만큼만. 높이가 0인 칸은 뺀다. */
export function riserBoxes(
  stage: Stage,
  venue: Venue,
): { x: number; z: number; w: number; d: number; h: number; base: number; rotationY: number }[] {
  const out: { x: number; z: number; w: number; d: number; h: number; base: number; rotationY: number }[] = [];
  for (const b of venueBlocks(stage, venue)) {
    const base = HOUSE_FLOOR + Math.max(0, b.elevation - SLAB);
    for (const s of blockSeats(b)) {
      if (s.y > base + 1e-6) out.push({ x: s.x, z: s.z, w: s.width, d: ROW_GAP, h: s.y - base, base, rotationY: s.rotationY });
    }
  }
  return out;
}

export function defaultSeat(stage: Stage, venue: Venue): SeatRef | null {
  const b = venueBlocks(stage, venue)[0];
  if (!b) return null;
  const row = Math.min(5, b.rows);
  return { blockId: b.id, row, seat: Math.ceil(rowSeats(b, row) / 2) };
}

/** 템플릿이 바뀌어 블록이 사라지거나 줄·좌석 수가 줄어도 고른 좌석이 남아 있게 맞춘다. */
export function clampSeat(stage: Stage, venue: Venue, ref: SeatRef | null): SeatRef | null {
  const b = ref && venueBlocks(stage, venue).find((x) => x.id === ref.blockId);
  if (!ref || !b) return defaultSeat(stage, venue);
  const row = Math.min(b.rows, Math.max(1, Math.round(ref.row)));
  return { blockId: b.id, row, seat: Math.min(rowSeats(b, row), Math.max(1, Math.round(ref.seat))) };
}

export function seatLabel(stage: Stage, venue: Venue, ref: SeatRef | null): string {
  const b = ref && venueBlocks(stage, venue).find((x) => x.id === ref.blockId);
  return ref && b ? `${b.name} ${ref.row}열 ${ref.seat}번` : "좌석 없음";
}

export function seatView(stage: Stage, venue: Venue, ref: SeatRef | null): { eye: Vec3; target: Vec3 } {
  const target = { x: 0, y: 1, z: -stage.depth / 2 };
  const r = clampSeat(stage, venue, ref);
  const b = r && venueBlocks(stage, venue).find((x) => x.id === r.blockId);
  const seat = r && b ? blockSeats(b).find((s) => s.row === r.row && s.seat === r.seat) : undefined;
  if (!seat) return { eye: { x: 0, y: HOUSE_FLOOR + EYE + 1, z: 8 }, target };
  return { eye: { x: seat.x, y: seat.y + EYE, z: seat.z }, target };
}

export function venueBox(stage: Stage, venue: Venue): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
  const seats = seatLayout(stage, venue);
  const xs = seats.map((s) => s.x);
  const zs = seats.map((s) => s.z);
  const top = Math.max(HOUSE_FLOOR, ...seats.map((s) => s.y)) - HOUSE_FLOOR + 3;
  const m = 2;
  return {
    minX: Math.min(-stage.width / 2 - 2, ...xs) - m,
    maxX: Math.max(stage.width / 2 + 2, ...xs) + m,
    minZ: Math.min(-stage.depth - 1, ...zs) - m,
    maxZ: Math.max(5, ...zs) + m,
    height: Math.max(stage.height + 4, top),
  };
}
