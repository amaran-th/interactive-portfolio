"use client";

import { PassportState } from "./types";
import { computeReceipt, GOALS_YEAR, itemDone } from "./utils";

const DEVICE_KEY = "goals-device-id";

/** 브라우저(기기)별 고유 id — 없으면 만들어 localStorage에 저장 */
function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * 인쇄 시점의 영수증 상태를 서버 라우트(/api/goals-log)로 전송한다.
 * 같은 기기(deviceId)는 시트의 같은 행이 갱신되고, 새 기기는 새 행이 추가된다.
 * fire-and-forget — 실패해도 인쇄 UX에는 영향을 주지 않는다.
 */
export function logPrintRecord(state: PassportState, settledAt: string): void {
  if (typeof window === "undefined") return;
  try {
    const { lines, subtotal, totalPaid } = computeReceipt(state.goals);
    const itemsTotal = lines.reduce((sum, l) => sum + l.total, 0);
    const itemsDone = lines.reduce((sum, l) => sum + l.checked, 0);
    const goalsDone = lines.filter(
      (l) => l.total > 0 && l.checked === l.total,
    ).length;

    const payload = {
      deviceId: getDeviceId(),
      year: GOALS_YEAR,
      settledAt,
      totalPaid,
      subtotal,
      goalsTotal: state.goals.length,
      goalsDone,
      itemsTotal,
      itemsDone,
      goals: state.goals.map((g) => ({
        title: g.title,
        checked: g.items.filter(itemDone).length,
        total: g.items.length,
        items: g.items.map((i) => ({
          label: i.label,
          kind: i.kind,
          checked: i.checked,
          current: i.current,
          target: i.target,
        })),
      })),
    };

    void fetch("/api/goals-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 기록 실패는 무시
  }
}
