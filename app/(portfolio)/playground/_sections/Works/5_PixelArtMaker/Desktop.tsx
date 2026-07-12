"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePixelArt,
  duplicatePixelArt,
  listPixelArt,
  PixelArt,
  renamePixelArt,
} from "../_shared/assetLibrary";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import DesktopIcon from "./DesktopIcon";
import TrashIcon from "./TrashIcon";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import {
  getIconPosition,
  getTrashPosition,
  removeIconPositions,
  setIconPosition,
  setTrashPosition,
} from "./useDesktopLayout";

type Menu = { x: number; y: number; items: ContextMenuItem[] } | null;

// 아이콘/휴지통의 대략적인 폭·높이(box-select 히트박스와 동일 기준) — 창 크기가
// 줄어들 때 이 크기만큼의 여유를 두고 컨테이너 안쪽으로 위치를 당겨온다.
const ICON_FOOTPRINT = 80;

export default function Desktop({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [items, setItems] = useState<PixelArt[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Menu>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [trashPos, setTrashPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  // 휴지통 자체를 드래그하는 동안에는 pointerup이 트래시 위에서 발생해도
  // handleTrashDrop(아이콘을 놓아 삭제하는 동작)이 아니라 위치 이동으로 처리해야 한다.
  const trashDraggingRef = useRef(false);

  // 창 크기가 줄어들었을 때 아이콘/휴지통이 보이는 영역 밖으로 나가지 않도록
  // 컨테이너의 현재 실제 크기 기준으로 좌표를 안쪽으로 당겨온다.
  const clampToContainer = useCallback((pos: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const maxX = Math.max(0, (rect?.width ?? 0) - ICON_FOOTPRINT);
    const maxY = Math.max(0, (rect?.height ?? 0) - ICON_FOOTPRINT);
    return {
      x: Math.min(Math.max(pos.x, 0), maxX),
      y: Math.min(Math.max(pos.y, 0), maxY),
    };
  }, []);

  useEffect(() => {
    const stored = getTrashPosition();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrashPos(stored ? clampToContainer(stored) : stored);
  }, [clampToContainer]);

  const refresh = useCallback(() => {
    const list = listPixelArt();
    setItems(list);
    const pos: Record<string, { x: number; y: number }> = {};
    list.forEach((art, i) => {
      pos[art.id] = clampToContainer(getIconPosition(art.id, i));
    });
    setPositions(pos);
  }, [clampToContainer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // 창 크기 변경 시 현재 화면 밖으로 나간 아이콘/휴지통을 안쪽으로 재배치하고,
  // 다음에도 그 위치를 기억하도록 저장한다(기존 드래그 종료 시 저장 방식과 동일).
  useEffect(() => {
    const handleResize = () => {
      setPositions((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [id, p] of Object.entries(prev)) {
          const c = clampToContainer(p);
          next[id] = c;
          if (c.x !== p.x || c.y !== p.y) {
            changed = true;
            setIconPosition(id, c.x, c.y);
          }
        }
        return changed ? next : prev;
      });
      setTrashPos((prev) => {
        if (!prev) return prev;
        const c = clampToContainer(prev);
        if (c.x === prev.x && c.y === prev.y) return prev;
        setTrashPosition(c.x, c.y);
        return c;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampToContainer]);

  const startBoxSelect = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // 아이콘 위치는 컨테이너 기준 좌표인데 pointer 이벤트는 뷰포트 기준 좌표라
      // 오프셋 보정 없이 비교하면 실제 화면 위치와 어긋나는 버그가 있었다.
      const rect = containerRef.current?.getBoundingClientRect();
      const offsetX = rect?.left ?? 0;
      const offsetY = rect?.top ?? 0;
      const x0 = e.clientX - offsetX;
      const y0 = e.clientY - offsetY;
      setBox({ x0, y0, x1: x0, y1: y0 });
      setSelected(new Set());

      const move = (ev: PointerEvent) => setBox({ x0, y0, x1: ev.clientX - offsetX, y1: ev.clientY - offsetY });
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const curX = ev.clientX - offsetX;
        const curY = ev.clientY - offsetY;
        const minX = Math.min(x0, curX);
        const maxX = Math.max(x0, curX);
        const minY = Math.min(y0, curY);
        const maxY = Math.max(y0, curY);
        const next = new Set<string>();
        for (const art of items) {
          const p = positions[art.id];
          if (!p) continue;
          if (p.x + 80 >= minX && p.x <= maxX && p.y + 80 >= minY && p.y <= maxY) next.add(art.id);
        }
        setSelected(next);
        setBox(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [items, positions],
  );

  const startIconDrag = useCallback(
    (art: PixelArt, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      // Ctrl/Cmd/Shift+클릭은 드래그를 시작하지 않고 다중 선택 집합만 토글한다.
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(art.id)) next.delete(art.id);
          else next.add(art.id);
          return next;
        });
        return;
      }

      const group = selected.has(art.id) ? Array.from(selected) : [art.id];
      if (!selected.has(art.id)) setSelected(new Set([art.id]));

      const startX = e.clientX;
      const startY = e.clientY;
      const startPositions = group.map((id) => ({ id, ...positions[id] }));

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        setPositions((prev) => {
          const next = { ...prev };
          for (const sp of startPositions) next[sp.id] = { x: sp.x + dx, y: sp.y + dy };
          return next;
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setPositions((prev) => {
          for (const sp of startPositions) {
            const p = prev[sp.id];
            if (p) setIconPosition(sp.id, p.x, p.y);
          }
          return prev;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [selected, positions],
  );

  const startTrashDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      trashDraggingRef.current = true;
      // 드래그 중에는 휴지통이 마우스 아래에서 움직이면서 pointerenter/leave가
      // 반복 발생해 열림/닫힘 그림(OPEN_GRID/CLOSED_GRID)이 깜빡였다 — 드래그
      // 시작 시 고정으로 닫힘 상태로 되돌리고, 드래그 중 hover 갱신을 막는다.
      setTrashHover(false);

      const containerRect = containerRef.current?.getBoundingClientRect();
      const offsetX = containerRect?.left ?? 0;
      const offsetY = containerRect?.top ?? 0;
      // 아직 한 번도 옮긴 적이 없으면(trashPos === null) 현재 화면상 위치(기본 우하단)를
      // 컨테이너 기준 좌표로 환산해 드래그 시작점으로 삼는다 — 그래야 첫 드래그에서
      // 위치가 갑자기 튀지 않는다.
      const origin =
        trashPos ??
        (() => {
          const trashRect = trashRef.current?.getBoundingClientRect();
          return { x: (trashRect?.left ?? 0) - offsetX, y: (trashRect?.top ?? 0) - offsetY };
        })();

      const startX = e.clientX;
      const startY = e.clientY;

      const move = (ev: PointerEvent) => {
        setTrashPos({ x: origin.x + (ev.clientX - startX), y: origin.y + (ev.clientY - startY) });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setTrashPos((cur) => {
          if (cur) setTrashPosition(cur.x, cur.y);
          return cur;
        });
        trashDraggingRef.current = false;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [trashPos],
  );

  const handleTrashDrop = useCallback(() => {
    setTrashHover(false);
    if (trashDraggingRef.current) return;
    if (selected.size === 0) return;
    setPendingDelete(Array.from(selected));
  }, [selected]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deletePixelArt(pendingDelete);
    removeIconPositions(pendingDelete);
    setSelected(new Set());
    setPendingDelete(null);
    refresh();
  }, [pendingDelete, refresh]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white"
      onPointerDown={startBoxSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [{ label: "새로 만들기", onClick: onCreate }],
        });
      }}
    >
      {items.map((art) => {
        const p = positions[art.id];
        if (!p) return null;
        return (
          <DesktopIcon
            key={art.id}
            art={art}
            x={p.x}
            y={p.y}
            selected={selected.has(art.id)}
            onPointerDownIcon={(e) => startIconDrag(art, e)}
            onDoubleClick={() => onOpen(art.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({
                x: e.clientX,
                y: e.clientY,
                items: [
                  {
                    label: "이름 바꾸기",
                    onClick: () => {
                      const next = window.prompt("새 이름", art.name);
                      if (next) {
                        renamePixelArt(art.id, next);
                        refresh();
                      }
                    },
                  },
                  { label: "PNG로 내보내기", onClick: () => exportAsPNG(art) },
                  { label: "SVG로 내보내기", onClick: () => exportAsSVG(art) },
                  { label: "JSON으로 내보내기", onClick: () => exportAsJSON(art) },
                  { label: "JPG로 내보내기 (손실 압축)", onClick: () => exportAsJPG(art) },
                  {
                    label: "복제",
                    onClick: () => {
                      duplicatePixelArt(art.id);
                      refresh();
                    },
                  },
                ],
              });
            }}
          />
        );
      })}

      {box && (
        <div
          className="pointer-events-none absolute bg-violet-500/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.6)]"
          style={{
            left: Math.min(box.x0, box.x1),
            top: Math.min(box.y0, box.y1),
            width: Math.abs(box.x1 - box.x0),
            height: Math.abs(box.y1 - box.y0),
          }}
        />
      )}

      <div
        ref={trashRef}
        onPointerDown={startTrashDrag}
        onPointerEnter={() => !trashDraggingRef.current && setTrashHover(true)}
        onPointerLeave={() => !trashDraggingRef.current && setTrashHover(false)}
        onPointerUp={handleTrashDrop}
        className={`absolute flex w-20 flex-col items-center gap-1 p-2 ${trashPos ? "" : "bottom-4 right-4"}`}
        style={trashPos ? { left: trashPos.x, top: trashPos.y } : undefined}
        title="선택한 아이콘을 여기로 드래그해 삭제 · 드래그해서 위치 이동 가능"
      >
        <TrashIcon active={trashHover} />
        <span className="w-full truncate text-center text-[10px] text-gray-600">휴지통</span>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {pendingDelete && (
        <ConfirmDialog
          message={`${pendingDelete.length}개 항목을 삭제하시겠습니까?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
