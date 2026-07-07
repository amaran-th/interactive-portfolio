"use client";

import { useState } from "react";
import EditView from "./EditView";
import { logPrintRecord } from "./logPrint";
import PassportView from "./PassportView";
import { useGoalsStorage } from "./useGoalsStorage";

type Mode = "edit" | "passport";

function formatSettledAt(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function GoalsPassport() {
  const { state, setState, hydrated } = useGoalsStorage();
  // 모드는 저장하지 않음 — 새로고침 시 항상 편집 모드로 시작
  const [mode, setMode] = useState<Mode>("edit");
  const [settledAt, setSettledAt] = useState("");

  const handleOpen = () => {
    const now = formatSettledAt(new Date());
    setSettledAt(now);
    logPrintRecord(state, now); // 구글 시트에 익명 기록 (fire-and-forget)
    setMode("passport");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#efe6d3]">
      {/* 로드 전에는 편집 UI가 깜빡이지 않도록 빈 배경 유지 */}
      {!hydrated ? null : mode === "edit" ? (
        <EditView state={state} setState={setState} onOpen={handleOpen} />
      ) : (
        <PassportView
          state={state}
          settledAt={settledAt}
          onEdit={() => setMode("edit")}
        />
      )}
    </div>
  );
}
