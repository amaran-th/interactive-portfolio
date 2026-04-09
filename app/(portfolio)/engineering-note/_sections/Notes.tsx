"use client";

import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { engineeringEntries } from "./data";

export default function Notes() {
  const sorted = [...engineeringEntries].sort((a, b) => b.date.localeCompare(a.date));
  const [openId, setOpenId] = useState<string>(sorted[0]?.id ?? "");

  return (
    <section className="space-y-4">
      {sorted.map((entry) => {
        const isOpen = openId === entry.id;

        return (
          <article
            key={entry.id}
            className={`overflow-hidden rounded-3xl border bg-linear-to-br shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-colors ${
              isOpen
                ? "border-white/15 from-stone-400/10 via-transparent to-white/3"
                : "border-white/10 from-stone-400/8 via-transparent to-white/2"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setOpenId((current) => (current === entry.id ? "" : entry.id))
              }
              className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/3 sm:gap-4 sm:px-6 sm:py-5"
              aria-expanded={isOpen}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border sm:h-12 sm:w-12 ${
                  isOpen
                    ? "border-white/15 bg-white/8"
                    : "border-white/10 bg-white/6"
                }`}
              >
                <span className="text-xs font-semibold tracking-[0.18em] text-stone-200 sm:text-sm">
                  ENG
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">
                      {entry.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-400">
                      {entry.subtitle}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 md:hidden">
                      {entry.date}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 md:block">
                    {entry.date}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-gray-300 sm:px-3 sm:text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 md:flex">
                <ChevronDown
                  className={`h-4 w-4 text-gray-300 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-white/15 bg-black/35 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:bg-black/25">
                  <section className="divide-y divide-white/10 lg:divide-y-0 lg:space-y-4 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:p-5">
                    <div className="space-y-2 pb-5 lg:border-b-0 lg:pb-0">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                        Problem
                      </p>
                      <p className="leading-7 text-gray-300">{entry.problem}</p>
                    </div>

                    <div className="space-y-2 py-5 lg:py-0">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                        Approach
                      </p>
                      <ul className="space-y-2 text-gray-300">
                        {entry.approach.map((item) => (
                          <li
                            key={item}
                            className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/30 lg:rounded-2xl lg:bg-white/4 lg:px-4 lg:py-3 lg:pl-4 lg:before:hidden"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <div className="divide-y divide-white/10 lg:divide-y-0 lg:space-y-4">
                    <section className="space-y-2 py-5 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:p-4 lg:py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                        Outcome
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-300">
                        {entry.outcome.map((item) => (
                          <li
                            key={item}
                            className="relative pl-4 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/30"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </section>

                    {entry.links?.length ? (
                      <section className="space-y-2 pt-5 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/4 lg:p-4 lg:pt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                          Linked Materials
                        </p>
                        <div className="mt-3 space-y-2">
                          {entry.links.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target={
                                link.href.startsWith("http")
                                  ? "_blank"
                                  : undefined
                              }
                              rel={
                                link.href.startsWith("http")
                                  ? "noreferrer"
                                  : undefined
                              }
                              className="flex items-center justify-between py-3 text-sm text-gray-200 transition-colors hover:text-white lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:px-4 lg:hover:bg-black/30"
                            >
                              <span className="inline-flex items-center gap-2">
                                {link.type === "blog" ? (
                                  <BookOpen className="h-4 w-4 text-stone-300" />
                                ) : link.type === "document" ? (
                                  <FileText className="h-4 w-4 text-stone-300" />
                                ) : (
                                  <Link2 className="h-4 w-4 text-stone-300" />
                                )}
                                {link.label}
                              </span>
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </a>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
