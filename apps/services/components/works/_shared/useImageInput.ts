"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { isTextEntryTarget } from "./imageInput";

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

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTextEntryTarget(e.target as HTMLInputElement | null)) return;
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
    // 드롭 영역(dropProps)이 이미 처리한 드롭은 defaultPrevented라 건너뛴다.
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.defaultPrevented || !e.dataTransfer?.files.length) return;
      e.preventDefault();
      load(e.dataTransfer.files[0]);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
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
