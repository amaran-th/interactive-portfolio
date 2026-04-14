import { useMemo } from "react";
import { Color, Stitch, StitchType } from "./type";

type DraftCell = { type: StitchType; color: Color };

type Props = {
  draft: DraftCell[][];
  stitches: Stitch[][];
  elapsed: number;
};

export const useKnittingStats = ({ draft, stitches, elapsed }: Props) => {
  return useMemo(() => {
    let total = 0;
    let success = 0; // slipped === false
    let correctColor = 0;

    draft.forEach((row, y) => {
      const isReversed = y % 2 === 1;
      row.forEach((_, x) => {
        const draftX = isReversed ? row.length - 1 - x : x;
        const targetColor = row[draftX].color;
        const stitch = stitches[y]?.[x];
        if (!stitch) return;

        total++;

        if (!stitch.slipped) {
          success++;
        }

        if (stitch.color === targetColor) {
          correctColor++;
        }
      });
    });

    const slipAccuracy = total === 0 ? 0 : (success / total) * 100;
    const colorAccuracy = total === 0 ? 0 : (correctColor / total) * 100;
    const spm = elapsed > 0 ? total / (elapsed / 6000) : 0;
    const progress =
      draft.length === 0
        ? 0
        : (total / (draft.length * (draft[0]?.length ?? 1))) * 100;
    const slipCount = total - success;

    return {
      total,
      success,
      slipCount,
      slipAccuracy,
      colorAccuracy,
      spm,
      progress,
    };
  }, [draft, stitches, elapsed]);
};
