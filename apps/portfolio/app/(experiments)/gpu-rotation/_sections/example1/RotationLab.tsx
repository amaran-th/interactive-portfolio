"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildGeometry } from "./geometry";
import { VectorRenderer } from "./gl";
import { bakeScene, drawRaster, type Baked } from "./raster";
import { generateScene, SCENE_HALF } from "./scene";

type Stats = { fps: number; rasterMs: number; vectorMs: number };

export default function RotationLab() {
  const scene = useMemo(() => generateScene(), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const rasterRef = useRef<HTMLCanvasElement>(null);
  const vectorRef = useRef<HTMLCanvasElement>(null);

  const [spinning, setSpinning] = useState(true);
  const [headingDeg, setHeadingDeg] = useState(0); // 표시용
  const [forceRaster, setForceRaster] = useState(false);
  const [glSupported, setGlSupported] = useState(true);
  const [stats, setStats] = useState<Stats>({ fps: 0, rasterMs: 0, vectorMs: 0 });

  // 루프에서 읽을 최신 상태 미러
  const spinningRef = useRef(spinning);
  const forceRasterRef = useRef(forceRaster);
  const manualRadRef = useRef(0);
  const headingRadRef = useRef(0);
  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);
  useEffect(() => {
    forceRasterRef.current = forceRaster;
  }, [forceRaster]);
  useEffect(() => {
    manualRadRef.current = (headingDeg * Math.PI) / 180;
  }, [headingDeg]);

  const onSlider = useCallback((deg: number) => {
    setSpinning(false);
    setHeadingDeg(deg);
  }, []);

  useEffect(() => {
    const rasterCanvas = rasterRef.current;
    const vectorCanvas = vectorRef.current;
    const wrap = wrapRef.current;
    if (!rasterCanvas || !vectorCanvas || !wrap) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx2d = rasterCanvas.getContext("2d");
    const gl = vectorCanvas.getContext("webgl2", { antialias: true });
    if (!ctx2d) return;
    if (!gl) {
      const id = requestAnimationFrame(() => setGlSupported(false));
      return () => cancelAnimationFrame(id);
    }

    const geom = buildGeometry(scene, dpr);
    const renderer = new VectorRenderer(gl);
    renderer.setGeometry(geom, scene.background);

    let baked: Baked | null = null;
    let lw = 0;
    let lh = 0;

    const resize = () => {
      const w = Math.max(1, Math.round(rasterCanvas.clientWidth));
      const h = Math.max(1, Math.round(rasterCanvas.clientHeight));
      if (w === lw && h === lh) return;
      lw = w;
      lh = h;
      rasterCanvas.width = Math.round(w * dpr);
      rasterCanvas.height = Math.round(h * dpr);
      renderer.resize(w, h, dpr);
      const diag = Math.hypot(w, h);
      const scale = Math.hypot(w / 2, h / 2) / SCENE_HALF;
      baked = bakeScene(scene, dpr, Math.ceil(diag) + 2, scale);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(rasterCanvas);

    let raf = 0;
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let statTimer = 0;
    let rasterMs = 0;
    let vectorMs = 0;

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;

      if (spinningRef.current) {
        headingRadRef.current = (headingRadRef.current + dt * 0.5) % (Math.PI * 2);
      } else {
        headingRadRef.current = manualRadRef.current;
      }
      const h = headingRadRef.current;

      if (baked) rasterMs = drawRaster(ctx2d, baked, h, lw, lh, dpr);

      const vt0 = performance.now();
      renderer.draw(forceRasterRef.current ? 0 : h); // 폴백 시 회전 무시(북쪽 고정)
      gl.flush();
      vectorMs = performance.now() - vt0;

      // FPS 집계 + 표시 갱신(throttle)
      fpsAccum += dt;
      fpsFrames += 1;
      statTimer += dt;
      if (statTimer >= 0.25) {
        setStats({
          fps: fpsFrames / fpsAccum,
          rasterMs,
          vectorMs,
        });
        if (spinningRef.current) {
          setHeadingDeg(Math.round((h * 180) / Math.PI) % 360);
        }
        fpsAccum = 0;
        fpsFrames = 0;
        statTimer = 0;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
    };
  }, [scene]);

  return (
    <div className="min-h-0 flex flex-col gap-5 px-8 py-6">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          onClick={() => setSpinning((s) => !s)}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          {spinning ? "⏸ Pause" : "▶ Auto-spin"}
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-md">
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Heading
          </span>
          <input
            type="range"
            min={0}
            max={359}
            value={headingDeg}
            onChange={(e) => onSlider(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="text-xs font-mono text-white/60 w-12 text-right">
            {headingDeg}°
          </span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forceRaster}
            onChange={(e) => setForceRaster(e.target.checked)}
            className="accent-orange-400 w-4 h-4"
          />
          <span className="text-xs font-medium text-white/70">
            GPU 사용 불가 → 래스터 폴백 강제
          </span>
        </label>
      </div>

      {!glSupported && (
        <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-xs text-orange-200/80">
          이 환경에서 WebGL2를 사용할 수 없습니다. 바로 이때 구글맵은 래스터로
          폴백되고, 회전(heading)이 동작하지 않습니다.
        </div>
      )}

      {/* 두 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="Raster"
          subtitle="CPU 비트맵 회전 (drawImage)"
          dotClass="bg-orange-400"
          metricLabel="CPU rotate"
          metricValue={`${stats.rasterMs.toFixed(2)} ms`}
          metricNote="픽셀 리샘플 → 흐려지고 라벨이 같이 기울어짐"
          canvasRef={rasterRef}
          wrapRef={wrapRef}
        />
        <Panel
          title="Vector (WebGL)"
          subtitle="GPU 지오메트리 회전 (vertex shader)"
          dotClass={forceRaster ? "bg-orange-400" : "bg-green-400"}
          metricLabel="JS submit"
          metricValue={`${stats.vectorMs.toFixed(2)} ms`}
          metricNote={
            forceRaster
              ? "폴백: heading 미지원 — 북쪽 고정"
              : "어떤 각도에서도 선명 · 라벨은 빌보드로 정립"
          }
          canvasRef={vectorRef}
          badge={forceRaster ? "RASTER FALLBACK · no rotation" : undefined}
        />
      </div>

      {/* 공통 지표 */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span className="font-mono text-white/70 text-sm">
          {stats.fps.toFixed(0)} FPS
        </span>
        <span>· 60FPS 기준 프레임 예산 16.6ms</span>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  dotClass,
  metricLabel,
  metricValue,
  metricNote,
  canvasRef,
  wrapRef,
  badge,
}: {
  title: string;
  subtitle: string;
  dotClass: string;
  metricLabel: string;
  metricValue: string;
  metricNote: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wrapRef?: React.RefObject<HTMLDivElement | null>;
  badge?: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <div>
            <div className="text-sm font-medium text-white">{title}</div>
            <div className="text-xs text-white/40">{subtitle}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/30 uppercase tracking-widest">
            {metricLabel}
          </div>
          <div className="text-sm font-mono text-white/80">{metricValue}</div>
        </div>
      </div>

      <div ref={wrapRef} className="relative aspect-square rounded-lg overflow-hidden bg-gray-950">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-orange-500/90 text-[10px] font-semibold text-white tracking-wide">
            {badge}
          </div>
        )}
      </div>

      <p className="text-xs text-white/30 leading-relaxed">{metricNote}</p>
    </div>
  );
}
