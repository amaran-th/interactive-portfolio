import { useCallback, useState } from "react";
import { setPixel } from "./pixelGrid";

type Clip = {
  w: number;
  h: number;
  cells: { dx: number; dy: number; colorIndex: number }[];
};

export function useSelection() {
  const [mask, setMask] = useState<Set<number> | null>(null);
  const [clipboard, setClipboard] = useState<Clip | null>(null);

  const copy = useCallback(
    (pixels: number[], width: number) => {
      if (!mask || mask.size === 0) return;
      const xs: number[] = [];
      const ys: number[] = [];
      mask.forEach((i) => {
        xs.push(i % width);
        ys.push(Math.floor(i / width));
      });
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const cells = Array.from(mask).map((i) => {
        const x = i % width;
        const y = Math.floor(i / width);
        return { dx: x - minX, dy: y - minY, colorIndex: pixels[i] };
      });
      const w = Math.max(...xs) - minX + 1;
      const h = Math.max(...ys) - minY + 1;
      setClipboard({ w, h, cells });
    },
    [mask],
  );

  const paste = useCallback(
    (
      pixels: number[],
      width: number,
      height: number,
      atX: number,
      atY: number,
    ): number[] => {
      if (!clipboard) return pixels;
      let next = pixels;
      for (const cell of clipboard.cells) {
        const x = atX + cell.dx;
        const y = atY + cell.dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        next = setPixel(next, width, x, y, cell.colorIndex);
      }
      return next;
    },
    [clipboard],
  );

  return { mask, setMask, clipboard, copy, paste };
}
