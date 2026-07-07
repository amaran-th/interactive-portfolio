// WebGL2 벡터 렌더러.
// 핵심: 회전은 버텍스 셰이더에서 2x2 회전·스케일 행렬(u_m)을 모든 정점에 곱하는 것.
// GPU가 수천 정점에 같은 변환을 병렬 적용하므로 매 프레임 회전해도 비용이 거의 없고,
// 매 프레임 지오메트리로부터 다시 래스터화하므로 어떤 각도에서도 선명하다.

import { SCENE_HALF } from "./scene";
import type { Geometry } from "./geometry";

const GEOM_VERT = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
uniform mat2 u_m;
uniform vec2 u_half;
out vec4 v_color;
void main() {
  vec2 s = u_m * a_pos;
  gl_Position = vec4(s.x / u_half.x, -s.y / u_half.y, 0.0, 1.0);
  v_color = a_color;
}`;

const GEOM_FRAG = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 o;
void main() { o = v_color; }`;

const MARKER_VERT = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
uniform mat2 u_m;
uniform vec2 u_half;
uniform float u_size;
out vec4 v_color;
void main() {
  vec2 s = u_m * a_pos;
  gl_Position = vec4(s.x / u_half.x, -s.y / u_half.y, 0.0, 1.0);
  gl_PointSize = u_size;
  v_color = a_color;
}`;

const MARKER_FRAG = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 o;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float t = smoothstep(0.36, 0.40, d);          // 안쪽 컬러 → 바깥 흰 테두리
  vec3 col = mix(v_color.rgb, vec3(1.0), t);
  float a = smoothstep(0.5, 0.46, d);            // 가장자리 안티앨리어싱
  o = vec4(col, a);
}`;

// 라벨: 빌보드 — 마커 위치만 회전시키고 쿼드 코너(px)는 회전시키지 않아 항상 수평 유지.
const LABEL_VERT = `#version 300 es
in vec2 a_marker;
in vec2 a_corner;
in vec2 a_uv;
uniform mat2 u_m;
uniform vec2 u_half;
out vec2 v_uv;
void main() {
  vec2 s = u_m * a_marker + a_corner;
  gl_Position = vec4(s.x / u_half.x, -s.y / u_half.y, 0.0, 1.0);
  v_uv = a_uv;
}`;

const LABEL_FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 o;
void main() { o = texture(u_tex, v_uv); }`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader compile error: " + log);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("program link error: " + gl.getProgramInfoLog(p));
  }
  return p;
}

export class VectorRenderer {
  private gl: WebGL2RenderingContext;
  private geomProg: WebGLProgram;
  private markerProg: WebGLProgram;
  private labelProg: WebGLProgram;
  private buffers: WebGLBuffer[] = [];
  private tex: WebGLTexture | null = null;
  private geom: Geometry | null = null;
  private vaoGeom: WebGLVertexArrayObject | null = null;
  private vaoMarker: WebGLVertexArrayObject | null = null;
  private vaoLabel: WebGLVertexArrayObject | null = null;
  private halfW = 1;
  private halfH = 1;
  private bg: [number, number, number, number] = [0.07, 0.08, 0.1, 1];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.geomProg = program(gl, GEOM_VERT, GEOM_FRAG);
    this.markerProg = program(gl, MARKER_VERT, MARKER_FRAG);
    this.labelProg = program(gl, LABEL_VERT, LABEL_FRAG);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private makeBuffer(data: Float32Array) {
    const gl = this.gl;
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.buffers.push(buf);
    return buf;
  }

  private attrib(prog: WebGLProgram, name: string, buf: WebGLBuffer, size: number) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  setGeometry(geom: Geometry, bg: [number, number, number, number]) {
    const gl = this.gl;
    this.geom = geom;
    this.bg = bg;

    // 삼각형 VAO
    this.vaoGeom = gl.createVertexArray();
    gl.bindVertexArray(this.vaoGeom);
    this.attrib(this.geomProg, "a_pos", this.makeBuffer(geom.triPositions), 2);
    this.attrib(this.geomProg, "a_color", this.makeBuffer(geom.triColors), 4);

    // 마커 VAO
    this.vaoMarker = gl.createVertexArray();
    gl.bindVertexArray(this.vaoMarker);
    this.attrib(this.markerProg, "a_pos", this.makeBuffer(geom.markerPositions), 2);
    this.attrib(this.markerProg, "a_color", this.makeBuffer(geom.markerColors), 4);

    // 라벨 VAO
    this.vaoLabel = gl.createVertexArray();
    gl.bindVertexArray(this.vaoLabel);
    this.attrib(this.labelProg, "a_marker", this.makeBuffer(geom.labelPositions), 2);
    this.attrib(this.labelProg, "a_corner", this.makeBuffer(geom.labelCorners), 2);
    this.attrib(this.labelProg, "a_uv", this.makeBuffer(geom.labelUVs), 2);
    gl.bindVertexArray(null);

    // 라벨 텍스처
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, geom.labelCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // logicalW/H: CSS px, dpr: devicePixelRatio
  resize(logicalW: number, logicalH: number, dpr: number) {
    const gl = this.gl;
    const cw = Math.max(1, Math.round(logicalW * dpr));
    const ch = Math.max(1, Math.round(logicalH * dpr));
    gl.canvas.width = cw;
    gl.canvas.height = ch;
    gl.viewport(0, 0, cw, ch);
    this.halfW = logicalW / 2;
    this.halfH = logicalH / 2;
    this.dpr = dpr;
  }
  private dpr = 1;

  // headingRad: 회전 각(라디안). 씬 600 월드가 뷰포트 짧은 변을 채우도록 스케일.
  draw(headingRad: number) {
    const gl = this.gl;
    if (!this.geom) return;
    // 대각선 기준 스케일 — 회전해도 뷰포트 모서리가 비지 않도록 씬이 충분히 덮게.
    const scale = Math.hypot(this.halfW, this.halfH) / SCENE_HALF;
    const c = Math.cos(headingRad) * scale;
    const s = Math.sin(headingRad) * scale;
    // mat2 (열 우선): [c, s, -s, c]
    const m = new Float32Array([c, s, -s, c]);
    const half = new Float32Array([this.halfW, this.halfH]);

    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], this.bg[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 삼각형
    gl.useProgram(this.geomProg);
    gl.uniformMatrix2fv(gl.getUniformLocation(this.geomProg, "u_m"), false, m);
    gl.uniform2fv(gl.getUniformLocation(this.geomProg, "u_half"), half);
    gl.bindVertexArray(this.vaoGeom);
    gl.drawArrays(gl.TRIANGLES, 0, this.geom.triVertexCount);

    // 마커
    gl.useProgram(this.markerProg);
    gl.uniformMatrix2fv(gl.getUniformLocation(this.markerProg, "u_m"), false, m);
    gl.uniform2fv(gl.getUniformLocation(this.markerProg, "u_half"), half);
    gl.uniform1f(gl.getUniformLocation(this.markerProg, "u_size"), 16 * this.dpr);
    gl.bindVertexArray(this.vaoMarker);
    gl.drawArrays(gl.POINTS, 0, this.geom.markerCount);

    // 라벨 (빌보드)
    gl.useProgram(this.labelProg);
    gl.uniformMatrix2fv(gl.getUniformLocation(this.labelProg, "u_m"), false, m);
    gl.uniform2fv(gl.getUniformLocation(this.labelProg, "u_half"), half);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(this.labelProg, "u_tex"), 0);
    gl.bindVertexArray(this.vaoLabel);
    gl.drawArrays(gl.TRIANGLES, 0, this.geom.labelVertexCount);

    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    this.buffers.forEach((b) => gl.deleteBuffer(b));
    if (this.tex) gl.deleteTexture(this.tex);
    [this.vaoGeom, this.vaoMarker, this.vaoLabel].forEach(
      (v) => v && gl.deleteVertexArray(v),
    );
    gl.deleteProgram(this.geomProg);
    gl.deleteProgram(this.markerProg);
    gl.deleteProgram(this.labelProg);
  }
}
