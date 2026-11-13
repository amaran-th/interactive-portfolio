import { test } from "node:test";
import assert from "node:assert/strict";
import { blockSeats, clampSeat, defaultSeat, riserBoxes, seatLabel, seatLayout, seatView, venueBox } from "./venue.ts";
import { defaultBlocks, defaultShow, updateBlock, updateStage, addBlock, removeBlock, LIMITS } from "./show.ts";
import type { SeatBlock, Stage } from "./show.ts";

const stage = (shape: string): Stage => ({ shape, width: 10, depth: 8, height: 6, floorColor: "#000000", backdropColor: "#000000" }) as Stage;
const B: SeatBlock = { id: "b", name: "가운데", x: 0, z: 2, rotationY: 0, rows: 4, seatsPerRow: 6, rake: 0.25, curve: 0 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

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

test("기본 객석: 프로시니엄 3블록, 돌출 3블록, 원형 4블록이 무대 가운데를 둘러싼다", () => {
  assert.equal(defaultBlocks(stage("proscenium")).length, 3);
  assert.equal(defaultBlocks(stage("thrust")).length, 3);
  const round = defaultBlocks(stage("round"));
  assert.equal(round.length, 4);
  // 원형: 첫 줄 좌석이 모두 무대 중심(0, -4)에서 같은 거리
  const first = round.flatMap((b) => blockSeats(b).filter((s) => s.row === 1));
  const ds = first.map((s) => Math.hypot(s.x, s.z + 4));
  assert.ok(Math.max(...ds) - Math.min(...ds) < 0.02); // curve를 0.1° 단위로 반올림한 만큼의 오차
  // 모든 기본 좌석은 무대 밖(프로시니엄: z > 0)
  for (const s of seatLayout({ blocks: defaultBlocks(stage("proscenium")) })) assert.ok(s.z > 0);
});

test("무대 형태를 바꾸면 그 형태의 기본 객석으로", () => {
  const s = updateStage(defaultShow(), { shape: "round" });
  assert.equal(s.venue.blocks.length, 4);
  const w = updateStage(s, { width: 12 });
  assert.equal(w.venue, s.venue);
});

test("블록 추가·수정·삭제와 범위", () => {
  let s = defaultShow();
  for (let i = 0; i < 20; i++) s = addBlock(s);
  assert.equal(s.venue.blocks.length, LIMITS.blocks);
  const id = s.venue.blocks[0].id;
  s = updateBlock(s, id, { rows: 99, seatsPerRow: 0, rake: 3, curve: -5, rotationY: 7 });
  const b = s.venue.blocks[0];
  assert.deepEqual([b.rows, b.seatsPerRow, b.rake, b.curve], [20, 1, 0.5, 0]);
  assert.ok(b.rotationY > -Math.PI && b.rotationY <= Math.PI);
  s = removeBlock(s, id);
  assert.equal(s.venue.blocks.some((x) => x.id === id), false);
});

test("좌석 고르기: 기본 좌석, 범위 밖은 끝으로, 없는 블록은 기본으로, 블록이 없으면 null", () => {
  const venue = { blocks: [B] };
  assert.deepEqual(defaultSeat(venue), { blockId: "b", row: 4, seat: 3 });
  assert.deepEqual(clampSeat(venue, { blockId: "b", row: 9, seat: 0 }), { blockId: "b", row: 4, seat: 1 });
  assert.deepEqual(clampSeat(venue, { blockId: "x", row: 1, seat: 1 }), defaultSeat(venue));
  assert.equal(clampSeat({ blocks: [] }, { blockId: "b", row: 1, seat: 1 }), null);
  assert.equal(seatLabel(venue, { blockId: "b", row: 2, seat: 5 }), "가운데 2열 5번");
});

test("seatView: 눈높이는 좌석 위, 무대 가운데를 본다", () => {
  const st = stage("proscenium");
  const venue = { blocks: [B] };
  const a = seatView(st, venue, { blockId: "b", row: 1, seat: 3 });
  const b = seatView(st, venue, { blockId: "b", row: 4, seat: 3 });
  assert.ok(b.eye.y > a.eye.y && b.eye.z > a.eye.z);
  assert.deepEqual(a.target, { x: 0, y: 1, z: -4 });
  const none = seatView(st, { blocks: [] }, null);
  assert.ok(none.eye.z > 0);
});

test("riserBoxes·venueBox", () => {
  const st = stage("proscenium");
  const venue = { blocks: defaultBlocks(st) };
  assert.ok(riserBoxes(venue).every((b) => b.h > 0));
  const box = venueBox(st, venue);
  assert.ok(box.maxZ > Math.max(...seatLayout(venue).map((x) => x.z)));
  assert.equal(box.height, 10);
  assert.ok(venueBox(st, { blocks: [] }).maxZ >= 5);
});
