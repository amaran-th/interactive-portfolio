import type { CSSProperties } from "react";
import v from "./voyager.module.css";

// 1광일 돌파 지점에 섰을 때 터지는 도트 폭죽과 흩날리는 색종이.
// 렌더 중 Math.random을 쓰지 않도록 고정 시드로 한 번만 만들어 둔다.

const COLORS = ["#f8d878", "#f85898", "#3cbcfc", "#58d858", "#f4f4f8", "#f8a838"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Spark = { x: number; y: number; dx: number; dy: number; color: string; delay: number; size: number };
type Flake = { x: number; color: string; delay: number; dur: number; drift: number; size: number };

const SPARKS: Spark[] = (() => {
  const r = rng(18);
  const bursts = [
    { x: 22, y: 26, delay: 0 },
    { x: 76, y: 20, delay: 0.5 },
    { x: 50, y: 12, delay: 1.0 },
    { x: 34, y: 38, delay: 1.6 },
    { x: 66, y: 40, delay: 2.1 },
  ];
  return bursts.flatMap((b, bi) =>
    Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2 + r() * 0.3;
      const dist = 60 + r() * 60;
      return {
        x: b.x,
        y: b.y,
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist,
        color: COLORS[(bi + i) % COLORS.length],
        delay: b.delay,
        size: r() < 0.3 ? 6 : 4,
      };
    }),
  );
})();

const FLAKES: Flake[] = (() => {
  const r = rng(1118);
  return Array.from({ length: 40 }, (_, i) => ({
    x: r() * 100,
    color: COLORS[i % COLORS.length],
    delay: r() * 3,
    dur: 3 + r() * 2.5,
    drift: (r() - 0.5) * 80,
    size: r() < 0.5 ? 4 : 6,
  }));
})();

export default function Celebration() {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 z-[15] overflow-hidden ${v.celebrate}`}>
      {SPARKS.map((s, i) => (
        <span
          key={`s${i}`}
          className={v.spark}
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              animationDelay: `${s.delay}s`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
            } as CSSProperties
          }
        />
      ))}
      {FLAKES.map((f, i) => (
        <span
          key={`f${i}`}
          className={v.flake}
          style={
            {
              left: `${f.x}%`,
              width: f.size,
              height: f.size * 1.5,
              background: f.color,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.dur}s`,
              "--drift": `${f.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
