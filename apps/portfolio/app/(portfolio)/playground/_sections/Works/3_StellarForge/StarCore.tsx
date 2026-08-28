"use client";

import { useEffect, useRef } from "react";
import { Fate, Phase } from "./useFactory";

// 거대 질량별의 실제 일생에 맞춘 단계별 외형.
// 주계열성은 '수소 연소(H→He)' 단계 = 헬륨이 생산되는 tier 2.
// 이후 헬륨 연소(He→C)부터 주계열을 벗어나 팽창하며 식어 붉어진다(적색거성→적색 초거성).
const TIER_VIS: Record<number, { grow: number; rgb: [number, number, number] }> = {
  1: { grow: 0.04, rgb: [176, 124, 255] }, // 성운(가스) — 아직 점화 전
  2: { grow: 0.3, rgb: [175, 205, 255] }, // 주계열성(청백색, 수소 연소)
  3: { grow: 0.5, rgb: [255, 196, 120] }, // 적색거성(헬륨 연소 시작, 팽창)
  4: { grow: 0.62, rgb: [255, 160, 95] }, // 적색거성
  5: { grow: 0.76, rgb: [255, 120, 75] }, // 적색 초거성
  6: { grow: 0.86, rgb: [255, 100, 66] }, // 적색 초거성
  7: { grow: 0.94, rgb: [255, 84, 58] }, // 적색 초거성
  8: { grow: 1.0, rgb: [240, 70, 52] }, // 철 코어(붕괴 직전)
};

const STAGE: Record<number, string> = {
  1: "성운",
  2: "주계열성",
  3: "적색거성",
  4: "적색거성",
  5: "적색 초거성",
  6: "적색 초거성",
  7: "적색 초거성",
  8: "철 코어",
};

interface Particle {
  a: number;
  rr: number;
  spd: number;
  size: number;
  tw: number;
}

interface StarCoreProps {
  tier: number; // 1~8
  phase: Phase;
  fate: Fate | null;
  solarMass: number | null;
}

export default function StarCore({
  tier,
  phase,
  fate,
  solarMass,
}: StarCoreProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const target = useRef({ tier, phase, fate });
  useEffect(() => {
    target.current = { tier, phase, fate };
  }, [tier, phase, fate]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    let grow = 0;
    let rgb: [number, number, number] = [176, 124, 255];
    let nova = 0; // 초신성 섬광 0~1
    let remnant = 0; // 잔해 단계 0~1

    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      a: Math.random() * Math.PI * 2,
      rr: 0.2 + Math.random() * 0.8,
      spd: (0.1 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1),
      size: 0.6 + Math.random() * 1.5,
      tw: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      t += 0.016;
      const { tier: tr, phase: ph, fate: ft } = target.current;
      const vis = TIER_VIS[tr] ?? TIER_VIS[1];

      // 목표값 보간
      grow += (vis.grow - grow) * 0.04;
      rgb = [
        rgb[0] + (vis.rgb[0] - rgb[0]) * 0.05,
        rgb[1] + (vis.rgb[1] - rgb[1]) * 0.05,
        rgb[2] + (vis.rgb[2] - rgb[2]) * 0.05,
      ];
      nova += ((ph === "supernova" ? 1 : 0) - nova) * 0.12;
      // 잔해는 천천히 떠올라 섬광(nova)이 먼저 보이게 한다
      remnant += ((ph === "supernova" ? 1 : 0) - remnant) * 0.02;

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) / 2;
      const [cr, cg, cb] = rgb.map(Math.round) as [number, number, number];

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // ===== 잔해(초신성 직후) — 섬광이 지난 뒤 떠오른다 =====
      if (remnant > 0.6) {
        // 흩어지는 초신성 잔해 껍질
        const shellR = R * (0.4 + remnant * 0.55);
        const sg = ctx.createRadialGradient(
          cx,
          cy,
          shellR * 0.7,
          cx,
          cy,
          shellR,
        );
        sg.addColorStop(0, "rgba(120,160,255,0)");
        sg.addColorStop(0.7, `rgba(150,180,255,${0.12 * (1 - remnant * 0.4)})`);
        sg.addColorStop(1, "rgba(200,120,255,0)");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, shellR, 0, Math.PI * 2);
        ctx.fill();

        if (ft === "bh") {
          // 블랙홀: 강착원반 + 어두운 중심
          const ringR = R * 0.22;
          for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2 + t * 0.8;
            const wob = 0.85 + 0.15 * Math.sin(a * 3 + t * 2);
            const x = cx + Math.cos(a) * ringR * 1.5 * wob;
            const y = cy + Math.sin(a) * ringR * 0.5 * wob;
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, Math.PI * 2);
            const hot = 0.5 + 0.5 * Math.sin(a + t * 2);
            ctx.fillStyle = `rgba(255,${160 + hot * 80},${80 + hot * 60},0.8)`;
            ctx.fill();
          }
          const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR * 1.8);
          gg.addColorStop(0, "rgba(255,180,90,0.25)");
          gg.addColorStop(1, "rgba(255,180,90,0)");
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR * 1.8, 0, Math.PI * 2);
          ctx.fill();
          // 사건의 지평선
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#000008";
          ctx.beginPath();
          ctx.arc(cx, cy, ringR * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "lighter";
        } else {
          // 중성자별: 작고 강렬한 청백색 + 회전 빔(펄사)
          const beat = 0.7 + 0.3 * Math.sin(t * 6);
          const coreR = R * 0.07;
          for (let k = 0; k < 2; k++) {
            const a = t * 1.6 + k * Math.PI;
            const len = R * 0.9;
            const x2 = cx + Math.cos(a) * len;
            const y2 = cy + Math.sin(a) * len;
            const bg = ctx.createLinearGradient(cx, cy, x2, y2);
            bg.addColorStop(0, `rgba(190,220,255,${0.5 * beat})`);
            bg.addColorStop(1, "rgba(190,220,255,0)");
            ctx.strokeStyle = bg;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 5);
          ng.addColorStop(0, `rgba(220,235,255,${0.9 * beat})`);
          ng.addColorStop(0.4, "rgba(150,190,255,0.3)");
          ng.addColorStop(1, "rgba(150,190,255,0)");
          ctx.fillStyle = ng;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath();
          ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        raf = requestAnimationFrame(draw);
        return;
      }

      // ===== 가스 입자(성운) =====
      const spread = R * (0.96 - grow * 0.45);
      const dim = (0.45 - grow * 0.22) * (1 - nova * 0.8);
      if (dim > 0.01) {
        for (const p of particles) {
          p.a += p.spd * 0.016 * (0.6 + grow);
          const rr = p.rr * spread * (1 - grow * 0.35 * (1 - p.rr));
          const x = cx + Math.cos(p.a) * rr;
          const y = cy + Math.sin(p.a) * rr * 0.92;
          const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.tw);
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${dim * tw})`;
          ctx.fill();
        }
      }

      // ===== 초신성 충격파 =====
      if (nova > 0.02) {
        const shock = R * (0.2 + nova * 1.4);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - nova)})`;
        ctx.lineWidth = 2 + nova * 6;
        ctx.beginPath();
        ctx.arc(cx, cy, shock, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ===== 코어 + 코로나 =====
      const flick = tr >= 8 ? 0.06 * Math.sin(t * 9) : 0;
      const coreR =
        R * (0.05 + grow * 0.4) * (1 + 0.04 * Math.sin(t * 1.6) + flick) +
        R * nova * 0.5;
      const glowR = coreR * (3.2 + nova * 4);
      const novaW = nova; // 초신성 시 흰빛/청백색으로
      const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      og.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.5 + nova * 0.5})`);
      og.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, 0.14)`);
      og.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      if (grow > 0.02 || nova > 0.01) {
        const cg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        cg2.addColorStop(0, "rgba(255,255,255,0.95)");
        cg2.addColorStop(
          0.55,
          `rgba(${Math.min(255, cr + 70 + novaW * 120)}, ${Math.min(255, cg + 70 + novaW * 120)}, ${Math.min(255, cb + 80 + novaW * 120)}, 0.95)`,
        );
        cg2.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0.9)`);
        ctx.fillStyle = cg2;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 코로나 광선
      if (grow > 0.32 && nova < 0.2) {
        const rays = 6;
        const len = coreR * 1.6;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < rays; i++) {
          const ang = t * 0.3 + (i / rays) * Math.PI * 2;
          const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
          const x2 = cx + Math.cos(ang) * (coreR + len * pulse);
          const y2 = cy + Math.sin(ang) * (coreR + len * pulse);
          const rg = ctx.createLinearGradient(cx, cy, x2, y2);
          rg.addColorStop(0, `rgba(255,255,255,${0.3 * (grow - 0.32)})`);
          rg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.strokeStyle = rg;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const label =
    phase === "supernova"
      ? fate === "bh"
        ? "블랙홀 🕳️"
        : fate === "ns"
          ? "중성자별 ✦"
          : "초신성 폭발"
      : (STAGE[tier] ?? "성운");

  const sub =
    phase === "supernova" && solarMass != null
      ? `질량 ~${solarMass} M☉`
      : "별의 진화";

  return (
    <div className="flex w-full flex-col items-center">
      <div
        ref={wrapRef}
        className="relative aspect-square w-full max-w-[10rem] sm:max-w-[13rem] md:max-w-[15rem]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
        {sub}
      </p>
      <p className="text-base font-bold text-white">{label}</p>
    </div>
  );
}
