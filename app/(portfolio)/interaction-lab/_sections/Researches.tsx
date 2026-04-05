"use client";

import { ChevronDown, ExternalLink, FileText, Link2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { researches } from "./data";

export default function Researches() {
  const [openId, setOpenId] = useState<string>(researches[0].id ?? "");

  return (
    <section className="space-y-4">
      {researches.map((research) => {
        const isOpen = openId === research.id;

        return (
          <article
            key={research.id}
            className={`overflow-hidden rounded-3xl border shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-colors ${
              isOpen
                ? "border-white/15 bg-white/[0.08]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setOpenId((current) =>
                  current === research.id ? "" : research.id,
                )
              }
              className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] sm:px-6 sm:py-5"
              aria-expanded={isOpen}
            >
              <div
                className={`relative h-18 w-22 shrink-0 overflow-hidden rounded-2xl border bg-gray-900 transition-colors sm:h-20 sm:w-28 ${
                  isOpen ? "border-white/20" : "border-white/10"
                }`}
              >
                {research.thumbnail ? (
                  <Image
                    src={research.thumbnail}
                    alt={research.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-end bg-linear-to-br ${research.accentClassName} p-3`}
                  >
                    <span className="text-base font-semibold tracking-[0.18em] text-gray-950/70 sm:text-lg">
                      {research.thumbnailLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">
                      {research.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-400">
                      {research.subtitle}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 md:hidden">
                    {research.period}
                  </p>
                  <p className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 md:block">
                    {research.period}
                  </p>
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
                <div className="border-t border-white/15 bg-black/35 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-6 lg:bg-black/25">
                  <div className="divide-y divide-white/10 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-6 lg:divide-y-0">
                    <div className="space-y-5 py-0 lg:space-y-5">
                      <div className="space-y-2 pb-5 lg:pb-0">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                          Summary
                        </p>
                        <p className="leading-7 text-gray-300">
                          {research.summary}
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-white/10 py-5 lg:border-t-0 lg:py-0">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                          Findings
                        </p>
                        <ul className="space-y-2 text-gray-300">
                          {research.findings.map((finding) => (
                            <li
                              key={finding}
                              className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/30 lg:rounded-2xl lg:bg-white/[0.04] lg:px-4 lg:py-3 lg:pl-4 lg:before:hidden"
                            >
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="grid gap-0 sm:grid-cols-1 lg:grid-cols-1 lg:gap-4">
                      <section className="space-y-2 py-5 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:p-4 lg:py-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                          Methods
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-gray-300">
                          {research.methods.map((method) => (
                            <li
                              key={method}
                              className="relative pl-4 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/30"
                            >
                              {method}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="space-y-2 border-t border-white/10 py-5 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:p-4 lg:py-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                          Next Steps
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-gray-300">
                          {research.nextSteps.map((step) => (
                            <li
                              key={step}
                              className="relative pl-4 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/30"
                            >
                              {step}
                            </li>
                          ))}
                        </ul>
                      </section>

                      {research.references?.length ? (
                        <section className="space-y-2 border-t border-white/10 py-5 sm:col-span-1 lg:col-span-1 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/20 lg:p-4 lg:py-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                            Documents & References
                          </p>
                          <div className="mt-3 flex flex-col gap-0 lg:flex-wrap lg:flex-row lg:gap-2">
                            {research.references.map((reference) => (
                              <a
                                key={reference.label}
                                href={reference.href}
                                target={
                                  reference.href.startsWith("http")
                                    ? "_blank"
                                    : undefined
                                }
                                rel={
                                  reference.href.startsWith("http")
                                    ? "noreferrer"
                                    : undefined
                                }
                                className="inline-flex items-center justify-between gap-2 py-3 text-sm text-gray-200 transition-colors hover:text-white lg:rounded-full lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-3 lg:hover:bg-white/[0.08]"
                              >
                                <span className="inline-flex items-center gap-2">
                                  {reference.type === "document" ? (
                                    <FileText className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Link2 className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span>{reference.label}</span>
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                              </a>
                            ))}
                          </div>
                        </section>
                      ) : null}
                    </div>
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
