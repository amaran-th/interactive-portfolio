import type { Metadata } from "next";
import Link from "next/link";
import { activeCategories, TOOLS, toolsIn } from "@/lib/tools";
import SiteFooter from "./_components/SiteFooter";
import ToolGrid from "./_components/ToolGrid";
import {
  ToolSearchInput,
  ToolSearchProvider,
  ToolSearchResults,
} from "./_components/ToolSearch";

export const metadata: Metadata = {
  title: "Amaranth Site",
  description: "설치·가입 없이 브라우저에서 바로 여는 작은 도구 모음",
};

// 카테고리마다 한 줄: 왼쪽 제목 칸 + 오른쪽 도구 목록,
// 줄 사이는 옅은 구분선. 모바일에서는 제목이 위로 올라간다.
const ROW = "py-6 sm:grid sm:grid-cols-[8rem_1fr] sm:gap-6";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink">
      <ToolSearchProvider>
        {/* 소개·검색만 하늘색 띠에 두고 목록은 물방울 무늬 흰 바탕에 놓는다 */}
        <header className="border-b-2 border-point bg-shade">
          <div className="mx-auto max-w-6xl px-5 pt-8 pb-8">
            <h1 className="text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
              Amaranth Site
            </h1>
            <p className="mt-1.5 text-sm break-keep text-ink/80">
              브라우저에서 바로 쓰는 작은 도구 {TOOLS.length}개
            </p>
            <div className="mt-6">
              <ToolSearchInput />
            </div>
          </div>
        </header>

        {/* 물방울 점무늬는 기본 썸네일(ServiceThumbFallback)의 배경과 같은 무늬다 */}
        <div className="flex-1 bg-[radial-gradient(var(--color-shade)_2.5px,transparent_2.5px)] bg-size-[22px_22px]">
          <main className="mx-auto w-full max-w-6xl px-5 pb-12">
            <ToolSearchResults>
              <div className="divide-y-2 divide-dashed divide-point/20">
                {activeCategories().map((c) => (
                  <section
                    key={c.id}
                    aria-labelledby={`category-${c.id}`}
                    className={ROW}
                  >
                    <h2 id={`category-${c.id}`} className="mb-4 sm:mb-0">
                      {/* 카테고리 색 스티커를 살짝 기울여 붙인다 */}
                      <Link
                        href={`/category/${c.id}`}
                        className={`inline-flex -rotate-2 items-center gap-1.5 rounded-full border-2 border-point py-0.5 pr-1 pl-3 text-sm font-bold text-point shadow-[2px_2px_0_0_var(--color-point)] transition-transform hover:rotate-0 ${c.badgeClass}`}
                      >
                        {c.label}
                        <span className="rounded-full bg-white px-1.5 text-[11px] tabular-nums">
                          {toolsIn(c.id).length}
                        </span>
                      </Link>
                    </h2>
                    <ToolGrid
                      tools={toolsIn(c.id)}
                      cols="sm:grid-cols-3 lg:grid-cols-5"
                    />
                  </section>
                ))}
              </div>
            </ToolSearchResults>
          </main>
        </div>
      </ToolSearchProvider>
      <SiteFooter>
        <section aria-labelledby="about-title" className="max-w-2xl break-keep">
          <h2 id="about-title" className="font-bold">
            이 사이트에 대해
          </h2>
          <div className="mt-2 flex flex-col gap-1.5 leading-relaxed text-white/80">
            <p>
              설치도 가입도 필요 없어요. 만든 건 이 브라우저에만 저장되고 서버로
              가지 않아요.
            </p>
            <p>
              쓰는 법이 궁금하면 각 도구 위쪽의 &lsquo;사용 안내&rsquo;를 눌러
              보세요.
            </p>
            <p>
              혼자 만들고 운영하는 사이트예요. 다른 작업은{" "}
              <a
                href="https://amaranth-portfolio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white underline decoration-white/40 decoration-2 underline-offset-4 hover:decoration-white"
              >
                포트폴리오
              </a>
              에 있어요.
            </p>
          </div>
        </section>
      </SiteFooter>
    </div>
  );
}
