"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number; // 깊이(0~1)
  tw: number; // 반짝임 위상
}
interface Blob {
  x: number;
  y: number;
  r: number;
  hue: string;
  ph: number;
  dx: number;
  dy: number;
}
interface Shoot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  len: number;
}

const NEON = [
  "#7c3aed",
  "#db2777",
  "#0ea5e9",
  "#2563eb",
  "#c026d3",
  "#06b6d4",
  "#6d28d9",
];

function hexA(hex: string, a: number) {
  const m = hex.replace("#", "");
  const n = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((x) => x + x)
          .join("")
      : m,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** 화려한 우주 배경 — 다층 네온 성운 + 별빛 + 별똥별. */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    let stars: Star[] = [];
    let blobs: Blob[] = [];
    let shoots: Shoot[] = [];
    let nebula: HTMLCanvasElement | null = null;

    const pick = () => NEON[Math.floor(Math.random() * NEON.length)];

    // 정적인 성운 구름을 오프스크린에 한 번만 그려 베이스로 사용
    const buildNebula = () => {
      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext("2d");
      if (!o) return null;
      o.scale(dpr, dpr);
      o.fillStyle = "#04050d";
      o.fillRect(0, 0, w, h);
      o.globalCompositeOperation = "lighter";
      const clouds = Math.round((w * h) / 70000) + 7;
      for (let i = 0; i < clouds; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const rad = Math.min(w, h) * (0.22 + Math.random() * 0.5);
        const col = pick();
        const g = o.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, hexA(col, 0.18 + Math.random() * 0.14));
        g.addColorStop(0.45, hexA(col, 0.06));
        g.addColorStop(1, hexA(col, 0));
        o.fillStyle = g;
        o.beginPath();
        o.arc(cx, cy, rad, 0, Math.PI * 2);
        o.fill();
      }
      o.globalCompositeOperation = "source-over";
      return off;
    };

    const seed = () => {
      const count = Math.round((w * h) / 4200);
      stars = Array.from(
        { length: Math.max(80, Math.min(280, count)) },
        () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          tw: Math.random() * Math.PI * 2,
        }),
      );
      blobs = Array.from({ length: 3 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.min(w, h) * (0.3 + Math.random() * 0.25),
        hue: pick(),
        ph: Math.random() * Math.PI * 2,
        dx: (Math.random() - 0.5) * 0.09,
        dy: (Math.random() - 0.5) * 0.09,
      }));
      shoots = [];
      nebula = buildNebula();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      t += 0.016;

      // 베이스(성운) — 불투명이라 이전 프레임을 덮어 clear 역할까지 한다
      if (nebula) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(nebula, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.fillStyle = "#04050d";
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = "lighter";

      // 천천히 흐르며 맥동하는 글로우 구름
      for (const b of blobs) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.4 + b.ph);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.hue, 0.1 * pulse + 0.03));
        g.addColorStop(0.6, hexA(b.hue, 0.015));
        g.addColorStop(1, hexA(b.hue, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 별빛
      for (const s of stars) {
        s.y -= 0.03 + s.z * 0.16;
        if (s.y < 0) {
          s.y = h;
          s.x = Math.random() * w;
        }
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + s.z * 2) + s.tw);
        const size = 0.4 + s.z * 1.8;
        const alpha = (0.2 + s.z * 0.6) * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${200 + s.z * 55}, ${215 + s.z * 40}, 255, ${alpha})`;
        ctx.fill();
        // 밝은 별엔 십자 광채
        if (s.z > 0.82) {
          const gl = size * 4.5 * tw;
          ctx.strokeStyle = `rgba(220, 230, 255, ${alpha * 0.5})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(s.x - gl, s.y);
          ctx.lineTo(s.x + gl, s.y);
          ctx.moveTo(s.x, s.y - gl);
          ctx.lineTo(s.x, s.y + gl);
          ctx.stroke();
        }
      }

      // 별똥별
      if (Math.random() < 0.006 && shoots.length < 2) {
        const fromLeft = Math.random() < 0.5;
        shoots.push({
          x: fromLeft ? 0 : w,
          y: Math.random() * h * 0.55,
          vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 3),
          vy: 1.4 + Math.random() * 1.6,
          life: 1,
          len: 110 + Math.random() * 90,
        });
      }
      shoots = shoots.filter((sh) => {
        sh.x += sh.vx * 4;
        sh.y += sh.vy * 4;
        sh.life -= 0.012;
        if (sh.life <= 0) return false;
        const ang = Math.atan2(sh.vy, sh.vx);
        const tx = sh.x - Math.cos(ang) * sh.len;
        const ty = sh.y - Math.sin(ang) * sh.len;
        const g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * sh.life})`);
        g.addColorStop(0.4, `rgba(180, 200, 255, ${0.4 * sh.life})`);
        g.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        return sh.x > -220 && sh.x < w + 220 && sh.y < h + 220;
      });

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
