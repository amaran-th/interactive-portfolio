"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Goal, ItemKind, ReceiptState, ReceiptStyle } from "./types";
import PixelIcon, { type PixelIconName } from "./PixelIcon";
import r from "./retro.module.css";
import { GOALS_YEAR, itemDone, newId, newItem } from "./utils";

interface EditViewProps {
  state: ReceiptState;
  setState: Dispatch<SetStateAction<ReceiptState>>;
  onOpen: () => void;
}

const STYLE_OPTIONS: {
  value: ReceiptStyle;
  label: string;
  icon: PixelIconName;
}[] = [
  { value: "classic", label: "기본", icon: "sun" },
  { value: "dark", label: "다크", icon: "moon" },
];

const KIND_META: Record<ItemKind, { icon: PixelIconName; label: string }> = {
  check: { icon: "check", label: "체크" },
  progress: { icon: "up", label: "진행률" },
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 헤더: 패미컴 본체의 붉은 판 */}
      <header className={`flex flex-col items-center px-5 pt-3 pb-4 ${r.band}`}>
        <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.2em] text-[#c9d2a6]">
          <PixelIcon name="star" size={8} />
          {GOALS_YEAR} 중간 정산
          <PixelIcon name="star" size={8} />
        </p>
        <p className="text-center text-[12px] font-bold sm:text-[24px] sm:leading-[1.5]">
          {GOALS_YEAR}년의 목표 달성 현황을 공유해주세요!
        </p>
      </header>

      {/* 사용법 안내 (접기/펼치기, 기본 펼침) */}
      <div className="px-5 pt-4">
        <div className={`px-3 py-2 ${r.panel}`}>
          <button
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            className="flex w-full items-center justify-between font-bold"
          >
            <span className="flex items-center gap-2">
              <PixelIcon name="book" size={16} fill="#1d2414" />
              사용법 &amp; 주의사항
            </span>
            <PixelIcon
              name="arrow"
              size={8}
              className={guideOpen ? "rotate-90" : ""}
            />
          </button>
          {guideOpen && (
            <ol className="mt-1 flex flex-col gap-1 text-[#4e5838]">
              <li className="flex gap-2">
                <span className="font-bold text-[#1d2414]">1.</span>
                <span>
                  &lsquo;목표 추가&rsquo;로 올해 세운 목표의 카테고리를
                  작성해주세요.{" "}
                  <span className="text-[#4e5838]">
                    (예: 공부, 습관, 대인관계, 쉼, 일)
                  </span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#1d2414]">2.</span>
                <span>
                  카테고리 별로 목표를 작성하고, 유형을 선택해 달성 현황을
                  기록하세요.{" "}
                  <span className="inline-flex items-center gap-1 text-[#4e5838]">
                    (<PixelIcon name="check" size={8} /> 체크 ·{" "}
                    <PixelIcon name="up" size={8} /> 진행률)
                  </span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#1d2414]">3.</span>
                <span>
                  &lsquo;인쇄하기&rsquo;로 목표 달성 현황을 영수증으로
                  출력하고, 이미지로 저장할 수 있어요.
                </span>
              </li>
            </ol>
          )}
        </div>
      </div>

      {/* 툴바: 항상 보이는 '목표 추가' 버튼 */}
      <div className="px-5 pt-5 pb-2">
        <button
          onClick={addGoal}
          className={`w-full px-4 py-2 ${r.btn} ${r.btnGreen}`}
        >
          <PixelIcon name="plus" size={8} /> 목표 추가
        </button>
      </div>

      {/* 목표 리스트 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
        {!hasGoals ? (
          <div className="flex h-full min-h-50 flex-col items-center justify-center gap-2 text-center">
            <PixelIcon name="heart" size={32} fill="#1d2414" />
            <p className="font-bold">
              아직 목표가 없어요
              <span className={r.blink}>_</span>
            </p>
            <p className="text-[#4e5838]">
              위 &lsquo;목표 추가&rsquo;로 올해 도전할 목표를 적어보세요!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-6 px-0.5">
            {goals.map((goal, gi) => {
              const total = goal.items.length;
              const checked = goal.items.filter(itemDone).length;
              return (
                <li
                  key={goal.id}
                  data-goal-index={gi}
                  className={`relative p-3 ${r.panel} ${
                    dragG === gi ? "opacity-40" : ""
                  }`}
                >
                  {dragG !== null && overG === gi && (
                    <span
                      className={`pointer-events-none absolute inset-x-0 -top-4 z-10 ${r.dropLine}`}
                    />
                  )}
                  {dragG !== null &&
                    overG === goals.length &&
                    gi === goals.length - 1 && (
                      <span
                        className={`pointer-events-none absolute inset-x-0 -bottom-4 z-10 ${r.dropLine}`}
                      />
                    )}
                  <div className="flex items-center gap-3">
                    <button
                      onPointerDown={(e) =>
                        startDrag({ kind: "goal", index: gi }, e)
                      }
                      aria-label="목표 순서 변경 (드래그)"
                      className="shrink-0 cursor-grab touch-none select-none text-[#8f9a6c] active:cursor-grabbing"
                    >
                      <PixelIcon name="grip" size={12} />
                    </button>
                    <input
                      value={goal.title}
                      onChange={(e) => setGoalTitle(goal.id, e.target.value)}
                      placeholder="목표 카테고리 (예: 자기계발)"
                      aria-label="목표 카테고리명"
                      className={`min-w-0 flex-1 px-2 py-1 font-bold ${r.input}`}
                    />
                    <span className={`shrink-0 px-1.5 ${r.badge}`}>
                      {checked}/{total}
                    </span>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      aria-label="목표 삭제"
                      className={r.iconBtn}
                    >
                      <PixelIcon name="trash" size={16} />
                    </button>
                  </div>

                  {/* 하위 항목 */}
                  <ul className="mt-3 flex flex-col gap-2">
                    {goal.items.map((item, ii) => (
                      <li
                        key={item.id}
                        data-item-index={ii}
                        data-item-goal={goal.id}
                        className={`relative bg-[#c9d2a6] px-2 py-1.5 ${
                          dragI?.goalId === goal.id && dragI.index === ii
                            ? "opacity-40"
                            : ""
                        }`}
                      >
                        {dragI?.goalId === goal.id && overI?.index === ii && (
                          <span
                            className={`pointer-events-none absolute inset-x-0 -top-1.5 z-10 ${r.dropLine}`}
                          />
                        )}
                        {dragI?.goalId === goal.id &&
                          overI?.index === goal.items.length &&
                          ii === goal.items.length - 1 && (
                            <span
                              className={`pointer-events-none absolute inset-x-0 -bottom-1.5 z-10 ${r.dropLine}`}
                            />
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
                            className="shrink-0 cursor-grab touch-none select-none text-[#8f9a6c] active:cursor-grabbing"
                          >
                            <PixelIcon name="grip" size={8} />
                          </button>
                          {item.kind === "check" && (
                            <button
                              role="checkbox"
                              aria-checked={item.checked}
                              onClick={() => toggleItem(goal.id, item.id)}
                              aria-label="완료 체크"
                              className={`ml-1 ${r.check}`}
                            >
                              {item.checked && (
                                <PixelIcon name="check" size={8} />
                              )}
                            </button>
                          )}
                          <input
                            value={item.label}
                            onChange={(e) =>
                              setItemLabel(goal.id, item.id, e.target.value)
                            }
                            placeholder="하위 항목 (예: 책 10권 읽기)"
                            aria-label="하위 항목 내용"
                            className={`min-w-0 flex-1 px-2 py-0.5 ${r.inputGhost} ${
                              item.kind === "check" && item.checked
                                ? "text-[#4e5838] line-through"
                                : ""
                            }`}
                          />
                          <button
                            onClick={() => removeItem(goal.id, item.id)}
                            aria-label="하위 항목 삭제"
                            className={r.iconBtn}
                          >
                            <PixelIcon name="trash" size={8} />
                          </button>
                        </div>

                        {/* 형태 선택 + 진행률 값 */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-4">
                          <div className="flex bg-[#eef2d9] p-0.5">
                            {KINDS.map((k) => (
                              <button
                                key={k}
                                onClick={() => setItemKind(goal.id, item.id, k)}
                                aria-pressed={item.kind === k}
                                className={`px-1.5 ${r.toggle}`}
                              >
                                <PixelIcon name={KIND_META[k].icon} size={8} />
                                {KIND_META[k].label}
                              </button>
                            ))}
                          </div>

                          {item.kind !== "check" && (
                            <div className="flex items-center gap-2 text-[#4e5838]">
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
                                className={`w-14 px-1 text-center ${r.input}`}
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
                                className={`w-14 px-1 text-center ${r.input}`}
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    <li>
                      <button
                        onClick={() => addItem(goal.id)}
                        className={`px-2 py-0.5 ${r.toggle}`}
                      >
                        <PixelIcon name="plus" size={8} /> 하위 항목 추가
                      </button>
                    </li>
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 하단: 영수증 스타일 + 인쇄 */}
      <footer className="flex items-center justify-between gap-4 bg-[#1d2414] px-5 pt-3 pb-4">
        {/* 영수증 스타일 선택 토글 */}
        <div className="flex items-center gap-1 bg-[#eef2d9] p-1">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStyle(opt.value)}
              aria-pressed={style === opt.value}
              className={`px-2.5 py-1 font-bold ${r.toggle}`}
            >
              <PixelIcon name={opt.icon} size={8} />
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpen}
          disabled={!hasGoals}
          className={`shrink-0 px-5 py-2 ${r.btn} ${r.btnRed}`}
        >
          <PixelIcon name="printer" size={16} /> 인쇄하기
        </button>
      </footer>
    </div>
  );
}
