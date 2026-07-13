"use client";

import { Copy } from "lucide-react";
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

type Format = "png" | "svg" | "json" | "jpg";

// 래스터 형식(PNG·JPG)을 나란히, 그 다음 벡터/데이터 형식(SVG·JSON) 순으로 배치한다.
const FORMATS: { id: Format; label: string }[] = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "svg", label: "SVG" },
  { id: "json", label: "JSON" },
];

// PNG·JPG는 래스터라 배율만큼 실제 출력 해상도가 달라진다 — SVG·JSON은
// 벡터/데이터라 해상도 개념이 없어 이 옵션 자체를 보여주지 않는다.
const SCALE_OPTIONS = [1, 2, 4, 8, 16];

export default function ExportPanel({ doc }: { doc: PixelArt }) {
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState(8);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
  }, []);

  const handleSave = useCallback(() => {
    if (format === "png") exportAsPNG(doc, scale);
    else if (format === "svg") exportAsSVG(doc);
    else if (format === "json") exportAsJSON(doc);
    else exportAsJPG(doc, scale);
  }, [format, doc, scale]);

  // PNG는 이미지로, SVG·JSON은 코드(텍스트)로 클립보드에 복사한다. JPG는
  // 대부분 브라우저의 ClipboardItem이 image/png만 신뢰성 있게 지원해 제외.
  const handleSecondary = useCallback(async () => {
    if (format === "png") {
      flash((await copyPngToClipboard(doc, scale)) ? "PNG를 클립보드에 복사했습니다" : "클립보드 복사 실패");
    } else if (format === "svg") {
      flash((await copyTextToClipboard(buildSvgString(doc))) ? "SVG 코드를 복사했습니다" : "클립보드 복사 실패");
    } else if (format === "json") {
      flash((await copyTextToClipboard(JSON.stringify(doc, null, 2))) ? "JSON을 복사했습니다" : "클립보드 복사 실패");
    }
  }, [format, doc, scale, flash]);

  const hasSecondary = format !== "jpg";
  const secondaryTitle = format === "png" ? "클립보드에 이미지로 복사" : "코드 복사";

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <p className="text-xs font-semibold text-gray-500">내보내기</p>

      <div className="grid grid-cols-4 gap-1">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`py-1.5 text-[10px] font-semibold ${
              format === f.id ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(format === "png" || format === "jpg") && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center justify-between text-xs text-gray-600">
            <span>해상도</span>
            <span className="text-[10px] tabular-nums text-gray-400">
              {doc.width * scale} × {doc.height * scale}px
            </span>
          </label>
          <div className="flex gap-1">
            {SCALE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`flex-1 py-1 text-[10px] ${
                  scale === s ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}

      {status && <p className="text-[10px] text-violet-600">{status}</p>}

      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          className="flex-1 bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
        >
          파일로 저장
        </button>
        {hasSecondary && (
          <button
            onClick={handleSecondary}
            title={secondaryTitle}
            className="flex w-9 shrink-0 items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
