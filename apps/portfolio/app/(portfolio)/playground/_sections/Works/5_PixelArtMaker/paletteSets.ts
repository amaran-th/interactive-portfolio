// 특정 파일이 아니라 편집기 자체에 저장되는 팔레트 세트 — 여러 작품을
// 오가며 같은 색 구성을 재사용하고 싶을 때 쓴다. 문서의 즐겨찾기(doc.palette)
// 와는 독립된 저장소라, 세트를 지우거나 고쳐도 이미 즐겨찾기에 불러온 색은
// 그대로 남는다(값을 복사해 불러올 뿐 참조하지 않는다).
export type PaletteSet = { id: string; name: string; colors: string[] };

const KEY = "pixel-art-maker:palette-sets";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function listPaletteSets(): PaletteSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createPaletteSet(name: string, colors: string[]): PaletteSet {
  const set: PaletteSet = { id: uid(), name, colors: colors.slice() };
  const sets = listPaletteSets();
  sets.push(set);
  localStorage.setItem(KEY, JSON.stringify(sets));
  return set;
}

export function renamePaletteSet(id: string, name: string): void {
  const sets = listPaletteSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return;
  set.name = name;
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function updatePaletteSetColors(id: string, colors: string[]): void {
  const sets = listPaletteSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return;
  set.colors = colors.slice();
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function deletePaletteSet(id: string): void {
  const sets = listPaletteSets().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(sets));
}
