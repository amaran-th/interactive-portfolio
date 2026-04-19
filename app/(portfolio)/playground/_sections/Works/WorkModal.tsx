"use client";

import { CalendarRange, ExternalLink, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkItem } from "./Work";

const WORK_MODAL_THEME = "from-[#2a2c32] via-[#3a3d45] to-[#575b66]";

interface WorkModalProps {
  works: WorkItem[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkModal({
  works,
  selectedIndex,
  onNavigate,
  isOpen,
  onClose,
}: WorkModalProps) {
  const selected = works[selectedIndex];
  const [mobileView, setMobileView] = useState<"description" | "content">(
    "description",
  );

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileView("description");
  }, [isOpen, selectedIndex]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isOpen ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
          backdropFilter: isOpen ? "blur(8px)" : "blur(0px)",
          transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />
      <div
        className={`relative h-full flex items-center justify-center transition-all duration-300
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={onClose}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden bg-gray-900 md:h-[90vh] md:w-[90vw] md:rounded-xl md:border md:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`bg-linear-to-br ${WORK_MODAL_THEME} shrink-0 px-4 py-4 flex flex-col items-center`}
          >
            <div className="flex gap-1 items-center">
              <button
                onClick={() => onNavigate(selectedIndex - 1)}
                disabled={selectedIndex === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ‹
              </button>
              {works.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(i)}
                  className="p-1 flex items-center justify-center rounded-full hover:bg-white/20 transition-all disabled:cursor-not-allowed"
                >
                  <span
                    className={`rounded-full size-1.5 block transition-colors ${
                      i === selectedIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                </button>
              ))}
              <button
                onClick={() => onNavigate(selectedIndex + 1)}
                disabled={selectedIndex === works.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ›
              </button>
            </div>
            <div className="flex justify-center items-center gap-2">
              <h4 className="text-white text-center text-2xl font-bold">
                {selected.title}
              </h4>
              {selected.path && (
                <Link
                  href={selected.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink
                    className="inline-block opacity-60 hover:opacity-80"
                    size={20}
                  />
                </Link>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2 border-b border-white/10 bg-black/20 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("description")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "description"
                  ? "bg-white text-gray-900"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              설명
            </button>
            <button
              type="button"
              onClick={() => setMobileView("content")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "content"
                  ? "bg-white text-gray-900"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              결과물
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-gray-300 md:flex-row md:divide-x md:divide-gray-800">
            <div
              className={`min-h-[40dvh] h-full shrink-0 border-b border-gray-800 md:min-h-0 md:w-[calc(80vh-64px)] md:border-b-0 ${
                mobileView === "content" ? "block" : "hidden md:block"
              }`}
            >
              {selected.content}
            </div>
            <div
              className={`flex-1 overflow-y-auto px-5 py-4 ${
                mobileView === "description" ? "block" : "hidden md:block"
              }`}
            >
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-4">
                {selected.period ? (
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                      제작 기간
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-gray-200">
                      <CalendarRange className="h-4 w-4 text-gray-500" />
                      {selected.period}
                    </p>
                  </div>
                ) : null}

                {selected.platforms?.length ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                      지원 플랫폼
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-gray-200"
                        >
                          {platform === "mobile" ? (
                            <Smartphone className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Monitor className="h-4 w-4 text-gray-500" />
                          )}
                          {platform === "mobile" ? "모바일" : "PC"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="prose prose-invert text-pretty whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-sm text-white/70 transition-colors hover:bg-black/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
