"use client";

import { toPng } from "html-to-image";
import { useCallback, useRef, useState } from "react";

/** export 이미지 바깥에 두르는 여백(px, pixelRatio 2 기준) */
const EXPORT_PADDING = 56;
/** 여백 배경색 (영수증이 놓인 데스크 색과 동일) */
const EXPORT_BG = "#efe6d3";

/**
 * 영수증 DOM을 PNG로 캡처하고, 바깥에 여백을 둘러 다운로드한다.
 * KnitMuffler `useResultExport.ts`와 동일한 html-to-image + 캔버스 패딩 패턴.
 */
export function useReceiptExport(year: string) {
  const receiptCaptureRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (typeof window === "undefined" || isSaving) return;
    const el = receiptCaptureRef.current;
    if (!el) return;

    setIsSaving(true);
    try {
      const exportWidth = Math.ceil(Math.max(el.scrollWidth, el.clientWidth));
      const exportHeight = Math.ceil(
        Math.max(el.scrollHeight, el.clientHeight),
      );

      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        width: exportWidth,
        height: exportHeight,
        style: {
          // 펼침·도장 애니메이션 변형이 캡처에 섞이지 않도록 정적으로 고정
          transform: "none",
          animation: "none",
          margin: "0",
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
        },
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            node.dataset.htmlToImageIgnore === "true"
          ),
      });

      // 캡처한 영수증을 여백을 준 캔버스 위에 올려 최종 이미지를 만든다
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Failed to load generated image"));
        image.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width + EXPORT_PADDING * 2;
      canvas.height = image.height + EXPORT_PADDING * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = EXPORT_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, EXPORT_PADDING, EXPORT_PADDING);

      const link = document.createElement("a");
      link.download = `${year || "goals"}-receipt.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, year]);

  return { receiptCaptureRef, isSaving, handleSave };
}
