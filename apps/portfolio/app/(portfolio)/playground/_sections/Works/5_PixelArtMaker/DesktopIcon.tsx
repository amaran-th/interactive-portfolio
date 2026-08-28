"use client";

import { useEffect, useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { CURSOR_POINTING, CURSOR_TEXT } from "./cursors";

export default function DesktopIcon({
  art,
  x,
  y,
  selected,
  editing,
  onPointerDownIcon,
  onDoubleClick,
  onContextMenu,
  onRenameConfirm,
  onRenameCancel,
}: {
  art: PixelArt;
  x: number;
  y: number;
  selected: boolean;
  editing: boolean;
  onPointerDownIcon: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameConfirm: (name: string) => void;
  onRenameCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState(art.name);

  useEffect(() => {
    if (!editing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftName(art.name);
    // 다음 프레임에 포커스+전체 선택 — 실제 OS 아이콘 이름을 고칠 때와 동일한 느낌.
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [editing, art.name]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const scale = size / Math.max(art.width, art.height);
    // 정사각형이 아닌 캔버스(예: 160x90)는 긴 축만 꽉 채우면 짧은 축 쪽에
    // 빈 공간이 남는다 — 그 여백을 가운데로 정렬한다.
    const offsetX = (size - art.width * scale) / 2;
    const offsetY = (size - art.height * scale) / 2;
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const color = art.pixels[py * art.width + px];
        if (color === null) continue;
        ctx.fillStyle = color;
        ctx.fillRect(px * scale + offsetX, py * scale + offsetY, scale, scale);
      }
    }
  }, [art]);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed) onRenameConfirm(trimmed);
    else onRenameCancel();
  };

  return (
    <div
      style={{
        left: x,
        top: y,
        position: "absolute",
        cursor: editing ? undefined : CURSOR_POINTING,
      }}
      className={`flex w-20 flex-col items-center gap-1 p-2 ${selected ? "bg-violet-500/15" : "hover:bg-black/5"}`}
      onPointerDown={editing ? undefined : onPointerDownIcon}
      onDoubleClick={editing ? undefined : onDoubleClick}
      onContextMenu={editing ? undefined : onContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="shadow-sm"
        style={{ imageRendering: "pixelated" }}
      />
      {editing ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            else if (e.key === "Escape") onRenameCancel();
          }}
          className="w-full bg-white text-center text-[10px] text-gray-900 shadow-[0_0_0_1px_#8b5cf6] outline-none"
          style={{ cursor: CURSOR_TEXT }}
        />
      ) : (
        <span className="w-full truncate text-center text-[10px] text-gray-600">
          {art.name}
        </span>
      )}
    </div>
  );
}
