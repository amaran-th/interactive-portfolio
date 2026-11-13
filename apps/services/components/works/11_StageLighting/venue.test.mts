import { test } from "node:test";
import assert from "node:assert/strict";
import { seatLayout, seatView, riserBoxes, venueBox } from "./venue.ts";

const stage = (shape: string) => ({ shape, width: 10, depth: 8, height: 6, floorColor: "#000000", backdropColor: "#000000" }) as never;

test("프로시니엄: 줄 수·높이·앞쪽", () => {
  const seats = seatLayout(stage("proscenium"), 10);
  assert.equal(new Set(seats.map((s) => s.row)).size, 10);
  const last = seats.filter((s) => s.row === 9);
  assert.ok(Math.abs(last[0].y - 1.65) < 1e-9);
  assert.ok(seats.every((s) => s.z > 0 && s.side === "front"));
});

test("돌출: 양옆 좌석", () => {
  const sides = new Set(seatLayout(stage("thrust"), 6).map((s) => s.side));
  assert.ok(sides.has("left") && sides.has("right") && sides.has("front"));
});

test("원형: 뒤쪽 좌석", () => {
  assert.ok(seatLayout(stage("round"), 6).some((s) => s.side === "back"));
});

test("seatView: 가운데는 x 0, 뒷줄이 더 높다", () => {
  const a = seatView(stage("proscenium"), 10, 1, "center");
  const b = seatView(stage("proscenium"), 10, 10, "center");
  assert.equal(a.eye.x, 0);
  assert.ok(b.eye.y > a.eye.y && b.eye.z > a.eye.z);
  assert.ok(seatView(stage("proscenium"), 10, 1, "left").eye.x < 0);
});

test("riserBoxes·venueBox", () => {
  const s = stage("proscenium");
  assert.ok(riserBoxes(s, 10).every((b) => b.h > 0));
  const box = venueBox(s, 10);
  assert.ok(box.maxZ > Math.max(...seatLayout(s, 10).map((x) => x.z)));
  assert.equal(box.height, 10);
});
