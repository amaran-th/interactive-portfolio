import { useCallback, useState } from "react";
import { PixelValue } from "./pixelGrid";

export type Clip = {
  w: number;
  h: number;
  cells: { dx: number; dy: number; color: PixelValue }[];
};

export function useSelection() {
  const [mask, setMask] = useState<Set<number> | null>(null);
  const [clipboard, setClipboard] = useState<Clip | null>(null);

  const copy = useCallback(
    (pixels: PixelValue[], width: number) => {
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
        return { dx: x - minX, dy: y - minY, color: pixels[i] };
      });
      const w = Math.max(...xs) - minX + 1;
      const h = Math.max(...ys) - minY + 1;
      setClipboard({ w, h, cells });
    },
    [mask],
  );

  return { mask, setMask, clipboard, copy };
}
