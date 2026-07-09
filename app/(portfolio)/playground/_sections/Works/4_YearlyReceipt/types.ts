/** 하위 항목 기록 형태: 체크(달성/미달성) · 진행률(현재/목표) */
export type ItemKind = "check" | "progress";

export type ChecklistItem = {
  id: string;
  label: string;
  kind: ItemKind;
  checked: boolean; // kind === "check" 일 때 사용
  current: number; // kind === "progress" 일 때 현재값
  target: number; // kind === "progress" 일 때 목표값 (>= 1)
};

export type Goal = {
  id: string;
  title: string; // 목표 이름
  items: ChecklistItem[]; // 하위 항목들
};

export type ReceiptStyle = "classic" | "dark";

export type ReceiptState = {
  goals: Goal[];
  style: ReceiptStyle; // 기본값: "classic"
};
