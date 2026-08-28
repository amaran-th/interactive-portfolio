"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 파일 선택·드래그드롭·클립보드 붙여넣기로 이미지를 불러오는 공통 로직 —
// ReferenceWindow(레퍼런스 창)와 트레이싱 이미지 추가 UI가 함께 쓴다.
// 불러온 이미지의 objectURL은 컴포넌트가 사라지거나 이 훅 인스턴스에서
// 새 이미지로 바뀔 때 스스로 정리한다.
export function useImageFileLoader(onLoaded: (image: HTMLImageElement) => void) {
  const [isDragOver, setIsDragOver] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const loadFile = useCallback(
    (file: File) => {
      const img = new Image();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      img.onload = () => onLoaded(img);
      img.src = url;
    },
    [onLoaded],
  );

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        loadFile(new File([blob], "clipboard-image", { type: imageType }));
        return;
      }
    } catch {
      // 클립보드 접근 실패 — 무시(파일 선택으로 대신 진행할 수 있음)
    }
  }, [loadFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) loadFile(file);
    },
    [loadFile],
  );

  return {
    loadFile,
    handleDrop,
    handlePasteFromClipboard,
    isDragOver,
    setIsDragOver,
  };
}
