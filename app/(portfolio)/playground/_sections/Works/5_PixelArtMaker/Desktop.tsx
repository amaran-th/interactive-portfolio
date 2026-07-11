"use client";

import { Trash2 } from "lucide-react";
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
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import { getIconPosition, removeIconPositions, setIconPosition } from "./useDesktopLayout";

type Menu = { x: number; y: number; items: ContextMenuItem[] } | null;

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
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    const list = listPixelArt();
    setItems(list);
    const pos: Record<string, { x: number; y: number }> = {};
    list.forEach((art, i) => {
      pos[art.id] = getIconPosition(art.id, i);
    });
    setPositions(pos);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const startBoxSelect = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // 아이콘은 컨테이너(position: relative) 기준 절대좌표(top/left)로 배치되므로,
    // 박스 선택 좌표도 뷰포트 기준(clientX/Y)이 아니라 컨테이너 기준으로 변환해야
    // 페이지 안에 여백/스크롤이 있어도 실제 아이콘 위치와 정확히 맞아떨어진다.
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect?.left ?? 0;
    const offsetY = rect?.top ?? 0;
    const x0 = e.clientX - offsetX;
    const y0 = e.clientY - offsetY;
    setBox({ x0, y0, x1: x0, y1: y0 });
    setSelected(new Set());

    const move = (ev: PointerEvent) =>
      setBox({ x0, y0, x1: ev.clientX - offsetX, y1: ev.clientY - offsetY });
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
  }, [items, positions]);

  const startIconDrag = useCallback(
    (art: PixelArt, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      // Ctrl/Cmd/Shift+클릭은 드래그를 시작하지 않고 개별 아이콘만 선택 집합에 추가/제외한다.
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

  const handleTrashDrop = useCallback(() => {
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
      className="relative h-full w-full overflow-hidden bg-gray-950"
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
          className="pointer-events-none absolute border border-white/40 bg-white/10"
          style={{
            left: Math.min(box.x0, box.x1),
            top: Math.min(box.y0, box.y1),
            width: Math.abs(box.x1 - box.x0),
            height: Math.abs(box.y1 - box.y0),
          }}
        />
      )}

      <div
        onPointerUp={handleTrashDrop}
        className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400"
        title="선택한 아이콘을 여기로 드래그해 삭제"
      >
        <Trash2 className="h-5 w-5" />
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
