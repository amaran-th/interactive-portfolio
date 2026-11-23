"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { T, useLang } from "./i18n";
import { Sprite } from "./sprites";
import Typewriter from "./Typewriter";
import v from "./voyager.module.css";

// 1광일 돌파 지점에서 다음으로 넘어가려 할 때 시작하는 엔딩.
// 1) 앞으로 이어지던 점선이 끊기고, 지나온 기록과 선이 그대로 뒤로 흘러가며 탐사선이 계속 나아간다(트랙 쪽 처리).
//    크레딧 기록이 탐사선을 따라 한 장씩 뜨고, 누르거나 →·Enter로 넘긴다.
// 2) 다 보면 사진 더미와 정보 패널이 먼저 사라지고 3) 별빛이 하나씩 꺼진 뒤 4) 탐사선이 화면 밖으로 사라지면 5) 지구로 돌아갈 수 있다.

// 크레딧은 보이저가 처음 스쳐 본 곳들로 뒤이어 간 탐사선·망원경의 이야기다(NASA·JPL 미션 페이지의 날짜).
// 사진은 각 탐사선이 찍은 NASA 원본(웹 망원경·IMAP은 NASA 이미지 라이브러리 원본).
type Credit = {
  kicker: string;
  title: string;
  body: string;
  /** 사진(폴라로이드)에 적는 영어 이름. 기록 카드는 title 그대로 */
  en?: string;
  img?: { src: string; w: number; h: number; alt: string; credit: string; href: string };
};
const NASA_IMG = (id: string) => `https://images.nasa.gov/details/${id}`;
const CREDITS: Credit[] = [
  { kicker: "보이저 이후", title: "보이저가 열어 준 미래", body: "보이저가 발견한 우주를, 뒤이은 탐사선과 망원경들이 탐험했습니다." },
  {
    kicker: "1979 → 1995 · 목성",
    title: "갈릴레오호",
    en: "Galileo",
    body: "보이저가 이오의 화산을 발견하고 유로파의 금 간 얼음을 처음 자세히 찍은 뒤, 그 뒤를 이은 갈릴레오 탐사선이 목성 궤도에 머물며 이오와 유로파를 포착했습니다. 1995년 12월부터 2003년 9월까지.",
    img: { src: "/voyager/successors/PIA19048.jpg", w: 2300, h: 1700, alt: "갈릴레오가 찍은 유로파 표면", credit: "PIA19048", href: NASA_IMG("PIA19048") },
  },
  {
    kicker: "1980 → 2004 · 토성",
    title: "카시니-하위헌스호",
    en: "Cassini-Huygens",
    body: "보이저 1호는 타이탄의 짙은 대기 아래 땅을 보지 못했습니다. 2004년 카시니는 토성 궤도에 13년을 머무르며 타이탄의 대기를 관측했고, 2005년 1월 하위헌스가 타이탄의 땅을 밟았습니다.",
    img: { src: "/voyager/successors/PIA06230.jpg", w: 758, h: 766, alt: "카시니가 찍은 타이탄(자연색 합성)", credit: "PIA06230", href: NASA_IMG("PIA06230") },
  },
  {
    kicker: "1980 → 2015 · 명왕성",
    title: "뉴호라이즌스호",
    en: "New Horizons",
    body: "보이저 1호는 타이탄을 가까이 보기 위해 명왕성으로 접근하기를 포기했습니다. 시간이 흘러 2015년 7월 14일, 뉴호라이즌스가 명왕성에 접근해 선명한 표면을 촬영했습니다.",
    img: { src: "/voyager/successors/PIA19952.jpg", w: 1200, h: 1200, alt: "뉴호라이즌스가 찍은 명왕성의 색 차이", credit: "PIA19952", href: NASA_IMG("PIA19952") },
  },
  {
    kicker: "1979 → 2016 · 목성",
    title: "주노호",
    en: "Juno",
    body: "보이저가 목성의 구름을 찍어 보낸 뒤, 주노는 2016년 7월 목성 궤도에 진입해 목성의 선명한 구름 띠를 촬영했습니다.",
    img: { src: "/voyager/successors/PIA21974.jpg", w: 1280, h: 433, alt: "주노가 찍은 목성의 구름 띠", credit: "PIA21974", href: NASA_IMG("PIA21974") },
  },
  {
    kicker: "1990 → 2021 · 망원경",
    title: "제임스 웹 우주 망원경",
    en: "James Webb Space Telescope",
    body: "60억 km 밖에서 지구를 돌아본 보이저 이후로, 인류의 눈은 더 먼 곳을 향했습니다. 2021년 12월 25일 발사된 제임스 웹 우주 망원경은 2022년 7월 12일 공개한 첫 컬러 사진에 수십억 년 전의 은하들을 담았습니다.",
    img: {
      src: "/voyager/successors/webb-first-deep-field.jpg",
      w: 1881,
      h: 1920,
      alt: "제임스 웹 우주 망원경의 첫 딥 필드(SMACS 0723)",
      credit: "NASA, ESA, CSA, STScI",
      href: NASA_IMG("webb_first_deep_field"),
    },
  },
  {
    kicker: "1979 → 2030 · 유로파",
    title: "유로파 클리퍼호",
    en: "Europa Clipper",
    body: "보이저가 포착했던 목성의 위성 유로파의 얼음층, 그 밑 바다를 탐사하기 위해 유로파 클리퍼호가 2024년 10월 14일에 출발했습니다. 2030년 4월 목성에 도달할 예정이며, 여정 중에 화성을 적외선으로 촬영했습니다.",
    img: { src: "/voyager/successors/PIA26566.jpg", w: 557, h: 549, alt: "유로파 클리퍼가 찍은 화성 적외선 사진(색 입힘)", credit: "PIA26566", href: NASA_IMG("PIA26566") },
  },
  {
    kicker: "2012 → 2025 · 태양권",
    title: "IMAP",
    en: "IMAP",
    body: "보이저가 직접 항해하며 측정했던 태양권의 경계를 보다 선명히 측정하기 위해, 2025년 9월 24일 떠난 IMAP(성간 지도 및 가속 탐사선)이 성간 지도를 그리러 떠났습니다.",
    img: {
      src: "/voyager/successors/imap.jpg",
      w: 1920,
      h: 1280,
      alt: "발사 전 작업대에 올린 IMAP 탐사선",
      credit: "NASA/Johns Hopkins APL/Ed Whitman",
      href: NASA_IMG("KSC-20250529-PH-EGW01_0008"),
    },
  },
  { kicker: "CREDITS", title: "사진·자료", body: "NASA/JPL-Caltech · ESA · CSA · STScI · Johns Hopkins APL · 거리 NASA/JPL Horizons" },
  { kicker: "MADE BY", title: "Amaranth", body: "사이트 제작" },
];

/** CREDITS와 같은 순서의 영어 문구(사진 설명 포함) */
const CREDITS_EN: { kicker: string; title: string; body: string; alt?: string }[] = [
  { kicker: "After Voyager", title: "The path Voyager opened", body: "The questions Voyager raised on its first quick look were taken up by the spacecraft and telescopes that followed." },
  {
    kicker: "1979 → 1995 · Jupiter",
    title: "Galileo",
    body: "After Voyager discovered Io's volcanoes and took the first detailed images of Europa's cracked ice, the Galileo spacecraft stayed in orbit around Jupiter and studied Io and Europa up close, from December 1995 to September 2003.",
    alt: "Europa's surface, imaged by Galileo",
  },
  {
    kicker: "1980 → 2004 · Saturn",
    title: "Cassini-Huygens",
    body: "Voyager 1 could not see the ground beneath Titan's thick atmosphere. Cassini entered orbit around Saturn in 2004 and stayed 13 years, studying Titan's atmosphere, and in January 2005 the Huygens probe landed on Titan's surface.",
    alt: "Titan in natural color, imaged by Cassini",
  },
  {
    kicker: "1980 → 2015 · Pluto",
    title: "New Horizons",
    body: "Voyager 1 gave up a path toward Pluto to get a close look at Titan. Years later, on July 14, 2015, New Horizons flew past Pluto and captured its surface in sharp detail.",
    alt: "Color variations across Pluto, imaged by New Horizons",
  },
  {
    kicker: "1979 → 2016 · Jupiter",
    title: "Juno",
    body: "After Voyager sent back images of Jupiter's clouds, Juno entered orbit around Jupiter in July 2016 and photographed its vivid cloud bands.",
    alt: "Jupiter's cloud bands, imaged by Juno",
  },
  {
    kicker: "1990 → 2021 · Telescope",
    title: "James Webb Space Telescope",
    body: "After Voyager looked back at Earth from 6 billion km away, humanity's eyes turned even farther. Launched on December 25, 2021, the James Webb Space Telescope captured galaxies billions of years old in its first full-color image, released on July 12, 2022.",
    alt: "Webb's First Deep Field (SMACS 0723)",
  },
  {
    kicker: "1979 → 2030 · Europa",
    title: "Europa Clipper",
    body: "Europa Clipper left on October 14, 2024 to explore the ocean beneath the ice shell of Europa, the Jupiter moon Voyager captured. It is due to reach Jupiter in April 2030, and it photographed Mars in infrared on the way.",
    alt: "Infrared image of Mars by Europa Clipper (false color)",
  },
  {
    kicker: "2012 → 2025 · Heliosphere",
    title: "IMAP",
    body: "To map in sharper detail the edge of the heliosphere that Voyager crossed and measured in person, IMAP (Interstellar Mapping and Acceleration Probe) set out on September 24, 2025 to chart it.",
    alt: "The IMAP spacecraft on a work stand before launch",
  },
  { kicker: "CREDITS", title: "Photos & data", body: "NASA/JPL-Caltech · ESA · CSA · STScI · Johns Hopkins APL · Distances NASA/JPL Horizons" },
  { kicker: "MADE BY", title: "Amaranth", body: "Site design and development" },
];

/** 쌓이는 사진 자리: 넓은 화면(x,y)·좁은 화면(xm,ym)·기울기(°). 가운데 기록 카드를 피해 흩어 둔다 */
const PILE: { x: number; y: number; xm: number; ym: number; rot: number }[] = [
  { x: 6, y: 8, xm: 2, ym: 1, rot: -6 },
  { x: 72, y: 6, xm: 52, ym: 0, rot: 5 },
  { x: 20, y: 30, xm: 26, ym: 6, rot: 4 },
  { x: 84, y: 30, xm: 74, ym: 2, rot: -5 },
  { x: 4, y: 48, xm: 6, ym: 14, rot: 7 },
  { x: 66, y: 44, xm: 40, ym: 12, rot: -3 },
  { x: 26, y: 4, xm: 66, ym: 15, rot: -8 },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 하나씩 꺼질 별. 꺼지는 순서(off)는 섞어 둔다 */
const STARS = (() => {
  const r = rng(1977);
  const list = Array.from({ length: 110 }, (_, i) => ({
    x: r() * 100,
    y: r() * 100,
    size: r() < 0.2 ? 3 : 2,
    color: ["#f4f4f8", "#f4f4f8", "#3cbcfc", "#f8d878", "#9ca0d0"][i % 5],
    off: 0,
  }));
  const order = list.map((_, i) => i).sort(() => r() - 0.5);
  order.forEach((idx, k) => (list[idx].off = k));
  return list;
})();

const STAR_STEP_MS = 55;
/** 사진·패널이 사라지는 시간(Timeline의 패널 transition과 맞춘다) */
const CLEAR_MS = 2000;
/** 1광일 기록 카드가 뒤로 빠질 때까지 기다렸다가 첫 크레딧을 띄운다 */
const FIRST_CREDIT_DELAY_MS = 3000;
type Phase = "credits" | "clear" | "stars" | "drift" | "end";

export default function Ending({
  lineBottom,
  onClear,
  onStarsOff,
  onLeave,
  onExit,
  onReturn,
}: {
  lineBottom: number;
  onClear: () => void;
  onStarsOff: () => void;
  onLeave: () => void;
  onExit: () => void;
  onReturn: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("credits");
  const lang = useLang();
  const t = T[lang];
  // 화면 언어의 크레딧(사진은 그대로, 문구만 바꾼다)
  const credits: Credit[] =
    lang === "en"
      ? CREDITS.map((c, i) => {
          const e = CREDITS_EN[i];
          return { ...c, kicker: e.kicker, title: e.title, body: e.body, img: c.img && { ...c.img, alt: e.alt ?? c.img.alt } };
        })
      : CREDITS;
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const returnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), FIRST_CREDIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const next = useCallback(() => {
    if (phase !== "credits" || !ready) return;
    if (step < CREDITS.length - 1) setStep(step + 1);
    else {
      setPhase("clear");
      onClear();
    }
  }, [phase, step, onClear, ready]);

  // 사진·패널이 다 사라진 뒤 별을 끄고, 별이 다 꺼지면 탐사선이 떠나고, 떠난 뒤 돌아가기 버튼을 띄운다
  useEffect(() => {
    if (phase === "clear") {
      const id = window.setTimeout(() => setPhase("stars"), CLEAR_MS + 300);
      return () => window.clearTimeout(id);
    }
    if (phase === "stars") {
      onStarsOff();
      const id = window.setTimeout(() => setPhase("drift"), STARS.length * STAR_STEP_MS + 1200);
      return () => window.clearTimeout(id);
    }
    if (phase === "drift") {
      onLeave();
      const id = window.setTimeout(() => setPhase("end"), 7500);
      return () => window.clearTimeout(id);
    }
    if (phase === "end") returnRef.current?.focus();
  }, [phase, onLeave, onStarsOff]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onExit();
      } else if (e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
        // 엔딩 중에는 ←가 엔딩을 끊지 않고 이전 크레딧으로 돌아간다
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "ArrowLeft" && phase === "credits" && ready) setStep((k) => Math.max(0, k - 1));
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        if (phase !== "credits") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // 엔딩을 연 →를 누르고 있으면 자동 반복이 크레딧을 넘기므로, 새로 누른 키만 받는다
        if (!e.repeat) next();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [next, onExit, phase, ready]);

  const c = credits[step];
  const leaving = phase === "drift" || phase === "end";
  const starsLit = phase === "credits" || phase === "clear";

  return (
    <div className="absolute inset-0 z-30" role="region" aria-label={t.ending}>
      {/* 하나씩 꺼질 별 */}
      <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-[200%] ${v.starStrip}`}>
        {[...STARS, ...STARS].map((s, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${(i < STARS.length ? 0 : 50) + s.x / 2}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              opacity: starsLit ? 1 : 0,
              transition: "opacity 0.25s steps(2)",
              transitionDelay: starsLit ? "0s" : `${s.off * STAR_STEP_MS}ms`,
            }}
          />
        ))}
      </div>

      {/* 사진 더미: 크레딧을 넘길 때마다 한 장씩 기울어진 채 쌓인다 */}
      <div aria-hidden={phase !== "credits"} className={`pointer-events-none absolute inset-0 transition-opacity duration-[2000ms] ${phase !== "credits" ? "opacity-0" : ""}`}>
        {credits.slice(0, step + 1)
          .filter((c) => c.img)
          .map((c, k) => {
            const pos = PILE[k % PILE.length];
            const img = c.img!;
            return (
              <a
                key={img.src}
                href={img.href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto absolute ${v.polaroid}`}
                style={
                  {
                    "--x": `${pos.x}%`,
                    "--y": `${pos.y}%`,
                    "--xm": `${pos.xm}%`,
                    "--ym": `${pos.ym}%`,
                    transform: `rotate(${pos.rot}deg)`,
                    zIndex: k,
                  } as CSSProperties
                }
                aria-label={t.imgSource(img.alt)}
              >
                <span className={`block ${v.tvOn}`}>
                  <Image src={img.src} alt={img.alt} width={img.w} height={img.h} unoptimized className={v.polaroidImg} />
                </span>
                <span className="mt-1 block truncate text-center text-[#3a3a5a]">{c.en ?? c.title}</span>
              </a>
            );
          })}
      </div>

      {/* 탐사선과 따라가는 기록 */}
      <div
        // 사진 더미보다 위에 둬서 기록이 가려지지 않게 한다
        className={`absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-4 ${leaving ? v.endLeave : ""}`}
        style={{ bottom: lineBottom + 24, width: "min(320px, calc(100% - 32px))" }}
      >
        {phase === "credits" && ready && (
          <article key={step} className={`w-full px-4 py-3 ${v.frameActive} ${v.creditIn}`} aria-live="polite">
            <p className="text-[var(--mute)] tabular-nums">{c.kicker}</p>
            <h2 className="text-[20px] leading-[1.5] font-bold text-[var(--yellow)]">
              <Typewriter text={c.title} run />
            </h2>
            <p className="leading-[1.75] text-[#d8daf0]">
              <Typewriter text={c.body} run delay={c.title.length} />
            </p>
            <div className="mt-2 flex items-center justify-between text-[var(--mute)]">
              <span className="tabular-nums">
                {step + 1}/{CREDITS.length}
              </span>
              <button
                type="button"
                className={v.btn}
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
              >
                {step < CREDITS.length - 1 ? t.nextCredit : t.lastCredit}
              </button>
            </div>
          </article>
        )}
        <div className={v.bob}>
          <Sprite name="voyager" scale={3} />
        </div>
      </div>

      {phase === "end" && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 text-center ${v.creditIn}`}>
          <div className="flex max-w-md flex-col gap-2 px-6">
            <p className="text-[18px] leading-[1.6] font-bold text-[var(--yellow)]">
              <Typewriter text={t.endLine1} run msPerChar={55} />
            </p>
            <p className="leading-[1.75] text-[#d8daf0]">
              {/* 첫 줄(17자)을 다 친 뒤 잠깐 쉬고 시작한다 */}
              <Typewriter text={t.endLine2} run msPerChar={55} delay={t.endLine1.length} delayMs={400} />
            </p>
          </div>
          <button
            ref={returnRef}
            type="button"
            className={`${v.btn} gap-2`}
            onClick={(e) => {
              e.stopPropagation();
              onReturn();
            }}
          >
            <Sprite name="earth" scale={2} /> {t.returnEarth}
          </button>
        </div>
      )}

      {phase === "credits" && (
        <button
          type="button"
          className="absolute top-3 right-3 text-[var(--mute)] underline underline-offset-2 hover:text-[var(--ink)]"
          onClick={(e) => {
            e.stopPropagation();
            onExit();
          }}
        >
          {t.closeEnding}
        </button>
      )}
    </div>
  );
}
