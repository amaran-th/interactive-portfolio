"use client";

import { useCallback, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";
import { monaFont } from "./fonts";

type Screen = { view: "desktop" } | { view: "editor"; docId: string | null };

export default function PixelArtMaker() {
  const [screen, setScreen] = useState<Screen>({ view: "desktop" });
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesWarning(isDirty);

  const openEditor = useCallback((docId: string | null) => {
    setIsDirty(false);
    setScreen({ view: "editor", docId });
  }, []);

  const closeEditor = useCallback(() => {
    setIsDirty(false);
    setScreen({ view: "desktop" });
  }, []);

  return (
    <div className={`${monaFont.className} h-full w-full`}>
      {screen.view === "editor" ? (
        <Editor docId={screen.docId} onDirtyChange={setIsDirty} onExit={closeEditor} />
      ) : (
        <Desktop onOpen={(id) => openEditor(id)} onCreate={() => openEditor(null)} />
      )}
    </div>
  );
}
