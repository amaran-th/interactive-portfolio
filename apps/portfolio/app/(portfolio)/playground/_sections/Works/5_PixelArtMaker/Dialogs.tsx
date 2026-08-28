"use client";

import { useEffect, useRef, useState } from "react";

// window.alert/prompt 같은 브라우저 네이티브 모달은 이 편집기의 나머지 UI와
// 스타일이 완전히 달라 어색하고, 자동화 테스트나 임베딩 환경에서 막히기도
// 한다 — 그래서 이 편집기 안에서 쓰는 알림·입력은 전부 이 두 컴포넌트로
// 대체한다.
function DialogBackdrop({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-72 bg-white p-4 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}

export function AlertModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <DialogBackdrop onDismiss={onClose}>
      <p className="mb-4 text-sm whitespace-pre-line text-gray-900">
        {message}
      </p>
      <div className="flex justify-end">
        <button
          autoFocus
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          className="bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
        >
          확인
        </button>
      </div>
    </DialogBackdrop>
  );
}

export function PromptModal({
  open,
  title,
  defaultValue = "",
  confirmLabel = "확인",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 열릴 때마다 기본값으로 되돌린다 — effect 안에서 setState를 부르는 대신,
  // 리액트 문서가 권장하는 "렌더링 중 이전 prop과 비교해 조정하기" 패턴을
  // 쓴다(ref는 렌더링 중 쓸 수 없어 상태로 이전 open 값을 추적한다).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(defaultValue);
  }

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  if (!open) return null;

  const trimmed = value.trim();
  const handleConfirm = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <DialogBackdrop onDismiss={onCancel}>
      <p className="mb-2 text-sm text-gray-900">{title}</p>
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleConfirm();
          if (e.key === "Escape") onCancel();
        }}
        className="mb-4 w-full border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-800 focus:outline-violet-400"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-900"
        >
          취소
        </button>
        <button
          onClick={handleConfirm}
          disabled={!trimmed}
          className="bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </div>
    </DialogBackdrop>
  );
}
