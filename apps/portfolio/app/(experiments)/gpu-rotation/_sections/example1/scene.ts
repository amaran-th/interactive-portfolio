// 절차적으로 생성하는 미니 "다크 맵" 씬.
// 좌표는 월드 단위(= scale 1일 때 px). 원점은 화면 중앙, y는 아래 방향(스크린과 동일).
// 회전 시 뷰포트가 항상 채워지도록 뷰포트보다 넉넉히 큰 영역을 덮는다.

export const SCENE_HALF = 600; // 씬은 [-600, 600] 영역을 덮는다.

export type RGBA = [number, number, number, number];

export type Road = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: RGBA;
};

export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: RGBA;
};

export type Marker = {
  x: number;
  y: number;
  color: RGBA;
  label: string;
};

export type Scene = {
  background: RGBA;
  blocks: Block[];
  roads: Road[];
  markers: Marker[];
};

// 결정적 PRNG (mulberry32) — 새로고침해도 같은 맵이 나오도록.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK_COLORS: RGBA[] = [
  [0.16, 0.18, 0.22, 1], // 건물 블록 (차가운 회색)
  [0.18, 0.2, 0.24, 1],
  [0.14, 0.17, 0.2, 1],
  [0.15, 0.21, 0.18, 1], // 공원 (녹색 톤)
];

const WATER: RGBA = [0.1, 0.16, 0.26, 1];

export function generateScene(seed = 7): Scene {
  const rand = mulberry32(seed);
  const blocks: Block[] = [];
  const roads: Road[] = [];
  const markers: Marker[] = [];

  const GRID = 150; // 격자 간격
  const start = -SCENE_HALF;
  const end = SCENE_HALF;

  // 강(물) — 대각선 띠
  blocks.push({ x: -SCENE_HALF, y: 120, w: SCENE_HALF * 2, h: 70, color: WATER });

  // 격자 블록: 도로 사이를 채우는 건물/공원
  for (let gx = start; gx < end; gx += GRID) {
    for (let gy = start; gy < end; gy += GRID) {
      // 강 영역은 건너뜀
      if (gy + GRID > 110 && gy < 200) continue;
      const pad = 14 + rand() * 10;
      blocks.push({
        x: gx + pad,
        y: gy + pad,
        w: GRID - pad * 2,
        h: GRID - pad * 2,
        color: BLOCK_COLORS[Math.floor(rand() * BLOCK_COLORS.length)],
      });
    }
  }

  // 격자 도로 (얇은 선 — 래스터 회전 시 블러가 잘 보인다)
  const ROAD: RGBA = [0.55, 0.58, 0.64, 1];
  const ROAD_MINOR: RGBA = [0.34, 0.37, 0.42, 1];
  for (let gx = start; gx <= end; gx += GRID) {
    roads.push({
      x1: gx,
      y1: start,
      x2: gx,
      y2: end,
      width: gx % (GRID * 2) === 0 ? 6 : 3,
      color: gx % (GRID * 2) === 0 ? ROAD : ROAD_MINOR,
    });
  }
  for (let gy = start; gy <= end; gy += GRID) {
    roads.push({
      x1: start,
      y1: gy,
      x2: end,
      y2: gy,
      width: gy % (GRID * 2) === 0 ? 6 : 3,
      color: gy % (GRID * 2) === 0 ? ROAD : ROAD_MINOR,
    });
  }

  // 대각선 간선도로
  const AVENUE: RGBA = [0.62, 0.55, 0.4, 1];
  roads.push({ x1: -SCENE_HALF, y1: -SCENE_HALF, x2: SCENE_HALF, y2: SCENE_HALF, width: 8, color: AVENUE });

  // POI 마커 + 라벨 (중앙 영역에 배치 → 회전해도 화면에 보임)
  const MARKER_DEFS: Omit<Marker, "color">[] = [
    { x: -120, y: -90, label: "Seoul Station" },
    { x: 140, y: -40, label: "City Hall" },
    { x: -30, y: 250, label: "Riverside Park" },
    { x: 210, y: 200, label: "Tech Campus" },
    { x: -200, y: 60, label: "Old Market" },
  ];
  const MARKER_COLORS: RGBA[] = [
    [0.92, 0.3, 0.27, 1],
    [0.27, 0.6, 0.92, 1],
    [0.3, 0.8, 0.5, 1],
    [0.95, 0.65, 0.2, 1],
    [0.7, 0.45, 0.92, 1],
  ];
  MARKER_DEFS.forEach((m, i) => {
    markers.push({ ...m, color: MARKER_COLORS[i % MARKER_COLORS.length] });
  });

  return { background: [0.07, 0.08, 0.1, 1], blocks, roads, markers };
}
