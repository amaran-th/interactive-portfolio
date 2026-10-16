import type { Metadata } from "next";
import Link from "next/link";
import { activeCategories, toolsIn } from "@/lib/tools";
import CategoryChips from "./_components/CategoryChips";
import SiteFooter from "./_components/SiteFooter";
import ToolGrid from "./_components/ToolGrid";
import ToolSearch from "./_components/ToolSearch";

export const metadata: Metadata = {
  title: "Amaranth Site",
  description: "간단 웹 서비스 모음",
};

export default function Home() {
  return (
    <div className="min-h-dvh bg-shade text-ink">
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-12">
        <header>
          <h1 className="text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
            Amaranth Site
          </h1>
          <p className="mt-1.5 text-sm text-ink/80">간단 웹서비스 모음</p>
        </header>

        <div className="mt-6">
          <ToolSearch>
            <div className="mt-4">
              <CategoryChips />
            </div>
            <div className="mt-6 flex flex-col gap-8">
              {activeCategories().map((c) => (
                <section key={c.id} aria-labelledby={`category-${c.id}`}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h2
                      id={`category-${c.id}`}
                      className="font-bold text-point"
                    >
                      {c.label}
                    </h2>
                    <Link
                      href={`/category/${c.id}`}
                      className="text-xs font-bold text-main hover:text-point"
                    >
                      전체 보기 →
                    </Link>
                  </div>
                  <ToolGrid tools={toolsIn(c.id)} />
                </section>
              ))}
            </div>
          </ToolSearch>
        </div>

        <section
          aria-labelledby="about-title"
          className={`mt-10 max-w-3xl p-2 break-keep`}
        >
          <h2 id="about-title" className="font-bold text-point">
            이 사이트에 대해
          </h2>
          <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              본 페이지는 웹 서비스를 제공하고 있습니다. 별도의 설치나 회원가입
              절차를 필요로 하지 않습니다.
            </p>
            <p>
              서비스에 저장되는 데이터는 사용자의 브라우저에 저장됩니다. 사용
              방법과 자주 묻는 질문은 각 서비스 화면 위쪽의 &lsquo;사용
              안내&rsquo; 버튼을 누르면 볼 수 있습니다.
            </p>
            <p>
              사이트는 개발자 개인이 직접 만들고 운영합니다. 다른 작업물은{" "}
              <a
                href="https://amaranth-portfolio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-point underline decoration-main decoration-2 underline-offset-4 hover:text-main"
              >
                포트폴리오
              </a>
              에서 볼 수 있습니다.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
