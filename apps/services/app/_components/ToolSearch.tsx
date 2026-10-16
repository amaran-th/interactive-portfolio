"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { normalizeQuery, searchTools } from "@/lib/tools";
import { STICKER } from "./ToolCard";
import ToolGrid from "./ToolGrid";

/** 검색어가 없으면 서버가 그린 children(카테고리 섹션)을, 있으면 결과 그리드를 보여 준다. */
export default function ToolSearch({ children }: { children: ReactNode }) {
  // input에 보이는 값과 검색에 쓰는 값을 나눈다. 한글 조합 중에는 검색값을 갱신하지 않는다.
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searching = normalizeQuery(searchQuery) !== "";
  const results = searching ? searchTools(searchQuery) : [];

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
          onChange={(e) => {
            setQuery(e.target.value);
            if (!(e.nativeEvent as InputEvent).isComposing) {
              setSearchQuery(e.target.value);
            }
          }}
          onCompositionEnd={(e) => setSearchQuery(e.currentTarget.value)}
          placeholder="도구 검색 (예: 픽셀, 목표, 게임)"
          autoComplete="off"
          className={`w-full py-2.5 pr-3 pl-9 text-base sm:text-sm text-ink placeholder:text-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${STICKER}`}
        />
      </div>

      <p
        aria-live="polite"
        className={searching ? "mt-6 mb-3 text-sm break-all text-ink/80" : "sr-only"}
      >
        {!searching
          ? ""
          : results.length > 0
            ? `검색 결과 ${results.length}개`
            : `'${searchQuery.trim()}'에 맞는 도구가 없습니다.`}
      </p>
      {searching ? (
        results.length > 0 && <ToolGrid tools={results} />
      ) : (
        children
      )}
    </>
  );
}
