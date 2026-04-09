"use client";

import { toPng } from "html-to-image";
import { useCallback, useRef, useState } from "react";
import { Mode, Stitch } from "./type";

const RESULT_EXPORT_PADDING = 40;

export function useResultExport({
  finalRows,
  mode,
}: {
  finalRows: Stitch[][];
  mode: Mode | null;
}) {
  const resultCaptureRef = useRef<HTMLDivElement>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);

  const handleSaveResult = useCallback(async () => {
    if (typeof window === "undefined" || finalRows.length === 0 || isSavingResult) return;

    setIsSavingResult(true);
    try {
      if (!resultCaptureRef.current) return;

      const el = resultCaptureRef.current;
      const exportWidth = Math.ceil(Math.max(el.scrollWidth, el.clientWidth));
      const exportHeight = Math.ceil(Math.max(el.scrollHeight, el.clientHeight));

      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        width: exportWidth,
        height: exportHeight,
        style: {
          boxShadow: "none",
          borderRadius: "32px",
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
          maxHeight: "none",
          overflow: "visible",
          overflowY: "visible",
        },
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.htmlToImageIgnore === "true"),
      });

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load generated image"));
        image.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width + RESULT_EXPORT_PADDING * 2;
      canvas.height = image.height + RESULT_EXPORT_PADDING * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#f6f0e8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, RESULT_EXPORT_PADDING, RESULT_EXPORT_PADDING);

      const link = document.createElement("a");
      link.download =
        mode === "challenge"
          ? "knit-muffler-challenge-result.png"
          : "knit-muffler-free-result.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsSavingResult(false);
    }
  }, [finalRows, isSavingResult, mode]);

  return { resultCaptureRef, isSavingResult, handleSaveResult };
}
