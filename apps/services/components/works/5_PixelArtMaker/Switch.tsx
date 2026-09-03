"use client";

// 켜고 끄는 옵션용 토글 스위치 — 프레임 패널(핑퐁·어니언 스킨), 도구 옵션 바
// (전역 동일색 등)에서 공유한다.
export default function Switch({
  checked,
  onClick,
  title,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-violet-500" : "bg-gray-300"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(12px)" : "translateX(0)" }}
      />
    </button>
  );
}
