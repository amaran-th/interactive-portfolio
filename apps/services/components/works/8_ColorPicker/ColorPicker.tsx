"use client";

import { Copy, Download, Pipette, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type React from "react";
import { type Rgb, formatHex, formatHsl, formatRgb, hexToRgb, isDark, parseColor } from "../_shared/color";
import CopyToast from "../_shared/CopyToast";
import ImageDropZone from "../_shared/ImageDropZone";
import { extractPalette } from "../_shared/quantize";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import { fitWithin } from "../_shared/imageInput";
import { useImageInput } from "../_shared/useImageInput";
import { penFont } from "./font";
import s from "./paper.module.css";

// 색상 추출기: 한 점을 찍어 색을 뽑는 스포이트와, 이미지 전체에서 많이 쓰인 색을
// 고르는 팔레트를 한 화면에 둔다. 팔레트 견본을 누르면 스포이트로 뽑은 것처럼
// 위쪽 '고른 색'에 올라가 HEX·RGB·HSL로 복사한다.

const MAX_RECENT = 10;
// 내 팔레트에 담을 수 있는 색 수
const MAX_CUSTOM = 10;
// 내 팔레트 막대 높이(px)
const CUSTOM_BAR = 112;
const LOUPE_CELLS = 11;
const LOUPE_CELL_PX = 10;
const LOUPE_PX = LOUPE_CELLS * LOUPE_CELL_PX;
const LOUPE_OFFSET = 16;

const MIN_COLORS = 3;
const MAX_COLORS = 12;
const DEFAULT_COLORS = 6;
// 팔레트 계산 전에 긴 변을 이 크기로 줄인다. 큰 사진도 빠르게 계산한다.
const SAMPLE_MAX = 200;
// 이미지+팔레트 카드의 여백. 바깥 여백·이미지와 막대 사이·막대 사이가 모두 같다
const CARD_GAP = 10;
// 저장하는 PNG 바탕(화면의 카드 종이색)
const SHEET = "#fffdf8";
// 내려받는 PNG에서 이미지 폭의 범위(px)
const EXPORT_MIN = 800;
const EXPORT_MAX = 1600;
// 세로/가로 비율이 이보다 크면 팔레트를 이미지 오른쪽에 세로로 쌓는다
const TALL_RATIO = 1.25;

// 막대 크기에 맞춘 HEX 글자 크기(px). 고정폭 글꼴 7자(#rrggbb)는 글자 크기의 약
// 4.2배 폭이라, 8px로도 안 들어가는 좁은(짧은) 막대에서는 글자를 빼고 null을 돌려준다.
function labelPx(barWidth: number, barHeight: number): number | null {
  const px = Math.min(12, (barWidth - 8) / 4.2);
  return px < 8 || barHeight < 22 ? null : px;
}

const SMALL_BUTTON = `${s.btn} ${s.pen} px-3 text-xl leading-8`;
// 이미지 넣는 칸도 같은 종이·손글씨 모양으로
const DROP_ZONE = {
  zone: `border-dashed! ${s.sketch}`,
  primary: `${SMALL_BUTTON} ${s.btnInk}`,
  button: SMALL_BUTTON,
  text: `${s.pen} text-lg text-ink/60`,
};

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
type Hover = { x: number; y: number; clientX: number; clientY: number; hex: string };

const noopSubscribe = () => () => {};

const FORMATS = [
  { label: "HEX", format: formatHex },
  { label: "RGB", format: formatRgb },
  { label: "HSL", format: formatHsl },
];

function saveCanvas(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

// 막대 하나와 그 아래쪽 HEX 글자를 그린다. 글자 크기는 화면 기준(px)에 k배.
function drawBar(ctx: CanvasRenderingContext2D, hex: string, x: number, y: number, w: number, h: number, k: number) {
  ctx.fillStyle = hex;
  ctx.fillRect(x, y, w, h);
  const px = labelPx(w / k, h / k);
  if (!px) return;
  ctx.font = `bold ${px * k}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = isDark(hexToRgb(hex)!) ? "#fff" : "#2e353f";
  ctx.fillText(hex, x + w / 2, y + h - 6 * k);
  ctx.globalAlpha = 1;
}

export default function ColorPicker() {
  const input = useImageInput();
  const { copy, message } = useCopyFeedback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 이미지는 원본 크기와 상관없이 이미지 칸을 넘지 않는 선에서 가득 채운다(contain).
  // 카드 여백·막대 높이를 빼고 남은 자리에 맞추고, 팔레트 막대 줄도 이 폭을 따른다.
  const areaRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<{ width: number; height: number; bar: number; vertical: boolean } | null>(null);
  useEffect(() => {
    const area = areaRef.current;
    const img = input.image;
    if (!area || !img) return;
    const fit = () => {
      const pad = 2 * CARD_GAP; // 카드는 테두리 없이 종이 그림자로 띄운다
      const bar = area.clientWidth < 640 ? 96 : 128;
      // 세로로 긴 이미지는 팔레트를 오른쪽에 둔다
      const vertical = img.naturalHeight / img.naturalWidth > TALL_RATIO;
      const scale = vertical
        ? Math.min(
            (area.clientWidth - pad - CARD_GAP - bar) / img.naturalWidth,
            (area.clientHeight - pad) / img.naturalHeight,
          )
        : Math.min(
            (area.clientWidth - pad) / img.naturalWidth,
            (area.clientHeight - pad - CARD_GAP - bar) / img.naturalHeight,
          );
      setShown({
        width: Math.max(1, Math.floor(img.naturalWidth * scale)),
        height: Math.max(1, Math.floor(img.naturalHeight * scale)),
        bar,
        vertical,
      });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, [input.image]);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const [current, setCurrent] = useState<Rgb | null>(null);
  const [recent, setRecent] = useState<Rgb[]>([]);
  // 내 팔레트: 고른 색을 직접 담아 만드는 팔레트(HEX 목록). 저장하지 않는다
  const [custom, setCustom] = useState<string[]>([]);
  const customRef = useRef<HTMLUListElement>(null);
  const [customWidth, setCustomWidth] = useState(0);
  // 막대를 옆으로 끌어 순서를 바꾼다. 5px 넘게 움직여야 끌기로 보고, 그때는 클릭(고르기)을 막는다.
  // 끄는 동안은 막대를 그대로 두고 놓일 자리(막대 사이 틈 번호 0~n)에 보조선만 그린 뒤, 놓을 때 옮긴다.
  const dragRef = useRef<{ hex: string; startX: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [draggingHex, setDraggingHex] = useState<string | null>(null);
  const [dropGap, setDropGap] = useState<number | null>(null);
  const moveCustom = useCallback((hex: string, to: number) => {
    setCustom((c) => {
      const from = c.indexOf(hex);
      const target = Math.max(0, Math.min(c.length - 1, to));
      if (from < 0 || from === target) return c;
      const next = c.filter((h) => h !== hex);
      next.splice(target, 0, hex);
      return next;
    });
  }, []);
  useEffect(() => {
    const ul = customRef.current;
    if (!ul) return;
    const ro = new ResizeObserver(() => setCustomWidth(ul.clientWidth));
    ro.observe(ul);
    return () => ro.disconnect();
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [count, setCount] = useState(DEFAULT_COLORS);
  // 서버에서는 false. EyeDropper API는 데스크톱 크로미움 브라우저에만 있다.
  const screenPickSupported = useSyncExternalStore(
    noopSubscribe,
    () => "EyeDropper" in window,
    () => false,
  );

  // 캔버스에 그려 두고 거기서 픽셀을 읽는다. 아주 큰 사진은 브라우저 캔버스
  // 한도를 넘지 않게 줄여 그린다(좌표는 pixelAt이 캔버스 크기 기준으로 맞춘다).
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = input.image;
    if (!canvas || !img) return;
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, width, height);
  }, [input.image]);

  // 팔레트용으로 작게 줄인 픽셀
  const samplePixels = useMemo(() => {
    const img = input.image;
    if (!img) return null;
    const scale = Math.min(1, SAMPLE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  }, [input.image]);

  const palette = useMemo(
    () => (samplePixels ? extractPalette(samplePixels, count) : []),
    [samplePixels, count],
  );

  // 돋보기: 포인터 주변 11×11 픽셀을 칸마다 10px로 키워 그린다.
  useEffect(() => {
    const loupe = loupeRef.current;
    const canvas = canvasRef.current;
    if (!hover || !loupe || !canvas) return;
    const half = (LOUPE_CELLS - 1) / 2;
    const data = canvas
      .getContext("2d")!
      .getImageData(hover.x - half, hover.y - half, LOUPE_CELLS, LOUPE_CELLS);
    const tmp = document.createElement("canvas");
    tmp.width = LOUPE_CELLS;
    tmp.height = LOUPE_CELLS;
    tmp.getContext("2d")!.putImageData(data, 0, 0);
    const ctx = loupe.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOUPE_PX, LOUPE_PX);
    ctx.drawImage(tmp, 0, 0, LOUPE_PX, LOUPE_PX);
    ctx.strokeStyle = "#c4553b";
    ctx.lineWidth = 2;
    ctx.strokeRect(half * LOUPE_CELL_PX, half * LOUPE_CELL_PX, LOUPE_CELL_PX, LOUPE_CELL_PX);
  }, [hover]);

  const choose = useCallback((rgb: Rgb) => {
    setCurrent(rgb);
    setNotice(null);
    setRecent((prev) =>
      [rgb, ...prev.filter((c) => formatHex(c) !== formatHex(rgb))].slice(0, MAX_RECENT),
    );
  }, []);

  function pixelAt(e: React.PointerEvent | React.MouseEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const cx = Math.min(canvas.width - 1, Math.max(0, x));
    const cy = Math.min(canvas.height - 1, Math.max(0, y));
    const d = canvas.getContext("2d")!.getImageData(cx, cy, 1, 1).data;
    return { x: cx, y: cy, rgb: { r: d[0], g: d[1], b: d[2] }, alpha: d[3] };
  }

  async function pickFromScreen() {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return;
    try {
      const { sRGBHex } = await new Ctor().open();
      const rgb = parseColor(sRGBHex);
      if (rgb) choose(rgb);
      else setNotice("색을 읽지 못했어요");
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") setNotice("화면에서 색을 뽑지 못했어요");
    }
  }

  // 화면의 카드(흰 바탕·같은 여백·이미지·팔레트 막대·HEX)를 그대로 PNG로 그린다.
  // 이미지는 원본에서 다시 그려, 화면보다 크게(이미지 폭 800~1600px) 저장한다.
  function downloadCard() {
    const img = input.image;
    if (!img || !shown || palette.length === 0) return;
    const target = Math.min(EXPORT_MAX, Math.max(EXPORT_MIN, img.naturalWidth));
    const k = target / shown.width;
    const gap = CARD_GAP * k;
    const w = shown.width * k;
    const h = shown.height * k;
    const bar = shown.bar * k;
    const n = palette.length;
    const out = document.createElement("canvas");
    // 가로 배치: 이미지 아래 막대 줄 / 세로 배치: 이미지 오른쪽 막대 기둥
    out.width = Math.round(shown.vertical ? w + bar + gap * 3 : w + gap * 2);
    out.height = Math.round(shown.vertical ? h + gap * 2 : h + bar + gap * 3);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = SHEET;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, gap, gap, w, h);
    const bw = shown.vertical ? bar : (w - gap * (n - 1)) / n;
    const bh = shown.vertical ? (h - gap * (n - 1)) / n : bar;
    palette.forEach((p, i) => {
      const x = shown.vertical ? gap * 2 + w : gap + i * (bw + gap);
      const y = shown.vertical ? gap + i * (bh + gap) : gap * 2 + h;
      drawBar(ctx, p.hex, x, y, bw, bh, k);
    });
    saveCanvas(out, "palette.png");
  }

  const currentHex = current ? formatHex(current) : null;
  const canAdd = currentHex !== null && !custom.includes(currentHex) && custom.length < MAX_CUSTOM;
  const customBarW = custom.length ? (customWidth - CARD_GAP * (custom.length - 1)) / custom.length : 0;
  const customLabel = labelPx(customBarW, CUSTOM_BAR);

  // 내 팔레트를 막대만 있는 카드로 저장한다(막대 폭은 화면과 같은 비율, 1200px 폭)
  function downloadCustom() {
    if (custom.length === 0 || customWidth === 0) return;
    const k = 1200 / customWidth;
    const gap = CARD_GAP * k;
    const w = customWidth * k;
    const bh = CUSTOM_BAR * k;
    const bw = (w - gap * (custom.length - 1)) / custom.length;
    const out = document.createElement("canvas");
    out.width = Math.round(w + gap * 2);
    out.height = Math.round(bh + gap * 2);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = SHEET;
    ctx.fillRect(0, 0, out.width, out.height);
    custom.forEach((hex, i) => drawBar(ctx, hex, gap + i * (bw + gap), gap, bw, bh, k));
    saveCanvas(out, "my-palette.png");
  }
  // 막대 하나의 화면 크기와 거기 맞춘 HEX 글자 크기
  const n = palette.length || 1;
  const barSize = !shown
    ? { w: 0, h: 0 }
    : shown.vertical
      ? { w: shown.bar, h: (shown.height - CARD_GAP * (n - 1)) / n }
      : { w: (shown.width - CARD_GAP * (n - 1)) / n, h: shown.bar };
  const label = labelPx(barSize.w, barSize.h);

  const loupeLeft =
    hover && typeof window !== "undefined" && hover.clientX + LOUPE_OFFSET + LOUPE_PX > window.innerWidth
      ? hover.clientX - LOUPE_OFFSET - LOUPE_PX
      : (hover?.clientX ?? 0) + LOUPE_OFFSET;
  const loupeTop =
    hover && typeof window !== "undefined" && hover.clientY + LOUPE_OFFSET + LOUPE_PX + 24 > window.innerHeight
      ? hover.clientY - LOUPE_OFFSET - LOUPE_PX - 24
      : (hover?.clientY ?? 0) + LOUPE_OFFSET;

  return (
    <div className={`min-h-full lg:h-full ${penFont.variable} ${s.root}`}>
    <div className="mx-auto grid min-h-full max-w-6xl gap-x-8 gap-y-4 p-4 sm:p-6 lg:h-full lg:grid-cols-[1fr_22rem] lg:grid-rows-[auto_1fr]">
      <h1 className={`text-4xl leading-none lg:col-span-2 ${s.pen}`}>
        <span className={s.marker}>색상 추출기</span>
      </h1>
      <section aria-label="이미지" className="flex min-h-0 flex-col gap-3">
        {input.image ? (
          <>
            {/* 이미지 아래에 팔레트 막대를 이어 붙인 한 장의 카드 — 색 조합 카드처럼 보이게.
                남은 자리(area) 가운데에 카드를 두고, 카드는 이미지 폭에 맞춰 줄어든다 */}
            <div ref={areaRef} className="flex h-[60vh] min-h-80 items-center justify-center lg:h-auto lg:min-h-0 lg:flex-1">
              <div
                className={`flex ${s.sheet} ${shown?.vertical ? "flex-row" : "flex-col"}`}
                style={{ padding: CARD_GAP, gap: CARD_GAP }}
              >
                <span aria-hidden className={s.tape} />
                <canvas
                  ref={canvasRef}
                  aria-label="이미지에서 색 고르기"
                  onPointerMove={(e) => {
                    const p = pixelAt(e);
                    setHover({ x: p.x, y: p.y, clientX: e.clientX, clientY: e.clientY, hex: formatHex(p.rgb) });
                  }}
                  onPointerLeave={() => setHover(null)}
                  onClick={(e) => {
                    const p = pixelAt(e);
                    if (p.alpha === 0) setNotice("투명한 곳이라 색이 없어요");
                    else choose(p.rgb);
                  }}
                  className="cursor-crosshair touch-none"
                  style={{ imageRendering: "pixelated", width: shown?.width ?? 0, height: shown?.height ?? 0 }}
                />
                {palette.length === 0 ? (
                  <p
                    role="status"
                    className="text-center text-sm text-ink/70"
                    style={shown?.vertical ? { width: shown.bar } : { width: shown?.width }}
                  >
                    투명하지 않은 픽셀이 없어서 팔레트를 만들지 못했어요.
                  </p>
                ) : (
                  <ul
                    aria-label="컬러 팔레트"
                    className={`flex shrink-0 ${shown?.vertical ? "flex-col" : ""}`}
                    style={
                      shown?.vertical
                        ? { width: shown.bar, height: shown.height, gap: CARD_GAP }
                        : { width: shown?.width, height: shown?.bar, gap: CARD_GAP }
                    }
                  >
                    {palette.map((p) => {
                      const rgb = hexToRgb(p.hex)!;
                      const selected = currentHex === p.hex;
                      return (
                        <li key={p.hex} className="min-h-0 min-w-0 flex-1">
                          <button
                            type="button"
                            aria-label={`${p.hex} 고르기 (${Math.round(p.ratio * 1000) / 10}%)`}
                            aria-pressed={selected}
                            title={`${p.hex} · ${Math.round(p.ratio * 1000) / 10}%`}
                            onClick={() => choose(rgb)}
                            className="relative flex size-full items-end justify-center pb-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-main"
                            style={{ backgroundColor: p.hex, color: isDark(rgb) ? "#fff" : "#2e353f" }}
                          >
                            {label !== null && (
                              <span
                                className={`overflow-hidden font-mono leading-none font-bold whitespace-nowrap ${selected ? "" : "opacity-75"}`}
                                style={{ fontSize: label }}
                              >
                                {p.hex}
                              </span>
                            )}
                            {selected && <span aria-hidden className="absolute top-1.5 size-2 rounded-full bg-current" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`flex items-center gap-2 text-2xl ${s.pen}`}>
                컬러 팔레트 <span className="w-7 tabular-nums">{count}색</span>
                <input
                  type="range"
                  aria-label="컬러 팔레트 색 개수"
                  min={MIN_COLORS}
                  max={MAX_COLORS}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={`w-28 ${s.range}`}
                />
              </label>
              {palette.length > 0 && (
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={downloadCard} className={`${SMALL_BUTTON} flex items-center gap-1`}>
                    <Download aria-hidden className="size-4" strokeWidth={1.75} />
                    PNG 저장
                  </button>
                </div>
              )}
            </div>
            <ImageDropZone input={input} compact classNames={DROP_ZONE} />
          </>
        ) : (
          <ImageDropZone input={input} classNames={DROP_ZONE} />
        )}
      </section>

      <aside className="flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:pb-1">
        {/* 고른 색 — 이미지 클릭, 화면 색상 추출, 팔레트 막대가 모두 여기로 온다 */}
        <section aria-label="고른 색" className="flex flex-col gap-3">
          {screenPickSupported ? (
            <button
              type="button"
              onClick={pickFromScreen}
              className={`px-4 py-1.5 text-2xl ${s.btn} ${s.btnInk} ${s.pen}`}
            >
              <Pipette aria-hidden className="size-4" strokeWidth={1.75} />
              화면에서 색상 추출
            </button>
          ) : (
            <p className={`text-xl leading-6 text-ink/60 ${s.pen}`}>
              화면 어디서나 색을 뽑는 기능은 데스크톱 Chrome·Edge에서만 돼요.
            </p>
          )}

          {/* 견본 동그라미 하나와 코드 세 줄. 줄을 누르면 그 형식으로 복사한다.
              코드 세 줄(24px×3)만큼 높이를 고정해, 색이 생기기 전후로 아래가 밀리지 않는다 */}
          <div className="flex h-18 items-center gap-3">
            <div
              aria-hidden
              className={`size-14 shrink-0 ${s.blob} ${current ? "" : "border-dashed! bg-white/50"}`}
              style={current ? { backgroundColor: formatHex(current) } : undefined}
            />
            {current ? (
              <ul className="min-w-0 flex-1">
                {FORMATS.map(({ label, format }) => (
                  <li key={label}>
                    <button
                      type="button"
                      aria-label={`${label} 복사`}
                      onClick={() => copy(format(current))}
                      className={`group flex w-full items-center gap-2 px-1.5 py-0.5 text-left ${s.row}`}
                    >
                      <span className={`w-10 shrink-0 text-xl leading-5 text-ink/55 ${s.pen}`}>{label}</span>
                      <span className="truncate font-mono text-sm text-ink">{format(current)}</span>
                      <Copy aria-hidden strokeWidth={1.75} className="ml-auto size-3.5 shrink-0 text-ink/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-xl leading-6 text-ink/50 ${s.pen}`}>이미지나 팔레트를 누르면 여기에 색이 나와요</p>
            )}
          </div>

          {/* 고른 색을 아래 '내 팔레트'에 담는다. 이미 담았거나 가득 차면 흐려진다 */}
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => currentHex && setCustom((c) => [...c, currentHex])}
            className={`self-start px-3 text-xl leading-8 ${s.btn} ${s.pen}`}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.75} />
            {currentHex && custom.includes(currentHex)
              ? "내 팔레트에 담김"
              : custom.length >= MAX_CUSTOM
                ? "내 팔레트가 가득 찼어요"
                : "내 팔레트에 담기"}
          </button>

          {notice && (
            <p role="status" className={`text-xl leading-6 text-main ${s.pen}`}>
              {notice}
            </p>
          )}

          {recent.length > 0 && (
            <div>
              <h2 className={`text-2xl leading-7 ${s.pen}`}>최근 고른 색</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {recent.map((c) => (
                  <li key={formatHex(c)}>
                    <button
                      type="button"
                      aria-label={`${formatHex(c)} 다시 고르기`}
                      title={formatHex(c)}
                      onClick={() => choose(c)}
                      className={`size-7 transition-transform hover:scale-110 ${s.chip}`}
                      style={{ backgroundColor: formatHex(c) }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 내 팔레트 — 사진 없이 막대만 있는 카드. 고른 색을 담아 직접 만든다 */}
        <section aria-label="내 팔레트" className="flex flex-col gap-3 lg:mt-auto">
          <div aria-hidden className={s.squiggle} />
          <div className="flex items-center gap-2">
            <h2 className={`text-3xl leading-none ${s.pen}`}>
              <span className={s.marker}>내 팔레트</span>
            </h2>
            <span className={`text-xl text-ink/50 tabular-nums ${s.pen}`}>
              {custom.length}/{MAX_CUSTOM}
            </span>
            {custom.length > 0 && (
              <button
                type="button"
                onClick={() => setCustom([])}
                className={`ml-auto text-xl text-ink/50 underline-offset-2 hover:text-main hover:underline ${s.pen}`}
              >
                초기화
              </button>
            )}
            {custom.length > 0 && (
              <button type="button" onClick={downloadCustom} className={`${SMALL_BUTTON} flex items-center gap-1`}>
                <Download aria-hidden className="size-3.5" />
                PNG 저장
              </button>
            )}
          </div>
          <div className={s.sheet} style={{ padding: CARD_GAP }}>
            <ul ref={customRef} aria-label="내 팔레트 색" className="relative flex" style={{ height: CUSTOM_BAR, gap: CARD_GAP }}>
              {/* 놓일 자리 보조선: 틈 가운데에 세로 막대와 위아래 점 */}
              {dropGap !== null && custom.length > 0 && (
                <li
                  aria-hidden
                  className="pointer-events-none absolute -inset-y-1.5 z-10 w-0.5 bg-point before:absolute before:-top-1 before:-left-[3px] before:size-2 before:rounded-full before:bg-point after:absolute after:-bottom-1 after:-left-[3px] after:size-2 after:rounded-full after:bg-point"
                  style={{ left: dropGap * ((customWidth + CARD_GAP) / custom.length) - CARD_GAP / 2 - 1 }}
                />
              )}
              {custom.length === 0 ? (
                <li className={`grid flex-1 place-items-center border-dashed! border-ink/30! px-4 text-center text-xl leading-6 text-ink/50 ${s.sketch} ${s.pen}`}>
                  색을 고르고 &apos;내 팔레트에 담기&apos;를 누르면 여기에 쌓여요
                </li>
              ) : (
                custom.map((hex) => {
                  const rgb = hexToRgb(hex)!;
                  const fg = isDark(rgb) ? "#fff" : "#2e353f";
                  return (
                    <li key={hex} className="group relative min-w-0 flex-1">
                      <button
                        type="button"
                        aria-label={`${hex} 고르기`}
                        aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                        title={`${hex} · 옆으로 끌어 순서 바꾸기`}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          choose(rgb);
                        }}
                        onKeyDown={(e) => {
                          if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                          e.preventDefault();
                          moveCustom(hex, custom.indexOf(hex) + (e.key === "ArrowLeft" ? -1 : 1));
                        }}
                        onPointerDown={(e) => {
                          dragRef.current = { hex, startX: e.clientX, moved: false };
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          const drag = dragRef.current;
                          const ul = customRef.current;
                          if (!drag || !ul) return;
                          if (!drag.moved && Math.abs(e.clientX - drag.startX) < 5) return;
                          drag.moved = true;
                          setDraggingHex(drag.hex);
                          // 포인터에 가장 가까운 틈 번호. 틈 i는 i번째 막대의 왼쪽 경계다
                          const rect = ul.getBoundingClientRect();
                          const slot = (rect.width + CARD_GAP) / custom.length;
                          const gapIdx = Math.max(0, Math.min(custom.length, Math.round((e.clientX - rect.left + CARD_GAP / 2) / slot)));
                          // 제자리(자기 왼쪽·오른쪽 틈)면 보조선을 숨긴다
                          const from = custom.indexOf(drag.hex);
                          setDropGap(gapIdx === from || gapIdx === from + 1 ? null : gapIdx);
                        }}
                        onPointerUp={() => {
                          const drag = dragRef.current;
                          if (drag?.moved && dropGap !== null) {
                            const from = custom.indexOf(drag.hex);
                            moveCustom(drag.hex, dropGap > from ? dropGap - 1 : dropGap);
                          }
                          setDropGap(null);
                          // 끌기 직후 따라오는 클릭만 막는다. 클릭이 안 오는 경우도 있어 곧 푼다
                          if (dragRef.current?.moved) {
                            suppressClick.current = true;
                            setTimeout(() => (suppressClick.current = false), 0);
                          }
                          dragRef.current = null;
                          setDraggingHex(null);
                        }}
                        onPointerCancel={() => {
                          dragRef.current = null;
                          setDraggingHex(null);
                          setDropGap(null);
                        }}
                        className={`flex size-full cursor-grab touch-pan-y items-end justify-center pb-1.5 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${
                          draggingHex === hex ? "cursor-grabbing opacity-40" : ""
                        }`}
                        style={{ backgroundColor: hex, color: fg }}
                      >
                        {customLabel !== null && (
                          <span
                            className={`overflow-hidden font-mono leading-none font-bold whitespace-nowrap ${currentHex === hex ? "" : "opacity-75"}`}
                            style={{ fontSize: customLabel }}
                          >
                            {hex}
                          </span>
                        )}
                      </button>
                      {draggingHex === null && (
                      <button
                        type="button"
                        aria-label={`${hex} 빼기`}
                        onClick={() => setCustom((c) => c.filter((h) => h !== hex))}
                        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/25 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <X aria-hidden className="size-3" />
                      </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>
      </aside>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col items-center gap-1"
          style={{ left: loupeLeft, top: loupeTop }}
        >
          <canvas
            ref={loupeRef}
            width={LOUPE_PX}
            height={LOUPE_PX}
            className="rounded-full border-2 border-ink bg-white shadow-lg"
          />
          <span className={`bg-ink px-2 font-mono text-[11px] leading-5 text-[#fffdf8] ${s.sketch}`}>
            {hover.hex}
          </span>
        </div>
      )}
      <CopyToast message={message} />
    </div>
    </div>
  );
}
