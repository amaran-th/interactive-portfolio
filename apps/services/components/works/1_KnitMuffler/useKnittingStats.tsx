import { useMemo } from "react";
import { Color, Stitch, StitchType } from "./type";

type DraftCell = { type: StitchType; color: Color };

type Props = {
  draft: DraftCell[][];
  stitches: Stitch[][];
  checkStitchType?: boolean;
};

export const useKnittingStats = ({ draft, stitches, checkStitchType = false }: Props) => {
  return useMemo(() => {
    let total = 0;
    let success = 0; // slipped === false
    let correctColor = 0;

    draft.forEach((row, y) => {
      const isReversed = y % 2 === 1;
      row.forEach((_, x) => {
        const draftX = isReversed ? row.length - 1 - x : x;
        const target = row[draftX];
        const stitch = stitches[y]?.[x];
        if (!stitch) return;

        total++;

        if (!stitch.slipped) {
          success++;
        }

        const colorMatch = stitch.color === target.color;
        const typeMatch = !checkStitchType || stitch.type === target.type;
        if (colorMatch && typeMatch) {
          correctColor++;
        }
      });
    });

    const slipAccuracy = total === 0 ? 0 : (success / total) * 100;
    const colorAccuracy = total === 0 ? 0 : (correctColor / total) * 100;
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
      progress,
    };
  }, [draft, stitches, checkStitchType]);
};
