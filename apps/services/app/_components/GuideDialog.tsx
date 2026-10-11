"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * 상단 바의 '사용 안내' 버튼과 오른쪽 드로어. 드로어 내용(children)은 서버에서
 * 렌더된 ToolGuide라 닫혀 있어도 초기 HTML에 들어 있다 — 사용자가 버튼으로
 * 여는 접이식 콘텐츠다.
 */
export default function GuideDialog({
  toolName,
  children,
}: {
  toolName: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 도구들은 window에서 keydown을 듣는다(숫자 키로 코 뜨기, 스페이스로 진행 등).
  // 드로어가 열려 있는 동안 여기서 친 키가 뒤의 도구로 새지 않도록 dialog에서
  // 전파를 끊는다. Esc로 닫히는 dialog 기본 동작은 그대로 유지된다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const stop = (e: Event) => e.stopPropagation();
    dialog.addEventListener("keydown", stop);
    dialog.addEventListener("keyup", stop);
    return () => {
      dialog.removeEventListener("keydown", stop);
      dialog.removeEventListener("keyup", stop);
    };
  }, []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => dialogRef.current?.close();
  // dialog는 닫힐 때 포커스를 '사용 안내' 버튼으로 되돌린다. 그대로 두면 도구를
  // 쓰다 누른 스페이스·Enter가 버튼을 눌러 드로어가 다시 열리므로 포커스를 푼다.
  const handleClose = () => triggerRef.current?.blur();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
      >
        <CircleHelp className="size-3.5" />
        사용 안내
      </button>
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        aria-label={`${toolName} 안내`}
        // 드로어 바깥(::backdrop 영역)을 누르면 닫는다 — 클릭 대상이 dialog
        // 자신일 때만 바깥 클릭이다.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl bg-transparent p-0 backdrop:bg-point/40"
      >
        <div className="flex h-full flex-col bg-white text-ink sm:border-l-[2.5px] sm:border-point">
          <div className="flex shrink-0 items-center justify-between border-b-2 border-point bg-shade px-6 py-3">
            <p className="text-sm font-bold text-point">사용 안내</p>
            <button
              type="button"
              onClick={close}
              aria-label="안내 닫기"
              className="rounded-full p-1.5 text-point transition-colors hover:bg-sub/60"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
