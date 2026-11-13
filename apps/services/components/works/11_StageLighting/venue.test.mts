import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_FLOOR,
  blockSeats,
  clampSeat,
  defaultSeat,
  riserBoxes,
  rowSeats,
  seatLabel,
  seatLayout,
  seatView,
  templateBlocks,
  venueBox,
} from "./venue.ts";
import { defaultShow, defaultTemplate, updateStage, updateTemplate } from "./show.ts";
import type { SeatBlock, Stage, Venue, VenueTemplate } from "./show.ts";

const stage = (shape: string, width = 10, depth = 8): Stage =>
  ({ shape, width, depth, height: 6, floorColor: "#000000", backdropColor: "#000000" }) as Stage;
const B: SeatBlock = { id: "b", name: "가운데", x: 0, z: 2, rotationY: 0, rows: 4, seatsPerRow: 6, rake: 0.25, curve: 0, widen: 0, elevation: 0 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const venueOf = (st: Stage, patch: Partial<VenueTemplate> = {}): Venue => ({ template: { ...defaultTemplate(st.shape), ...patch } });

test("곧은 블록: 줄·좌석 수, 번호는 객석에서 봐서 왼쪽부터, 뒷줄이 더 높고 멀다", () => {
  const seats = blockSeats(B);
  assert.equal(seats.length, 24);
  const row1 = seats.filter((s) => s.row === 1);
  assert.equal(row1.length, 6);
  assert.ok(row1.every((s) => near(s.z, 2)));
  const s1 = row1.find((s) => s.seat === 1)!;
  const s6 = row1.find((s) => s.seat === 6)!;
  assert.ok(s1.x < s6.x);
  const back = seats.find((s) => s.row === 4 && s.seat === 1)!;
  assert.ok(back.z > s1.z && back.y > s1.y);
  assert.ok(near(back.y - s1.y, 0.75));
  assert.ok(near(s1.rotationY, Math.PI));
});

test("돌린 블록: -90°면 +x를 보고 좌석이 z로 늘어선다", () => {
  const seats = blockSeats({ ...B, x: -6, z: -2, rotationY: -Math.PI / 2 });
  const row1 = seats.filter((s) => s.row === 1);
  assert.ok(row1.every((s) => near(s.x, -6)));
  const back = seats.filter((s) => s.row === 4);
  assert.ok(back.every((s) => s.x < -6));
});

test("휜 블록: 같은 줄 좌석은 한 점에서 같은 거리", () => {
  const b = { ...B, seatsPerRow: 10, curve: 60 };
  const r0 = (10 * 0.55) / ((60 * Math.PI) / 180);
  const cz = b.z - r0;
  for (const s of blockSeats(b).filter((s) => s.row === 2)) assert.ok(near(Math.hypot(s.x, s.z - cz), r0 + 0.9));
});

test("뒷줄로 갈수록 좌석이 늘고(widen), 발코니는 elevation만큼 높다", () => {
  const b = { ...B, widen: 0.5, elevation: 3 };
  assert.deepEqual([1, 2, 3, 4].map((r) => rowSeats(b, r)), [6, 6, 7, 7]);
  const seats = blockSeats(b);
  assert.equal(seats.length, 26);
  assert.ok(near(seats[0].y, HOUSE_FLOOR + 3));
  // 늘어난 줄도 가운데 정렬
  const row3 = seats.filter((s) => s.row === 3).map((s) => s.x);
  assert.ok(near(Math.min(...row3), -Math.max(...row3)));
});

test("템플릿 종류별 블록 수", () => {
  const p = stage("proscenium");
  const kinds = (k: VenueTemplate["kind"]) => templateBlocks(p, { ...defaultTemplate("proscenium"), kind: k }).length;
  assert.equal(kinds("studio"), 1);
  assert.equal(kinds("hall"), 3);
  assert.equal(kinds("grand"), 4);
  assert.equal(templateBlocks(stage("thrust"), defaultTemplate("thrust")).length, 3);
  assert.equal(templateBlocks(stage("round"), defaultTemplate("round")).length, 4);
});

/** 좌석이 무대 안에 있는가(여유 0.3m). */
function onStage(st: Stage, x: number, z: number): boolean {
  const m = 0.3;
  if (st.shape === "round") return Math.hypot(x, z + st.depth / 2) < Math.min(st.width, st.depth) / 2 + m;
  const main = Math.abs(x) < st.width / 2 + m && z > -st.depth - m && z < m;
  const thrust = st.shape === "thrust" && Math.abs(x) < st.width / 4 + m && z < st.depth * 0.4 + m && z > -m;
  return main || thrust;
}

function assertClean(st: Stage, tpl: VenueTemplate, label: string) {
  const blocks = templateBlocks(st, tpl);
  const seats = blocks.flatMap(blockSeats);
  assert.ok(seats.length > 0, label);
  for (const s of seats) assert.ok(!onStage(st, s.x, s.z), `${label}: 무대 위 좌석 ${s.blockId} ${s.row}-${s.seat}`);
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i];
      const b = seats[j];
      if (a.blockId === b.blockId || Math.abs(a.y - b.y) > 2) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      assert.ok(d >= 0.5, `${label}: ${a.blockId}${a.row}-${a.seat} ↔ ${b.blockId}${b.row}-${b.seat} ${d.toFixed(2)}m`);
    }
  }
}

test("템플릿 블록끼리·무대와 겹치지 않는다(수치 범위 끝값 포함)", () => {
  const ends: Partial<VenueTemplate>[] = [
    {},
    { rows: 4, width: 6, aisle: 1, rake: 0.1, gap: 1, widen: 0, balconyRows: 3 },
    { rows: 25, width: 30, aisle: 1, rake: 0.5, gap: 1, widen: 1, balconyRows: 10 },
    { rows: 25, width: 6, aisle: 2, rake: 0.5, gap: 4, widen: 1, balconyRows: 10 },
    { rows: 4, width: 30, aisle: 2, rake: 0.1, gap: 4, widen: 0, balconyRows: 3 },
  ];
  const stages = [stage("proscenium"), stage("proscenium", 20, 12), stage("proscenium", 4, 3), stage("thrust"), stage("thrust", 20, 12), stage("thrust", 4, 3), stage("round"), stage("round", 20, 12), stage("round", 4, 3)];
  for (const st of stages) {
    for (const kind of st.shape === "proscenium" ? (["studio", "hall", "grand"] as const) : [defaultTemplate(st.shape).kind]) {
      for (const e of ends) assertClean(st, { ...defaultTemplate(st.shape), kind, ...e }, `${st.shape} ${st.width}x${st.depth} ${kind} ${JSON.stringify(e)}`);
    }
  }
});

test("중극장: 양옆 블록은 가운데를 향해 15° 돌고 통로만큼 떨어진다", () => {
  const [center, left, right] = templateBlocks(stage("proscenium"), defaultTemplate("proscenium"));
  assert.equal(center.rotationY, 0);
  assert.ok(near(left.rotationY, (-15 * Math.PI) / 180));
  assert.ok(near(right.rotationY, (15 * Math.PI) / 180));
  assert.ok(left.x < 0 && right.x > 0 && near(left.x, -right.x));
  // 앞줄: 가운데 블록 끝 좌석과 옆 블록 안쪽 좌석 사이가 통로 폭 이상
  const c1 = blockSeats(center).filter((s) => s.row === 1);
  const l1 = blockSeats(left).filter((s) => s.row === 1);
  const gap = Math.min(...c1.map((s) => s.x)) - Math.max(...l1.map((s) => s.x));
  assert.ok(gap >= 1.2 + 0.55 - 1e-6, `gap ${gap}`);
});

test("대극장 발코니: 1층 마지막 줄 + 3m 높이, 1층 뒤쪽 위에 겹친다", () => {
  const tpl = { ...defaultTemplate("proscenium"), kind: "grand" as const };
  const blocks = templateBlocks(stage("proscenium"), tpl);
  const center = blocks.find((b) => b.id === "b-center")!;
  const balcony = blocks.find((b) => b.id === "b-balcony")!;
  assert.ok(near(balcony.elevation, (tpl.rows - 1) * tpl.rake + 3));
  assert.equal(balcony.rows, tpl.balconyRows);
  const lastZ = center.z + (center.rows - 1) * 0.9;
  assert.ok(near(balcony.z, lastZ - 2));
  // 발코니 받침은 객석 바닥까지 내려오지 않는다(1층 좌석을 덮지 않음)
  const bal = riserBoxes(stage("proscenium"), { template: tpl }).filter((r) => r.base > HOUSE_FLOOR + 1);
  assert.ok(bal.length > 0);
});

test("원형: 첫 줄 좌석이 모두 무대 중심에서 같은 거리", () => {
  const st = stage("round");
  const first = templateBlocks(st, defaultTemplate("round")).flatMap((b) => blockSeats(b).filter((s) => s.row === 1));
  const ds = first.map((s) => Math.hypot(s.x, s.z + 4));
  assert.ok(Math.max(...ds) - Math.min(...ds) < 0.02);
});

test("무대 형태를 바꾸면 맞지 않는 템플릿만 기본으로", () => {
  const s = updateStage(defaultShow(), { shape: "round" });
  assert.equal(s.venue.template.kind, "arena");
  const w = updateStage(s, { width: 12 });
  assert.equal(w.venue, s.venue);
  const g = updateTemplate(defaultShow(), { kind: "grand" });
  assert.equal(updateStage(g, { width: 14 }).venue.template.kind, "grand");
});

test("좌석 고르기: 기본 좌석, 범위 밖은 끝으로(늘어난 줄 기준), 없는 블록은 기본으로", () => {
  const st = stage("proscenium");
  const venue = venueOf(st, { kind: "studio", rows: 4, width: 6, widen: 0.5 });
  assert.deepEqual(defaultSeat(st, venue), { blockId: "b-center", row: 4, seat: 4 });
  assert.deepEqual(clampSeat(st, venue, { blockId: "b-center", row: 9, seat: 99 }), { blockId: "b-center", row: 4, seat: 7 });
  assert.deepEqual(clampSeat(st, venue, { blockId: "b-center", row: 1, seat: 99 }), { blockId: "b-center", row: 1, seat: 6 });
  assert.deepEqual(clampSeat(st, venue, { blockId: "x", row: 1, seat: 1 }), defaultSeat(st, venue));
  assert.equal(seatLabel(st, venue, { blockId: "b-center", row: 2, seat: 5 }), "가운데 2열 5번");
});

test("seatView: 눈높이는 좌석 위, 무대 가운데를 본다", () => {
  const st = stage("proscenium");
  const venue = venueOf(st);
  const a = seatView(st, venue, { blockId: "b-center", row: 1, seat: 3 });
  const b = seatView(st, venue, { blockId: "b-center", row: 4, seat: 3 });
  assert.ok(b.eye.y > a.eye.y && b.eye.z > a.eye.z);
  assert.deepEqual(a.target, { x: 0, y: 1, z: -4 });
});

test("riserBoxes·venueBox", () => {
  const st = stage("proscenium");
  const venue = venueOf(st, { kind: "grand" });
  assert.ok(riserBoxes(st, venue).every((b) => b.h > 0));
  const box = venueBox(st, venue);
  const seats = seatLayout(st, venue);
  assert.ok(box.maxZ > Math.max(...seats.map((x) => x.z)));
  // 발코니가 있으면 천장이 발코니 좌석 위 3m 이상
  assert.ok(box.height >= Math.max(...seats.map((s) => s.y)) - HOUSE_FLOOR + 3 - 1e-9);
  assert.equal(venueBox(st, venueOf(st, { kind: "studio" })).height, 10);
});
