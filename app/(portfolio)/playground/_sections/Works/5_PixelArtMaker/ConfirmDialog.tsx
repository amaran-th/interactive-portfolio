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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <p className="mb-4 text-sm text-gray-900">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-900">
            취소
          </button>
          <button onClick={onConfirm} className="bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
