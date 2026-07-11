"use client";

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-72 rounded-xl border border-white/10 bg-gray-950 p-4">
        <p className="mb-4 text-sm text-white">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            취소
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
