"use client";

import { useEffect, useState } from "react";
import { Goal, ReceiptState, ReceiptStyle } from "./types";
import { newId, normalizeItem } from "./utils";

const STORAGE_KEY = "yearly-receipt-state";

function defaultState(): ReceiptState {
  return { goals: [], style: "classic" };
}

// 구버전(항목에 kind/current/target 없음) 데이터도 안전하게 읽어들인다
function normalizeGoal(raw: Partial<Goal> | undefined): Goal {
  return {
    id: typeof raw?.id === "string" ? raw.id : newId(),
    title: typeof raw?.title === "string" ? raw.title : "",
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [],
  };
}

function loadState(): ReceiptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<ReceiptState>;
    const style: ReceiptStyle =
      parsed.style === "dark" ? "dark" : "classic";
    return {
      goals: Array.isArray(parsed.goals)
        ? parsed.goals.map(normalizeGoal)
        : [],
      style,
    };
  } catch {
    return defaultState();
  }
}

export function useGoalsStorage() {
  const [state, setState] = useState<ReceiptState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  // 최초 방문/파싱 실패 시 기본값으로 초기화 (모드는 저장하지 않음)
  // 마운트 시 1회만 localStorage에서 로드하므로 cascading render 문제 없음
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(loadState());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 항상 최신 상태를 하나의 키에 덮어쓰기 저장
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  return { state, setState, hydrated };
}
