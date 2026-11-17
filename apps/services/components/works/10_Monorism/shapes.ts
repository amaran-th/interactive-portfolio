// 칩 윤곽. 칩 지름이 1인 layout 좌표계(칸 간격 1, 벌집 배치)에서 칩 하나의 테두리 점을 만든다.
// 어떤 모양이든 이웃 칩과 겹치지 않고, 뒤집기(x축 회전)에도 같은 모양이 되도록 위아래 대칭이다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다(타입만 가져온다).
import type { ChipShape } from "./board";

export type OutlinePoint = { x: number; y: number };

// 원 칩 반지름. 이웃 칩과 0.08만큼 틈이 생긴다.
export const CHIP_RADIUS = 0.46;
// 꼭짓점에서 이만큼 떨어진 곳부터 모서리를 둥글린다
const CORNER_CUT = 0.07;
const CORNER_SEGMENTS = 6;
const CIRCLE_SEGMENTS = 48;
const SQRT3 = Math.sqrt(3);

// 둥글리기 전 꼭짓점(반시계 방향). 원은 따로 만든다.
function corners(shape: Exclude<ChipShape, "circle">): OutlinePoint[] {
  if (shape === "square") {
    // 줄 간격(√3/2) 안에서 위아래 이웃과 틈이 남는 크기
    const a = 0.4;
    return [
      { x: a, y: a },
      { x: -a, y: a },
      { x: -a, y: -a },
      { x: a, y: -a },
    ];
  }
  if (shape === "diamond") {
    // 가로:세로 대각선 ≈ 1:1.48. 벌집을 빈틈없이 덮는 1:√3 마름모보다 덜 길쭉해서
    // 좌우 꼭짓점 사이는 원과 같은 0.08, 비스듬한 이웃과 마주 보는 변 사이는 약 0.14 벌어진다.
    const a = 0.46;
    const b = 0.68;
    return [
      { x: a, y: 0 },
      { x: 0, y: b },
      { x: -a, y: 0 },
      { x: 0, y: -b },
    ];
  }
  // 꼭짓점이 위아래로 오는 육각형. 마주 보는 변 사이 거리가 원 지름과 같다.
  const r = (CHIP_RADIUS * 2) / SQRT3;
  return Array.from({ length: 6 }, (_, i) => {
    const t = Math.PI / 2 + (i * Math.PI) / 3;
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });
}

// 꼭짓점마다 양옆 변 위의 두 점을 잇는 2차 베지어로 모서리를 살짝 둥글린다.
function rounded(pts: OutlinePoint[]): OutlinePoint[] {
  const out: OutlinePoint[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const toward = (q: OutlinePoint) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      const t = Math.min(CORNER_CUT, d / 2) / d;
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    };
    const a = toward(pts[(i + n - 1) % n]);
    const b = toward(pts[(i + 1) % n]);
    for (let s = 0; s <= CORNER_SEGMENTS; s++) {
      const t = s / CORNER_SEGMENTS;
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * p.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * p.y + t * t * b.y,
      });
    }
  }
  return out;
}

export function chipOutline(shape: ChipShape): OutlinePoint[] {
  if (shape === "circle") {
    return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
      const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      return { x: CHIP_RADIUS * Math.cos(t), y: CHIP_RADIUS * Math.sin(t) };
    });
  }
  return rounded(corners(shape));
}

// 버튼 아이콘용 SVG path. viewBox는 -0.5 -0.5 1 1.
export function chipOutlinePath(shape: ChipShape): string {
  const pts = chipOutline(shape);
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`).join("") + "Z";
}
