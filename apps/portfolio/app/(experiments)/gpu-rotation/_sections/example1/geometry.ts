// Scene → WebGL용 타입 배열 변환.
// 블록/도로는 삼각형 메시로, 마커는 포인트로, 라벨은 하나의 텍스처 시트 + 빌보드 쿼드로 만든다.

import type { Block, Road, Scene } from "./scene";

export type Geometry = {
  // 삼각형 (블록 + 도로 쿼드): 정점당 x,y / r,g,b,a
  triPositions: Float32Array;
  triColors: Float32Array;
  triVertexCount: number;
  // 마커 포인트: 정점당 x,y / r,g,b,a
  markerPositions: Float32Array;
  markerColors: Float32Array;
  markerCount: number;
  // 라벨: 텍스처 시트 한 장 + 마커별 빌보드 쿼드
  labelCanvas: HTMLCanvasElement;
  // 쿼드 정점당: markerX, markerY (월드) / cornerX, cornerY (px, 미회전) / u, v
  labelPositions: Float32Array; // markerX, markerY
  labelCorners: Float32Array; // cornerX, cornerY (px)
  labelUVs: Float32Array;
  labelVertexCount: number;
};

function pushRect(
  positions: number[],
  colors: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  color: Block["color"],
) {
  const x2 = x + w;
  const y2 = y + h;
  // 2 삼각형
  const corners = [
    [x, y],
    [x2, y],
    [x2, y2],
    [x, y],
    [x2, y2],
    [x, y2],
  ];
  for (const [cx, cy] of corners) {
    positions.push(cx, cy);
    colors.push(color[0], color[1], color[2], color[3]);
  }
}

function pushRoad(positions: number[], colors: number[], road: Road) {
  const dx = road.x2 - road.x1;
  const dy = road.y2 - road.y1;
  const len = Math.hypot(dx, dy) || 1;
  // 선분에 수직인 법선 * 반폭
  const nx = (-dy / len) * (road.width / 2);
  const ny = (dx / len) * (road.width / 2);
  const a = [road.x1 + nx, road.y1 + ny];
  const b = [road.x1 - nx, road.y1 - ny];
  const c = [road.x2 - nx, road.y2 - ny];
  const d = [road.x2 + nx, road.y2 + ny];
  const corners = [a, b, c, a, c, d];
  for (const [cx, cy] of corners) {
    positions.push(cx, cy);
    colors.push(road.color[0], road.color[1], road.color[2], road.color[3]);
  }
}

const LABEL_FONT = "600 13px ui-sans-serif, system-ui, sans-serif";
const LABEL_PAD_X = 8;
const LABEL_GAP = 4; // 시트 내 라벨 간 여백

export function buildGeometry(scene: Scene, dpr: number): Geometry {
  // ── 삼각형 메시 ──
  const triPos: number[] = [];
  const triCol: number[] = [];
  for (const block of scene.blocks) {
    pushRect(triPos, triCol, block.x, block.y, block.w, block.h, block.color);
  }
  for (const road of scene.roads) {
    pushRoad(triPos, triCol, road);
  }

  // ── 마커 포인트 ──
  const mPos: number[] = [];
  const mCol: number[] = [];
  for (const m of scene.markers) {
    mPos.push(m.x, m.y);
    mCol.push(m.color[0], m.color[1], m.color[2], m.color[3]);
  }

  // ── 라벨 텍스처 시트 ──
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = LABEL_FONT;
  const LABEL_H = 24;
  const metrics = scene.markers.map((m) => {
    const w = Math.ceil(ctx.measureText(m.label).width) + LABEL_PAD_X * 2;
    return { label: m.label, w, h: LABEL_H };
  });
  const sheetW = Math.max(1, ...metrics.map((m) => m.w));
  const sheetH = metrics.reduce((s, m) => s + m.h + LABEL_GAP, 0);
  canvas.width = sheetW * dpr;
  canvas.height = sheetH * dpr;
  ctx.scale(dpr, dpr);
  ctx.font = LABEL_FONT;
  ctx.textBaseline = "middle";

  const labelPos: number[] = [];
  const labelCorner: number[] = [];
  const labelUV: number[] = [];

  let cursorY = 0;
  scene.markers.forEach((m, i) => {
    const { w, h } = metrics[i];
    const y0 = cursorY;
    // 핀 색 배경 알약
    ctx.fillStyle = "rgba(20,22,28,0.92)";
    roundRect(ctx, 1, y0 + 1, w - 2, h - 2, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(${m.color[0] * 255},${m.color[1] * 255},${m.color[2] * 255},0.9)`;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 1, y0 + 1, w - 2, h - 2, 6);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(m.label, LABEL_PAD_X, y0 + h / 2 + 0.5);

    // UV (0~1) — y는 위에서 아래
    const u0 = 0;
    const u1 = w / sheetW;
    const v0 = y0 / sheetH;
    const v1 = (y0 + h) / sheetH;

    // 빌보드 쿼드: 마커 위쪽에 표시되도록 corner 오프셋(px). y는 아래 방향이므로 음수가 위.
    const offY = -26; // 마커 위로 띄움
    const hw = w / 2;
    const x0 = -hw;
    const x1 = hw;
    const ya = offY - h;
    const yb = offY;

    // 마커 월드 좌표는 모든 정점에 동일
    const quad = [
      [x0, ya, u0, v0],
      [x1, ya, u1, v0],
      [x1, yb, u1, v1],
      [x0, ya, u0, v0],
      [x1, yb, u1, v1],
      [x0, yb, u0, v1],
    ];
    for (const [cx, cy, u, v] of quad) {
      labelPos.push(m.x, m.y);
      labelCorner.push(cx, cy);
      labelUV.push(u, v);
    }
    cursorY += h + LABEL_GAP;
  });

  return {
    triPositions: new Float32Array(triPos),
    triColors: new Float32Array(triCol),
    triVertexCount: triPos.length / 2,
    markerPositions: new Float32Array(mPos),
    markerColors: new Float32Array(mCol),
    markerCount: mPos.length / 2,
    labelCanvas: canvas,
    labelPositions: new Float32Array(labelPos),
    labelCorners: new Float32Array(labelCorner),
    labelUVs: new Float32Array(labelUV),
    labelVertexCount: labelPos.length / 2,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
