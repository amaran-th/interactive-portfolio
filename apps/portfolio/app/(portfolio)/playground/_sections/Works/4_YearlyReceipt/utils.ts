import { ChecklistItem, ItemKind, Goal } from "./types";

/** 결산 연도 (현재 연도 기준) */
export const GOALS_YEAR = String(new Date().getFullYear());

/** 하위 항목 1칸의 정가 (진행률·습관은 달성 비율만큼 부분 결제) */
export const ITEM_PRICE = 10_000;

/** 고유 id 생성 */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 기본 하위 항목 (체크형) */
export function newItem(): ChecklistItem {
  return { id: newId(), label: "", kind: "check", checked: false, current: 0, target: 1 };
}

/** localStorage 등에서 읽은 원본 항목을 안전한 ChecklistItem으로 정규화 (구버전 호환) */
export function normalizeItem(raw: Partial<ChecklistItem> | undefined): ChecklistItem {
  const kind: ItemKind = raw?.kind === "progress" ? "progress" : "check";
  const target =
    typeof raw?.target === "number" && raw.target > 0 ? raw.target : 1;
  const current =
    typeof raw?.current === "number" && raw.current >= 0 ? raw.current : 0;
  return {
    id: typeof raw?.id === "string" ? raw.id : newId(),
    label: typeof raw?.label === "string" ? raw.label : "",
    kind,
    checked: !!raw?.checked,
    current,
    target,
  };
}

/** 항목의 달성 비율 (0~1). 체크형은 0 또는 1 */
export function itemRatio(item: ChecklistItem): number {
  if (item.kind === "check") return item.checked ? 1 : 0;
  if (item.target <= 0) return 0;
  return Math.max(0, Math.min(1, item.current / item.target));
}

/** 항목이 완전히 달성됐는지 */
export function itemDone(item: ChecklistItem): boolean {
  return itemRatio(item) >= 1;
}

export type ReceiptItem = {
  item: ChecklistItem;
  price: number; // 이 항목의 정가 (= ITEM_PRICE)
  paid: number; // 결제액 (달성했으면 정가, 아니면 0)
};

export type ReceiptLine = {
  goal: Goal;
  price: number; // 목표 정가 (= 항목 수 × ITEM_PRICE)
  items: ReceiptItem[];
  paid: number; // 달성한 항목 결제액 합
  checked: number;
  total: number;
};

export type ReceiptTotals = {
  lines: ReceiptLine[];
  subtotal: number; // 전체 정가 합
  totalPaid: number; // 결제(달성)액 합
};

/** 영수증에 필요한 항목별 금액과 합계를 계산한다 (1칸 = ITEM_PRICE 고정) */
export function computeReceipt(goals: Goal[]): ReceiptTotals {
  const lines: ReceiptLine[] = goals.map((goal) => {
    const total = goal.items.length;
    const items: ReceiptItem[] = goal.items.map((item) => ({
      item,
      price: ITEM_PRICE,
      paid: Math.round(ITEM_PRICE * itemRatio(item)), // 달성 비율만큼 결제
    }));
    const checked = goal.items.filter(itemDone).length; // 완전 달성한 항목 수
    return {
      goal,
      price: total * ITEM_PRICE,
      items,
      paid: items.reduce((sum, it) => sum + it.paid, 0),
      checked,
      total,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.price, 0);
  const totalPaid = lines.reduce((sum, line) => sum + line.paid, 0);
  return { lines, subtotal, totalPaid };
}

/** 1234567 → "₩1,234,567" */
export function formatWon(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}
