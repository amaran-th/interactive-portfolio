"use client";

import { useEffect, useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { CURSOR_POINTING, CURSOR_TEXT } from "./cursors";
import {
  ICON_BOX,
  ICON_CANVAS_PX,
  ICON_GAP,
  ICON_LABEL_PX,
  ICON_PADDING,
} from "./iconMetrics";

export default function DesktopIcon({
  art,
  x,
  y,
  scale,
  selected,
  editing,
  onPointerDownIcon,
  onDoubleClick,
  onContextMenu,
  onRenameConfirm,
  onRenameCancel,
}: {
  art: PixelArt;
  // x, y는 기준(배율 1.0) 좌표 — 여기서 scale을 곱해 화면 좌표로 그린다.
  x: number;
  y: number;
  scale: number;
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
    // 캔버스 내부 해상도도 배율만큼 키워 다시 그린다 — transform 스케일로
    // 늘리면 픽셀아트가 뭉개지므로, 확대된 크기 기준으로 새로 렌더한다.
    const size = Math.max(1, Math.round(ICON_CANVAS_PX * scale));
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const block = size / Math.max(art.width, art.height);
    // 정사각형이 아닌 캔버스(예: 160x90)는 긴 축만 꽉 채우면 짧은 축 쪽에
    // 빈 공간이 남는다 — 그 여백을 가운데로 정렬한다.
    const offsetX = (size - art.width * block) / 2;
    const offsetY = (size - art.height * block) / 2;
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const color = art.pixels[py * art.width + px];
        if (color === null) continue;
        ctx.fillStyle = color;
        ctx.fillRect(px * block + offsetX, py * block + offsetY, block, block);
      }
    }
  }, [art, scale]);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed) onRenameConfirm(trimmed);
    else onRenameCancel();
  };

  return (
    <div
      style={{
        left: x * scale,
        top: y * scale,
        position: "absolute",
        width: ICON_BOX * scale,
        padding: ICON_PADDING * scale,
        gap: ICON_GAP * scale,
        cursor: editing ? undefined : CURSOR_POINTING,
      }}
      className={`flex flex-col items-center ${selected ? "bg-violet-500/15" : "hover:bg-black/5"}`}
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
          className="w-full bg-white text-center text-gray-900 shadow-[0_0_0_1px_#8b5cf6] outline-none"
          style={{ cursor: CURSOR_TEXT, fontSize: ICON_LABEL_PX * scale }}
        />
      ) : (
        <span
          className="w-full truncate text-center text-gray-600"
          style={{ fontSize: ICON_LABEL_PX * scale }}
        >
          {art.name}
        </span>
      )}
    </div>
  );
}
