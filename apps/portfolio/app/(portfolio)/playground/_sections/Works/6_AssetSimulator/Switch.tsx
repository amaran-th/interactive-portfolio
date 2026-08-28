"use client";

type SwitchProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
};

export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-indigo-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
