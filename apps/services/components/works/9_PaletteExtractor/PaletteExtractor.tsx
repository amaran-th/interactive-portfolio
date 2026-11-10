"use client";

import { useMemo, useState } from "react";
import { hexToRgb, isDark } from "../_shared/color";
import CopyToast from "../_shared/CopyToast";
import ImageDropZone from "../_shared/ImageDropZone";
import { extractPalette } from "../_shared/quantize";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import { useImageInput } from "../_shared/useImageInput";

const MIN_COLORS = 3;
const MAX_COLORS = 12;
const DEFAULT_COLORS = 6;
// 계산 전에 긴 변을 이 크기로 줄인다. 큰 사진도 빠르게 계산한다.
const SAMPLE_MAX = 200;

const BUTTON =
  "rounded-md border-2 border-point bg-white px-3 py-1.5 text-sm font-bold text-point shadow-[2px_2px_0_0_var(--color-point)] hover:bg-shade";

export default function PaletteExtractor() {
  const input = useImageInput();
  const { copy, message } = useCopyFeedback();
  const [count, setCount] = useState(DEFAULT_COLORS);

  const pixels = useMemo(() => {
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
    () => (pixels ? extractPalette(pixels, count) : []),
    [pixels, count],
  );

  const cssVars = palette.map((p, i) => `--color-${i + 1}: ${p.hex};`).join("\n");
  const json = JSON.stringify(palette.map((p) => p.hex));

  return (
    <div className="mx-auto grid min-h-full max-w-6xl gap-5 p-4 sm:p-6 lg:h-full lg:grid-cols-[1fr_22rem]">
      <section aria-label="이미지" className="flex min-h-0 flex-col gap-3">
        {input.image ? (
          <>
            <div className="flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-point bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={input.image.src}
                alt="넣은 이미지"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <ImageDropZone input={input} compact />
          </>
        ) : (
          <ImageDropZone input={input} />
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-bold text-point">
          <span>
            색 개수 <span className="tabular-nums">{count}</span>
          </span>
          <input
            type="range"
            aria-label="색 개수"
            min={MIN_COLORS}
            max={MAX_COLORS}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="accent-[var(--color-point)]"
          />
        </label>

        {input.image && palette.length === 0 && (
          <p role="status" className="text-sm text-ink/70">
            투명하지 않은 픽셀이 없어서 색을 찾지 못했어요.
          </p>
        )}

        {palette.length > 0 && (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {palette.map((p) => {
                const rgb = hexToRgb(p.hex)!;
                return (
                  <li key={p.hex}>
                    <button
                      type="button"
                      aria-label={`${p.hex} 복사`}
                      onClick={() => copy(p.hex)}
                      className="flex h-16 w-full flex-col items-start justify-end rounded-md border-2 border-point p-2 text-left transition-transform hover:-rotate-1"
                      style={{ backgroundColor: p.hex, color: isDark(rgb) ? "#fff" : "#2e353f" }}
                    >
                      <span className="font-mono text-sm font-bold">{p.hex}</span>
                      <span className="text-[11px] tabular-nums opacity-80">
                        {Math.round(p.ratio * 1000) / 10}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(cssVars)} className={BUTTON}>
                CSS 변수 복사
              </button>
              <button type="button" onClick={() => copy(json)} className={BUTTON}>
                JSON 복사
              </button>
            </div>
          </>
        )}
      </aside>
      <CopyToast message={message} />
    </div>
  );
}
