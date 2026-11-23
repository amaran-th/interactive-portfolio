"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { galmuri } from "../_shared/galmuri";
import { EVENTS, LAUNCH, LIGHT_DAY_AT, NASA_PAGE, daysSinceLaunch, eventText, type VoyagerEvent } from "./data";
import { LangContext, T, useLang, useT, type Lang } from "./i18n";
import Celebration from "./Celebration";
import DistancePanel from "./DistancePanel";
import Ending from "./Ending";
import Typewriter, { MS_PER_CHAR } from "./Typewriter";
import GoldenRecord from "./GoldenRecord";
import { earthAuAt, sunAuAt } from "./horizons";
import { useAmbient } from "./useAmbient";
import { Sprite } from "./sprites";
import v from "./voyager.module.css";

// 사건 하나가 차지하는 가로 칸(px)과 카드 폭
const SLOT = 380;
const CARD_W = 320;
// 이만큼(년) 넘게 비는 구간은 '··· N년 ···' 칸을 끼워 시간이 흘렀음을 보여 준다
const GAP_YEARS = 3;
const GAP_SLOT = 220;
// 트랙 바닥에서 선까지 높이(px). 선 아래는 좌표, 위는 카드
const LINE_BOTTOM = 112;

const DAY = 86_400_000;
const LAUNCH_MS = Date.parse(LAUNCH);
const FINAL_AU = EVENTS[EVENTS.length - 1].earthAu;

type Layout = {
  centers: number[];
  gaps: { x: number; years: number }[];
  width: number;
};

function buildLayout(): Layout {
  const centers: number[] = [];
  const gaps: Layout["gaps"] = [];
  // 첫 사건 중심이 0이 되게 시작한다 — scrollLeft가 곧 화면 가운데의 트랙 좌표가 된다
  let x = -SLOT / 2;
  EVENTS.forEach((e, i) => {
    if (i > 0) {
      const years = (Date.parse(e.date) - Date.parse(EVENTS[i - 1].date)) / (365.25 * DAY);
      if (years >= GAP_YEARS) {
        gaps.push({ x: x + GAP_SLOT / 2, years: Math.round(years) });
        x += GAP_SLOT;
      }
    }
    centers.push(x + SLOT / 2);
    x += SLOT;
  });
  return { centers, gaps, width: centers[centers.length - 1] };
}

// 사건 배치는 고정이라 모듈에서 한 번만 계산한다
const LAYOUT = buildLayout();

const fmtDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
};

// 시드 고정 난수 — 서버·클라이언트 어디서 만들어도 같은 별자리가 나온다
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

/** 반복해서 깔 별 타일(도트 별) 데이터 URL */
function starTile(seed: number, count: number, size: number, colors: string[]): string {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 480;
  const ctx = c.getContext("2d")!;
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * (480 / size)) * size;
    const y = Math.floor(r() * (480 / size)) * size;
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.fillRect(x, y, size, size);
    // 가끔 십자 모양 큰 별
    if (r() < 0.08) {
      ctx.fillRect(x - size, y, size, size);
      ctx.fillRect(x + size, y, size, size);
      ctx.fillRect(x, y - size, size, size);
      ctx.fillRect(x, y + size, size, size);
    }
  }
  return c.toDataURL();
}

const STAR_LAYERS = [
  { seed: 7, count: 90, size: 2, colors: ["#3c3c8c", "#5c5cb8"], speed: 0.08 },
  { seed: 21, count: 40, size: 2, colors: ["#9ca0d0", "#f8d878", "#3cbcfc"], speed: 0.2 },
  { seed: 42, count: 14, size: 4, colors: ["#fcfcfc", "#f878a8"], speed: 0.45 },
];

export default function VoyagerTimeline({ lang = "ko" }: { lang?: Lang }) {
  const layout = LAYOUT;
  const t = T[lang];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [nowMs, setNowMs] = useState(Date.parse(EVENTS[0].date));
  // 화면 가운데 지점의 지구 거리(AU)
  const [nowAu, setNowAu] = useState(0);
  const [nowSunAu, setNowSunAu] = useState(() => sunAuAt(LAUNCH_MS, LAUNCH_MS, LIGHT_DAY_AT));
  const [zoom, setZoom] = useState<ZoomTarget | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  // 1광일에서 더 나아가려 하면 엔딩을 연다. starsOff: 배경 별을 끄는 단계
  const [ending, setEnding] = useState(false);
  // 들어올 때마다 보여 주는 첫 안내(저장하지 않는다)
  const [intro, setIntro] = useState(true);
  const [starsOff, setStarsOff] = useState(false);
  const [left, setLeft] = useState(false); // 엔딩 끝: 탐사선과 선이 떠남
  const [panelsOff, setPanelsOff] = useState(false); // 엔딩: 별이 꺼지기 전에 정보 패널을 먼저 치운다
  const atEndRef = useRef(false);
  const startEnding = useCallback(() => setEnding(true), []);
  const startEndingRef = useRef(startEnding);
  const bgm = useAmbient();

  // 트랙 가운데(탐사선 위치)에 해당하는 날짜·사건을 구한다
  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const c = el.scrollLeft; // 트랙 좌표 0이 화면 가운데에서 시작하므로 scrollLeft가 곧 가운데 좌표다
    const { centers } = layout;
    let idx = 0;
    for (let i = 0; i < centers.length; i++) if (Math.abs(centers[i] - c) < Math.abs(centers[idx] - c)) idx = i;
    setActive(idx);
    atEndRef.current = idx === EVENTS.length - 1;
    let ms = Date.parse(EVENTS[0].date);
    let au = 0;
    if (c >= centers[centers.length - 1]) {
      ms = Date.parse(EVENTS[EVENTS.length - 1].date);
      au = FINAL_AU;
    } else if (c > centers[0]) {
      const i = centers.findIndex((x, k) => c >= x && c < centers[k + 1]);
      const t = (c - centers[i]) / (centers[i + 1] - centers[i]);
      const a = Date.parse(EVENTS[i].date);
      ms = a + t * (Date.parse(EVENTS[i + 1].date) - a);
      // 기록 위에 딱 섰을 때는 그 기록 시각의 Horizons 값, 사이에서는 월별 표를 보간한 값
      au = t < 0.002 ? EVENTS[i].earthAu : earthAuAt(ms, LAUNCH_MS, { ms: LIGHT_DAY_AT, au: FINAL_AU });
    }
    setNowMs(ms);
    setNowAu(au);
    setNowSunAu(sunAuAt(ms, LAUNCH_MS, LIGHT_DAY_AT));
    starRefs.current.forEach((s, i) => {
      if (!s) return;
      const bx = `${-Math.round(el.scrollLeft * STAR_LAYERS[i].speed)}px`;
      s.style.backgroundPositionX = bx;
      s.style.setProperty("--bx", bx);
    });
  }, [layout]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    // 세로 휠을 가로 이동으로 바꾼다
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // 지금 보고 있는 카드의 내용이 넘치면 휠은 카드 안에서만 쓴다. 카드 끝에 닿아도 연대기로 넘기지 않는다.
      // 지나가는 카드는 스크롤하지 않는다(도착했을 때 카드가 중간부터 보이지 않게)
      const card = (e.target as Element).closest("article");
      if (card?.getAttribute("aria-current") && card.scrollHeight > card.clientHeight + 1) return;
      e.preventDefault();
      // 1광일 지점에서 더 앞으로 굴리면 엔딩
      if (e.deltaY > 0 && atEndRef.current && el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
        startEndingRef.current();
        return;
      }
      el.scrollLeft += e.deltaY;
    };
    // 트랙 좌표 0을 스크롤 칸 가운데에 맞춘다(--half = 칸 폭의 절반)
    const ro = new ResizeObserver(() => {
      el.style.setProperty("--half", `${el.clientWidth / 2}px`);
      onScroll();
    });
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    raf = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, [sync]);

  useEffect(() => {
    starRefs.current.forEach((s, i) => {
      if (!s) return;
      const l = STAR_LAYERS[i];
      s.style.backgroundImage = `url(${starTile(l.seed, l.count, l.size, l.colors)})`;
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const target = Math.max(0, Math.min(EVENTS.length - 1, i));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: layout.centers[target], behavior: reduce ? "auto" : "smooth" });
    },
    [layout],
  );

  const exitEnding = useCallback(() => {
    setEnding(false);
    setStarsOff(false);
    setLeft(false);
    setPanelsOff(false);
  }, []);
  // 엔딩 끝에서 처음(발사)으로 돌아간다
  const returnToEarth = useCallback(() => {
    setEnding(false);
    setStarsOff(false);
    setLeft(false);
    setPanelsOff(false);
    scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
    scrollerRef.current?.focus();
  }, []);
  const clearPanels = useCallback(() => setPanelsOff(true), []);
  const turnStarsOff = useCallback(() => setStarsOff(true), []);
  const leave = useCallback(() => setLeft(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom) {
        if (e.key === "Escape") setZoom(null);
        return;
      }
      if (recordOpen) {
        if (e.key === "Escape") setRecordOpen(false);
        return;
      }
      if (intro) {
        if (e.key === "Escape" || e.key === "Enter") setIntro(false);
        return;
      }
      if (ending) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (active === EVENTS.length - 1) setEnding(true);
        else goTo(active + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(EVENTS.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, zoom, recordOpen, ending, intro]);

  const days = Math.max(0, Math.round((nowMs - Date.parse(EVENTS[0].date)) / DAY));

  return (
    <LangContext.Provider value={lang}>
    <div lang={lang} className={`${galmuri.variable} ${v.root} relative flex h-full flex-col overflow-hidden select-none`}>
      {/* 별 배경 3겹 — 가까운 별일수록 빨리 지나간다 */}
      {STAR_LAYERS.map((l, i) => (
        <div
          key={l.seed}
          ref={(el) => {
            starRefs.current[i] = el;
          }}
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-[1500ms] ${
            ending ? v.starDrift : i === 2 ? v.twinkle : ""
          } ${starsOff ? "opacity-0" : ""}`}
          // 엔딩에서 트랙(초당 120px)과 같은 비율로 흐르게, 타일 한 장(480px)을 도는 시간
          style={{ imageRendering: "pixelated", ["--dur" as string]: `${480 / (120 * l.speed)}s` }}
        />
      ))}

      {/* 정보 패널 — 모바일은 두 줄(제목·날짜 / 이동·골든 레코드), 넓은 화면은 한 줄 */}
      <header
        inert={panelsOff}
        className={`relative z-20 px-3 pt-3 transition-opacity duration-[2000ms] sm:px-6 sm:pt-4 ${panelsOff ? "opacity-0" : ""}`}
      >
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:gap-x-6 sm:px-4 ${v.frame}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Sprite name="voyager" scale={2} />
            <div className="leading-tight">
              <p className="font-bold text-[var(--yellow)]">VOYAGER 1</p>
              <p className="hidden text-[var(--mute)] sm:block">{t.chronicle}</p>
            </div>
          </div>
          <dl className="ml-auto flex gap-3 tabular-nums sm:ml-0 sm:gap-5">
            <div>
              <dt className="sr-only text-[var(--mute)] sm:not-sr-only">DATE</dt>
              <dd className="font-bold">{fmtDate(nowMs)}</dd>
            </div>
            <div>
              <dt className="sr-only text-[var(--mute)] sm:not-sr-only">MISSION</dt>
              <dd className="font-bold">{t.days(days)}</dd>
            </div>
          </dl>
          <div className="flex basis-full items-center justify-between gap-2 sm:ml-auto sm:basis-auto sm:gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className={`${v.btn} gap-1.5`} onClick={() => setRecordOpen(true)}>
                <Sprite name="record" scale={2} />
                {t.goldenRecord}
              </button>
              <button
                type="button"
                className={v.btn}
                aria-pressed={bgm.playing}
                onClick={bgm.toggle}
                aria-label={bgm.playing ? t.bgmOff : t.bgmOn}
                title={bgm.playing ? t.bgmOff : t.bgmOn}
              >
                <Sprite name={bgm.playing ? "speaker" : "mute"} scale={2} />
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:ml-3 sm:gap-3">
              <button
                type="button"
                className={v.btn}
                onClick={() => goTo(active - 1)}
                disabled={active === 0 || ending}
                aria-label={t.prev}
              >
                ◀
              </button>
              <span className="w-10 text-center tabular-nums sm:w-12">
                {String(active + 1).padStart(2, "0")}/{EVENTS.length}
              </span>
              <button
                type="button"
                className={v.btn}
                onClick={() => (active === EVENTS.length - 1 ? setEnding(true) : goTo(active + 1))}
                disabled={ending}
                aria-label={active === EVENTS.length - 1 ? t.beyond : t.next}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </header>

      {active === EVENTS.length - 1 && !ending && <Celebration />}

      {/* 트랙 */}
      <div className="relative z-10 min-h-0 flex-1">
        {/* 선: 탐사선(가운데) 왼쪽은 지나온 길 */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 transition-opacity duration-[3000ms] ${left ? "opacity-0" : ""}`}
          style={{ bottom: LINE_BOTTOM }}
        >
          {/* 엔딩에서는 같은 자리의 트랙 선(아래)으로 바꿔 끼워, 선이 1광일 표식에서 끝나 함께 흘러가게 한다 */}
          <div className={`absolute right-1/2 left-0 ${v.pastLine} ${ending ? "invisible" : ""}`} />
          {/* 엔딩에서는 앞길(점선)이 끊긴다 */}
          <div className={`absolute right-0 left-1/2 transition-opacity duration-[1800ms] ${v.futureLine} ${ending ? "opacity-0" : ""}`} />
        </div>

        <div
          ref={scrollerRef}
          tabIndex={0}
          aria-label={t.trackLabel}
          inert={ending}
          className={`absolute inset-0 overflow-x-auto overflow-y-hidden focus:outline-none max-sm:snap-x max-sm:snap-mandatory ${v.scroller} ${
            ending ? "pointer-events-none" : ""
          }`}
        >
          <ol className={`relative h-full ${ending ? v.endScroll : ""}`} style={{ width: `calc(2 * var(--half, 50vw) + ${layout.width}px)` }}>
            {ending && (
              <li
                aria-hidden
                className={`absolute left-0 ${v.pastLine}`}
                style={{ bottom: LINE_BOTTOM - 4, width: `calc(var(--half, 50vw) + ${layout.centers[layout.centers.length - 1]}px)` }}
              />
            )}
            {layout.gaps.map((g) => (
              <li
                key={g.x}
                aria-hidden
                className="absolute flex -translate-x-1/2 flex-col items-center text-[var(--mute)]"
                style={{ left: `calc(var(--half, 50vw) + ${g.x}px)`, bottom: LINE_BOTTOM - 40 }}
              >
                ··· {t.years(g.years)} ···
              </li>
            ))}
            {EVENTS.map((e, i) => (
              <EventSlot
                key={e.id}
                event={e}
                index={i}
                left={layout.centers[i]}
                active={i === active}
                ahead={i > active}
                onFocusNode={goTo}
                onZoom={setZoom}
              />
            ))}
          </ol>
        </div>

        {/* 탐사선은 화면 가운데에 머물고 기록이 밑으로 지나간다 */}
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 ${ending ? "invisible" : ""}`}
          style={{ bottom: LINE_BOTTOM + 24 }}
        >
          <div className="relative">
            <div className={v.bob}>
              <Sprite name="voyager" scale={3} />
            </div>
            {/* 지구(왼쪽)로 보내는 신호 */}
            <span className={`absolute top-1 -left-3 font-bold text-[var(--cyan)] ${v.signal}`}>((</span>
          </div>
        </div>
        {ending && <Ending lineBottom={LINE_BOTTOM} onClear={clearPanels} onStarsOff={turnStarsOff} onLeave={leave} onExit={exitEnding} onReturn={returnToEarth} />}
      </div>

      {/* 엔딩에서 별이 꺼지기 전에 아래 패널도 먼저 사라진다 */}
      <div inert={panelsOff} className={`relative z-20 transition-opacity duration-[2000ms] ${panelsOff ? "opacity-0" : ""}`}>
        <DistancePanel au={nowAu} sunAu={nowSunAu} ms={nowMs} />
      </div>

      <p className={`relative z-20 px-4 pb-2 text-center text-[var(--mute)] transition-opacity duration-[2000ms] sm:px-6 ${panelsOff ? "opacity-0" : ""}`}>
        <span className="hidden sm:inline">{t.footerMove}</span>
        {t.footerRest}
      </p>

      {intro && (
        <div role="dialog" aria-modal="true" aria-label={t.introLabel} className="absolute inset-0 z-50 flex items-center justify-center bg-[#05060f]/70 p-4">
          <div className={`flex w-full max-w-sm flex-col items-center gap-4 px-5 py-5 text-center ${v.frameActive} ${v.creditIn}`}>
            <div className={v.bob}>
              <Sprite name="voyager" scale={3} />
            </div>
            <div>
              <p className="font-bold text-[var(--yellow)]">VOYAGER 1</p>
              <p className="text-[18px] leading-[1.5] font-bold">{t.introSub}</p>
            </div>
            <p className="leading-[1.75] text-[#d8daf0]">
              <span className="hidden flex-col items-center gap-2 sm:flex">
                <span className="flex items-end gap-4" aria-hidden>
                  {/* 키보드 방향키 배열(역T자). 쓰는 건 ← →라 위·아래는 흐리게 */}
                  <span className="grid grid-cols-3 gap-1">
                    <span className="col-start-2 opacity-35">
                      <Sprite name="keyUp" scale={3} />
                    </span>
                    <span className={`col-start-1 ${v.keyPress}`}>
                      <Sprite name="keyLeft" scale={3} />
                    </span>
                    <span className="opacity-35">
                      <Sprite name="keyDown" scale={3} />
                    </span>
                    <span className={`${v.keyPress} ${v.keyPressLate}`}>
                      <Sprite name="keyRight" scale={3} />
                    </span>
                  </span>
                  <span className="text-[var(--mute)]">{t.or}</span>
                  {/* 마우스: 휠만 깜박인다 */}
                  <span className="relative">
                    <Sprite name="mouse" scale={5} />
                    <span className={`absolute inset-0 ${v.wheel}`}>
                      <Sprite name="mouseWheel" scale={5} />
                    </span>
                  </span>
                </span>
                <span>{t.introMove}</span>
              </span>
              <span className="sm:hidden">
                {t.introMoveMobile[0]}
                <b className="text-[var(--cyan)]">◀ ▶</b>
                {t.introMoveMobile[1]}
              </span>
            </p>
            <div className="my-2 flex flex-col items-center gap-3">
              <button
                type="button"
                className={v.soundBtn}
                aria-pressed={bgm.playing}
                onClick={bgm.toggle}
                aria-label={bgm.playing ? t.bgmOff : t.bgmOn}
              >
                <Sprite name={bgm.playing ? "speaker" : "mute"} scale={4} />
              </button>
              <span className="text-[var(--yellow)]">{t.turnOnMusic}</span>
            </div>
            <button
              type="button"
              autoFocus
              className={`${v.btn} !h-12 w-full text-[16px]`}
              onClick={() => {
                setIntro(false);
                scrollerRef.current?.focus();
              }}
            >
              {t.start}
            </button>
          </div>
        </div>
      )}
      {recordOpen && <GoldenRecord onClose={() => setRecordOpen(false)} onZoom={setZoom} />}
      {zoom && <Lightbox target={zoom} onClose={() => setZoom(null)} />}
    </div>
    </LangContext.Provider>
  );
}

const EventSlot = memo(function EventSlot({
  event: e,
  index,
  left,
  active,
  ahead,
  onFocusNode,
  onZoom,
}: {
  event: VoyagerEvent;
  index: number;
  left: number;
  active: boolean;
  ahead: boolean;
  onFocusNode: (i: number) => void;
  onZoom: (z: ZoomTarget) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = e.photos?.[photoIdx];
  const lang = useLang();
  const t = T[lang];
  const tx = eventText(e, lang);
  const cardRef = useRef<HTMLElement>(null);
  // 카드에 도착하거나 떠나면 맨 위로 돌려놓는다
  useEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [active]);
  const isFinal = index === EVENTS.length - 1;
  // 순서: 제목·거리 타이핑 → 사진 켜짐 → 본문 타이핑
  const headChars = tx.title.length + (tx.distance?.length ?? 0);
  const photoDelayMs = headChars * MS_PER_CHAR + 80;
  const TV_MS = 280; // 로그 사진이 켜지는 시간(엔딩 사진보다 빠르게)
  const x = `calc(var(--half, 50vw) + ${left}px)`;

  return (
    <li className="contents">
      {/* 카드: 선 위 */}
      <article
        ref={cardRef}
        aria-current={active ? "step" : undefined}
        aria-hidden={ahead || undefined}
        inert={ahead}
        className={`absolute flex -translate-x-1/2 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-3 transition-[filter,opacity] duration-300 ${v.scroller} ${
          active ? v.frameActive : `${v.frame} ${v.dim}`
        } ${ahead ? "invisible opacity-0" : ""}`}
        style={{
          left: x,
          width: `min(${CARD_W}px, calc(2 * var(--half, 50vw) - 32px))`,
          bottom: LINE_BOTTOM + 68,
          maxHeight: `calc(100% - ${LINE_BOTTOM + 84}px)`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className={v.badge} style={{ background: e.kind === "photo" ? "var(--cyan)" : "var(--pink)" }}>
            {e.kind === "photo" ? "PHOTO" : "LOG"}
          </span>
          <span className="text-[var(--mute)] tabular-nums">{e.date.replaceAll("-", ".")}</span>
        </div>
        <h2 className={`font-bold ${isFinal ? "text-[24px] leading-[1.5] text-[var(--yellow)]" : "text-[12px]"}`}>
          <Typewriter key={`t${active}`} text={tx.title} run={active} />
        </h2>
        {tx.distance && (
          <p className="-mt-1 text-[var(--cyan)]">
            <Typewriter key={`d${active}`} text={tx.distance} run={active} delay={tx.title.length} />
          </p>
        )}

        {photo && (
          <div className="flex flex-col items-start gap-1.5">
            {e.photos!.length > 1 && (
              <div className="flex gap-1">
                {e.photos!.map((p, k) => (
                  <button key={p.pia} type="button" className={v.tab} aria-pressed={k === photoIdx} onClick={() => setPhotoIdx(k)}>
                    {tx.labels?.[k]}
                  </button>
                ))}
              </div>
            )}
            <button
              key={`${photoIdx}-${active}`}
              type="button"
              className={`${v.photoBtn} self-center ${active ? v.tvOn : ""}`}
              style={active ? { animationDelay: `${photoDelayMs}ms`, animationDuration: `${TV_MS}ms` } : undefined}
              onClick={() =>
                onZoom({ title: tx.title, src: photo.src, width: photo.width, height: photo.height, id: photo.pia, href: NASA_PAGE(photo.pia) })
              }
              aria-label={t.zoomPhoto(tx.title)}
            >
              {/* 원본 파일 그대로(unoptimized). 칸보다 클 때만 줄이고 키우지는 않는다 */}
              <Image
                src={photo.src}
                alt={t.photoAlt(tx.title, photo.pia)}
                width={photo.width}
                height={photo.height}
                unoptimized
                draggable={false}
                style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: "min(32vh, 300px)" }}
              />
            </button>
            <p className="self-center text-[var(--mute)]">
              {photo.width}×{photo.height} ·{" "}
              <a href={NASA_PAGE(photo.pia)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--yellow)]">
                {photo.pia}
              </a>
            </p>
          </div>
        )}

        <p className="leading-[1.75] text-[#d8daf0]">
          <Typewriter key={`b${active}`} text={tx.body} run={active} delay={headChars} delayMs={photo ? TV_MS + 80 : 0} />
        </p>
      </article>

      {/* 좌표: 선 위 표식 + 선 아래 날짜·거리 */}
      <button
        type="button"
        onClick={() => onFocusNode(index)}
        aria-label={t.goTo(e.date, tx.title)}
        className={`absolute flex -translate-x-1/2 snap-center flex-col items-center ${v.node}`}
        style={{ left: x, bottom: LINE_BOTTOM - 14 }}
      >
        <span className={active ? v.hop : ""}>
          <Sprite name={e.icon} scale={e.icon === "saturn" ? 3 : 4} />
        </span>
      </button>
      <div
        className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center text-center leading-[1.5] tabular-nums"
        style={{ left: x, top: `calc(100% - ${LINE_BOTTOM - 26}px)`, width: SLOT - 60 }}
      >
        <b className={active ? "text-[var(--yellow)]" : ""}>{e.date.replaceAll("-", ".")}</b>
        <span className="text-[var(--mute)]">{t.days(daysSinceLaunch(e.date))}</span>
      </div>
    </li>
  );
});

/** 원본 크기로 볼 이미지 */
export type ZoomTarget = { title: string; src: string; width: number; height: number; id: string; href: string };

export function Lightbox({ target, onClose }: { target: ZoomTarget; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // 기본은 화면에 맞춰 줄여 보고(키우지는 않는다), 누르면 원본 픽셀 그대로 본다
  const [actual, setActual] = useState(false);
  const t = useT();
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.zoomBig(target.title)}
      className="fixed inset-0 z-[60] flex flex-col bg-[#05060f]/95"
      onClick={onClose}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <span className="font-bold text-[var(--yellow)]">{target.title}</span>
        <span className="text-[var(--mute)] tabular-nums">
          {target.id} · {target.width}×{target.height}px
        </span>
        <a href={target.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--yellow)]">
          {t.nasaSource}
        </a>
        <div className="ml-auto flex gap-2">
          <button type="button" className={v.btn} aria-pressed={actual} onClick={() => setActual((a) => !a)}>
            {actual ? t.fit : t.actual}
          </button>
          <button ref={closeRef} type="button" className={v.btn} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </div>
      </div>
      {actual ? (
        <div className="min-h-0 flex-1 overflow-auto" onClick={(ev) => ev.stopPropagation()}>
          <div className="flex min-h-full min-w-full items-center justify-center p-4" style={{ width: "max-content" }}>
            <Image
              src={target.src}
              alt={`${target.title} (${target.id})`}
              width={target.width}
              height={target.height}
              unoptimized
              style={{ display: "block", maxWidth: "none", width: target.width, height: target.height }}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
          <Image
            src={target.src}
            alt={`${target.title} (${target.id})`}
            width={target.width}
            height={target.height}
            unoptimized
            onClick={(ev) => ev.stopPropagation()}
            style={{ display: "block", width: "auto", height: "auto", maxWidth: "min(100%, 800px)", maxHeight: "min(100%, 72vh)" }}
          />
        </div>
      )}
    </div>
  );
}
