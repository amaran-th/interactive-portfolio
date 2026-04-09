import { memo } from "react";
import { STITCH_COUNT } from "./data";
import StitchBlock from "./StitchBlock";
import { Stitch } from "./type";

export function padRows(rows: Stitch[][]) {
  return rows.map((row) => [
    ...row,
    ...Array.from({ length: STITCH_COUNT - row.length }, () => null),
  ]);
}

export const StitchRow = memo(function StitchRow({
  row,
  stitchSize,
  emptyClassName,
}: {
  row: (Stitch | null)[];
  stitchSize: number;
  emptyClassName: string;
}) {
  const nextEmptyIndex = row.findIndex((stitch) => stitch === null);

  return (
    <div className="grid w-fit grid-cols-10">
      {row.map((thread, stitchIndex) =>
        thread ? (
          <div
            key={stitchIndex}
            className="relative"
            style={{
              width: stitchSize,
              height: stitchSize,
              zIndex: thread.slipped ? 50 : 1,
            }}
          >
            <StitchBlock color={thread.color} slipped={thread.slipped} size={stitchSize} />
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
    </div>
  );
});

export function MufflerPreview({ rows, compact = false }: { rows: Stitch[][]; compact?: boolean }) {
  const cellSize = compact ? 20 : 32;
  const emptyClassName = compact ? "w-5 h-5" : "w-8 h-8";
  const paddedRows = padRows(rows);

  return (
    <div className="px-6 py-4 text-gray-700 flex flex-col items-center relative">
      {paddedRows.map((row, rowIndex) => (
        <StitchRow key={rowIndex} row={row} stitchSize={cellSize} emptyClassName={emptyClassName} />
      ))}
    </div>
  );
}

export function ResultMuffler({ rows, title }: { rows: Stitch[][]; title: string }) {
  const paddedRows = padRows(rows);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-stone-600 text-center">{title}</p>
      <div className="flex flex-col items-center">
        {paddedRows.map((row, rowIndex) => (
          <StitchRow key={rowIndex} row={row} stitchSize={20} emptyClassName="h-5 w-5" />
        ))}
      </div>
    </div>
  );
}
