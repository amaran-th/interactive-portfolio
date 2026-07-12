const LIBRARY_KEY = "playground-asset-library";

export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[]; // hex 색상
  pixels: number[]; // length = width*height, palette 인덱스, -1 = 투명
  createdAt: number;
};

// 픽셀 배열을 그대로 JSON.stringify하면 픽셀당 콤마+최대 3자(예: "-1,")가 붙어
// localStorage 용량을 낭비한다 — 팔레트 인덱스(0~35, MAX_PALETTE_COLORS보다 넉넉한
// 여유)를 36진수 한 글자로, 투명(-1)은 구분자 없이 "." 한 글자로 압축해 저장한다.
// 픽셀당 1글자로 고정되므로 원래 배열 대비 대략 2~3배 더 작다. 저장된 원본은 항상
// 문자열이지만, 이 포맷을 도입하기 전에 저장된 값은 그대로 숫자 배열일 수 있어
// unpackPixels에서 둘 다 받아들인다(하위 호환).
const TRANSPARENT_CHAR = ".";

export function packPixels(pixels: number[]): string {
  return pixels.map((v) => (v < 0 ? TRANSPARENT_CHAR : v.toString(36))).join("");
}

export function unpackPixels(packed: string | number[]): number[] {
  if (Array.isArray(packed)) return packed;
  const out = new Array<number>(packed.length);
  for (let i = 0; i < packed.length; i++) {
    out[i] = packed[i] === TRANSPARENT_CHAR ? -1 : parseInt(packed[i], 36);
  }
  return out;
}

type StoredPixelArt = Omit<PixelArt, "pixels"> & { pixels: string | number[] };

export type BeatTrack = {
  wave: "square" | "triangle" | "noise";
  steps: (string | null)[];
};

export type BeatPattern = {
  id: string;
  name: string;
  type: "bgm" | "sfx";
  bpm: number;
  tracks: BeatTrack[];
  createdAt: number;
};

type AssetLibrary = {
  pixelArt: PixelArt[];
  beatPatterns: BeatPattern[];
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function loadLibrary(): AssetLibrary {
  if (typeof window === "undefined") return { pixelArt: [], beatPatterns: [] };
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return { pixelArt: [], beatPatterns: [] };
    const parsed = JSON.parse(raw) as Partial<{ pixelArt: StoredPixelArt[]; beatPatterns: BeatPattern[] }>;
    return {
      pixelArt: (parsed.pixelArt ?? []).map((p) => ({ ...p, pixels: unpackPixels(p.pixels) })),
      beatPatterns: parsed.beatPatterns ?? [],
    };
  } catch {
    return { pixelArt: [], beatPatterns: [] };
  }
}

function saveLibrary(lib: AssetLibrary): boolean {
  try {
    const stored: { pixelArt: StoredPixelArt[]; beatPatterns: BeatPattern[] } = {
      pixelArt: lib.pixelArt.map((p) => ({ ...p, pixels: packPixels(p.pixels) })),
      beatPatterns: lib.beatPatterns,
    };
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function listPixelArt(): PixelArt[] {
  return loadLibrary().pixelArt;
}

export function getPixelArt(id: string): PixelArt | undefined {
  return loadLibrary().pixelArt.find((p) => p.id === id);
}

export function savePixelArt(art: PixelArt): boolean {
  const lib = loadLibrary();
  const idx = lib.pixelArt.findIndex((p) => p.id === art.id);
  if (idx >= 0) lib.pixelArt[idx] = art;
  else lib.pixelArt.push(art);
  return saveLibrary(lib);
}

export function renamePixelArt(id: string, name: string): void {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return;
  item.name = name;
  saveLibrary(lib);
}

export function deletePixelArt(ids: string[]): void {
  const lib = loadLibrary();
  lib.pixelArt = lib.pixelArt.filter((p) => !ids.includes(p.id));
  saveLibrary(lib);
}

// 픽셀아트 메이커 전용 초기화 — 같은 라이브러리를 공유하는 beatPatterns는 건드리지 않는다.
export function resetAllPixelArt(): void {
  const lib = loadLibrary();
  lib.pixelArt = [];
  saveLibrary(lib);
}

export function duplicatePixelArt(id: string): PixelArt | undefined {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return undefined;
  const copy: PixelArt = {
    ...item,
    id: uid(),
    name: `${item.name} 사본`,
    pixels: item.pixels.slice(),
    palette: item.palette.slice(),
    createdAt: Date.now(),
  };
  lib.pixelArt.push(copy);
  saveLibrary(lib);
  return copy;
}
