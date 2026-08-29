"use client";

import { Download } from "lucide-react";
import { useRef } from "react";

type ImportScenarioButtonProps = {
  onImportJson: (file: File) => void;
};

export default function ImportScenarioButton({
  onImportJson,
}: ImportScenarioButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex h-7 items-center gap-1 rounded-full bg-white/80 px-3 text-xs text-gray-600 hover:bg-white"
      >
        <Download className="h-3.5 w-3.5" /> 불러오기
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportJson(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
