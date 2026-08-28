"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GpuInfo = {
  webgl2: boolean;
  vendor: string;
  renderer: string;
  glVersion: string;
  glslVersion: string;
  maxTexture: number;
  maxViewport: string;
  isSoftware: boolean;
};

const SOFTWARE_HINTS = ["swiftshader", "llvmpipe", "software", "microsoft basic"];

function readGpuInfo(): GpuInfo | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl1) return null;
    return softwareUnknown(false);
  }
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) : "(masked)";
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "(masked)";
  const maxVp = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
  const info: GpuInfo = {
    webgl2: true,
    vendor,
    renderer,
    glVersion: String(gl.getParameter(gl.VERSION)),
    glslVersion: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxViewport: `${maxVp?.[0] ?? "?"} × ${maxVp?.[1] ?? "?"}`,
    isSoftware: SOFTWARE_HINTS.some((h) => renderer.toLowerCase().includes(h)),
  };
  // 정리
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return info;
}

function softwareUnknown(webgl2: boolean): GpuInfo {
  return {
    webgl2,
    vendor: "(masked)",
    renderer: "(masked)",
    glVersion: "WebGL 1.0",
    glslVersion: "—",
    maxTexture: 0,
    maxViewport: "—",
    isSoftware: false,
  };
}

export default function EnvLab() {
  const [info, setInfo] = useState<GpuInfo | null>(null);
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    // rAF 콜백(외부 시스템)에서 갱신해 effect 본문 내 동기 setState를 피한다
    const id = requestAnimationFrame(() => {
      const i = readGpuInfo();
      if (!i) setNoGl(true);
      else setInfo(i);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-0 px-8 py-6 flex flex-col gap-6 max-w-3xl">
      {/* 1) Your GPU */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">이 환경의 GPU</h2>
          <p className="text-xs text-white/40 mt-0.5">
            브라우저가 WebGL에 실제로 어떤 렌더러를 쓰는지 (WEBGL_debug_renderer_info)
          </p>
        </div>

        {noGl && (
          <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-xs text-orange-200/80">
            WebGL을 전혀 사용할 수 없는 환경입니다. 벡터 지도는 불가능하고 래스터만 가능합니다.
          </div>
        )}

        {info && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5 rounded-lg overflow-hidden">
              <Row label="WebGL2" value={info.webgl2 ? "지원" : "미지원"} />
              <Row label="Vendor" value={info.vendor} />
              <Row label="Renderer" value={info.renderer} mono />
              <Row label="GL Version" value={info.glVersion} mono />
              <Row label="GLSL" value={info.glslVersion} mono />
              <Row label="Max Texture" value={info.maxTexture ? `${info.maxTexture}px` : "—"} mono />
              <Row label="Max Viewport" value={info.maxViewport} mono />
            </div>

            <div
              className={`rounded-lg px-4 py-3 text-xs leading-relaxed border ${
                info.isSoftware
                  ? "border-orange-400/30 bg-orange-400/10 text-orange-200/80"
                  : "border-green-400/30 bg-green-400/10 text-green-200/80"
              }`}
            >
              {info.isSoftware ? (
                <>
                  <strong>소프트웨어 렌더러 감지</strong> — GPU 가속이 아니라 CPU
                  소프트웨어(SwiftShader 등)로 그리고 있습니다. 구글맵은 이 경우 성능을
                  위해 래스터로 폴백할 수 있고, 그러면 회전(heading)이 사라집니다.
                </>
              ) : (
                <>
                  <strong>하드웨어 GPU 가속 활성</strong> — 벡터(WebGL) 지도의 회전·틸트가
                  매끄럽게 동작하는 환경입니다. Chrome에서 GPU가 블록리스트에 오르거나
                  하드웨어 가속을 끄면 위 Renderer가 SwiftShader로 바뀝니다.
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* 2) Context limit */}
      <ContextLimitDemo />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-950/40 px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
      <span className={`text-xs text-white/80 break-words ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ContextLimitDemo() {
  const contextsRef = useRef<{ canvas: HTMLCanvasElement; gl: WebGLRenderingContext }[]>([]);
  const [created, setCreated] = useState(0);
  const [alive, setAlive] = useState(0);
  const [lost, setLost] = useState(0);

  const recount = useCallback(() => {
    let a = 0;
    for (const c of contextsRef.current) if (!c.gl.isContextLost()) a += 1;
    setAlive(a);
    setLost(contextsRef.current.length - a);
  }, []);

  const addContexts = useCallback(
    (n: number) => {
      for (let i = 0; i < n; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const gl = canvas.getContext("webgl");
        if (gl) {
          // 한 프레임 그려 컨텍스트를 실제로 점유
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          contextsRef.current.push({ canvas, gl });
        }
      }
      setCreated(contextsRef.current.length);
      // 브라우저가 오래된 컨텍스트를 드롭하는지 확인
      requestAnimationFrame(recount);
    },
    [recount],
  );

  const reset = useCallback(() => {
    for (const c of contextsRef.current) {
      c.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    contextsRef.current = [];
    setCreated(0);
    setAlive(0);
    setLost(0);
  }, []);

  useEffect(() => () => reset(), [reset]);

  return (
    <section className="bg-white/5 rounded-xl border border-white/10 p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-white">WebGL 컨텍스트 한도</h2>
        <p className="text-xs text-white/40 mt-0.5">
          브라우저는 동시 WebGL 컨텍스트 수를 제한한다(보통 ~16). 초과하면 가장 오래된
          것부터 강제로 잃는다 — 지도 인스턴스를 여러 개 띄울 때 부딪히는 GPU 자원 제약.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-px bg-white/5 rounded-lg overflow-hidden">
        <Stat label="created" value={created} />
        <Stat label="alive" value={alive} accent="text-green-400/80" />
        <Stat label="lost" value={lost} accent="text-orange-400/80" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => addContexts(4)}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          컨텍스트 +4
        </button>
        <button
          onClick={() => addContexts(1)}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          +1
        </button>
        <button
          onClick={reset}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/50 hover:text-white/80 transition-colors cursor-pointer"
        >
          전부 해제
        </button>
      </div>

      <p className="text-xs text-white/30 leading-relaxed">
        created가 한도를 넘어가면 alive가 더 늘지 않고 lost가 증가한다. 콘솔에도
        &quot;Too many active WebGL contexts&quot; 경고가 찍힌다. 잃은 컨텍스트의 지도는
        화면이 비거나 렌더링이 멈춘다.
      </p>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-gray-950/40 px-4 py-3 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
      <span className={`text-2xl font-mono font-semibold ${accent ?? "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
