"use client";

import { useCallback, useId, useRef, useState } from "react";

type CodeTab = "html" | "css" | "js";

interface InteractionSectionProps {
  title: string;
  description?: string;
  html?: string;
  css?: string;
  jsCode?: string;
}

export default function InteractionSection({
  title,
  description,
  html,
  css,
  jsCode,
}: InteractionSectionProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [copied, setCopied] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const scopeId = useId();

  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (container && jsCode) {
        try {
          const fn = new Function("container", jsCode);
          const cleanup = fn(container);
          if (typeof cleanup === "function") cleanupRef.current = cleanup;
        } catch (e) {
          console.error("Interaction JS error:", e);
        }
      }
    },
    [jsCode],
  );

  const tabs: { key: CodeTab; label: string; code?: string }[] = [
    { key: "html", label: "HTML", code: html },
    { key: "css", label: "CSS", code: css },
    { key: "js", label: "JS", code: jsCode },
  ];

  const availableTabs = tabs.filter((t) => t.code);
  const activeCode = tabs.find((t) => t.key === codeTab)?.code?.trim() ?? "";

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold relative group cursor-default">
          {title}
          {description && (
            <div className="absolute left-0 top-full mt-2 w-64 p-3 rounded-lg bg-gray-800 border border-white/10 text-xs text-gray-300 font-normal leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
              {description}
            </div>
          )}
        </h2>
        <button
          onClick={() => setView((v) => (v === "preview" ? "code" : "preview"))}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-colors"
        >
          {view === "code" ? "Preview" : "Code"}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-70 max-h-70 overflow-y-auto flex flex-col">
        {view === "code" ? (
          <div className="flex-1 flex flex-col">
            {/* Tabs + Copy */}
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex gap-1">
                {availableTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCodeTab(t.key)}
                    className={`text-xs px-3 py-1 rounded-t transition-colors ${
                      codeTab === t.key
                        ? "bg-white/10 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {/* Code */}
            <pre className="flex-1 px-5 pb-5 pt-3 text-xs text-gray-300 overflow-auto font-mono leading-relaxed whitespace-pre-wrap">
              <code>{activeCode}</code>
            </pre>
          </div>
        ) : (
          <div data-scope={scopeId} className="flex-1">
            <style>{`@scope ([data-scope="${scopeId}"]) { ${css} }`}</style>
            <div
              ref={containerRef}
              className="w-full h-full"
              dangerouslySetInnerHTML={html ? { __html: html } : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}
