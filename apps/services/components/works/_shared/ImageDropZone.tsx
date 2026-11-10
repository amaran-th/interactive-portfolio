"use client";

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import type { ImageInput } from "./useImageInput";

// 이미지를 넣는 영역. compact면 이미지가 이미 있을 때 쓰는 작은 '다른 이미지' 줄.
export default function ImageDropZone({
  input,
  compact = false,
}: {
  input: ImageInput;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div
      {...input.dropProps}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
        input.dragging ? "border-main bg-white" : "border-point/30 bg-white/60"
      } ${compact ? "" : "min-h-56 flex-1"}`}
    >
      {!compact && <ImagePlus aria-hidden className="size-8 text-point/60" />}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-md border-2 border-point bg-white px-3 py-1.5 font-bold text-point shadow-[2px_2px_0_0_var(--color-point)] hover:bg-shade"
      >
        {compact ? "다른 이미지" : "이미지 고르기"}
      </button>
      <p className="text-xs text-ink/60">끌어다 놓거나 Ctrl/⌘+V로 붙여 넣어도 돼요</p>
      {input.error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {input.error}
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          input.load(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
