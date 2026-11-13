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
void main() {
  vAxial = clamp(-position.y, 0.0, 1.0);
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
varying float vAxial;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  // 원뿔 면을 정면으로 볼수록(빔 가운데) 진하고, 비스듬할수록(가장자리) 옅다.
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float edge = pow(facing, mix(0.6, 3.0, uSoftness));
  float axial = pow(1.0 - vAxial, 1.5) * smoothstep(0.0, 0.04, vAxial);
  float a = uIntensity * uHaze * 0.35 * axial * edge;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#ffffff") },
      uIntensity: { value: 0 },
      uHaze: { value: 0 },
      uSoftness: { value: 0.5 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
