"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePixelArt,
  duplicatePixelArt,
  listPixelArt,
  PixelArt,
  renamePixelArt,
  resetAllPixelArt,
} from "../_shared/assetLibrary";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import DesktopIcon from "./DesktopIcon";
import FormatIcon from "./FormatIcon";
import LauncherIcon from "./LauncherIcon";
import TrashIcon from "./TrashIcon";
import WallpaperBackground from "./WallpaperBackground";
import WallpaperIcon from "./WallpaperIcon";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import {
  getIconPosition,
  getStoredPosition,
  removeIconPositions,
  resetDesktopLayout,
  setIconPosition,
} from "./useDesktopLayout";
import { getWallpaper, resetWallpaper, WALLPAPER_ID } from "./wallpaper";

type Menu = { x: number; y: number; items: ContextMenuItem[] } | null;

// 아이콘/휴지통/포맷/배경화면/편집기의 대략적인 폭·높이(box-select 히트박스와 동일
// 기준) — 창 크기가 줄어들 때 이 크기만큼의 여유를 두고 컨테이너 안쪽으로 위치를 당겨온다.
const ICON_FOOTPRINT = 80;

// 일반 픽셀아트 항목이 아닌 시스템 아이콘들 — 다중 선택·박스 선택·휴지통 삭제
// 대상에서 제외되고, 저장된 위치가 없을 때는 그리드 기본값 대신 CSS 코너 배치를 쓴다.
const TRASH_ID = "__trash__";
const FORMAT_ID = "__format__";
const LAUNCHER_ID = "__editor_launcher__";
const SPECIAL_ICON_IDS = [TRASH_ID, FORMAT_ID, WALLPAPER_ID, LAUNCHER_ID] as const;

export default function Desktop({
  refreshSignal,
  onOpen,
  onCreate,
  onOpenLauncher,
}: {
  refreshSignal: number;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOpenLauncher: () => void;
}) {
  const [items, setItems] = useState<PixelArt[]>([]);
  const [wallpaper, setWallpaper] = useState<PixelArt>(() => getWallpaper());
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Menu>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [pendingFormat, setPendingFormat] = useState(false);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 특수 아이콘(트래시/포맷) 자체를 드래그하는 동안에는 pointerup이 그 위에서
  // 발생해도(예: 휴지통 위로 아이콘을 놓는 삭제 동작) 위치 이동으로만 처리해야 한다.
  const draggingSpecialRef = useRef<string | null>(null);

  // 창 크기가 줄어들었을 때 아이콘/휴지통/포맷이 보이는 영역 밖으로 나가지 않도록
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

  const refresh = useCallback(() => {
    const list = listPixelArt();
    setItems(list);
    setWallpaper(getWallpaper());
    const pos: Record<string, { x: number; y: number }> = {};
    list.forEach((art, i) => {
      pos[art.id] = clampToContainer(getIconPosition(art.id, i));
    });
    // 특수 아이콘은 아직 옮긴 적이 없으면(저장된 위치 없음) positions에 아예 넣지
    // 않는다 — 렌더링에서 이 경우 CSS 코너 클래스(bottom-4 right-4 등)로 기본
    // 배치하고, 첫 드래그 시점에 실제 화면 위치를 시작점으로 삼는다.
    for (const id of SPECIAL_ICON_IDS) {
      const stored = getStoredPosition(id);
      if (stored) pos[id] = clampToContainer(stored);
    }
    setPositions(pos);
  }, [clampToContainer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // refreshSignal: 편집창이 이제 desktop 위에 겹쳐 뜨는 방식이라 desktop이 더 이상
    // 화면 전환마다 재마운트되지 않는다 — 편집창을 닫을 때마다 이 값이 바뀌어
    // 저장소를 다시 읽어온다(그러지 않으면 방금 저장한 작품이 반영되지 않는다).
  }, [refresh, refreshSignal]);

  // 창 크기 변경 시 화면 밖으로 나간 아이콘/휴지통/포맷을 안쪽으로 보정해 보여준다.
  // 저장된 원래 위치(localStorage)는 건드리지 않고 매번 그 값을 다시 읽어 현재
  // 창 크기로 클램프만 하므로, 창을 다시 키우면 원래 위치로 돌아온다 — 이미
  // 클램프된 state 값을 또 클램프하면 창을 키워도 좁아진 위치에 그대로 고정되는
  // 문제가 있었다. 위치가 실제로 바뀌는 건 드래그로 옮길 때뿐이다.
  useEffect(() => {
    const handleResize = () => {
      setPositions(() => {
        const next: Record<string, { x: number; y: number }> = {};
        items.forEach((art, i) => {
          next[art.id] = clampToContainer(getIconPosition(art.id, i));
        });
        for (const id of SPECIAL_ICON_IDS) {
          const stored = getStoredPosition(id);
          if (stored) next[id] = clampToContainer(stored);
        }
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [items, clampToContainer]);

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

  // 일반 픽셀아트 아이콘과 트래시/포맷 같은 특수 아이콘이 모두 이 함수 하나로
  // 드래그된다 — "이 창에 들어가는 모든 파일의 시각적 인터랙션은 동일해야" 하므로
  // 별도 구현을 두지 않는다. 다중 선택·Ctrl/Shift 토글은 일반 아이콘에만 적용된다.
  const startIconDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const isSpecial = (SPECIAL_ICON_IDS as readonly string[]).includes(id);

      if (!isSpecial && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }

      if (isSpecial) {
        draggingSpecialRef.current = id;
        // 드래그 중에는 휴지통이 마우스 아래에서 움직이면서 pointerenter/leave가
        // 반복 발생해 열림/닫힘 그림이 깜빡였다 — 드래그 시작 시 고정으로 닫힘
        // 상태로 되돌리고, 드래그 중 hover 갱신을 막는다(아래 hover 핸들러 참조).
        if (id === TRASH_ID) setTrashHover(false);
      }

      const group = !isSpecial && selected.has(id) ? Array.from(selected) : [id];
      if (!isSpecial && !selected.has(id)) setSelected(new Set([id]));

      const containerRect = containerRef.current?.getBoundingClientRect();
      const offsetX = containerRect?.left ?? 0;
      const offsetY = containerRect?.top ?? 0;
      // 아직 저장된 위치가 없는 아이콘(트래시/포맷의 기본 코너 배치)은 지금 실제
      // 화면에 보이는 위치를 컨테이너 기준 좌표로 환산해 드래그 시작점으로 삼는다
      // — 그래야 첫 드래그에서 위치가 갑자기 튀지 않는다.
      const startPositions = group.map((gid) => {
        const existing = positions[gid];
        if (existing) return { id: gid, ...existing };
        const rect = e.currentTarget.getBoundingClientRect();
        return { id: gid, x: rect.left - offsetX, y: rect.top - offsetY };
      });

      const startX = e.clientX;
      const startY = e.clientY;

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
        window.removeEventListener("pointercancel", up);
        setPositions((prev) => {
          for (const sp of startPositions) {
            const p = prev[sp.id];
            if (p) setIconPosition(sp.id, p.x, p.y);
          }
          return prev;
        });
        if (isSpecial) draggingSpecialRef.current = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      // 시스템 제스처 등으로 pointerup 없이 드래그가 끊기면 draggingSpecialRef가
      // 계속 채워진 채로 남으므로 pointercancel도 같이 처리한다.
      window.addEventListener("pointercancel", up);
    },
    [selected, positions],
  );

  const handleTrashDrop = useCallback(() => {
    setTrashHover(false);
    if (draggingSpecialRef.current === TRASH_ID) return;
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

  const confirmFormat = useCallback(() => {
    resetAllPixelArt();
    resetDesktopLayout();
    resetWallpaper();
    setSelected(new Set());
    setPendingFormat(false);
    refresh();
  }, [refresh]);

  // 시스템 아이콘(트래시/포맷)은 이름 변경·삭제가 불가능하다는 걸 명시적으로
  // 보여주기 위해 비활성화된 상태로라도 항목을 그대로 노출한다.
  const systemIconMenuItems: ContextMenuItem[] = [
    { label: "이름 바꾸기", onClick: () => {}, disabled: true },
    { label: "삭제", onClick: () => {}, disabled: true },
  ];

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden bg-white"
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
      <WallpaperBackground art={wallpaper} />

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
            onPointerDownIcon={(e) => startIconDrag(art.id, e)}
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
        onPointerDown={(e) => startIconDrag(TRASH_ID, e)}
        onPointerEnter={() => draggingSpecialRef.current !== TRASH_ID && setTrashHover(true)}
        onPointerLeave={() => draggingSpecialRef.current !== TRASH_ID && setTrashHover(false)}
        onPointerUp={handleTrashDrop}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, items: systemIconMenuItems });
        }}
        className={`absolute flex w-20 flex-col items-center gap-1 p-2 ${positions[TRASH_ID] ? "" : "bottom-4 right-4"}`}
        style={positions[TRASH_ID] ? { left: positions[TRASH_ID].x, top: positions[TRASH_ID].y } : undefined}
        title="선택한 아이콘을 여기로 드래그해 삭제 · 드래그해서 위치 이동 가능"
      >
        <TrashIcon active={trashHover} />
        <span className="w-full truncate text-center text-[10px] text-gray-600">휴지통</span>
      </div>

      <div
        onPointerDown={(e) => startIconDrag(FORMAT_ID, e)}
        onDoubleClick={() => setPendingFormat(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, items: systemIconMenuItems });
        }}
        className={`absolute flex w-20 flex-col items-center gap-1 p-2 hover:bg-gray-100 ${positions[FORMAT_ID] ? "" : "bottom-4 left-4"}`}
        style={positions[FORMAT_ID] ? { left: positions[FORMAT_ID].x, top: positions[FORMAT_ID].y } : undefined}
        title="더블클릭하면 이 프로젝트의 저장된 모든 작품과 배치를 초기화합니다 · 드래그해서 위치 이동 가능"
      >
        <FormatIcon />
        <span className="w-full truncate text-center text-[10px] text-gray-600">포맷</span>
      </div>

      <div
        onPointerDown={(e) => startIconDrag(WALLPAPER_ID, e)}
        onDoubleClick={() => onOpen(WALLPAPER_ID)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, items: systemIconMenuItems });
        }}
        className={`absolute flex w-20 flex-col items-center gap-1 p-2 hover:bg-gray-100 ${positions[WALLPAPER_ID] ? "" : "top-4 right-4"}`}
        style={positions[WALLPAPER_ID] ? { left: positions[WALLPAPER_ID].x, top: positions[WALLPAPER_ID].y } : undefined}
        title="더블클릭하면 배경화면을 편집합니다 · 드래그해서 위치 이동 가능"
      >
        <WallpaperIcon art={wallpaper} />
        <span className="w-full truncate text-center text-[10px] text-gray-600">배경화면</span>
      </div>

      <div
        onPointerDown={(e) => startIconDrag(LAUNCHER_ID, e)}
        onDoubleClick={onOpenLauncher}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, items: systemIconMenuItems });
        }}
        className={`absolute flex w-20 flex-col items-center gap-1 p-2 hover:bg-gray-100 ${positions[LAUNCHER_ID] ? "" : "top-4 left-4"}`}
        style={positions[LAUNCHER_ID] ? { left: positions[LAUNCHER_ID].x, top: positions[LAUNCHER_ID].y } : undefined}
        title="더블클릭하면 새로 만들기·기존 파일 열기·이미지 불러오기를 선택할 수 있습니다 · 드래그해서 위치 이동 가능"
      >
        <LauncherIcon />
        <span className="w-full truncate text-center text-[10px] text-gray-600">편집기</span>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {pendingDelete && (
        <ConfirmDialog
          message={`${pendingDelete.length}개 항목을 삭제하시겠습니까?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {pendingFormat && (
        <ConfirmDialog
          message="저장된 모든 픽셀아트와 아이콘 배치를 초기화합니다. 되돌릴 수 없습니다. 계속할까요?"
          onConfirm={confirmFormat}
          onCancel={() => setPendingFormat(false)}
        />
      )}
    </div>
  );
}
