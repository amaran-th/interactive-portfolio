"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { imageSrcFromClipboardText, isTextEntryTarget } from "./imageInput";

export type ImageInput = {
  image: HTMLImageElement | null;
  error: string | null;
  dragging: boolean;
  load: (file: File | null | undefined) => void;
  /** 클립보드 읽기 API로 이미지를 가져온다. 붙여넣기 단축키가 닿지 않을 때 쓴다. */
  pasteFromClipboard: () => Promise<void>;
  dropProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
};

// Finder·탐색기에서 파일을 복사하면 브라우저에는 파일 이름만 오는 경우가 많다
const NO_IMAGE =
  "붙여 넣은 내용에 이미지가 없어요. 파일을 복사했다면 끌어다 놓거나 '이미지 고르기'를 써 주세요";

function imageFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  const file = Array.from(data.files).find((f) => f.type.startsWith("image/"));
  if (file) return file;
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

// 파일 선택·끌어다 놓기·붙여넣기(Ctrl/⌘+V)로 이미지 한 장을 받는다.
// 붙여넣기는 페이지 전체에서 받되, 글자 입력칸에 붙여 넣는 건 건드리지 않는다.
// 끌어다 놓기도 페이지 어디서든 받는다 — 놓친 파일을 브라우저가 열어 버리면
// 작업하던 화면이 사라지기 때문이다.
export function useImageInput(): ImageInput {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const urlRef = useRef<string | null>(null);

  const load = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 넣을 수 있어요");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setImage(img);
      setError(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("이미지를 읽지 못했어요");
    };
    img.src = url;
  }, []);

  // 클립보드에 이미지 주소만 있을 때 받아 온다. 다른 사이트 이미지는 그 사이트가
  // 막으면(CORS) 못 가져오므로, 그때는 다시 복사하는 방법을 알려 준다.
  const loadFromUrl = useCallback(
    async (src: string) => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        if (!res.ok || !blob.type.startsWith("image/")) throw new Error("not image");
        load(new File([blob], "clipboard", { type: blob.type }));
      } catch {
        setError("이미지 주소만 복사돼 가져오지 못했어요. 이미지를 우클릭해 '이미지 복사'로 다시 복사해 주세요");
      }
    },
    [load],
  );

  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) {
      setError("이 브라우저는 버튼으로 붙여넣기를 지원하지 않아요. Ctrl/⌘+V를 눌러 주세요");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        load(new File([blob], "clipboard", { type }));
        return;
      }
      for (const item of items) {
        const read = async (t: string) =>
          item.types.includes(t) ? (await item.getType(t)).text() : "";
        const src = imageSrcFromClipboardText(await read("text/html"), await read("text/plain"));
        if (src) return void (await loadFromUrl(src));
      }
      setError(NO_IMAGE);
    } catch (err) {
      setError(
        (err as DOMException).name === "NotAllowedError"
          ? "클립보드 읽기를 허용해야 붙여 넣을 수 있어요"
          : "클립보드를 읽지 못했어요",
      );
    }
  }, [load, loadFromUrl]);

  useEffect(() => {
    // 두 길을 함께 쓴다.
    // 1) 붙여넣기 이벤트: Finder에서 복사한 이미지 파일처럼 이벤트에만 실려 오는 경우가 있다.
    // 2) 클립보드 읽기 API: 이벤트가 비어 오거나(이미지 데이터만 있을 때), Safari처럼
    //    입력칸이 아닌 곳에서는 이벤트 자체가 오지 않을 때 직접 읽는다.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.code !== "KeyV") return;
      if (isTextEntryTarget(e.target as HTMLInputElement | null)) return;
      if (pending) clearTimeout(pending);
      // 붙여넣기 이벤트가 곧 오지 않으면 클립보드를 직접 읽는다
      pending = setTimeout(() => {
        pending = null;
        void pasteFromClipboard();
      }, 200);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTextEntryTarget(e.target as HTMLInputElement | null)) return;
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      e.preventDefault();
      const file = imageFromClipboard(e.clipboardData);
      if (file) return load(file);
      const data = e.clipboardData;
      const src = data
        ? imageSrcFromClipboardText(data.getData("text/html"), data.getData("text/plain"))
        : null;
      if (src) return void loadFromUrl(src);
      // 이벤트에 이미지가 없으면 클립보드를 직접 읽는다. 거기서도 없으면 안내를 띄운다
      void pasteFromClipboard();
    };
    // 드롭 영역(dropProps)이 이미 처리한 드롭은 defaultPrevented라 건너뛴다.
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.defaultPrevented || !e.dataTransfer?.files.length) return;
      e.preventDefault();
      load(e.dataTransfer.files[0]);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      if (pending) clearTimeout(pending);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [load, loadFromUrl, pasteFromClipboard]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return {
    image,
    error,
    dragging,
    load,
    pasteFromClipboard,
    dropProps: {
      onDragOver: (e) => {
        e.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: (e) => {
        e.preventDefault();
        setDragging(false);
        load(e.dataTransfer.files[0]);
      },
    },
  };
}
