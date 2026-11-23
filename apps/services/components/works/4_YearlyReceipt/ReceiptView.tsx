"use client";

import PixelIcon from "./PixelIcon";
import ReceiptPaper from "./ReceiptPaper";
import r from "./retro.module.css";
import { ReceiptState } from "./types";
import { useReceiptExport } from "./useReceiptExport";
import { GOALS_YEAR } from "./utils";

interface ReceiptViewProps {
  state: ReceiptState;
  settledAt: string;
  onEdit: () => void;
}

/** 다 뽑힌 뒤 슬릿과 영수증 사이 벌어지는 여백(px) */
const PRINT_GAP = 48;

export default function ReceiptView({
  state,
  settledAt,
  onEdit,
}: ReceiptViewProps) {
  const { goals, style } = state;
  const { receiptCaptureRef, isSaving, handleSave } =
    useReceiptExport(GOALS_YEAR);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6">
      <style>{`
        @keyframes gr-print {
          0%   { transform: translateY(-100%); }
          55%  { transform: translateY(0); }
          68%  { transform: translateY(0); }
          100% { transform: translateY(${PRINT_GAP}px); }
        }
      `}</style>

      <div className="w-full max-w-82.5">
        {/* 도트 프린터: 크림 본체 + 붉은 띠 + 깜빡이는 램프 */}
        <div
          className="relative z-10 h-16 w-full bg-[#c9d2a6]"
          style={{
            boxShadow:
              "0 -2px 0 0 #1d2414, -2px 0 0 0 #1d2414, 2px 0 0 0 #1d2414, inset 0 4px 0 0 #eef2d9, inset 0 -6px 0 0 #8f9a6c",
          }}
        >
          <div className="absolute inset-x-0 top-5 h-2 bg-[#4e5838]" />
          <div className="absolute top-2 left-3 flex gap-1">
            <span className={`size-2 bg-[#1d2414] ${r.blink}`} />
            <span className="size-2 bg-[#8f9a6c]" />
          </div>
          <span className="absolute top-1 right-3 text-[12px] font-bold text-[#4e5838]">
            PRINT-8
          </span>
          {/* 종이가 나오는 슬릿 */}
          <div className="absolute inset-x-2 bottom-0 flex h-4 items-center bg-[#1d2414] px-2">
            <div className="h-1 w-full bg-black" />
          </div>
        </div>

        {/* 슬릿에서 종이가 나온 뒤 아래로 내려가며 인쇄기와 간격이 벌어지는 연출.
            steps()로 한 줄씩 끊어 내보내 도트 프린터처럼 움직인다.
            paddingBottom(PRINT_GAP)만큼 clip 영역을 넓혀 내려간 종이가 잘리지 않게 한다. */}
        <div
          className="-mx-2 overflow-hidden px-2"
          style={{ paddingBottom: PRINT_GAP }}
        >
          <div
            ref={receiptCaptureRef}
            key={settledAt}
            className="pr-1 pb-1"
            style={{ animation: "gr-print 2.1s steps(28, end) both" }}
          >
            <ReceiptPaper goals={goals} style={style} settledAt={settledAt} />
          </div>
        </div>
      </div>

      {/* 늘어나는 여백: 영수증이 짧아도 버튼이 항상 화면 하단에 붙도록 함 */}
      <div className="min-h-6 flex-1" />

      {/* 액션 버튼 */}
      <div
        data-html-to-image-ignore="true"
        className="flex flex-wrap items-center justify-center gap-4 pb-1"
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-4 py-2 ${r.btn} ${r.btnGold}`}
        >
          <PixelIcon name="save" size={16} />
          {isSaving ? "저장 중…" : "이미지로 저장"}
        </button>
        <button
          onClick={onEdit}
          className={`px-4 py-2 ${r.btn}`}
        >
          <PixelIcon name="pencil" size={16} /> 수정하기
        </button>
      </div>
    </div>
  );
}
