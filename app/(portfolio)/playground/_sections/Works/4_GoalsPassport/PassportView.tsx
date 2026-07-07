"use client";

import { Download, Pencil } from "lucide-react";
import ReceiptPaper from "./ReceiptPaper";
import { PassportState } from "./types";
import { usePassportExport } from "./usePassportExport";
import { GOALS_YEAR } from "./utils";

interface PassportViewProps {
  state: PassportState;
  settledAt: string;
  onEdit: () => void;
}

/** 다 뽑힌 뒤 슬릿과 영수증 사이 벌어지는 여백(px) */
const PRINT_GAP = 48;

export default function PassportView({
  state,
  settledAt,
  onEdit,
}: PassportViewProps) {
  const { goals, style } = state;
  const { passportCaptureRef, isSaving, handleSave } =
    usePassportExport(GOALS_YEAR);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-[#efe6d3] px-4 py-6">
      <style>{`
        @keyframes gr-print {
          0%   { transform: translateY(-100%); }
          55%  { transform: translateY(0); }
          68%  { transform: translateY(0); }
          100% { transform: translateY(${PRINT_GAP}px); }
        }
      `}</style>

      <div className="w-full max-w-82.5">
        {/* 프린터 그래픽 */}
        <div className="relative z-10 mx-auto h-14 w-full rounded-t-2xl bg-linear-to-b from-[#c7c0b1] to-[#a79e8c] shadow-[0_3px_0_0_#8d8472] ring-1 ring-black/10">
          <div className="absolute left-4 top-4 flex gap-1.5">
            <span className="size-2 rounded-full bg-black/20" />
            <span className="size-2 rounded-full bg-black/20" />
          </div>
          <div className="absolute inset-x-3 bottom-0 flex h-3 items-center rounded-t-md bg-[#5b5346]">
            {/* 종이가 나오는 슬릿 */}
            <div className="mx-auto h-0.75 w-[94%] rounded-full bg-black/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* 슬릿에서 종이가 나온 뒤 아래로 내려가며 인쇄기와 간격이 벌어지는 연출.
            paddingBottom(PRINT_GAP)만큼 clip 영역을 넓혀 내려간 종이가 잘리지 않게 한다. */}
        <div className="overflow-hidden" style={{ paddingBottom: PRINT_GAP }}>
          <div
            ref={passportCaptureRef}
            key={settledAt}
            style={{
              animation: "gr-print 2.1s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <ReceiptPaper goals={goals} style={style} settledAt={settledAt} />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div
        data-html-to-image-ignore="true"
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-2xl border-2 border-[#d8c9a8] bg-white px-4 py-2.5 text-sm font-bold text-[#8a7a62] shadow-[3px_3px_0_0_#d8c9a8] transition active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50"
        >
          <Download className="size-4" strokeWidth={2.5} />
          {isSaving ? "저장 중…" : "이미지로 저장"}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 rounded-2xl bg-[#4a4038] px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_0_#2e2822] transition active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <Pencil className="size-4" strokeWidth={2.5} /> 수정하기
        </button>
      </div>
    </div>
  );
}
