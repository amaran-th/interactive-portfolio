import { memo } from "react";
import StitchBlock from "./StitchBlock";
import { Stitch, Width } from "./type";

export function padRows(rows: Stitch[][], stitchCount: number) {
  return rows.map((row) => [
    ...row,
    ...Array.from({ length: stitchCount - row.length }, () => null),
  ]);
}

export const StitchRow = memo(function StitchRow({
  row,
  stitchSize,
  emptyClassName,
  rowIndex = 0,
  totalRows = 1,
}: {
  row: (Stitch | null)[];
  stitchSize: number;
  emptyClassName: string;
  rowIndex?: number;
  totalRows?: number;
}) {
  const isReversed = rowIndex % 2 === 1;
  const displayRow = isReversed ? [...row].reverse() : row;
  const nextEmptyIndex = isReversed
    ? displayRow.findLastIndex((stitch) => stitch === null)
    : displayRow.findIndex((stitch) => stitch === null);

  return (
    <>
      {displayRow.map((thread, stitchIndex) =>
        thread ? (
          <div
            key={stitchIndex}
            className="relative"
            style={{
              width: stitchSize,
              height: stitchSize,
              zIndex: thread.slipped ? 50 : totalRows - rowIndex,
            }}
          >
            <StitchBlock
              type={thread.type}
              color={thread.color}
              slipped={thread.slipped}
              size={stitchSize}
            />
          </div>
        ) : stitchIndex === nextEmptyIndex ? (
          <div
            key={stitchIndex}
            className={`${emptyClassName} rounded-sm border-2 border-dashed border-gray-300`}
          />
        ) : (
          <div key={stitchIndex} className={emptyClassName} />
        ),
      )}
    </>
  );
});

export function MufflerPreview({
  rows,
  stitchCount,
  compact = false,
}: {
  rows: Stitch[][];
  stitchCount: Width;
  compact?: boolean;
}) {
  const cellSize = compact ? 20 : 32;
  const emptyClassName = compact ? "w-5 h-5" : "w-8 h-8";
  const paddedRows = padRows(rows, stitchCount);

  return (
    <div className="px-6 py-4 text-gray-700 flex justify-center">
      <div
        className="relative grid w-fit"
        style={{ gridTemplateColumns: `repeat(${stitchCount}, 1fr)` }}
      >
        {paddedRows.map((row, rowIndex) => (
          <StitchRow
            key={rowIndex}
            row={row}
            stitchSize={cellSize}
            emptyClassName={emptyClassName}
            rowIndex={rowIndex}
            totalRows={paddedRows.length}
          />
        ))}
      </div>
    </div>
  );
}

export function ResultMuffler({
  rows,
  title,
}: {
  rows: Stitch[][];
  title: string;
}) {
  const stitchCount = rows[0]?.length ?? 10;
  const paddedRows = padRows(rows, stitchCount);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-stone-600 text-center">{title}</p>
      <div
        className="relative grid w-fit"
        style={{ gridTemplateColumns: `repeat(${stitchCount}, 1fr)` }}
      >
        {paddedRows.map((row, rowIndex) => (
          <StitchRow
            key={rowIndex}
            row={row}
            stitchSize={20}
            emptyClassName="h-5 w-5"
            rowIndex={rowIndex}
            totalRows={paddedRows.length}
          />
        ))}
      </div>
    </div>
  );
}
