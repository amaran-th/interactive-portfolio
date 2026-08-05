import { findBuiltin } from "./builtinAssets";

const LIBRARY_KEY = "playground-asset-library";

// 픽셀은 항상 자기 색을 직접 저장하는 트루컬러다(hex 문자열, 투명은 null) —
// palette는 더 이상 픽셀이 참조하는 대상이 아니라, 빠르게 다시 쓸 수 있도록
// 모아둔 즐겨찾기 색 목록일 뿐이다. 그래서 팔레트 스와치를 고치거나 지워도
// 이미 칠한 픽셀은 절대 바뀌지 않는다.

// 레이어 하나 — pixels는 캔버스와 같은 width×height 크기의 평면 배열이다.
// opacity는 0~1이고, 이 레이어를 아래 레이어들 위에 합성할 때만 쓰인다
// (레이어 안의 개별 픽셀 알파와는 별개로 곱해진다).
export type PixelLayer = {
  id: string;
  name: string;
  pixels: (string | null)[];
  visible: boolean;
  opacity: number;
  locked: boolean;
  // 프레임 모드에서 이 레이어(프레임)가 화면에 머무는 시간(ms). 없으면
  // DEFAULT_FRAME_DURATION_MS(5_PixelArtMaker/types.ts)로 취급한다 — 레이어
  // 모드에선 읽지 않는다.
  frameDurationMs?: number;
};

export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[]; // 즐겨찾기 색 목록 — 그림 데이터 자체와는 무관하다.
  // 항상 "레이어를 모두 합성한 최종 결과"다 — 레이어 개념을 모르는 소비처
  // (썸네일, VN 스튜디오 리소스 피커 등)는 이 필드만 읽으면 된다.
  pixels: (string | null)[];
  // 있으면 편집기가 그대로 복원할 수 있는 레이어 스택. 없으면(V2 이하로
  // 저장된 구파일) pixels를 감싼 단일 레이어로 취급한다 — 이 마이그레이션은
  // 이 파일이 아니라 Editor.tsx가 문서를 열 때 담당한다(아래 참고).
  layers?: PixelLayer[];
  activeLayerId?: string;
  // 같은 layers 배열을 "레이어"(합성해서 보여줌)로 볼지 "프레임"(순서대로
  // 재생)으로 볼지. 없으면 "layers"로 취급한다(레이어 기능만 있던 구파일과
  // 호환). encodeStored/decodeStored는 이미 객체 스프레드로 이 필드를 그대로
  // 저장·복원하므로 저장 포맷 버전을 올릴 필요가 없다.
  layerMode?: "layers" | "frames";
  createdAt: number;
};

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encodeIndex(n: number, width: number): string {
  let s = "";
  let rest = n;
  for (let i = 0; i < width; i++) {
    s = BASE62[rest % 62] + s;
    rest = Math.floor(rest / 62);
  }
  return s;
}

function decodeIndex(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 62 + BASE62.indexOf(s[i]);
  return n;
}

// 62^1=62, 62^2=3844, 62^3=238328, 62^4=14776336 — 512×512 캔버스의 최대
// 픽셀 수(262144)보다 62^4이 훨씬 크므로 4글자면 어떤 경우에도 항상 충분하다.
function charWidthFor(distinctCountIncludingTransparent: number): number {
  if (distinctCountIncludingTransparent <= 62) return 1;
  if (distinctCountIncludingTransparent <= 3844) return 2;
  if (distinctCountIncludingTransparent <= 238328) return 3;
  return 4;
}

export type PackedPixels = {
  packed: string;
  dict: string[];
  charWidth: number;
};

// 저장할 때만 이 그림에서 실제로 쓰인 색을 모아 사전을 만들고, 그 사전의
// 인덱스를 압축해 담는다(0은 투명 전용, 실제 색은 1부터) — 대부분의 픽셀아트는
// 서로 다른 색이 62개를 넘지 않아 예전 인덱스 팔레트 방식과 같은 1글자/픽셀
// 크기를 그대로 유지한다. 편집 중(메모리)에는 이 사전과 무관하게 각 픽셀이
// 자기 색을 그대로 들고 있다 — 이건 오직 localStorage에 적을 때만의 압축이다.
export function packPixels(pixels: (string | null)[]): PackedPixels {
  const dict: string[] = [];
  const indexOf = new Map<string, number>();
  for (const p of pixels) {
    if (p !== null && !indexOf.has(p)) {
      indexOf.set(p, dict.length + 1);
      dict.push(p);
    }
  }
  const charWidth = charWidthFor(dict.length + 1);
  const packed = pixels
    .map((p) => encodeIndex(p === null ? 0 : (indexOf.get(p) ?? 0), charWidth))
    .join("");
  return { packed, dict, charWidth };
}

export function unpackPixels(data: PackedPixels): (string | null)[] {
  const { packed, dict, charWidth } = data;
  const out = new Array<string | null>(packed.length / charWidth);
  for (let i = 0; i < out.length; i++) {
    const n = decodeIndex(
      packed.slice(i * charWidth, i * charWidth + charWidth),
    );
    out[i] = n === 0 ? null : (dict[n - 1] ?? null);
  }
  return out;
}

// --- 이전(인덱스 팔레트) 포맷 마이그레이션 ---
// 예전에는 pixels가 팔레트 인덱스였고(문자 하나가 36진수 인덱스, "."이 투명),
// palette가 그 인덱스의 실제 참조처였다. 지금 그 파일을 열면 인덱스를 palette로
// 풀어 실제 hex로 바꾸고, 예전 palette는 그대로 즐겨찾기 목록으로 이어받는다.
const LEGACY_TRANSPARENT_CHAR = ".";

function legacyUnpack(
  packed: string | number[],
  legacyPalette: string[],
): (string | null)[] {
  const indices: number[] = Array.isArray(packed)
    ? packed
    : Array.from(packed, (ch) =>
        ch === LEGACY_TRANSPARENT_CHAR ? -1 : parseInt(ch, 36),
      );
  return indices.map((i) => (i < 0 ? null : (legacyPalette[i] ?? null)));
}

type StoredPixelLayerV3 = Omit<PixelLayer, "pixels"> & { pixels: PackedPixels };
type StoredPixelArtV3 = Omit<PixelArt, "pixels" | "layers"> & {
  pixels: PackedPixels;
  layers?: StoredPixelLayerV3[];
  version: 3;
};
type StoredPixelArtV2 = Omit<PixelArt, "pixels"> & {
  pixels: PackedPixels;
  version: 2;
};
type StoredPixelArtV1 = Omit<PixelArt, "pixels"> & {
  pixels: string | number[];
};
type StoredPixelArt = StoredPixelArtV3 | StoredPixelArtV2 | StoredPixelArtV1;

function isV3(stored: StoredPixelArt): stored is StoredPixelArtV3 {
  return (stored as StoredPixelArtV3).version === 3;
}

function isV2(stored: StoredPixelArt): stored is StoredPixelArtV2 {
  return (stored as StoredPixelArtV2).version === 2;
}

function decodeStored(stored: StoredPixelArt): PixelArt {
  if (isV3(stored)) {
    return {
      ...stored,
      pixels: unpackPixels(stored.pixels),
      layers: stored.layers?.map((l) => ({
        ...l,
        pixels: unpackPixels(l.pixels),
      })),
    };
  }
  if (isV2(stored)) {
    return { ...stored, pixels: unpackPixels(stored.pixels) };
  }
  return { ...stored, pixels: legacyUnpack(stored.pixels, stored.palette) };
}

export function encodeStored(art: PixelArt): StoredPixelArtV3 {
  return {
    ...art,
    pixels: packPixels(art.pixels),
    layers: art.layers?.map((l) => ({ ...l, pixels: packPixels(l.pixels) })),
    version: 3,
  };
}

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
    const parsed = JSON.parse(raw) as Partial<{
      pixelArt: StoredPixelArt[];
      beatPatterns: BeatPattern[];
    }>;
    return {
      pixelArt: (parsed.pixelArt ?? []).map(decodeStored),
      beatPatterns: parsed.beatPatterns ?? [],
    };
  } catch {
    return { pixelArt: [], beatPatterns: [] };
  }
}

function saveLibrary(lib: AssetLibrary): boolean {
  try {
    const stored: {
      pixelArt: StoredPixelArtV3[];
      beatPatterns: BeatPattern[];
    } = {
      pixelArt: lib.pixelArt.map(encodeStored),
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

// 사용자 라이브러리에서 먼저 찾고, 없으면 기본 제공 세트에서 찾는다.
// 둘 다 없으면 undefined — 호출부는 참조가 끊긴(삭제된) 리소스로 처리해야 한다.
export function resolvePixelArt(id: string): PixelArt | undefined {
  return getPixelArt(id) ?? findBuiltin(id);
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
    layers: item.layers?.map((l) => ({ ...l, pixels: l.pixels.slice() })),
    palette: item.palette.slice(),
    createdAt: Date.now(),
  };
  lib.pixelArt.push(copy);
  saveLibrary(lib);
  return copy;
}
