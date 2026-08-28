"use client";

import { Info, RotateCcw, Sparkles, X, Zap } from "lucide-react";
import { useState } from "react";
import { ELEMENTS } from "./elements";
import {
  BASE_ELEMENTS,
  FE_CORE_LIMIT,
  GRAV_K,
  HEAVY_METALS,
  MASS_PER_SOLAR,
  REACTORS,
  reactorCost,
} from "./factory";
import StarCore from "./StarCore";
import Starfield from "./Starfield";
import { maxTierOf, useFactory } from "./useFactory";

const ELEM_BY_SYM = Object.values(ELEMENTS).reduce(
  (acc, e) => {
    acc[e.symbol] = e;
    return acc;
  },
  {} as Record<string, (typeof ELEMENTS)[number]>,
);

const HEAVY_BY_SYM = HEAVY_METALS.reduce(
  (acc, h) => {
    acc[h.sym] = h;
    return acc;
  },
  {} as Record<string, (typeof HEAVY_METALS)[number]>,
);

function fmt(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";
  if (n < 1000) return n < 10 ? n.toFixed(1) : Math.floor(n).toString();
  const u = ["k", "M", "B", "T", "Qa", "Qi", "Sx"];
  let i = -1;
  let x = n;
  while (x >= 1000 && i < u.length - 1) {
    x /= 1000;
    i++;
  }
  return (
    (x < 10
      ? x.toFixed(2)
      : x < 100
        ? x.toFixed(1)
        : Math.floor(x).toString()) + u[i]
  );
}

const colorOf = (sym: string) =>
  ELEM_BY_SYM[sym]?.color ?? HEAVY_BY_SYM[sym]?.color ?? "#fff";
const nameOf = (sym: string) =>
  ELEM_BY_SYM[sym]?.name ?? HEAVY_BY_SYM[sym]?.name ?? sym;

export default function StellarForge() {
  const { s, offline, tap, build, reset, dismissOffline } = useFactory();
  const [showInfo, setShowInfo] = useState(false);
  const [floats, setFloats] = useState<{ id: number; x: number }[]>([]);

  const tier = maxTierOf(s.produced);
  const fe = s.res.Fe ?? 0;
  const solar = Math.round(s.mass / MASS_PER_SOLAR);
  const gravity = s.mass * GRAV_K;
  const contracting = s.produced.He && s.power < gravity;
  const cosmicOwned = HEAVY_METALS.filter((h) => (s.cosmic[h.sym] ?? 0) > 0);

  const onTapStar = () => {
    if (s.phase !== "living") return;
    tap();
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, x: 28 + Math.random() * 44 }]);
    window.setTimeout(
      () => setFloats((f) => f.filter((z) => z.id !== id)),
      750,
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#05060f] font-sans text-white">
      <Keyframes />
      <Starfield />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 95% at 50% 40%, transparent 42%, rgba(2,2,8,0.6) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* 헤더 */}
        <div className="shrink-0 border-b border-white/8 px-3 pt-3 pb-2 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h1 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
                <Sparkles className="h-4 w-4 text-indigo-300" />
                별들은 굉장한 빛메이커이다
              </h1>
              <p className="text-[10px] text-indigo-200/50">
                세대 #{s.generation} · 실시간 항성 시뮬레이션
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1">
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-sm font-bold tabular-nums text-amber-100">
                  {fmt(s.energy)}
                </span>
              </div>
              <button
                onClick={() => setShowInfo(true)}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="정보"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BASE_ELEMENTS.map((sym) => (
              <ResChip
                key={sym}
                sym={sym}
                amount={s.res[sym] ?? 0}
                active={s.produced[sym] || (s.res[sym] ?? 0) > 0}
              />
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* 별 + 바이탈 */}
          <div className="relative flex shrink-0 flex-col items-center gap-2 px-3 py-3 sm:w-[46%] sm:py-4">
            <button
              onClick={onTapStar}
              disabled={s.phase !== "living"}
              className="relative flex w-full flex-col items-center outline-none"
              style={{ cursor: s.phase === "living" ? "pointer" : "default" }}
              aria-label="수소 채집"
            >
              <StarCore
                tier={tier}
                phase={s.phase}
                fate={s.fate}
                solarMass={s.solarMass}
              />
              {floats.map((f) => (
                <span
                  key={f.id}
                  className="pointer-events-none absolute top-1/3 text-sm font-bold text-indigo-200"
                  style={{
                    left: `${f.x}%`,
                    animation: "sf-float 750ms ease-out forwards",
                  }}
                >
                  +H
                </span>
              ))}
            </button>

            {/* 바이탈 */}
            <div className="w-full max-w-[16rem] space-y-1.5">
              <StabilityBar value={s.stability} ignited={!!s.produced.He} />
              <div className="flex items-center justify-between text-[11px] text-white/55">
                <span>
                  질량 <b className="text-white/80">~{fmt(solar)} M☉</b>
                </span>
                <span
                  className={
                    contracting ? "text-rose-300" : "text-emerald-300/80"
                  }
                >
                  {!s.produced.He
                    ? "점화 대기"
                    : contracting
                      ? "● 수축 중"
                      : "● 평형 안정"}
                </span>
              </div>
              {fe > 0 && (
                <IronCore value={fe} limit={FE_CORE_LIMIT} fmt={fmt} />
              )}
              {cosmicOwned.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-white/35">🌌 흩뿌림</span>
                  {cosmicOwned.map((h) => (
                    <span
                      key={h.sym}
                      className="flex items-center gap-1 text-[10px]"
                      title={h.name}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: h.color }}
                      />
                      <span className="tabular-nums text-white/55">
                        {fmt(s.cosmic[h.sym] ?? 0)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {s.phase === "living" && (
              <p className="text-[11px] text-white/40">
                별(성운)을 탭해 수소를 채집
              </p>
            )}
          </div>

          {/* 반응로 목록 */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-white/8 sm:border-l sm:border-t-0">
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-4">
              {REACTORS.map((r) => {
                const owned = s.owned[r.id] ?? 0;
                const unlocked = r.unlock === null || !!s.tech[r.unlock];
                if (!unlocked) {
                  return <LockedRow key={r.id} name={r.name} need={r.unlock} />;
                }
                const cost = reactorCost(r, owned);
                const afford = s.energy >= cost && s.phase === "living";
                const accent = colorOf(r.outputs[0].el);
                return (
                  <button
                    key={r.id}
                    onClick={() => build(r.id)}
                    disabled={!afford}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      afford
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-white/5 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        background: accent,
                        color: ELEM_BY_SYM[r.outputs[0].el]?.text ?? "#000",
                        boxShadow: `0 0 12px ${accent}66`,
                      }}
                    >
                      {r.outputs[0].el}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="truncate text-[13px] font-semibold">
                          {r.name}
                        </span>
                        <span className="text-[11px] text-white/40">
                          ×{owned}
                        </span>
                      </div>
                      <p className="truncate font-mono text-[10.5px] text-indigo-200/55">
                        {r.desc}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-200">
                        <Zap className="h-3 w-3" />
                        {fmt(cost)}
                      </span>
                      <span className="text-[10px] text-white/35">건설</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 초신성 연출 (일시적 · 자동 환생) */}
      {s.phase === "supernova" && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-6"
          style={{ animation: "sf-fade 300ms ease-out" }}
        >
          <div className="text-center">
            <p
              className="text-2xl font-black tracking-tight text-white"
              style={{
                animation: "sf-pop 500ms ease-out",
                textShadow: "0 0 30px rgba(255,255,255,0.85)",
              }}
            >
              💥 초신성 폭발!
            </p>
            <p className="mt-1 text-sm text-indigo-100/85">
              {s.reason === "iron" ? "철 코어 붕괴" : "중력 붕괴"} ·{" "}
              {s.fate === "bh" ? "블랙홀" : "중성자별"} 탄생 (~
              {fmt(s.solarMass ?? 0)} M☉)
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              중원소를 우주로 흩뿌리고 새 성운에서 다시 태어납니다…
            </p>
          </div>
        </div>
      )}

      {/* 방치 보상 토스트 */}
      {offline && (
        <div
          className="absolute inset-x-0 top-3 z-40 mx-auto w-fit max-w-[90%] rounded-full border border-white/15 bg-[#0a0c1a]/90 px-4 py-2 text-center shadow-xl"
          style={{ animation: "sf-drop 320ms ease-out" }}
        >
          <p className="text-[12px] text-indigo-100/90">
            🌙 방치 {fmtTime(offline.seconds)} 동안{" "}
            <span className="font-bold text-amber-200">
              ⚡{fmt(offline.energy)}
            </span>{" "}
            생산
          </p>
          <button
            onClick={dismissOffline}
            className="mt-0.5 text-[10px] text-white/40 underline"
          >
            닫기
          </button>
        </div>
      )}

      {showInfo && (
        <InfoPanel onClose={() => setShowInfo(false)} onReset={reset} />
      )}
    </div>
  );
}

function StabilityBar({ value, ignited }: { value: number; ignited: boolean }) {
  const pct = Math.round(value * 100);
  const color = value > 0.5 ? "#34d399" : value > 0.2 ? "#fbbf24" : "#fb7185";
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px]">
        <span className="text-white/45">안정도 (복사압 ↔ 중력)</span>
        <span className="tabular-nums" style={{ color }}>
          {ignited ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{
            width: ignited ? `${pct}%` : "100%",
            background: ignited ? color : "rgba(255,255,255,0.2)",
            boxShadow: ignited ? `0 0 10px ${color}` : "none",
          }}
        />
      </div>
    </div>
  );
}

function IronCore({
  value,
  limit,
  fmt: f,
}: {
  value: number;
  limit: number;
  fmt: (n: number) => string;
}) {
  const pct = Math.min(100, (value / limit) * 100);
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px]">
        <span className="text-rose-200/70">☢ 철 코어</span>
        <span className="tabular-nums text-rose-200/70">
          {f(value)} / {f(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ResChip({
  sym,
  amount,
  active,
}: {
  sym: string;
  amount: number;
  active: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-opacity ${
        active ? "border-white/10 bg-white/5" : "border-white/5 opacity-30"
      }`}
      title={nameOf(sym)}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: colorOf(sym),
          boxShadow: `0 0 6px ${colorOf(sym)}`,
        }}
      />
      <span className="text-[11px] font-semibold">{sym}</span>
      <span className="text-[11px] tabular-nums text-white/55">
        {fmt(amount)}
      </span>
    </div>
  );
}

function LockedRow({ name, need }: { name: string; need: string | null }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/8 px-3 py-2 opacity-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40">
        🔒
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-semibold text-white/60">{name}</span>
        <p className="text-[11px] text-white/35">
          {need ? `${nameOf(need)}(${need})를 생산하면 해금` : "해금됨"}
        </p>
      </div>
    </div>
  );
}

function InfoPanel({
  onClose,
  onReset,
}: {
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(5,6,15,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[88%] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0a0c1a] p-5 sm:max-w-md sm:rounded-2xl"
        style={{ animation: "sf-rise 280ms cubic-bezier(0.2,0.8,0.3,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-bold">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            항성 시뮬레이션
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-[13px] leading-relaxed text-indigo-100/70">
          별은 <b>중력</b>과 <b>융합이 내는 복사압</b>의 줄다리기로 버팁니다.
          성운을 탭해 수소를 모으고 반응로를 지어 융합을 유지하세요. 융합 출력이
          중력을 못 따라가면 <b>안정도</b>가 떨어지고 별이 수축합니다. 속도
          업그레이드는 없습니다 — 반응로를 <b>많이</b> 지으세요.
        </p>
        <p className="mb-3 text-[13px] leading-relaxed text-indigo-100/70">
          별은 헬륨이 생기는 순간부터 <b>주계열성</b>이 되고, 헬륨 연소부터
          적색거성·적색 초거성으로 늙어갑니다. <b>철 코어가 한계를 넘거나</b>{" "}
          안정도가 0이 되면 <b>초신성</b>이 자동으로 터집니다 — 끝이 아니라,
          r-과정으로 금·백금·우라늄을 흩뿌리고 새 성운에서 다음 세대 별이
          태어납니다. (반응로와 에너지는 세대가 바뀌어도 유지됩니다.)
        </p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {REACTORS.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                style={{
                  background: colorOf(r.outputs[0].el),
                  color: ELEM_BY_SYM[r.outputs[0].el]?.text ?? "#000",
                }}
              >
                {r.outputs[0].el}
              </span>
              <span className="text-[12px] font-semibold">{r.name}</span>
              <span className="ml-auto font-mono text-[11px] text-indigo-200/55">
                {r.desc}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            if (
              window.confirm(
                "모든 진행(반응로·에너지·세대·누적 중원소)을 초기화할까요?",
              )
            ) {
              onReset();
              onClose();
            }
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[12px] text-white/60 transition-colors hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          전체 초기화
        </button>
      </div>
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes sf-float {
        0% { transform: translateY(0); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateY(-32px); opacity: 0; }
      }
      @keyframes sf-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes sf-pop {
        0% { transform: scale(0.4); opacity: 0; }
        60% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes sf-rise {
        from { transform: translateY(24px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes sf-drop {
        from { transform: translateY(-16px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );
}

function fmtTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}초`;
  if (sec < 3600) return `${Math.round(sec / 60)}분`;
  return `${(sec / 3600).toFixed(1)}시간`;
}
