// 모노리즘 칩 배치 계산. 칩 지름이 1인 좌표계에서 판 중심을 원점으로 둔다.
// x는 오른쪽, y는 줄이 늘어나는 방향(3D에서는 화면 아래쪽, +Z).
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type Point = { x: number; y: number };
export type Cell = { col: number; row: number };

// 홀수 줄을 반 칸 밀면 칩이 벌집처럼 맞물리는 줄 간격
export const ROW_GAP = Math.sqrt(3) / 2;
// 드래그 경로 보간 간격(칩 지름의 1/3) — 빠르게 그어도 칩을 건너뛰지 않는다
export const PATH_STEP = 1 / 3;
// 벌집 배치에서 판 안의 어떤 점도 가장 가까운 칩 중심과 이 거리(1/√3) 안에 있다.
// 이보다 멀면 판 밖으로 본다.
const MAX_DIST_SQ = 1 / 3 + 1e-9;

export function boardSize(w: number, h: number): { width: number; height: number } {
  return { width: w + 0.5, height: (h - 1) * ROW_GAP + 1 };
}

export function cellCenter(col: number, row: number, w: number, h: number): Point {
  const { width, height } = boardSize(w, h);
  return {
    x: col + (row % 2) * 0.5 + 0.5 - width / 2,
    y: row * ROW_GAP + 0.5 - height / 2,
  };
}

// 점에서 가장 가까운 칩 칸. 위아래 두 줄 × 좌우 세 칸만 비교한다.
export function cellAt(p: Point, w: number, h: number): Cell | null {
  const { width, height } = boardSize(w, h);
  const r0 = Math.floor((p.y + height / 2 - 0.5) / ROW_GAP);
  let best: Cell | null = null;
  let bestD = Infinity;
  for (const row of [r0, r0 + 1]) {
    if (row < 0 || row >= h) continue;
    // Math.round(-0.4)는 -0이라, || 0으로 칸 번호를 0으로 맞춘다
    const col0 = Math.round(p.x + width / 2 - 0.5 - (row % 2) * 0.5) || 0;
    for (const col of [col0 - 1, col0, col0 + 1]) {
      if (col < 0 || col >= w) continue;
      const c = cellCenter(col, row, w, h);
      const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { col, row };
      }
    }
  }
  return bestD <= MAX_DIST_SQ ? best : null;
}

// a에서 b까지 step 간격으로 나눈 점들(a는 이미 처리했으므로 빼고, b는 넣는다).
export function interpolate(a: Point, b: Point, step = PATH_STEP): Point[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
  const out: Point[] = [];
  for (let i = 1; i <= n; i++) {
    out.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  }
  return out;
}

// 판에서 판 한 변 길이 이상 떨어진 점은 버린다. 시점이 기울어 있어 지평선 근처를
// 가리키면 교점이 아주 멀리 생기는데, 그 사이를 보간하면 점이 수백만 개가 된다.
export function nearBoard(p: Point, w: number, h: number): boolean {
  const { width, height } = boardSize(w, h);
  const margin = Math.max(width, height);
  return Math.abs(p.x) <= width / 2 + margin && Math.abs(p.y) <= height / 2 + margin;
}
