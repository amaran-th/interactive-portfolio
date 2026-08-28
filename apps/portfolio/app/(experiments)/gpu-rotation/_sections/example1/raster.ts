// 래스터 경로: 씬을 heading 0으로 한 번 "타일 비트맵"처럼 굽고(bake),
// 매 프레임 그 비트맵을 CPU에서 회전시켜 그린다(ctx.rotate + drawImage).
// → 픽셀 리샘플링으로 흐려지고, 라벨도 비트맵째 회전해 뒤집힌다.
//   이것이 구글맵 래스터 모드가 heading/tilt를 아예 제공하지 않는 이유다.

import { SCENE_HALF, type Scene } from "./scene";

export type Baked = {
  canvas: HTMLCanvasElement;
  sideLogical: number; // CSS px 기준 한 변
  scale: number;
};

// sideLogical: 베이크 비트맵 한 변(회전해도 빈 곳이 없도록 뷰포트 대각선보다 크게)
export function bakeScene(scene: Scene, dpr: number, sideLogical: number, scale: number): Baked {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sideLogical * dpr);
  canvas.height = Math.round(sideLogical * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.translate(sideLogical / 2, sideLogical / 2);
  ctx.scale(scale, scale);

  // 배경
  ctx.fillStyle = rgba(scene.background);
  ctx.fillRect(-SCENE_HALF, -SCENE_HALF, SCENE_HALF * 2, SCENE_HALF * 2);

  // 블록
  for (const b of scene.blocks) {
    ctx.fillStyle = rgba(b.color);
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // 도로
  for (const r of scene.roads) {
    ctx.strokeStyle = rgba(r.color);
    ctx.lineWidth = r.width;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
    ctx.stroke();
  }

  // 마커 + 라벨 (heading 0 기준으로 구워짐 → 회전 시 같이 기울어진다)
  ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const m of scene.markers) {
    // 핀
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = rgba(m.color);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // 라벨 알약
    const w = Math.ceil(ctx.measureText(m.label).width) + 16;
    const lx = m.x - w / 2;
    const ly = m.y - 26 - 24;
    pill(ctx, lx, ly, w, 24, 6);
    ctx.fillStyle = "rgba(20,22,28,0.92)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${m.color[0] * 255},${m.color[1] * 255},${m.color[2] * 255},0.9)`;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(m.label, lx + 8, ly + 12.5);
  }

  return { canvas, sideLogical, scale };
}

// 매 프레임 호출: 베이크 비트맵을 heading만큼 회전해 그린다. 반환값은 CPU 소요 ms.
export function drawRaster(
  ctx: CanvasRenderingContext2D,
  baked: Baked,
  headingRad: number,
  logicalW: number,
  logicalH: number,
  dpr: number,
): number {
  const t0 = performance.now();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 논리 좌표로 작업
  ctx.clearRect(0, 0, logicalW, logicalH);
  ctx.save();
  ctx.translate(logicalW / 2, logicalH / 2);
  ctx.rotate(headingRad);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    baked.canvas,
    -baked.sideLogical / 2,
    -baked.sideLogical / 2,
    baked.sideLogical,
    baked.sideLogical,
  );
  ctx.restore();
  return performance.now() - t0;
}

function rgba(c: [number, number, number, number]) {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${c[3]})`;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
