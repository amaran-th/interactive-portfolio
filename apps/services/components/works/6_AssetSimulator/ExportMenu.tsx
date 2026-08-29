"use client";

import { FileJson, Image as ImageIcon, Sheet, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ExportMenuProps = {
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportImage: () => void;
  isExportingImage: boolean;
};

export default function ExportMenu({
  onExportJson,
  onExportCsv,
  onExportImage,
  isExportingImage,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-7 items-center gap-1 rounded-full bg-white/80 px-3 text-xs text-gray-600 hover:bg-white"
      >
        <Upload className="h-3.5 w-3.5" /> 내보내기
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onExportImage();
              setOpen(false);
            }}
            disabled={isExportingImage}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {isExportingImage ? "이미지 생성 중..." : "그래프 이미지 (PNG)"}
          </button>
          <button
            type="button"
            onClick={() => {
              onExportCsv();
              setOpen(false);
            }}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            <Sheet className="h-3.5 w-3.5" /> 월별 데이터 (CSV)
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            <FileJson className="h-3.5 w-3.5" /> 시나리오 저장 (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
