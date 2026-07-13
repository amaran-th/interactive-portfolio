"use client";

import { useCallback, useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import {
  buildSvgString,
  copyPngToClipboard,
  copyTextToClipboard,
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSVG,
} from "./exportPixelArt";

const BUTTON_CLASS = "flex-1 bg-gray-100 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200";

export default function ExportPanel({ doc }: { doc: PixelArt }) {
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
  }, []);

  const handleCopyPng = useCallback(async () => {
    flash((await copyPngToClipboard(doc)) ? "PNG를 클립보드에 복사했습니다" : "클립보드 복사 실패");
  }, [doc, flash]);

  const handleCopySvgCode = useCallback(async () => {
    flash((await copyTextToClipboard(buildSvgString(doc))) ? "SVG 코드를 복사했습니다" : "클립보드 복사 실패");
  }, [doc, flash]);

  const handleCopyJsonCode = useCallback(async () => {
    flash((await copyTextToClipboard(JSON.stringify(doc, null, 2))) ? "JSON을 복사했습니다" : "클립보드 복사 실패");
  }, [doc, flash]);

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <p className="text-xs font-semibold text-gray-500">내보내기</p>
      {status && <p className="text-[10px] text-violet-600">{status}</p>}

      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">PNG</p>
        <div className="flex gap-1.5">
          <button onClick={() => exportAsPNG(doc)} className={BUTTON_CLASS}>
            파일로 저장
          </button>
          <button onClick={handleCopyPng} className={BUTTON_CLASS}>
            클립보드에 복사
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">SVG</p>
        <div className="flex gap-1.5">
          <button onClick={() => exportAsSVG(doc)} className={BUTTON_CLASS}>
            파일로 저장
          </button>
          <button onClick={handleCopySvgCode} className={BUTTON_CLASS}>
            코드 복사
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">JSON</p>
        <div className="flex gap-1.5">
          <button onClick={() => exportAsJSON(doc)} className={BUTTON_CLASS}>
            파일로 저장
          </button>
          <button onClick={handleCopyJsonCode} className={BUTTON_CLASS}>
            코드 복사
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">JPG (손실 압축)</p>
        <button onClick={() => exportAsJPG(doc)} className={BUTTON_CLASS}>
          파일로 저장
        </button>
      </div>
    </div>
  );
}
