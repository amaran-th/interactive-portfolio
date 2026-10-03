import Link from "next/link";

/** 모든 페이지 공통 푸터 — 루트 layout에서 렌더한다. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-gray-950 text-sm text-gray-400">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <p>amaranth</p>
        <nav aria-label="사이트 정보">
          <ul className="flex gap-5">
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                홈
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="transition-colors hover:text-white"
              >
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
