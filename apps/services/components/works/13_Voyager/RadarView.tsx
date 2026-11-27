"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EVENTS, LAUNCH, LIGHT_DAY_AT } from "./data";
import { auToKm, fmtKm, fmtLight, lightSec } from "./format";
import { sunAuAt } from "./horizons";
import { T, bodyName, useLang, type Lang } from "./i18n";
import { PLANET_ORBITS, pathUntil, planetAt, voyagerAt, type Vec3 } from "./trajectory";
import v from "./voyager.module.css";

// 거리 패널의 레이더 버전. 패널 전체를 단색 형광 화면으로 그린다.
// 태양 중심 황도 좌표로 보이저의 실제 3D 경로(Horizons). 축척은 태양~지금 보이저를 화면에 맞춘다.

const INK = "120 255 170";
const ink = (a: number) => `rgb(${INK} / ${a})`;
const LAUNCH_MS = Date.parse(LAUNCH);
const crossedAt = (id: string) => sunAuAt(Date.parse(EVENTS.find((e) => e.id === id)!.date), LAUNCH_MS, LIGHT_DAY_AT);
const BOUNDARIES: [number, "termination" | "heliopause"][] = [
  [crossedAt("termination-shock"), "termination"],
  [crossedAt("interstellar"), "heliopause"],
];
const NICE = [0.5, 1, 2, 5, 10, 20, 50, 100, 150, 200];

export default function RadarPanel({
  au,
  sunAu,
  ms,
  modeSwitch,
}: {
  au: number;
  sunAu: number;
  ms: number;
  modeSwitch: ReactNode;
}) {
  const lang = useLang();
  const t = T[lang];
  return (
    <section aria-label={t.radarLabel} className={`relative z-20 mx-3 mb-2 px-3 py-2 sm:mx-6 sm:px-4 ${v.radar}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums">
        <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
          <span className="opacity-70">DIST/EARTH</span>
          <span className={`text-[22px] leading-[1.5] font-bold ${v.radarGlow}`}>{fmtKm(auToKm(au), lang)}</span>
        </span>
        <span className="hidden opacity-70 sm:inline">{au.toFixed(au < 1 ? 3 : 1)} AU</span>
        <span className="shrink-0 whitespace-nowrap">
          <span className="opacity-70">LIGHT </span>
          {fmtLight(lightSec(au), lang)}
        </span>
        <span className="hidden opacity-70 sm:inline">SUN {sunAu.toFixed(1)} AU</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {modeSwitch}
        </span>
      </div>
      <RadarCanvas ms={ms} lang={lang} />
    </section>
  );
}

function RadarCanvas({ ms, lang }: { ms: number; lang: Lang }) {
  const tr = T[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const msRef = useRef(ms);
  const view = useRef({ az: -0.6, el: 0.55, drag: null as null | { x: number; y: number; az: number; el: number } });

  useEffect(() => {
    msRef.current = ms;
  }, [ms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(canvas).fontFamily || "monospace";
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const draw = (t: number) => {
      const now = msRef.current;
      const { az, el } = view.current;
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      const ce = Math.cos(el);
      const se = Math.sin(el);
      const cx = w / 2;
      const cy = h * 0.54;
      let scale = 1;
      // 판(z=0)을 az만큼 돌리고 el만큼 기울여 내려다본다(정사영)
      const P = (p: Vec3) => {
        const x = p.x * ca - p.y * sa;
        const y = p.x * sa + p.y * ca;
        return { x: cx + x * scale, y: cy - (y * se + p.z * ce) * scale };
      };
      const ring = (rad: number, alpha: number, dash: number[] = []) => {
        ctx.beginPath();
        for (let k = 0; k <= 96; k++) {
          const a = (k / 96) * Math.PI * 2;
          const p = P({ x: rad * Math.cos(a), y: rad * Math.sin(a), z: 0 });
          if (k) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        }
        ctx.setLineDash(dash);
        ctx.strokeStyle = ink(alpha);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      const label = (text: string, x: number, y: number, alpha: number, align: CanvasTextAlign = "left") => {
        ctx.fillStyle = ink(alpha);
        ctx.textAlign = align;
        ctx.fillText(text, x, y);
      };
      const dot = (p: { x: number; y: number }, size: number, alpha: number) => {
        ctx.fillStyle = ink(alpha);
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
      };
      const beam = (maxR: number) => {
        if (reduce) return;
        const b = (t / 2400) % (Math.PI * 2);
        for (let k = 0; k < 14; k++) {
          const a = b - k * 0.035;
          const p = P({ x: maxR * Math.cos(a), y: maxR * Math.sin(a), z: 0 });
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = ink(0.26 * (1 - k / 14));
          ctx.stroke();
        }
      };
      const pulse = (p: { x: number; y: number }) => {
        if (reduce) return;
        const k = (t / 1400) % 1;
        ctx.strokeStyle = ink(0.8 * (1 - k));
        ctx.strokeRect(p.x - 4 - k * 12, p.y - 4 - k * 12, 8 + k * 24, 8 + k * 24);
      };

      ctx.clearRect(0, 0, w, h);
      ctx.font = `11px ${font}`;
      ctx.lineWidth = 1;

      {
        const me = voyagerAt(now);
        const r = Math.hypot(me.x, me.y, me.z);
        scale = (Math.min(w, h * 1.9) * 0.44) / Math.max(r, 1.2);
        const maxR = Math.max(r, 1.2) * 1.15;
        for (const n of NICE.filter((n) => n <= maxR && n * scale > 14).slice(-4)) {
          ring(n, 0.16, [2, 4]);
          const p = P({ x: n, y: 0, z: 0 });
          label(`${n}AU`, p.x + 3, p.y - 3, 0.4);
        }
        beam(maxR);
        for (const [rad, name] of BOUNDARIES) {
          if (rad > maxR) continue;
          ring(rad, 0.35, [6, 4]);
          const p = P({ x: 0, y: -rad, z: 0 });
          label(tr[name], p.x, p.y + 12, 0.55, "center");
        }
        PLANET_ORBITS.forEach(([name, a], i) => {
          if (a * scale < 3) return;
          ring(a, name === "지구" ? 0.5 : 0.22);
          const p = P(planetAt(i, now));
          dot(p, 4, name === "지구" ? 1 : 0.75);
          if (a * scale > 18) label(bodyName(name, lang), p.x + 5, p.y - 4, 0.7);
        });
        const sun = P({ x: 0, y: 0, z: 0 });
        dot(sun, 6, 1);
        label(bodyName("태양", lang), sun.x + 6, sun.y + 12, 0.8);

        // 지나온 길(실선)과 황도면까지 내린 수직선(높이)
        const path = pathUntil(now).map(P);
        ctx.beginPath();
        path.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = ink(0.9);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.lineWidth = 1;
        const vp = P(me);
        const foot = P({ x: me.x, y: me.y, z: 0 });
        ctx.beginPath();
        ctx.moveTo(vp.x, vp.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = ink(0.6);
        ctx.stroke();
        ctx.setLineDash([]);
        dot(foot, 3, 0.6);
        dot(vp, 6, reduce ? 1 : 0.6 + 0.4 * Math.round((Math.sin(t / 250) + 1) / 2));
        pulse(vp);
        const lat = (Math.asin(me.z / Math.max(r, 1e-6)) * 180) / Math.PI;
        label("VOYAGER 1", vp.x + 9, vp.y - 6, 1);
        label(tr.aboveEcliptic(lat.toFixed(1)), vp.x + 9, vp.y + 7, 0.6);
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const id = reduce ? window.setInterval(() => requestAnimationFrame(draw), 200) : 0;
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      ro.disconnect();
    };
  }, [lang, tr]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    view.current.drag = { x: e.clientX, y: e.clientY, az: view.current.az, el: view.current.el };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = view.current.drag;
    if (!d) return;
    view.current.az = d.az + (e.clientX - d.x) * 0.01;
    view.current.el = Math.max(0.05, Math.min(1.5, d.el + (e.clientY - d.y) * 0.01));
  };
  const onPointerUp = () => {
    view.current.drag = null;
  };

  return (
    <div className="relative mt-1">
      <canvas
        ref={canvasRef}
        className="block h-32 w-full cursor-grab touch-none active:cursor-grabbing sm:h-52"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={tr.radarAria}
      />
      <span className="pointer-events-none absolute top-1 right-1 opacity-60">{tr.dragToRotate}</span>
    </div>
  );
}
