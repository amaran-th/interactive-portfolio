const LAYOUT_KEY = "pixel-art-desktop-layout";
const GRID_STEP = 96;

type Position = { x: number; y: number };

function loadLayout(): Record<string, Position> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLayout(layout: Record<string, Position>) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}

function cellKey(pos: Position): string {
  return `${Math.round((pos.x - 16) / GRID_STEP)},${Math.round((pos.y - 16) / GRID_STEP)}`;
}

// containerWidth를 넘기면 실제 데스크탑 폭에 맞춰 한 줄에 들어갈 열 수를 계산한다
// — 배경화면 비율에 맞춰 데스크탑이 레터박스로 좁아질 수 있는데, 고정 6열 기준으로
// 배치하면 좁아진 실제 폭을 넘어서는 아이콘들이 전부 같은 클램프 위치로 밀려나
// 서로 겹쳐 보이는 문제가 있었다.
export function getIconPosition(id: string, containerWidth?: number): Position {
  const layout = loadLayout();
  if (layout[id]) return layout[id];
  const perRow = containerWidth
    ? Math.max(1, Math.floor(containerWidth / GRID_STEP))
    : 6;
  // 왼쪽 위 첫 칸(col 0, row 0)은 "편집기" 아이콘의 고정 코너 자리와 겹치므로
  // 이미 차지된 칸으로 간주한다. 이미 배치된(특수 아이콘 포함) 자리도 모두
  // 피해서 처음 비는 칸을 행 우선(row-major) 순서로 찾는다.
  const occupied = new Set(Object.values(layout).map(cellKey));
  occupied.add("0,0");
  let col = 0;
  let row = 0;
  while (occupied.has(`${col},${row}`)) {
    col++;
    if (col >= perRow) {
      col = 0;
      row++;
    }
  }
  const pos = { x: col * GRID_STEP + 16, y: row * GRID_STEP + 16 };
  // 여기서 바로 저장해둔다 — 그러지 않으면 다른 아이콘이 추가·삭제되어 목록
  // 순서가 바뀔 때마다 아직 옮긴 적 없는 아이콘의 자리가 매번 다시 계산되어
  // 편집기를 열었다 닫기만 해도 아이콘이 슬쩍 옮겨진 것처럼 보이는 문제가 있었다.
  layout[id] = pos;
  saveLayout(layout);
  return pos;
}

// 휴지통/포맷처럼 그리드 기본값이 아니라 CSS 코너 배치(bottom-4 right-4 등)를
// 기본값으로 쓰는 특수 아이콘용 — 저장된 위치가 없으면 null을 그대로 돌려준다.
export function getStoredPosition(id: string): Position | null {
  return loadLayout()[id] ?? null;
}

export function setIconPosition(id: string, x: number, y: number): void {
  const layout = loadLayout();
  const snappedX = Math.round(x / GRID_STEP) * GRID_STEP;
  const snappedY = Math.round(y / GRID_STEP) * GRID_STEP;
  layout[id] = { x: snappedX, y: snappedY };
  saveLayout(layout);
}

// 여러 아이콘의 위치를 한 번에 저장한다 — "정리하기"처럼 여러 아이콘이 동시에
// 옮겨질 때 아이콘 수만큼 localStorage를 반복해서 읽고 쓰지 않게 한다.
export function setIconPositions(next: Record<string, Position>): void {
  const layout = loadLayout();
  for (const [id, pos] of Object.entries(next)) layout[id] = pos;
  saveLayout(layout);
}

export function removeIconPositions(ids: string[]): void {
  const layout = loadLayout();
  for (const id of ids) delete layout[id];
  saveLayout(layout);
}

// "정리하기" — 각 아이콘을 지금 위치에서 가장 가까운 격자 칸으로 스냅한다.
// 여러 아이콘이 같은 칸에 대응되면 먼저 처리된(entries 배열 순서) 쪽이 그
// 칸을 차지하고, 나머지는 그 칸부터 행 우선(row-major) 순서로 다음 빈 칸에
// 순차적으로 배치된다.
export function cleanUpLayout(
  entries: { id: string; x: number; y: number }[],
  containerWidth: number,
  containerHeight: number,
): Record<string, Position> {
  const perRow = Math.max(1, Math.floor(containerWidth / GRID_STEP));
  // 세로로도 보이는 범위 안의 칸으로만 우선 스냅한다 — 그러지 않으면 화면
  // 밖 아득히 먼 곳에 있던 아이콘이 "가장 가까운 칸"을 그대로 따라가 여전히
  // 화면 밖에 위치하는 채로 남는다(정리했는데도 안 보이는 문제).
  const maxRow = Math.max(0, Math.floor((containerHeight - 16) / GRID_STEP));
  const occupied = new Set<string>();
  const result: Record<string, Position> = {};
  for (const { id, x, y } of entries) {
    let col = Math.min(
      Math.max(0, Math.round((x - 16) / GRID_STEP)),
      perRow - 1,
    );
    let row = Math.min(
      Math.max(0, Math.round((y - 16) / GRID_STEP)),
      maxRow,
    );
    while (occupied.has(`${col},${row}`)) {
      col++;
      if (col >= perRow) {
        col = 0;
        row++;
      }
    }
    occupied.add(`${col},${row}`);
    result[id] = { x: col * GRID_STEP + 16, y: row * GRID_STEP + 16 };
  }
  return result;
}

// 휴지통/포맷 등 특수 아이콘도 이제 같은 저장소(LAYOUT_KEY)를 공유하므로
// 하나만 지우면 전체(일반 아이콘 + 특수 아이콘) 배치가 초기화된다.
export function resetDesktopLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {}
}
