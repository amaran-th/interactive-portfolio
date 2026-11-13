// 사람 모델(Quaternius Universal Base Characters, CC0). scripts/stage-lighting-assets/build.mjs가 만든
// public/stage-lighting/human-<성별>.bin을 받아 (성별, 자세, 체형)마다 한 번 뼈대를 적용해 고정 지오메트리로 굳힌다.
// 인물은 SkinnedMesh가 아닌 Mesh로 그리고, 같은 조합끼리 지오메트리를 함께 쓴다.
// 색은 정점의 부위 가중치(피부·상의·하의·신발)를 셰이더가 인물별 색 4개로 섞는다.
import * as THREE from "three";
import type { Build, Gender, HairStyle, Pose } from "../show";

type Part = { count: number; indexCount: number; index32: boolean; index: number; position: number; normal: number };
type Meta = {
  bones: string[];
  body: Part & { skin: number; weight: number; region: number };
  inverses: number;
  head: number;
  hair: Partial<Record<HairStyle, Part>>;
  poses: Record<Pose, number>;
  height: number;
};
type Asset = { meta: Meta; data: ArrayBuffer; base: number; thickness: Record<Build, Float32Array> };

export type HumanParts = { body: THREE.BufferGeometry; hair: THREE.BufferGeometry | null; box: THREE.Box3; modelHeight: number };
export type LibraryState = "idle" | "loading" | "ready" | "failed";

// 무료 모델은 근육질 체형이라, '보통'도 어깨·팔·가슴 두께를 줄여 평범한 몸으로 맞춘다.
// 값은 뼈 길이 방향(로컬 y)에 수직인 두께 배율.
const THICKNESS: Record<Build, [RegExp, number][]> = {
  slim: [
    [/^clavicle/, 0.72],
    [/^upperarm/, 0.64],
    [/^lowerarm/, 0.72],
    [/^spine_03/, 0.74],
    [/^spine_02/, 0.74],
    [/^spine_01/, 0.78],
    [/^pelvis/, 0.86],
    [/^neck/, 0.82],
    [/^thigh/, 0.74],
    [/^calf/, 0.8],
  ],
  average: [
    [/^clavicle/, 0.88],
    [/^upperarm/, 0.84],
    [/^lowerarm/, 0.88],
    [/^spine_03/, 0.9],
    [/^spine_02/, 0.94],
    [/^neck/, 0.92],
    [/^thigh/, 0.95],
  ],
  stocky: [
    [/^clavicle/, 1.02],
    [/^upperarm/, 1.08],
    [/^lowerarm/, 1.05],
    [/^spine_03/, 1.15],
    [/^spine_02/, 1.42],
    [/^spine_01/, 1.48],
    [/^pelvis/, 1.26],
    [/^neck/, 1.12],
    [/^thigh/, 1.24],
    [/^calf/, 1.1],
  ],
};

function parse(buf: ArrayBuffer): Asset {
  const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
  if (magic !== "SLH1") throw new Error("사람 모델 형식이 아니에요");
  const jlen = new DataView(buf).getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jlen))) as Meta;
  const thickness = {} as Record<Build, Float32Array>;
  for (const b of Object.keys(THICKNESS) as Build[]) {
    thickness[b] = Float32Array.from(meta.bones, (name) => THICKNESS[b].find(([re]) => re.test(name))?.[1] ?? 1);
  }
  return { meta, data: buf, base: 8 + jlen, thickness };
}

const f32 = (a: Asset, off: number, n: number) => new Float32Array(a.data, a.base + off, n);
const u8 = (a: Asset, off: number, n: number) => new Uint8Array(a.data, a.base + off, n);
const indexOf = (a: Asset, p: Part) =>
  p.index32 ? new Uint32Array(a.data, a.base + p.index, p.indexCount) : new Uint16Array(a.data, a.base + p.index, p.indexCount);

/** 자세의 뼈 행렬(월드 × 두께 × 바인드 역행렬). 뼈마다 16개씩. */
function skinMatrices(a: Asset, pose: Pose, build: Build): Float32Array {
  const n = a.meta.bones.length;
  const world = f32(a, a.meta.poses[pose], n * 16);
  const inv = f32(a, a.meta.inverses, n * 16);
  const t = a.thickness[build];
  const out = new Float32Array(n * 16);
  const W = new THREE.Matrix4();
  const S = new THREE.Matrix4();
  const I = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    W.fromArray(world, i * 16);
    I.fromArray(inv, i * 16);
    S.makeScale(t[i], 1, t[i]);
    W.multiply(S).multiply(I).toArray(out, i * 16);
  }
  return out;
}

function bakeBody(a: Asset, pose: Pose, build: Build): THREE.BufferGeometry {
  const p = a.meta.body;
  const n = p.count;
  const pos = f32(a, p.position, n * 3);
  const nor = f32(a, p.normal, n * 3);
  const skin = u8(a, p.skin, n * 4);
  const weight = u8(a, p.weight, n * 4);
  const M = skinMatrices(a, pose, build);
  const op = new Float32Array(n * 3);
  const on = new Float32Array(n * 3);
  const m = new Float32Array(12);
  for (let i = 0; i < n; i++) {
    m.fill(0);
    for (let k = 0; k < 4; k++) {
      const w = weight[i * 4 + k] / 255;
      if (w === 0) continue;
      const b = skin[i * 4 + k] * 16;
      // 열 우선 4×4에서 앞 세 행만 섞는다.
      m[0] += w * M[b];
      m[1] += w * M[b + 1];
      m[2] += w * M[b + 2];
      m[3] += w * M[b + 4];
      m[4] += w * M[b + 5];
      m[5] += w * M[b + 6];
      m[6] += w * M[b + 8];
      m[7] += w * M[b + 9];
      m[8] += w * M[b + 10];
      m[9] += w * M[b + 12];
      m[10] += w * M[b + 13];
      m[11] += w * M[b + 14];
    }
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    op[i * 3] = m[0] * x + m[3] * y + m[6] * z + m[9];
    op[i * 3 + 1] = m[1] * x + m[4] * y + m[7] * z + m[10];
    op[i * 3 + 2] = m[2] * x + m[5] * y + m[8] * z + m[11];
    // 두께 배율로 비균일 스케일이 섞이지만 1에 가까워 법선은 같은 행렬로 돌리고 정규화한다.
    const nx = nor[i * 3];
    const ny = nor[i * 3 + 1];
    const nz = nor[i * 3 + 2];
    const tx = m[0] * nx + m[3] * ny + m[6] * nz;
    const ty = m[1] * nx + m[4] * ny + m[7] * nz;
    const tz = m[2] * nx + m[5] * ny + m[8] * nz;
    const l = Math.hypot(tx, ty, tz) || 1;
    on[i * 3] = tx / l;
    on[i * 3 + 1] = ty / l;
    on[i * 3 + 2] = tz / l;
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(new THREE.BufferAttribute(indexOf(a, p), 1));
  g.setAttribute("position", new THREE.BufferAttribute(op, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(on, 3));
  g.setAttribute("region", new THREE.BufferAttribute(u8(a, p.region, n * 4), 4, true));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function bakeHair(a: Asset, pose: Pose, style: HairStyle): THREE.BufferGeometry | null {
  const p = a.meta.hair[style];
  if (!p) return null;
  const head = new THREE.Matrix4().fromArray(f32(a, a.meta.poses[pose] + a.meta.head * 64, 16));
  const g = new THREE.BufferGeometry();
  g.setIndex(new THREE.BufferAttribute(indexOf(a, p), 1));
  g.setAttribute("position", new THREE.BufferAttribute(f32(a, p.position, p.count * 3).slice(), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(f32(a, p.normal, p.count * 3).slice(), 3));
  g.applyMatrix4(head);
  g.computeBoundingSphere();
  return g;
}

/** 사람 모델 에셋. 처음 쓸 때 받고, 받는 동안·실패하면 parts()가 null이라 씬은 절차적 마네킹을 쓴다. */
export class HumanLibrary {
  state: LibraryState = "idle";
  private assets: Partial<Record<Gender, Asset>> = {};
  private bodies = new Map<string, THREE.BufferGeometry>();
  private hairs = new Map<string, THREE.BufferGeometry | null>();
  private disposed = false;

  constructor(
    private readonly onChange: (state: LibraryState) => void,
    private readonly baseUrl = "/stage-lighting/",
  ) {}

  ensure(): void {
    if (this.state !== "idle") return;
    this.state = "loading";
    const load = async (g: Gender) => {
      const res = await fetch(`${this.baseUrl}human-${g}.bin`);
      if (!res.ok) throw new Error(`${res.status}`);
      this.assets[g] = parse(await res.arrayBuffer());
    };
    Promise.all([load("female"), load("male")]).then(
      () => {
        if (this.disposed) return;
        this.state = "ready";
        this.onChange(this.state);
      },
      () => {
        if (this.disposed) return;
        this.state = "failed";
        this.onChange(this.state);
      },
    );
  }

  parts(gender: Gender, pose: Pose, build: Build, hair: HairStyle): HumanParts | null {
    const a = this.assets[gender];
    if (this.state !== "ready" || !a) return null;
    const bk = `${gender}|${pose}|${build}`;
    let body = this.bodies.get(bk);
    if (!body) {
      body = bakeBody(a, pose, build);
      this.bodies.set(bk, body);
    }
    const hk = `${gender}|${pose}|${hair}`;
    let h = this.hairs.get(hk);
    if (h === undefined) {
      h = hair === "none" ? null : bakeHair(a, pose, hair);
      this.hairs.set(hk, h);
    }
    const box = body.boundingBox!.clone();
    if (h) {
      h.computeBoundingBox();
      box.union(h.boundingBox!);
    }
    return { body, hair: h, box, modelHeight: a.meta.height };
  }

  dispose(): void {
    this.disposed = true;
    for (const g of this.bodies.values()) g.dispose();
    for (const g of this.hairs.values()) g?.dispose();
    this.bodies.clear();
    this.hairs.clear();
  }
}

export type HumanMaterial = THREE.MeshStandardMaterial & {
  setColors(skin: string, top: string, bottom: string, shoe: string): void;
};

/** 부위 가중치로 색 4개를 섞는 재질. 프로그램은 모든 인물이 함께 쓰고 색 uniform만 인물마다 다르다. */
export function createHumanMaterial(): HumanMaterial {
  const u = {
    uSkin: { value: new THREE.Color() },
    uTop: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uShoe: { value: new THREE.Color() },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 }) as HumanMaterial;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      "attribute vec4 region;\nvarying vec4 vRegion;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvRegion = region;");
    sh.fragmentShader =
      "uniform vec3 uSkin;\nuniform vec3 uTop;\nuniform vec3 uBottom;\nuniform vec3 uShoe;\nvarying vec4 vRegion;\n" +
      sh.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = uSkin * vRegion.x + uTop * vRegion.y + uBottom * vRegion.z + uShoe * vRegion.w;",
      );
  };
  mat.customProgramCacheKey = () => "stage-human";
  mat.setColors = (skin, top, bottom, shoe) => {
    u.uSkin.value.setStyle(skin);
    u.uTop.value.setStyle(top);
    u.uBottom.value.setStyle(bottom);
    u.uShoe.value.setStyle(shoe);
  };
  return mat;
}
