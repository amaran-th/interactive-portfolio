"use client";

type SwitchProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
  /** "compact" — smaller track/label, for placing next to compact selects. */
  size?: "default" | "compact";
};

export default function Switch({
  checked,
  onChange,
  label,
  size = "default",
}: SwitchProps) {
  const compact = size === "compact";
  return (
    <label
      className={`flex cursor-pointer items-center select-none ${
        compact ? "gap-1 text-xs text-gray-500" : "gap-1.5"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative shrink-0 rounded-full transition-colors ${
          compact ? "h-4 w-7" : "h-5 w-9"
        } ${checked ? "bg-indigo-500" : "bg-gray-300"}`}
      >
        <span
          className={`absolute rounded-full bg-white shadow transition-transform ${
            compact
              ? `top-0.5 left-0.5 h-3 w-3 ${checked ? "translate-x-3" : "translate-x-0"}`
              : `top-0.5 left-0.5 h-4 w-4 ${checked ? "translate-x-4" : "translate-x-0"}`
          }`}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
