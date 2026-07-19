"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";
import { monaFont } from "../_shared/fonts";

type Screen =
  | { view: "desktop" }
  | { view: "editor"; docId: string | null; startMode: "newCanvas" | "empty" };

// 편집창이 닫힐 때 재생하는 축소·페이드 애니메이션 시간(ms) — Editor.tsx의
// transition-all duration-200과 동일하게 맞춰야 애니메이션이 끝나기 전에
// 화면(desktop)으로 바로 전환돼 버리지 않는다.
const CLOSE_ANIM_MS = 200;

// 편집기가 켜진 상태로 바로 접속할 수 있도록 하는 쿼리스트링 — 열려있을 때
// URL에 반영해두면 그 주소를 새로고침하거나 공유해도 같은 상태로 열린다.
const EDITOR_QUERY_PARAM = "editor";
const EDITOR_QUERY_VALUE = "on";

function setEditorQueryParam(on: boolean) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set(EDITOR_QUERY_PARAM, EDITOR_QUERY_VALUE);
  else url.searchParams.delete(EDITOR_QUERY_PARAM);
  window.history.replaceState(null, "", url);
}

export default function PixelArtMaker() {
  const [screen, setScreen] = useState<Screen>({ view: "desktop" });
  const [closing, setClosing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // 편집창도 데스크탑(배경화면)과 같은 letterbox 상자 크기를 쓰도록 Desktop이
  // 계산한 fittedSize를 그대로 물려받는다 — 그래야 편집창이 뷰포트 전체가 아니라
  // 배경화면 컨테이너와 정확히 같은 크기·비율로 뜬다.
  const [fittedSize, setFittedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
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

  const openEditor = useCallback(
    (docId: string | null, startMode: "newCanvas" | "empty" = "newCanvas") => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsDirty(false);
      setClosing(false);
      setScreen({ view: "editor", docId, startMode });
      setEditorQueryParam(true);
    },
    [],
  );

  // 처음 들어왔을 때 쿼리스트링에 편집기가 켜져있어야 한다고 표시돼 있으면
  // (예: ?editor=on) 데스크탑을 거치지 않고 곧바로 빈 편집창을 연다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(EDITOR_QUERY_PARAM) === EDITOR_QUERY_VALUE)
      openEditor(null, "empty");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 즉시 화면을 desktop으로 바꾸지 않고, 먼저 편집창이 축소·페이드되며 닫히는
  // 애니메이션을 재생한 뒤(진짜 프로그램 창이 닫히는 느낌) 그 시간이 지나야
  // 실제로 화면을 전환한다 — desktop은 그 아래 계속 마운트돼 있으므로 애니메이션
  // 도중에도 자연스럽게 드러난다.
  const closeEditor = useCallback(() => {
    setIsDirty(false);
    setClosing(true);
    setEditorQueryParam(false);
    closeTimeoutRef.current = setTimeout(() => {
      setScreen({ view: "desktop" });
      setClosing(false);
      setRefreshSignal((n) => n + 1);
      closeTimeoutRef.current = null;
    }, CLOSE_ANIM_MS);
  }, []);

  return (
    <div
      className={`${monaFont.className} relative h-full w-full overflow-hidden`}
    >
      <Desktop
        refreshSignal={refreshSignal}
        onOpen={(id) => openEditor(id)}
        onCreate={() => openEditor(null)}
        onOpenLauncher={() => openEditor(null, "empty")}
        onFittedSizeChange={setFittedSize}
      />
      {screen.view === "editor" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="pointer-events-auto h-full w-full"
            style={
              fittedSize
                ? { width: fittedSize.width, height: fittedSize.height }
                : undefined
            }
          >
            <Editor
              docId={screen.docId}
              startMode={screen.startMode}
              onDirtyChange={setIsDirty}
              onExit={closeEditor}
              closing={closing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
