// 조명 연습실 사람 모델 에셋을 만든다.
//   node apps/services/scripts/stage-lighting-assets/build.mjs <UBC 폴더> <UAL1_Standard.glb>
// 입력: Quaternius Universal Base Characters(무료판, CC0)·Universal Animation Library(무료판, CC0).
// 출력: apps/services/public/stage-lighting/human-female.bin, human-male.bin
//
// 형식(리틀 엔디언): "SLH1" + u32 JSON 길이 + JSON(4바이트 맞춤) + 데이터.
// JSON은 데이터 안 위치(byte offset)와 개수를 담는다.
// - body: 바인드 공간 정점(f32×3)·법선(f32×3)·인덱스(u16/u32)·뼈 번호(u8×4)·뼈 가중치(u8×4)·부위 가중치(u8×4: 피부·상의·하의·신발)
// - hair.<style>: Head 뼈 공간 정점·법선·인덱스(머리카락은 Head 뼈 하나에만 붙어 있다)
// - inverses: 뼈마다 바인드 역행렬(f32×16), poses.<pose>: 뼈마다 자세의 월드 행렬(f32×16, 발이 y=0에 닿게 맞춤)
// 텍스처·눈·눈썹은 넣지 않는다(마네킹처럼 단색으로 칠한다).
globalThis.ProgressEvent ??= class extends Event {
  constructor(t, o = {}) {
    super(t);
    Object.assign(this, o);
  }
};
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const THREE = await import(path.join(root, "node_modules/three/build/three.module.js"));
const { GLTFLoader } = await import(path.join(root, "node_modules/three/examples/jsm/loaders/GLTFLoader.js"));

const [ubcDir, ualFile] = process.argv.slice(2);
if (!ubcDir || !ualFile) {
  console.error("사용법: node build.mjs <Universal Base Characters 폴더> <UAL1_Standard.glb>");
  process.exit(1);
}
const OUT = path.join(root, "apps/services/public/stage-lighting");

// 자세 → [UAL 동작, 뽑을 시각(초, "end"는 마지막 프레임)]
const POSES = {
  stand: ["Idle_Loop", 0.5],
  talk: ["Idle_Talking_Loop", 0.8],
  walk: ["Walk_Loop", 0.3],
  formalWalk: ["Walk_Formal_Loop", 0.3],
  run: ["Jog_Fwd_Loop", 0.2],
  sit: ["Sitting_Idle_Loop", 0.5],
  sitTalk: ["Sitting_Talking_Loop", 1.2],
  crouch: ["Crouch_Idle_Loop", 0.5],
  kneel: ["Fixing_Kneeling", 1.5],
  dance: ["Dance_Loop", 0.3],
  push: ["Push_Loop", 0.6],
  reach: ["Interact", 0.9],
  lie: ["Death01", "end"],
  armsOpen: ["Spell_Simple_Idle_Loop", 0.5],
};
const HAIRS = {
  female: { parted: "Hair_SimpleParted", buzzed: "Hair_BuzzedFemale", buns: "Hair_Buns", long: "Hair_Long" },
  male: { parted: "Hair_SimpleParted", buzzed: "Hair_Buzzed", buns: "Hair_Buns", long: "Hair_Long" },
};
const BODIES = { female: "Superhero_Female_FullBody", male: "Superhero_Male_FullBody" };
const SKIN = /^(Head|neck_01|hand_|index|middle|pinky|ring|thumb)/;
const SHOE = /^(foot|ball)/;
const PANTS = /^(pelvis|thigh|calf)/;

const loader = new GLTFLoader();
const parse = (data) => new Promise((res, rej) => loader.parse(data, "", res, rej));

/** 외부 .bin을 data URI로 넣고 텍스처를 뺀 glTF JSON. */
async function loadGltf(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const b of j.buffers) b.uri = "data:application/octet-stream;base64," + fs.readFileSync(path.join(path.dirname(file), b.uri)).toString("base64");
  delete j.images;
  delete j.textures;
  delete j.samplers;
  for (const m of j.materials ?? []) {
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
    delete m.extensions;
    if (m.pbrMetallicRoughness) {
      delete m.pbrMetallicRoughness.baseColorTexture;
      delete m.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  const g = await parse(JSON.stringify(j));
  g.scene.updateMatrixWorld(true);
  return g;
}

class Blob {
  parts = [];
  size = 0;
  add(typed) {
    const pad = (4 - (this.size % 4)) % 4;
    if (pad) this.parts.push(new Uint8Array(pad));
    this.size += pad;
    const offset = this.size;
    this.parts.push(new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength));
    this.size += typed.byteLength;
    return offset;
  }
}

function indexArray(g, count) {
  const src = g.index ? g.index.array : Uint32Array.from({ length: count }, (_, i) => i);
  return count < 65536 ? Uint16Array.from(src) : Uint32Array.from(src);
}

/** 뼈 가중치 4개를 u8로(합 255). */
function quantWeights(sw, n) {
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const w = [0, 1, 2, 3].map((k) => sw.getComponent(i, k));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    const q = w.map((x) => Math.round((x / sum) * 255));
    q[q.indexOf(Math.max(...q))] += 255 - q.reduce((a, b) => a + b, 0);
    out.set(q, i * 4);
  }
  return out;
}

const ual = await parse(fs.readFileSync(ualFile).buffer.slice(0));
let ualMesh;
ual.scene.traverse((o) => {
  if (o.isSkinnedMesh && !ualMesh) ualMesh = o;
});
const ualBones = new Map(ualMesh.skeleton.bones.map((b) => [b.name, b]));
const ualPelvisY = ualBones.get("pelvis").position.z; // root가 -90°(X) 돌아 있어 로컬 z가 높이
const mixer = new THREE.AnimationMixer(ual.scene);

fs.mkdirSync(OUT, { recursive: true });
for (const gender of ["female", "male"]) {
  const g = await loadGltf(path.join(ubcDir, "Base Characters/Godot - UE", `${BODIES[gender]}.gltf`));
  let body;
  g.scene.traverse((o) => {
    if (o.isSkinnedMesh && o.geometry.attributes.position.count > 5000) body = o;
  });
  const bones = body.skeleton.bones;
  const names = bones.map((b) => b.name);
  const geo = body.geometry;
  const n = geo.attributes.position.count;
  const blob = new Blob();

  // 바인드 공간(bindMatrix 적용) 정점·법선
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(body.bindMatrix);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(geo.attributes.position, i).applyMatrix4(body.bindMatrix).toArray(pos, i * 3);
    v.fromBufferAttribute(geo.attributes.normal, i).applyMatrix3(nm).normalize().toArray(nor, i * 3);
  }
  const si = geo.attributes.skinIndex;
  const skin = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) skin[i * 4 + k] = si.getComponent(i, k);
  const weight = quantWeights(geo.attributes.skinWeight, n);
  const regionOf = names.map((nme) => (SKIN.test(nme) ? 0 : SHOE.test(nme) ? 3 : PANTS.test(nme) ? 2 : 1));
  const region = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const r = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) r[regionOf[skin[i * 4 + k]]] += weight[i * 4 + k];
    region.set(r, i * 4);
  }
  const idx = indexArray(geo, n);
  const meta = {
    bones: names,
    body: {
      count: n,
      indexCount: idx.length,
      index32: idx instanceof Uint32Array,
      index: blob.add(idx),
      position: blob.add(pos),
      normal: blob.add(nor),
      skin: blob.add(skin),
      weight: blob.add(weight),
      region: blob.add(region),
    },
    inverses: blob.add(Float32Array.from(bones.flatMap((b, i) => body.skeleton.boneInverses[i].elements))),
    head: names.indexOf("Head"),
    hair: {},
    poses: {},
    height: 0,
  };

  // 머리카락: Head 뼈 공간으로 옮겨 둔다.
  for (const [style, file] of Object.entries(HAIRS[gender])) {
    const h = await loadGltf(path.join(ubcDir, "Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)", `${file}.gltf`));
    let hm;
    h.scene.traverse((o) => {
      if (o.isSkinnedMesh && !hm) hm = o;
    });
    const hi = hm.skeleton.bones.findIndex((b) => b.name === "Head");
    const toHead = new THREE.Matrix4().multiplyMatrices(hm.skeleton.boneInverses[hi], hm.bindMatrix);
    const hn = new THREE.Matrix3().getNormalMatrix(toHead);
    const c = hm.geometry.attributes.position.count;
    const hp = new Float32Array(c * 3);
    const hnor = new Float32Array(c * 3);
    for (let i = 0; i < c; i++) {
      v.fromBufferAttribute(hm.geometry.attributes.position, i).applyMatrix4(toHead).toArray(hp, i * 3);
      v.fromBufferAttribute(hm.geometry.attributes.normal, i).applyMatrix3(hn).normalize().toArray(hnor, i * 3);
    }
    const hidx = indexArray(hm.geometry, c);
    meta.hair[style] = { count: c, indexCount: hidx.length, index32: hidx instanceof Uint32Array, index: blob.add(hidx), position: blob.add(hp), normal: blob.add(hnor) };
  }

  // 자세: UAL 동작의 뼈 회전만 옮기고(팔다리 길이는 이 몸 그대로), 골반 위치는 골반 높이 비율로 맞춘다.
  const rest = new Map(bones.map((b) => [b.name, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const pelvisRatio = bones.find((b) => b.name === "pelvis").position.z / ualPelvisY;
  for (const [pose, [clipName, at]] of Object.entries(POSES)) {
    const clip = ual.animations.find((a) => a.name === clipName);
    if (!clip) throw new Error(`동작 없음: ${clipName}`);
    mixer.stopAllAction();
    mixer.uncacheRoot(ual.scene);
    const action = mixer.clipAction(clip);
    action.play();
    mixer.setTime(at === "end" ? clip.duration - 1e-3 : at);
    for (const b of bones) {
      const r = rest.get(b.name);
      const src = ualBones.get(b.name);
      b.quaternion.copy(src ? src.quaternion : r.q);
      b.position.copy(r.p);
      if (b.name === "pelvis" && src) b.position.copy(src.position).multiplyScalar(pelvisRatio);
    }
    g.scene.updateMatrixWorld(true);
    // 발(가장 낮은 정점)이 y=0에 닿게
    const m = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, body.skeleton.boneInverses[i]));
    let minY = Infinity;
    let maxY = -Infinity;
    const acc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      acc.set(0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const w = weight[i * 4 + k] / 255;
        if (w > 0) acc.addScaledVector(v.fromArray(pos, i * 3).applyMatrix4(m[skin[i * 4 + k]]), w);
      }
      minY = Math.min(minY, acc.y);
      maxY = Math.max(maxY, acc.y);
    }
    const lift = new THREE.Matrix4().makeTranslation(0, -minY, 0);
    meta.poses[pose] = blob.add(Float32Array.from(bones.flatMap((b) => new THREE.Matrix4().multiplyMatrices(lift, b.matrixWorld).elements)));
    if (pose === "stand") meta.height = maxY - minY;
    for (const b of bones) {
      const r = rest.get(b.name);
      b.quaternion.copy(r.q);
      b.position.copy(r.p);
    }
  }

  const json = new TextEncoder().encode(JSON.stringify(meta));
  const jlen = Math.ceil(json.length / 4) * 4;
  const head = new Uint8Array(8 + jlen).fill(0x20);
  head.set(new TextEncoder().encode("SLH1"), 0);
  new DataView(head.buffer).setUint32(4, jlen, true);
  head.set(json, 8);
  const file = path.join(OUT, `human-${gender}.bin`);
  fs.writeFileSync(file, Buffer.concat([head, ...blob.parts]));
  console.log(`${file}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB, 정점 ${n}, 키 ${meta.height.toFixed(3)}m`);
}
