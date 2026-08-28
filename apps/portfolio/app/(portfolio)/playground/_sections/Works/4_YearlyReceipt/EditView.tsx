"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  GripVertical,
  type LucideIcon,
  Moon,
  Plus,
  Printer,
  Ticket,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Goal, ItemKind, ReceiptState, ReceiptStyle } from "./types";
import { GOALS_YEAR, itemDone, newId, newItem } from "./utils";

interface EditViewProps {
  state: ReceiptState;
  setState: Dispatch<SetStateAction<ReceiptState>>;
  onOpen: () => void;
}

const STYLE_OPTIONS: {
  value: ReceiptStyle;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "classic", label: "기본", icon: FileText },
  { value: "dark", label: "다크", icon: Moon },
];

const KIND_META: Record<ItemKind, { icon: LucideIcon; label: string }> = {
  check: { icon: Check, label: "체크" },
  progress: { icon: TrendingUp, label: "진행률" },
};
const KINDS = Object.keys(KIND_META) as ItemKind[];

/** 숫자 입력 파싱 (음수/NaN 방지) */
function parseCount(raw: string, min: number): number {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? min : Math.max(min, n);
}

export default function EditView({ state, setState, onOpen }: EditViewProps) {
  const { goals, style } = state;
  const [guideOpen, setGuideOpen] = useState(true);

  // 드래그 순서 변경 상태 (source / drop-target)
  const [dragG, setDragG] = useState<number | null>(null);
  const [overG, setOverG] = useState<number | null>(null);
  const [dragI, setDragI] = useState<{ goalId: string; index: number } | null>(
    null,
  );
  const [overI, setOverI] = useState<{ goalId: string; index: number } | null>(
    null,
  );

  const clearDrag = () => {
    setDragG(null);
    setOverG(null);
    setDragI(null);
    setOverI(null);
  };

  // gap: 삽입 간격 인덱스(0..length). from 제거 후 삽입 위치를 보정한다.
  const moveGoal = (from: number, gap: number) =>
    updateGoals((gs) => {
      const to = gap > from ? gap - 1 : gap;
      if (to === from) return gs;
      const next = [...gs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const moveItem = (goalId: string, from: number, gap: number) =>
    updateGoals((gs) =>
      gs.map((g) => {
        if (g.id !== goalId) return g;
        const to = gap > from ? gap - 1 : gap;
        if (to === from) return g;
        const items = [...g.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...g, items };
      }),
    );

  // 포인터(마우스·터치 공용) 기반 드래그 재정렬
  type Drag =
    | { kind: "goal"; index: number }
    | { kind: "item"; goalId: string; index: number };
  const dragRef = useRef<Drag | null>(null);
  const overRef = useRef<number | null>(null);

  const startDrag = (drag: Drag, e: React.PointerEvent) => {
    if (e.button !== 0) return; // 주 버튼/터치만
    e.preventDefault();
    dragRef.current = drag;
    overRef.current = drag.index;
    if (drag.kind === "goal") {
      setDragG(drag.index);
      setOverG(drag.index);
    } else {
      setDragI({ goalId: drag.goalId, index: drag.index });
      setOverI({ goalId: drag.goalId, index: drag.index });
    }

    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!el) return;
      if (drag.kind === "goal") {
        const li = el.closest("[data-goal-index]") as HTMLElement | null;
        if (!li) return;
        const idx = Number(li.dataset.goalIndex);
        if (Number.isNaN(idx)) return;
        const rect = li.getBoundingClientRect();
        // 위 절반이면 이 행 앞(gap=idx), 아래 절반이면 이 행 뒤(gap=idx+1)
        const gap = ev.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
        overRef.current = gap;
        setOverG(gap);
      } else {
        const li = el.closest("[data-item-index]") as HTMLElement | null;
        if (!li || li.dataset.itemGoal !== drag.goalId) return; // 같은 목표 내에서만
        const idx = Number(li.dataset.itemIndex);
        if (Number.isNaN(idx)) return;
        const rect = li.getBoundingClientRect();
        const gap = ev.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
        overRef.current = gap;
        setOverI({ goalId: drag.goalId, index: gap });
      }
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const to = overRef.current;
      if (to !== null) {
        if (drag.kind === "goal") moveGoal(drag.index, to);
        else moveItem(drag.goalId, drag.index, to);
      }
      dragRef.current = null;
      overRef.current = null;
      clearDrag();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const updateGoals = (updater: (goals: Goal[]) => Goal[]) =>
    setState((prev) => ({ ...prev, goals: updater(prev.goals) }));

  const setStyle = (value: ReceiptStyle) =>
    setState((prev) => ({ ...prev, style: value }));

  const addGoal = () =>
    updateGoals((gs) => [...gs, { id: newId(), title: "", items: [] }]);

  const removeGoal = (goalId: string) =>
    updateGoals((gs) => gs.filter((g) => g.id !== goalId));

  const setGoalTitle = (goalId: string, title: string) =>
    updateGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, title } : g)));

  const addItem = (goalId: string) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId ? { ...g, items: [...g.items, newItem()] } : g,
      ),
    );

  const removeItem = (goalId: string, itemId: string) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
          : g,
      ),
    );

  const toggleItem = (goalId: string, itemId: string) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked } : i,
              ),
            }
          : g,
      ),
    );

  const setItemLabel = (goalId: string, itemId: string, label: string) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, label } : i,
              ),
            }
          : g,
      ),
    );

  const setItemKind = (goalId: string, itemId: string, kind: ItemKind) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? {
              ...g,
              items: g.items.map((i) => (i.id === itemId ? { ...i, kind } : i)),
            }
          : g,
      ),
    );

  const setItemNumber = (
    goalId: string,
    itemId: string,
    field: "current" | "target",
    value: number,
  ) =>
    updateGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, [field]: value } : i,
              ),
            }
          : g,
      ),
    );

  const hasGoals = goals.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fbf3e6] text-[#4a4038]">
      {/* 헤더 */}
      <header className="flex flex-col border-b-2 border-dashed border-[#e2d3ba] px-5 py-4 items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a99a7d]">
          ~{GOALS_YEAR} 중간 정산~
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#4a4038]">
            {GOALS_YEAR}년의 목표 달성 현황을 공유해주세요!
          </span>
        </div>
      </header>

      {/* 사용법 안내 (접기/펼치기, 기본 펼침) */}
      <div className="border-b-2 border-dashed border-[#ecdcc4] bg-[#fdf8ef] px-5 py-3">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          aria-expanded={guideOpen}
          className="flex w-full items-center justify-between text-xs font-bold text-[#8a7a62]"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" strokeWidth={2.5} />
            사용법 &amp; 주의사항
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${guideOpen ? "" : "-rotate-90"}`}
            strokeWidth={2.5}
          />
        </button>
        {guideOpen && (
          <>
            <ol className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-[#a08d76]">
              <li>
                <span className="font-bold text-[#77b98a]">1.</span> &lsquo;목표
                추가&rsquo;로 올해 세운 목표의 카테고리를 작성해주세요.{" "}
                <span className="text-[#c3b49b]">
                  (예: 공부, 습관, 대인관계, 쉼, 일)
                </span>
              </li>
              <li>
                <span className="font-bold text-[#77b98a]">2.</span> 카테고리
                별로 목표를 작성하고, 유형을 선택해 달성 현황을 기록하세요.{" "}
                <span className="inline-flex items-center gap-1 text-[#c3b49b]">
                  (<Check className="inline-block size-3" strokeWidth={3} />{" "}
                  체크 ·{" "}
                  <TrendingUp
                    className="inline-block size-3"
                    strokeWidth={2.5}
                  />{" "}
                  진행률)
                </span>
              </li>
              <li>
                <span className="font-bold text-[#77b98a]">3.</span>{" "}
                &lsquo;인쇄하기&rsquo;로 목표 달성 현황을 영수증으로 출력하고,
                이미지로 저장할 수 있어요.
              </li>
            </ol>
          </>
        )}
      </div>

      {/* 툴바: 목표 개수 + 항상 보이는 '목표 추가' 버튼 */}
      <div className="flex items-center gap-3 border-b-2 border-[#e2d3ba] bg-[#fdf8ef] px-5 py-2.5">
        <button
          onClick={addGoal}
          className="flex grow justify-center items-center gap-1.5 rounded-xl bg-[#77b98a] px-3.5 py-2 text-sm font-bold text-white shadow-[2px_2px_0_0_#4f9066] transition active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <Plus className="size-4" strokeWidth={2.75} /> 목표 추가
        </button>
      </div>

      {/* 목표 리스트 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {!hasGoals ? (
          <div className="flex h-full min-h-50 flex-col items-center justify-center gap-2 rounded-2xl text-center">
            <Ticket className="size-9 text-[#cdbfa8]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#8a7a62]">
              아직 목표가 없어요.
            </p>
            <p className="text-xs text-[#b0a088]">
              위 &lsquo;목표 추가&rsquo;로 올해 도전할 목표를 적어보세요!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {goals.map((goal, gi) => {
              const total = goal.items.length;
              const checked = goal.items.filter(itemDone).length;
              return (
                <li
                  key={goal.id}
                  data-goal-index={gi}
                  className={`relative rounded-2xl border-2 border-[#ecdcc4] bg-white p-4 shadow-[3px_3px_0_0_#ecdcc4] transition ${
                    dragG === gi ? "opacity-40" : ""
                  }`}
                >
                  {dragG !== null && overG === gi && (
                    <span className="pointer-events-none absolute inset-x-2 -top-1.5 z-10 h-0.5 rounded-full bg-[#77b98a]" />
                  )}
                  {dragG !== null &&
                    overG === goals.length &&
                    gi === goals.length - 1 && (
                      <span className="pointer-events-none absolute inset-x-2 -bottom-1.5 z-10 h-0.5 rounded-full bg-[#77b98a]" />
                    )}
                  <div className="flex items-center gap-2">
                    <button
                      onPointerDown={(e) =>
                        startDrag({ kind: "goal", index: gi }, e)
                      }
                      aria-label="목표 순서 변경 (드래그)"
                      className="shrink-0 cursor-grab touch-none select-none text-[#c3b49b] active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <input
                      value={goal.title}
                      onChange={(e) => setGoalTitle(goal.id, e.target.value)}
                      placeholder="목표 카테고리 (예: 자기계발)"
                      aria-label="목표 카테고리명"
                      className="min-w-0 flex-1 rounded-xl border-2 border-[#ecdcc4] bg-white px-2.5 py-1.5 text-base font-bold text-[#4a4038] outline-none placeholder:font-normal placeholder:text-[#c3b49b] focus:border-[#9a8b70]"
                    />
                    <span className="shrink-0 rounded-full bg-[#eaf5ee] px-2 py-0.5 text-xs font-bold text-[#4f9066]">
                      {checked}/{total}
                    </span>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      aria-label="목표 삭제"
                      className="rounded-lg p-1.5 text-[#c3b49b] transition hover:bg-[#ffe1d8] hover:text-[#e5533d]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {/* 하위 항목 */}
                  <ul className="mt-3 flex flex-col gap-2 pl-1">
                    {goal.items.map((item, ii) => (
                      <li
                        key={item.id}
                        data-item-index={ii}
                        data-item-goal={goal.id}
                        className={`relative rounded-xl bg-[#faf4ea] px-2 py-1.5 transition ${
                          dragI?.goalId === goal.id && dragI.index === ii
                            ? "opacity-40"
                            : ""
                        }`}
                      >
                        {dragI?.goalId === goal.id && overI?.index === ii && (
                          <span className="pointer-events-none absolute inset-x-2 -top-1 z-10 h-0.5 rounded-full bg-[#77b98a]" />
                        )}
                        {dragI?.goalId === goal.id &&
                          overI?.index === goal.items.length &&
                          ii === goal.items.length - 1 && (
                            <span className="pointer-events-none absolute inset-x-2 -bottom-1 z-10 h-0.5 rounded-full bg-[#77b98a]" />
                          )}
                        {/* 라벨 + 삭제 (체크형은 체크박스도 함께) */}
                        <div className="flex items-center gap-2">
                          <button
                            onPointerDown={(e) =>
                              startDrag(
                                { kind: "item", goalId: goal.id, index: ii },
                                e,
                              )
                            }
                            aria-label="하위 항목 순서 변경 (드래그)"
                            className="shrink-0 cursor-grab touch-none select-none text-[#cdbfa8] active:cursor-grabbing"
                          >
                            <GripVertical className="size-3.5" />
                          </button>
                          {item.kind === "check" && (
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleItem(goal.id, item.id)}
                              aria-label="완료 체크"
                              className="size-4.5 shrink-0 rounded accent-[#77b98a]"
                            />
                          )}
                          <input
                            value={item.label}
                            onChange={(e) =>
                              setItemLabel(goal.id, item.id, e.target.value)
                            }
                            placeholder="하위 항목 (예: 책 10권 읽기)"
                            aria-label="하위 항목 내용"
                            className={`min-w-0 flex-1 rounded-lg border-2 border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-[#c3b49b] focus:border-[#f0c3a8] focus:bg-white ${
                              item.kind === "check" && item.checked
                                ? "text-[#b0a088] line-through"
                                : "text-[#5c5142]"
                            }`}
                          />
                          <button
                            onClick={() => removeItem(goal.id, item.id)}
                            aria-label="하위 항목 삭제"
                            className="rounded p-1 text-[#cdbfa8] transition hover:bg-[#ffe1d8] hover:text-[#e5533d]"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* 형태 선택 + 진행률/습관 값 */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
                          <div className="flex gap-0.5 rounded-lg bg-white p-0.5">
                            {KINDS.map((k) => {
                              const Icon = KIND_META[k].icon;
                              return (
                                <button
                                  key={k}
                                  onClick={() =>
                                    setItemKind(goal.id, item.id, k)
                                  }
                                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition ${
                                    item.kind === k
                                      ? "bg-[#eaf5ee] text-[#4f9066]"
                                      : "text-[#b0a088] hover:text-[#8a7a62]"
                                  }`}
                                >
                                  <Icon className="size-3" strokeWidth={2.5} />
                                  {KIND_META[k].label}
                                </button>
                              );
                            })}
                          </div>

                          {item.kind !== "check" && (
                            <div className="flex items-center gap-1 text-xs text-[#8a7a62]">
                              <input
                                type="number"
                                min={0}
                                value={item.current}
                                onChange={(e) =>
                                  setItemNumber(
                                    goal.id,
                                    item.id,
                                    "current",
                                    parseCount(e.target.value, 0),
                                  )
                                }
                                aria-label="현재값"
                                className="w-14 rounded-md border-2 border-[#e2d3ba] bg-white px-1.5 py-0.5 text-center outline-none focus:border-[#9a8b70]"
                              />
                              <span>/</span>
                              <input
                                type="number"
                                min={1}
                                value={item.target}
                                onChange={(e) =>
                                  setItemNumber(
                                    goal.id,
                                    item.id,
                                    "target",
                                    parseCount(e.target.value, 1),
                                  )
                                }
                                aria-label="목표값"
                                className="w-14 rounded-md border-2 border-[#e2d3ba] bg-white px-1.5 py-0.5 text-center outline-none focus:border-[#9a8b70]"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    <li>
                      <button
                        onClick={() => addItem(goal.id)}
                        className="mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#a08d76] transition hover:text-[#4f9066]"
                      >
                        <Plus className="size-3.5" strokeWidth={2.5} /> 하위
                        항목 추가
                      </button>
                    </li>
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 하단 요약 + 인쇄 */}
      <footer className="flex items-center justify-between gap-4 border-t-2 border-[#e2d3ba] bg-[#fdf8ef] px-5 py-4">
        {/* 영수증 스타일 선택 토글 */}
        <div className="flex items-center gap-1 rounded-2xl border-2 border-[#e2d3ba] bg-white p-1">
          {STYLE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setStyle(opt.value)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  style === opt.value
                    ? "bg-[#efe7d6] text-[#4a4038]"
                    : "text-[#b0a088] hover:text-[#8a7a62]"
                }`}
              >
                <Icon className="size-4" strokeWidth={2.5} />
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpen}
          disabled={!hasGoals}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#4a4038] px-5 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_0_#2e2822] transition active:translate-x-px active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:bg-[#e2d3ba] disabled:text-white/70 disabled:shadow-none"
        >
          <Printer className="size-4" strokeWidth={2.5} /> 인쇄하기
        </button>
      </footer>
    </div>
  );
}
