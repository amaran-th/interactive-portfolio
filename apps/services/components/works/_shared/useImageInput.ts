"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export type ImageInput = {
  image: HTMLImageElement | null;
  error: string | null;
  dragging: boolean;
  load: (file: File | null | undefined) => void;
  dropProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
};

// 파일 선택·끌어다 놓기·붙여넣기(Ctrl/⌘+V)로 이미지 한 장을 받는다.
// 붙여넣기는 페이지 전체에서 받되, 글자 입력칸에 붙여 넣는 건 건드리지 않는다.
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

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        load(file);
      } else {
        setError("붙여 넣은 내용에 이미지가 없어요");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [load]);

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
