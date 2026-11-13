// 헤이즈 속 빔: 열린 원뿔에 가산 블렌딩. 볼류메트릭 대신 가벼운 근사.
import * as THREE from "three";

/** 꼭짓점이 원점, 높이 1, 밑면 반지름 1, -y 방향 열린 원뿔. */
export function buildBeamGeometry(segments: number): THREE.BufferGeometry {
  return new THREE.ConeGeometry(1, 1, segments, 1, true).rotateX(Math.PI).translate(0, -0.5, 0);
}

const vertex = /* glsl */ `
varying float vAxial;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
void main() {
  vAxial = clamp(-position.y, 0.0, 1.0);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uHaze;
uniform float uSoftness;
uniform vec3 uLightPos;
uniform float uAngleBoost;
varying float vAxial;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
// Henyey-Greenstein 위상 함수를 등방성 대비 배율로, 옆에서 볼 때(cos=0)가 1이 되게 맞춘다.
// 관객 쪽으로 오는 빛(역광)일수록 연무에 산란돼 밝게 보인다.
float scatter(float c) {
  const float g = 0.6;
  float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
  float side = (1.0 - g * g) / pow(1.0 + g * g, 1.5);
  return clamp(hg / side, 0.3, 4.0);
}
void main() {
  // 원뿔 면을 정면으로 볼수록(빔 가운데) 진하고, 비스듬할수록(가장자리) 옅다.
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float edge = pow(facing, mix(0.6, 3.0, uSoftness));
  float axial = pow(1.0 - vAxial, 1.5) * smoothstep(0.0, 0.04, vAxial);
  vec3 dir = normalize(vWorld - uLightPos);
  vec3 toCam = normalize(cameraPosition - vWorld);
  float a = uIntensity * uHaze * 0.35 * axial * edge * scatter(dot(dir, toCam)) * uAngleBoost;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** 같은 밝기면 좁은 빔일수록 진하다. 26° 빔을 1로 둔 배율(0.3–3). */
export function angleBoost(beamAngleDeg: number): number {
  const half = (beamAngleDeg / 2) * (Math.PI / 180);
  return Math.min(3, Math.max(0.3, Math.tan((13 * Math.PI) / 180) / Math.tan(half)));
}

export function createBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#ffffff") },
      uIntensity: { value: 0 },
      uHaze: { value: 0 },
      uSoftness: { value: 0.5 },
      uLightPos: { value: new THREE.Vector3() },
      uAngleBoost: { value: 1 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
