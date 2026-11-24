"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Goal, ItemKind, ReceiptState, ReceiptStyle } from "./types";
import Handheld from "./Handheld";
import Manual from "./Manual";
import PixelIcon, { type PixelIconName } from "./PixelIcon";
import r from "./retro.module.css";
import { GOALS_YEAR, itemRatio, newId, newItem } from "./utils";

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
/** 목표(분류)는 8개까지 — 영수증 한 장과 캐러셀 쪽 표시가 넘치지 않게 */
const MAX_GOALS = 8;

/** 숫자 입력 파싱 (음수/NaN 방지) */
function parseCount(raw: string, min: number): number {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? min : Math.max(min, n);
}

export default function EditView({ state, setState, onOpen }: EditViewProps) {
  const { goals, style } = state;
  const listRef = useRef<HTMLDivElement>(null);

  // 목표는 한 장씩 좌우로 넘기는 캐러셀로 본다. page는 지금 보이는 목표 번호(0부터)
  const [page, setPage] = useState(0);
  const [turnFrom, setTurnFrom] = useState<"left" | "right">("right");
  const pageIdx = Math.min(Math.max(page, 0), Math.max(goals.length - 1, 0));
  const goTo = (i: number) => {
    if (i < 0 || i >= goals.length || i === pageIdx) return false;
    setTurnFrom(i > pageIdx ? "right" : "left");
    setPage(i);
    return true;
  };

  // 하위 항목 드래그 순서 변경 상태 (source / drop-target)
  const [dragI, setDragI] = useState<{ goalId: string; index: number } | null>(
    null,
  );
  const [overI, setOverI] = useState<{ goalId: string; index: number } | null>(
    null,
  );

  // 순서 바꾸기: 손잡이를 고르면 집고(목표는 좌우, 하위 항목은 위·아래로) 옮기고, A·B로 놓는다
  const [grabbed, setGrabbed] = useState<
    | { kind: "goal"; id: string }
    | { kind: "item"; goalId: string; id: string }
    | null
  >(null);
  const toggleGrab = (
    e: React.MouseEvent,
    target:
      | { kind: "goal"; id: string }
      | { kind: "item"; goalId: string; id: string },
  ) => {
    // 하위 항목 손잡이는 마우스로 끌어 옮기므로, 끌고 놓을 때 생기는 click(detail ≥ 1)은 무시한다.
    // 목표 번호 탭은 끌기가 없어 마우스 클릭으로도 집는다.
    if (target.kind === "item" && e.detail !== 0) return;
    setGrabbed((g) => (g && g.id === target.id ? null : target));
  };
  const onPadDir = (dir: "up" | "down" | "left" | "right") => {
    if (!grabbed) return false;
    if (grabbed.kind === "goal") {
      if (dir === "left" || dir === "right") shiftGoal(dir === "left" ? -1 : 1);
      return true;
    }
    if (dir === "left" || dir === "right") return true;
    const step = dir === "up" ? -1 : 1;
    {
      const items = goals.find((g) => g.id === grabbed.goalId)?.items ?? [];
      const from = items.findIndex((i) => i.id === grabbed.id);
      const to = from + step;
      if (from >= 0 && to >= 0 && to < items.length)
        moveItem(grabbed.goalId, from, step > 0 ? to + 1 : to);
    }
    return true;
  };
  /** 집은 목표를 한 칸 앞·뒤로 옮기고, 보이는 쪽도 따라간다 */
  const shiftGoal = (step: -1 | 1) => {
    const from = goals.findIndex((g) => g.id === grabbed?.id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= goals.length) return;
    moveGoal(from, step > 0 ? to + 1 : to);
    setTurnFrom(step > 0 ? "right" : "left");
    setPage(to);
  };
  /** 넘김 단추: 목표를 집고 있으면 옮기고, 아니면 넘긴다 */
  const turn = (step: -1 | 1) => {
    if (grabbed?.kind === "goal") shiftGoal(step);
    else goTo(pageIdx + step);
  };
  const onPadEdge = (dir: "left" | "right") => {
    if (goals.length === 0) return false;
    turn(dir === "left" ? -1 : 1);
    return true;
  };
  // 손가락으로 좌우로 밀어 넘기기
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const onPadCancel = () => {
    if (!grabbed) return false;
    setGrabbed(null);
    return true;
  };

  const clearDrag = () => {
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
  type Drag = { kind: "item"; goalId: string; index: number };
  const dragRef = useRef<Drag | null>(null);
  const overRef = useRef<number | null>(null);

  const startDrag = (drag: Drag, e: React.PointerEvent) => {
    if (e.button !== 0) return; // 주 버튼/터치만
    e.preventDefault();
    dragRef.current = drag;
    overRef.current = drag.index;
    setDragI({ goalId: drag.goalId, index: drag.index });
    setOverI({ goalId: drag.goalId, index: drag.index });

    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!el) return;
      const li = el.closest("[data-item-index]") as HTMLElement | null;
      if (!li || li.dataset.itemGoal !== drag.goalId) return; // 같은 목표 내에서만
      const idx = Number(li.dataset.itemIndex);
      if (Number.isNaN(idx)) return;
      const rect = li.getBoundingClientRect();
      // 위 절반이면 이 행 앞(gap=idx), 아래 절반이면 이 행 뒤(gap=idx+1)
      const gap = ev.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
      overRef.current = gap;
      setOverI({ goalId: drag.goalId, index: gap });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const to = overRef.current;
      if (to !== null) moveItem(drag.goalId, drag.index, to);
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
    updateGoals((gs) =>
      gs.length >= MAX_GOALS
        ? gs
        : [...gs, { id: newId(), title: "", items: [] }],
    );

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
  const styleOpt =
    STYLE_OPTIONS.find((o) => o.value === style) ?? STYLE_OPTIONS[0];
  const nextStyle = () => setStyle(style === "classic" ? "dark" : "classic");
  const addGoalAndShow = () => {
    if (goals.length >= MAX_GOALS) return;
    addGoal();
    // 새 목표(맨 뒤) 장으로 넘기고, 그 이름 칸으로 옮겨 바로 적게 한다
    setTurnFrom("right");
    setPage(goals.length);
    requestAnimationFrame(() => {
      const name = listRef.current?.querySelector<HTMLInputElement>(
        "input[aria-label='목표 카테고리명']",
      );
      name?.focus();
      name?.scrollIntoView({ block: "nearest" });
    });
  };
  const full = goals.length >= MAX_GOALS;
  const addButton = (
    <button
      onClick={addGoalAndShow}
      disabled={full}
      className={`w-full px-4 py-2 ${r.btn} ${r.btnGreen}`}
    >
      <PixelIcon name="plus" size={8} /> 목표 추가
    </button>
  );

  return (
    <Handheld
      onDir={onPadDir}
      onEdge={onPadEdge}
      manual={<Manual />}
      onCancel={onPadCancel}
      onConfirm={onPadCancel}
      select={{ label: "스타일", onPress: nextStyle }}
      start={{ label: "인쇄", onPress: onOpen, disabled: !hasGoals }}
    >
      {/* 타이틀 띠 */}
      <header className={`flex flex-col items-center px-4 pt-2 pb-3 ${r.band}`}>
        <p className="flex items-center gap-2 text-[24px] leading-[1.4] font-bold">
          <PixelIcon name="star" size={8} />
          {GOALS_YEAR} 중간 정산
          <PixelIcon name="star" size={8} />
        </p>
        <p className="text-center text-[12px] text-[#c9d2a6]">
          올해 목표, 얼마나 달성했나요?
        </p>
      </header>

      {/* 목표 추가는 위에 고정하고, 새 목표는 맨 뒤 장에 붙는다 */}
      <div className="shrink-0 px-4 pt-4">{addButton}</div>
      {/* 넘김 줄: 목표 바로 위에 고정(목록만 스크롤). ◀ 쪽 표시 ▶ */}
      {hasGoals && (
        <nav
          aria-label="목표 넘기기"
          className={`mx-4 mt-4 shrink-0 ${r.navBar}`}
        >
          <button
            type="button"
            data-pad-home="left"
            onClick={() => turn(-1)}
            aria-disabled={pageIdx === 0}
            aria-label={
              grabbed?.kind === "goal" ? "집은 목표를 앞으로" : "이전 목표"
            }
            className={r.pager}
          >
            ◀
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
            {goals.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번 목표${g.title ? ` (${g.title})` : ""}로 넘기기`}
                aria-current={i === pageIdx}
                className={r.pageDot}
              />
            ))}
          </div>
          <span className="shrink-0 text-[12px]">
            {String(pageIdx + 1).padStart(2, "0")}/
            {String(goals.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            data-pad-home="right"
            onClick={() => turn(1)}
            aria-disabled={pageIdx === goals.length - 1}
            aria-label={
              grabbed?.kind === "goal" ? "집은 목표를 뒤로" : "다음 목표"
            }
            className={r.pager}
          >
            ▶
          </button>
        </nav>
      )}

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* 목표 리스트 */}
        <div className="px-4 pt-3 pb-4">
          {!hasGoals ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
              <PixelIcon name="heart" size={32} fill="#1d2414" />
              <p className="font-bold">
                아직 목표가 없어요
                <span className={r.blink}>_</span>
              </p>
              <p className="text-[#4e5838]">올해 도전할 목표를 적어보세요!</p>
            </div>
          ) : (
            // 목표는 신청서 양식 한 장에 하나씩, 좌우로 넘겨 본다:
            // 목표 위 고정 넘김 줄(◀ 쪽 표시 ▶)로 넘기고, 왼쪽 검은 색인 탭(번호)을 고르면 좌우로 순서를 바꾼다.
            <div>
              <div
                onPointerDown={(e) => {
                  if (e.pointerType === "touch")
                    swipeRef.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerUp={(e) => {
                  const start = swipeRef.current;
                  swipeRef.current = null;
                  if (!start) return;
                  const dx = e.clientX - start.x;
                  // 세로보다 가로로 크게 밀었을 때만 넘긴다
                  if (
                    Math.abs(dx) > 48 &&
                    Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5
                  )
                    turn(dx < 0 ? 1 : -1);
                }}
                onPointerCancel={() => {
                  swipeRef.current = null;
                }}
              >
                {(() => {
                  const gi = pageIdx;
                  const goal = goals[gi];
                  const total = goal.items.length;
                  const percent = total
                    ? Math.round(
                        (goal.items.reduce(
                          (sum, it) => sum + itemRatio(it),
                          0,
                        ) /
                          total) *
                          100,
                      )
                    : 0;
                  return (
                    <div
                      key={goal.id}
                      style={{
                        ["--page-from" as string]:
                          turnFrom === "right" ? "24px" : "-24px",
                      }}
                      className={`relative ${r.formRow} ${r.pageIn} ${
                        grabbed?.id === goal.id ? r.grabbed : ""
                      }`}
                    >
                      {/* 색인 탭: 번호. 고르면 집어서 좌우로 순서를 바꾼다 */}
                      <button
                        onClick={(e) =>
                          toggleGrab(e, { kind: "goal", id: goal.id })
                        }
                        aria-label={`${gi + 1}번 목표 순서 바꾸기 (고른 뒤 좌우로 옮기기)`}
                        aria-pressed={grabbed?.id === goal.id}
                        className={`select-none ${r.indexTab}`}
                      >
                        <span className="text-[12px] opacity-70">NO.</span>
                        <span className="text-[12px] font-bold">
                          {String(gi + 1).padStart(2, "0")}
                        </span>
                        <span
                          aria-hidden
                          className="mt-1 text-[12px] opacity-60"
                        >
                          ◀▶
                        </span>
                      </button>

                      <div className="min-w-0 px-3 pt-2 pb-2">
                        <div className="flex items-end gap-3">
                          <label className="flex min-w-0 flex-1 flex-col">
                            <span className={r.caption}>분류</span>
                            <input
                              value={goal.title}
                              onChange={(e) =>
                                setGoalTitle(goal.id, e.target.value)
                              }
                              placeholder="예: 자기계발"
                              aria-label="목표 카테고리명"
                              className={`w-full px-1 py-0.5 ${r.inputLine}`}
                            />
                          </label>
                          {/* 달성률: 상자 없이 큰 숫자 + 작은 '달성' (단추로 보이지 않게) */}
                          <span className={`shrink-0 ${r.stamp}`}>
                            <span className="text-[24px] leading-none font-bold">
                              {percent}%
                            </span>
                            <span className={r.caption}>달성</span>
                          </span>
                          <button
                            onClick={() => removeGoal(goal.id)}
                            aria-label="목표 삭제"
                            className={`mb-0.5 ${r.iconBtn}`}
                          >
                            <PixelIcon name="trash" size={16} />
                          </button>
                        </div>

                        {/* 하위 항목: 괘선 줄 */}
                        <ul className={`mt-2 ${r.ruled}`}>
                          {goal.items.map((item, ii) => (
                            <li
                              key={item.id}
                              data-item-index={ii}
                              data-item-goal={goal.id}
                              className={`relative py-1.5 ${
                                dragI?.goalId === goal.id && dragI.index === ii
                                  ? "opacity-40"
                                  : ""
                              } ${grabbed?.id === item.id ? r.grabbed : ""}`}
                            >
                              {dragI?.goalId === goal.id &&
                                overI?.index === ii && (
                                  <span
                                    className={`pointer-events-none absolute inset-x-0 -top-1 z-10 ${r.dropLine}`}
                                  />
                                )}
                              {dragI?.goalId === goal.id &&
                                overI?.index === goal.items.length &&
                                ii === goal.items.length - 1 && (
                                  <span
                                    className={`pointer-events-none absolute inset-x-0 -bottom-1 z-10 ${r.dropLine}`}
                                  />
                                )}
                              <div className="flex items-center gap-2">
                                <button
                                  onPointerDown={(e) =>
                                    startDrag(
                                      {
                                        kind: "item",
                                        goalId: goal.id,
                                        index: ii,
                                      },
                                      e,
                                    )
                                  }
                                  onClick={(e) =>
                                    toggleGrab(e, {
                                      kind: "item",
                                      goalId: goal.id,
                                      id: item.id,
                                    })
                                  }
                                  aria-label="하위 항목 순서 변경 (끌거나, 키보드로 고른 뒤 위·아래)"
                                  aria-pressed={grabbed?.id === item.id}
                                  className="w-5 shrink-0 cursor-grab touch-none text-left text-[12px] font-bold text-[#4e5838] select-none active:cursor-grabbing"
                                >
                                  {ii + 1}.
                                </button>
                                {item.kind === "check" && (
                                  <button
                                    role="checkbox"
                                    aria-checked={item.checked}
                                    onClick={() => toggleItem(goal.id, item.id)}
                                    aria-label="완료 체크"
                                    className={r.check}
                                  >
                                    {item.checked && (
                                      <PixelIcon name="check" size={8} />
                                    )}
                                  </button>
                                )}
                                <input
                                  value={item.label}
                                  onChange={(e) =>
                                    setItemLabel(
                                      goal.id,
                                      item.id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="하위 항목 (예: 책 10권 읽기)"
                                  aria-label="하위 항목 내용"
                                  className={`min-w-0 flex-1 px-1 py-0.5 ${r.inputLine} ${
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

                              {/* 유형(양식의 네모 칸) + 진행률 값 */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 pl-7">
                                <span className={r.caption}>유형</span>
                                {KINDS.map((k) => (
                                  <button
                                    key={k}
                                    onClick={() =>
                                      setItemKind(goal.id, item.id, k)
                                    }
                                    aria-pressed={item.kind === k}
                                    className={r.opt}
                                  >
                                    <span aria-hidden className={r.optMark} />
                                    {KIND_META[k].label}
                                  </button>
                                ))}
                                {item.kind !== "check" && (
                                  <span className="flex items-center gap-1 text-[#4e5838]">
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
                                      className={`w-12 text-center ${r.inputLine}`}
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
                                      className={`w-12 text-center ${r.inputLine}`}
                                    />
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                          <li className="py-1">
                            <button
                              onClick={() => addItem(goal.id)}
                              className={`px-1 ${r.toggle}`}
                            >
                              <PixelIcon name="plus" size={8} /> 하위 항목 추가
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상태 줄: 지금 고른 영수증 스타일과 단추 안내 */}
      <footer className="flex items-center justify-between gap-3 bg-[#1d2414] px-3 py-1 text-[12px] text-[#c9d2a6]">
        <span className="flex items-center gap-1.5">
          <PixelIcon name={styleOpt.icon} size={8} />
          {styleOpt.label} 영수증
        </span>
        <span>
          {grabbed ? (
            `${grabbed.kind === "goal" ? "◀▶" : "↑↓"} 옮기기 · Enter 놓기`
          ) : hasGoals ? (
            <>
              START <span className={r.blink}>▶</span> 인쇄
            </>
          ) : (
            "방향키 이동 · Enter 선택"
          )}
        </span>
      </footer>
    </Handheld>
  );
}
