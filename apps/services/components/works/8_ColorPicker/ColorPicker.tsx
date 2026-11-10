"use client";

import { Pipette } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type React from "react";
import { type Rgb, formatHex, formatHsl, formatRgb, isDark, parseColor } from "../_shared/color";
import CopyToast from "../_shared/CopyToast";
import ImageDropZone from "../_shared/ImageDropZone";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import { fitWithin } from "../_shared/imageInput";
import { useImageInput } from "../_shared/useImageInput";

const MAX_RECENT = 10;
const LOUPE_CELLS = 11;
const LOUPE_CELL_PX = 10;
const LOUPE_PX = LOUPE_CELLS * LOUPE_CELL_PX;
const LOUPE_OFFSET = 16;

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
type Hover = { x: number; y: number; clientX: number; clientY: number; hex: string };

const noopSubscribe = () => () => {};

const FORMATS = [
  { label: "HEX", format: formatHex },
  { label: "RGB", format: formatRgb },
  { label: "HSL", format: formatHsl },
];

export default function ColorPicker() {
  const input = useImageInput();
  const { copy, message } = useCopyFeedback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const [current, setCurrent] = useState<Rgb | null>(null);
  const [recent, setRecent] = useState<Rgb[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
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
    ctx.strokeStyle = "#0c3675";
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

  const loupeLeft =
    hover && typeof window !== "undefined" && hover.clientX + LOUPE_OFFSET + LOUPE_PX > window.innerWidth
      ? hover.clientX - LOUPE_OFFSET - LOUPE_PX
      : (hover?.clientX ?? 0) + LOUPE_OFFSET;
  const loupeTop =
    hover && typeof window !== "undefined" && hover.clientY + LOUPE_OFFSET + LOUPE_PX + 24 > window.innerHeight
      ? hover.clientY - LOUPE_OFFSET - LOUPE_PX - 24
      : (hover?.clientY ?? 0) + LOUPE_OFFSET;

  return (
    <div className="mx-auto grid min-h-full max-w-6xl gap-5 p-4 sm:p-6 lg:h-full lg:grid-cols-[1fr_20rem]">
      <section aria-label="이미지" className="flex min-h-0 flex-col gap-3">
        {input.image ? (
          <>
            <div className="flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-point bg-white p-2">
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
                className="max-h-full max-w-full cursor-crosshair touch-none"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <ImageDropZone input={input} compact />
          </>
        ) : (
          <ImageDropZone input={input} />
        )}
      </section>

      <aside className="flex flex-col gap-4">
        {screenPickSupported ? (
          <button
            type="button"
            onClick={pickFromScreen}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-point bg-white px-4 py-2.5 font-bold text-point shadow-[3px_3px_0_0_var(--color-point)] hover:bg-shade"
          >
            <Pipette aria-hidden className="size-4" />
            화면에서 뽑기
          </button>
        ) : (
          <p className="text-xs text-ink/60">
            화면 어디서나 색을 뽑는 기능은 데스크톱 Chrome·Edge에서만 돼요.
          </p>
        )}

        <div
          className="flex h-28 items-center justify-center rounded-lg border-2 border-point text-sm font-bold"
          style={
            current
              ? { backgroundColor: formatHex(current), color: isDark(current) ? "#fff" : "#2e353f" }
              : undefined
          }
        >
          {current ? formatHex(current) : <span className="text-ink/50">이미지를 누르면 여기에 색이 나와요</span>}
        </div>

        {current && (
          <ul className="flex flex-col gap-2">
            {FORMATS.map(({ label, format }) => (
              <li key={label}>
                <button
                  type="button"
                  aria-label={`${label} 복사`}
                  onClick={() => copy(format(current))}
                  className="flex w-full items-center justify-between gap-3 rounded-md border-2 border-point/30 bg-white px-3 py-2 text-left hover:border-point"
                >
                  <span className="text-xs font-bold text-point">{label}</span>
                  <span className="font-mono text-sm">{format(current)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {notice && (
          <p role="status" className="text-sm font-bold text-red-600">
            {notice}
          </p>
        )}

        {recent.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-point">최근 뽑은 색</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recent.map((c) => (
                <li key={formatHex(c)}>
                  <button
                    type="button"
                    aria-label={`${formatHex(c)} 다시 고르기`}
                    title={formatHex(c)}
                    onClick={() => choose(c)}
                    className="size-8 rounded-md border-2 border-point"
                    style={{ backgroundColor: formatHex(c) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
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
            className="rounded-md border-2 border-point bg-white shadow-lg"
          />
          <span className="rounded bg-point px-1.5 py-0.5 font-mono text-[11px] text-white">
            {hover.hex}
          </span>
        </div>
      )}
      <CopyToast message={message} />
    </div>
  );
}
