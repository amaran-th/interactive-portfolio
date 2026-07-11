"use client";

import { useCallback, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";

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

  if (screen.view === "editor") {
    return <Editor docId={screen.docId} onDirtyChange={setIsDirty} onExit={closeEditor} />;
  }

  return <Desktop onOpen={(id) => openEditor(id)} onCreate={() => openEditor(null)} />;
}
