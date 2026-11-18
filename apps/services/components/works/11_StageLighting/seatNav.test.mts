import { test } from "node:test";
import assert from "node:assert/strict";
import { audienceMember, stepSeat, venueBlocks } from "./venue.ts";
import { defaultShow, defaultTemplate } from "./show.ts";
import type { Stage, Venue } from "./show.ts";

const show = defaultShow();
const st: Stage = show.stage;
const hall: Venue = { template: defaultTemplate(st.shape) };
const blocks = venueBlocks(st, hall);
const center = blocks.find((b) => b.name === "가운데")!;

test("오른쪽·왼쪽은 무대를 보는 관객 기준 옆자리(번호는 객석에서 봐서 왼쪽부터)", () => {
  const ref = { blockId: center.id, row: 3, seat: 4 };
  assert.deepEqual(stepSeat(st, hall, ref, "right"), { blockId: center.id, row: 3, seat: 5 });
  assert.deepEqual(stepSeat(st, hall, ref, "left"), { blockId: center.id, row: 3, seat: 3 });
});

test("앞·뒤는 무대 쪽·뒤쪽 줄", () => {
  const ref = { blockId: center.id, row: 3, seat: 4 };
  const front = stepSeat(st, hall, ref, "front");
  const back = stepSeat(st, hall, ref, "back");
  assert.equal(front.blockId, center.id);
  assert.equal(front.row, 2);
  assert.equal(back.row, 4);
  assert.equal(stepSeat(st, hall, { blockId: center.id, row: 1, seat: 4 }, "front").row, 1, "맨 앞줄에서 앞으로는 그대로");
});

test("줄 끝에서 옆으로 가면 통로 건너 옆 구역으로, 더 없으면 그대로", () => {
  const ref = { blockId: center.id, row: 2, seat: 1 };
  const next = stepSeat(st, hall, ref, "left");
  assert.notEqual(next.blockId, center.id);
  // 왼쪽 끝 구역의 맨 왼쪽 자리에서 왼쪽은 그대로
  let r = ref;
  for (let i = 0; i < 60; i++) r = stepSeat(st, hall, r, "left");
  assert.deepEqual(stepSeat(st, hall, r, "left"), r);
});

test("관객 모습은 좌석 번호로 정해져 매번 같고, 성별·옷 색이 섞인다", () => {
  assert.deepEqual(audienceMember(17), audienceMember(17));
  const many = Array.from({ length: 200 }, (_, i) => audienceMember(i));
  assert.ok(many.some((m) => m.gender === "female") && many.some((m) => m.gender === "male"));
  assert.ok(new Set(many.map((m) => m.topColor)).size >= 5);
  assert.ok(many.every((m) => m.height >= 1.5 && m.height <= 1.9));
});
