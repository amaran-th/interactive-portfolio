"use client";

import { useEffect, useState } from "react";
import { EVENTS, LAUNCH, LIGHT_DAY_AT } from "./data";
import RadarPanel from "./RadarView";
import { auToKm, fmtKm, fmtLight, lightSec } from "./format";
import { sunAuAt } from "./horizons";
import { T, bodyName, useLang } from "./i18n";
import { Sprite, type SpriteName } from "./sprites";
import v from "./voyager.module.css";

// 거리 패널. 숫자는 지구에서 잰 거리, 아래 지도는 태양(왼쪽 끝)부터 지금 보이저(오른쪽 끝)까지를
// 실제 비율로 펼친다. 지구는 그 사이의 출발점이고, 보이저가 멀어질수록 행성들이 왼쪽으로 모인다.
// 행성 위치는 태양에서 잰 평균 궤도 반지름(AU), 보이저 위치는 Horizons의 태양 거리(r)다.

/** row: 막대 위(-1)·아래(1). 지도에서 너무 붙으면(DOT_BELOW 미만) 아이콘 대신 막대 위 점으로 찍는다 */
const PLANETS: { name: string; sprite: SpriteName; au: number; row: -1 | 1; color: string }[] = [
  { name: "수성", sprite: "mercury", au: 0.387, row: -1, color: "#a8a8b8" },
  { name: "금성", sprite: "venus", au: 0.723, row: -1, color: "#f8e0a8" },
  { name: "지구", sprite: "earth", au: 1, row: 1, color: "#3c8cfc" },
  { name: "화성", sprite: "mars", au: 1.524, row: -1, color: "#e86838" },
  { name: "목성", sprite: "jupiter", au: 5.203, row: -1, color: "#d89058" },
  { name: "토성", sprite: "saturn", au: 9.537, row: 1, color: "#f8d878" },
  { name: "천왕성", sprite: "uranus", au: 19.19, row: -1, color: "#a8f0f0" },
  { name: "해왕성", sprite: "neptune", au: 30.07, row: 1, color: "#3c6cfc" },
];
const DOT_BELOW = 0.07;

// 태양권 경계는 보이저 1호가 실제로 넘은 날의 태양 거리라, 지도 끝(보이저)이 경계에 닿는 순간과 연대기가 맞는다
const LAUNCH_MS = Date.parse(LAUNCH);
const crossedAt = (id: string) => sunAuAt(Date.parse(EVENTS.find((e) => e.id === id)!.date), LAUNCH_MS, LIGHT_DAY_AT);
const TERMINATION_AU = crossedAt("termination-shock");
const HELIOPAUSE_AU = crossedAt("interstellar");
const KUIPER: [number, number] = [30, 50];

export default function DistancePanel({ au, sunAu, ms }: { au: number; sunAu: number; ms: number }) {
  // 비교용 두 보기: 막대(실제 비율 1차원)와 레이더(실제 3D 경로)
  const [mode, setMode] = useState<"bar" | "radar">("bar");
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)");
    const showBarOnMobile = () => {
      if (mobile.matches) setMode("bar");
    };
    showBarOnMobile();
    mobile.addEventListener("change", showBarOnMobile);
    return () => mobile.removeEventListener("change", showBarOnMobile);
  }, []);
  const lang = useLang();
  const t = T[lang];
  const nm = (ko: string) => bodyName(ko, lang);
  const modeSwitch = (radar: boolean) => (
    <span className="hidden gap-1 sm:flex" role="group" aria-label={t.viewMode}>
      {(
        [
          ["bar", t.bar],
          ["radar", t.radar],
        ] as const
      ).map(([k, label]) => (
        <button key={k} type="button" className={radar ? v.radarBtn : `${v.tab} px-2`} aria-pressed={mode === k} onClick={() => setMode(k)}>
          {label}
        </button>
      ))}
    </span>
  );
  if (mode === "radar") return <RadarPanel au={au} sunAu={sunAu} ms={ms} modeSwitch={modeSwitch(true)} />;
  const scale = sunAu;
  const f = (x: number) => Math.min(x, scale) / scale;
  const pct = (x: number) => `${f(x) * 100}%`;
  const earth = f(1);

  return (
    <section aria-label={t.distLabel} className={`relative z-20 mx-3 mb-2 px-3 py-2 sm:mx-6 sm:px-4 ${v.frame}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 tabular-nums">
        <span className="font-bold text-[var(--yellow)]">{t.fromEarth}</span>
        <span className="text-[24px] leading-[1.5] font-bold text-[var(--cyan)]">{fmtKm(auToKm(au), lang)}</span>
        <span className="hidden text-[var(--mute)] sm:inline">{au.toFixed(au < 1 ? 3 : 1)} AU</span>
        <span>
          <span className="text-[var(--mute)]">{t.byLight}</span>
          <b>{fmtLight(lightSec(au), lang)}</b>
        </span>
        <span className="hidden text-[var(--mute)] sm:inline">{t.fromSun(sunAu.toFixed(1))}</span>
        <span className="ml-auto">{modeSwitch(false)}</span>
      </div>


      {/* 태양 ─ 지구(출발) ─ 보이저(지금), 실제 비율 */}
      <div className="mt-1 flex items-center gap-1.5">
        <span title={nm("태양")} className="flex flex-col items-center leading-none text-[var(--mute)]">
          <Sprite name="sun" scale={2} />
        </span>
        <div className="relative h-14 min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2" style={{ background: "#14163a", boxShadow: "0 0 0 2px var(--ink)" }}>
            {scale > KUIPER[0] && (
              <span
                className="absolute inset-y-0"
                style={{
                  left: pct(KUIPER[0]),
                  width: `${(f(KUIPER[1]) - f(KUIPER[0])) * 100}%`,
                  background: "repeating-linear-gradient(90deg, #4a4e9c 0 2px, transparent 2px 4px)",
                }}
                title={t.kuiperTitle}
              />
            )}
            {scale > HELIOPAUSE_AU && (
              <span className="absolute inset-y-0 right-0" style={{ left: pct(HELIOPAUSE_AU), background: "#0a0b20" }} title={t.interstellar} />
            )}
            {/* 지구에서 지금까지 온 길: 점선이 오른쪽(보이저 쪽)으로 흐르고 끝으로 갈수록 밝아진다 */}
            <span className={`absolute inset-y-0 ${v.trail}`} style={{ left: `${earth * 100}%`, right: 0 }} />
            {PLANETS.filter((p) => p.au < scale && f(p.au) < DOT_BELOW && p.name !== "지구").map((p) => (
              <span
                key={p.name}
                className="absolute top-1/2 hidden size-1 -translate-x-1/2 -translate-y-1/2 sm:block"
                style={{ left: pct(p.au), background: p.color }}
                title={`${nm(p.name)} ${p.au}AU`}
              />
            ))}
          </div>

          {scale > TERMINATION_AU && <Tick at={f(TERMINATION_AU)} label={t.termination} side="top" />}
          {scale > HELIOPAUSE_AU && <Tick at={f(HELIOPAUSE_AU)} label={t.heliopause} side="bottom" />}
          {scale > HELIOPAUSE_AU + 15 && (
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[var(--mute)]" style={{ left: `${((f(HELIOPAUSE_AU) + 1) / 2) * 100}%` }}>
              {t.interstellar}
            </span>
          )}
          {f(KUIPER[1]) - f(KUIPER[0]) > 0.15 && (
            <span className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[var(--mute)]" style={{ left: `${((f(KUIPER[0]) + f(KUIPER[1])) / 2) * 100}%` }}>
              {t.kuiper}
            </span>
          )}

          {PLANETS.filter((p) => p.au < scale && f(p.au) >= DOT_BELOW && p.name !== "지구").map((p) => (
            <span
              key={p.name}
              className={`absolute hidden -translate-x-1/2 items-center leading-none sm:flex ${p.row < 0 ? "top-0.5" : "bottom-0.5"}`}
              style={{ left: pct(p.au) }}
              title={`${nm(p.name)} ${p.au}AU`}
            >
              <Sprite name={p.sprite} scale={p.sprite === "saturn" ? 1.25 : 1.5} />
            </span>
          ))}
          {/* 출발점(지구): 궤적이 시작되는 막대 위에 놓고, 노란 고리가 잔잔하게 퍼진다 */}
          <span
            className={`absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${v.origin}`}
            style={{ left: `${earth * 100}%` }}
            title={t.earthStart}
          >
            <Sprite name="earth" scale={2} />
          </span>
          <span
            className={`absolute bottom-0 leading-none whitespace-nowrap text-[var(--yellow)] ${earth > 0.9 ? "right-0" : "-translate-x-1/2"}`}
            style={earth > 0.9 ? undefined : { left: `max(${earth * 100}%, 12px)` }}
          >
            {t.start_}
          </span>
        </div>
        <span title={t.voyagerNow} className="flex shrink-0">
          <Sprite name="voyager" scale={1.5} />
        </span>
      </div>

      {/* 범례: 이름만 두고, 올리거나(포커스) 누르면 거리 정보를 띄운다 */}
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--mute)]">
        <Legend sprite="sun" scale={1} name={nm("태양")} info={t.sunInfo} align="left" />
        {PLANETS.map((p, i) => (
          <Legend
            key={p.name}
            sprite={p.sprite}
            scale={1}
            name={nm(p.name)}
            dim={p.au >= scale}
            align={i < 4 ? "left" : "right"}
            mobileHidden={p.name !== "지구"}
            info={t.planetInfo(p.au, fmtKm(auToKm(p.au), lang), p.name === "지구", p.au >= scale)}
          />
        ))}
        <Legend sprite="voyager" scale={0.75} name={t.voyager1} info={t.voyagerInfo(sunAu.toFixed(1))} align="right" />
      </ul>
    </section>
  );
}

function Legend({
  sprite,
  scale,
  name,
  info,
  dim,
  align,
  mobileHidden,
}: {
  sprite: SpriteName;
  scale: number;
  name: string;
  info: string;
  dim?: boolean;
  align: "left" | "right";
  mobileHidden?: boolean;
}) {
  return (
    <li tabIndex={0} className={`group relative flex cursor-help items-center gap-1 outline-none focus-visible:text-[var(--ink)] ${dim ? "opacity-40" : ""} ${mobileHidden ? "max-sm:hidden" : ""}`}>
      <Sprite name={sprite} scale={scale} /> {name}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-30 mb-2 hidden w-max px-2 py-1 whitespace-nowrap text-[var(--ink)] group-hover:block group-focus:block ${v.frameActive} ${
          align === "left" ? "left-0" : "right-0"
        }`}
      >
        <b className="text-[var(--yellow)]">{name}</b> {info}
      </span>
    </li>
  );
}

function Tick({ at, label, side }: { at: number; label: string; side: "top" | "bottom" }) {
  return (
    <span
      className={`absolute flex -translate-x-1/2 items-center leading-none text-[var(--mute)] ${side === "top" ? "top-0 flex-col" : "bottom-0 flex-col-reverse"}`}
      style={{ left: `${at * 100}%` }}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className="my-0.5 h-3 w-0.5 bg-[var(--mute)]" />
    </span>
  );
}
