import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { activeCategories, getCategory, toolsIn } from "@/lib/tools";
import CategoryChips from "../../_components/CategoryChips";
import SiteFooter from "../../_components/SiteFooter";
import ToolGrid from "../../_components/ToolGrid";

type Props = { params: Promise<{ id: string }> };

// 도구가 있는 카테고리만 만든다. 나머지 id는 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return activeCategories().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = getCategory(id);
  if (!category) return {};
  return {
    title: `${category.label} 도구`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  const category = getCategory(id);
  if (!category) notFound();
  const tools = toolsIn(category.id);
  if (tools.length === 0) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink">
      <header className="border-b-2 border-point bg-shade">
        <div className="mx-auto max-w-6xl px-5 pt-8 pb-8">
          <Link
            href="/"
            className="text-xs font-bold text-point/70 hover:text-point"
          >
            ← 전체 도구
          </Link>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
            {category.label} 도구
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm break-keep text-ink/80">
            {category.description}
          </p>
          <div className="mt-6">
            <CategoryChips current={category.id} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-12">
        <section aria-label={`${category.label} 도구 목록`}>
          <ToolGrid tools={tools} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
