import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "./_components/SiteFooter";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
};

// Next 기본 404는 자체 흰 배경을 깔아 사이트 배경과 어긋나므로 직접 그린다.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-shade text-ink">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-5 py-16">
        <p className="text-sm font-bold text-main">404</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-point">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-ink/80">
          주소가 바뀌었거나 없는 페이지입니다.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg border-2 border-point bg-white px-4 py-2 text-sm font-bold text-point shadow-[3px_3px_0_0_var(--color-point)] transition-[translate,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_var(--color-point)]"
        >
          서비스 목록으로
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
