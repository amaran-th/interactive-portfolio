"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";
import { monaFont } from "./fonts";

type Screen = { view: "desktop" } | { view: "editor"; docId: string | null };

// 편집창이 닫힐 때 재생하는 축소·페이드 애니메이션 시간(ms) — Editor.tsx의
// transition-all duration-200과 동일하게 맞춰야 애니메이션이 끝나기 전에
// 화면(desktop)으로 바로 전환돼 버리지 않는다.
const CLOSE_ANIM_MS = 200;

export default function PixelArtMaker() {
  const [screen, setScreen] = useState<Screen>({ view: "desktop" });
  const [closing, setClosing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // desktop이 이제 편집창 아래 계속 마운트된 채로 남아있어(더 이상 화면 전환마다
  // 다시 마운트되지 않음) 편집창을 닫을 때 이 값을 올려 desktop이 저장소를 다시
  // 읽도록 한다 — 안 그러면 저장한 새 작품이 데스크탑에 반영되지 않는다.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const openEditor = useCallback((docId: string | null) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsDirty(false);
    setClosing(false);
    setScreen({ view: "editor", docId });
  }, []);

  // 즉시 화면을 desktop으로 바꾸지 않고, 먼저 편집창이 축소·페이드되며 닫히는
  // 애니메이션을 재생한 뒤(진짜 프로그램 창이 닫히는 느낌) 그 시간이 지나야
  // 실제로 화면을 전환한다 — desktop은 그 아래 계속 마운트돼 있으므로 애니메이션
  // 도중에도 자연스럽게 드러난다.
  const closeEditor = useCallback(() => {
    setIsDirty(false);
    setClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setScreen({ view: "desktop" });
      setClosing(false);
      setRefreshSignal((n) => n + 1);
      closeTimeoutRef.current = null;
    }, CLOSE_ANIM_MS);
  }, []);

  return (
    <div className={`${monaFont.className} relative h-full w-full overflow-hidden`}>
      <Desktop refreshSignal={refreshSignal} onOpen={(id) => openEditor(id)} onCreate={() => openEditor(null)} />
      {screen.view === "editor" && (
        <Editor docId={screen.docId} onDirtyChange={setIsDirty} onExit={closeEditor} closing={closing} />
      )}
    </div>
  );
}
