"use client";

import { useState } from "react";

export default function TextToolPopup({
  onConfirm,
  onCancel,
}: {
  onConfirm: (text: string, fontSize: number) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-64 bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">텍스트 넣기</h2>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">내용</label>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(text, fontSize);
            else if (e.key === "Escape") onCancel();
          }}
          placeholder="텍스트 입력"
          className="mb-3 w-full select-text bg-white px-3 py-2 text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
        />
        <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <span>글자 크기</span>
          <span className="text-gray-500 normal-case">{fontSize}px</span>
        </label>
        <input
          type="range"
          min={4}
          max={64}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="mb-3 w-full"
        />
        <button
          onClick={() => onConfirm(text, fontSize)}
          className="w-full bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
        >
          찍기
        </button>
        <button onClick={onCancel} className="mt-2 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
          취소
        </button>
      </div>
    </div>
  );
}
