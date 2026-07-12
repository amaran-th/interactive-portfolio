import { useEffect } from "react";
import { MirrorMode, Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = {
  b: "pencil",
  e: "eraser",
  g: "bucket",
  i: "eyedropper",
  u: "line",
  m: "select",
  v: "move",
  w: "wand",
};

export function useKeyboardShortcuts({
  onToolChange,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onMirrorToggle,
  onSave,
}: {
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onMirrorToggle: (mode: MirrorMode) => void;
  onSave?: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        onCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        onPaste();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "h") {
        onMirrorToggle("horizontal");
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "v") {
        onMirrorToggle("vertical");
        return;
      }
      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) onToolChange(tool);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToolChange, onUndo, onRedo, onCopy, onPaste, onMirrorToggle, onSave]);
}
