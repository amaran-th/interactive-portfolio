"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { normalizeQuery, searchTools } from "@/lib/tools";
import { STICKER } from "./ToolCard";
import ToolGrid from "./ToolGrid";

/** 검색어가 없으면 서버가 그린 children(카테고리 섹션)을, 있으면 결과 그리드를 보여 준다. */
export default function ToolSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const searching = normalizeQuery(query) !== "";
  const results = searching ? searchTools(query) : [];

  return (
    <>
      <div className="relative max-w-md">
        <label htmlFor="tool-search" className="sr-only">
          도구 검색
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-point"
        />
        <input
          id="tool-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="도구 검색 (예: 픽셀, 목표, 게임)"
          autoComplete="off"
          className={`w-full py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${STICKER}`}
        />
      </div>

      {searching ? (
        <div className="mt-6">
          <p aria-live="polite" className="mb-3 text-sm text-ink/80">
            {results.length > 0
              ? `검색 결과 ${results.length}개`
              : `'${query.trim()}'에 맞는 도구가 없습니다.`}
          </p>
          {results.length > 0 && <ToolGrid tools={results} />}
        </div>
      ) : (
        children
      )}
    </>
  );
}
