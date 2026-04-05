import { useMemo } from "react";

type Props = {
  elapsed: number;
  slipCount: number;
  colorAccuracy: number;
  progress: number;
  spm: number;
};

export default function Status({
  elapsed,
  slipCount,
  colorAccuracy,
  progress,
  spm,
}: Props) {
  // ⏱ 시간 포맷 (MM:SS:CS)
  const time = useMemo(() => {
    const minutes = Math.floor(elapsed / 6000);
    const seconds = Math.floor((elapsed / 100) % 60);
    const centiseconds = elapsed % 100;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}:${String(centiseconds).padStart(2, "0")}`;
  }, [elapsed]);

  const getColor = (value: number) => {
    if (value === 100) return "text-green-600";
    if (value > 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-md shadow-md bg-gray-50 min-w-38.5">
      {/* 타이머 */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">시간</span>
        <span className="font-mono">{time}</span>
      </div>
      {/* 정확도 (분리) */}
      <div className="flex justify-between">
        <span className="text-gray-500">실수</span>
        <span className={slipCount > 0 ? "text-red-600" : "text-gray-600"}>
          {slipCount}회
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">정확도</span>
        <span className={getColor(colorAccuracy)}>
          {colorAccuracy.toFixed(1)}%
        </span>
      </div>

      {/* 진행도 */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">진행도</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded">
          <div
            className="h-full bg-blue-500 rounded transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* 속도 */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">속도</span>
        <span>{spm.toFixed(1)} SPM</span>
      </div>
    </div>
  );
}
