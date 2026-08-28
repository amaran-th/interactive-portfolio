"use client";

import { useState } from "react";
import EditView from "./EditView";
import ReceiptView from "./ReceiptView";
import { useGoalsStorage } from "./useGoalsStorage";

type Mode = "edit" | "receipt";

function formatSettledAt(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function YearlyReceipt() {
  const { state, setState, hydrated } = useGoalsStorage();
  // 모드는 저장하지 않음 — 새로고침 시 항상 편집 모드로 시작
  const [mode, setMode] = useState<Mode>("edit");
  const [settledAt, setSettledAt] = useState("");

  const handleOpen = () => {
    const now = formatSettledAt(new Date());
    setSettledAt(now);
    setMode("receipt");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#efe6d3]">
      {/* 로드 전에는 편집 UI가 깜빡이지 않도록 빈 배경 유지 */}
      {!hydrated ? null : mode === "edit" ? (
        <EditView state={state} setState={setState} onOpen={handleOpen} />
      ) : (
        <ReceiptView
          state={state}
          settledAt={settledAt}
          onEdit={() => setMode("edit")}
        />
      )}
    </div>
  );
}
