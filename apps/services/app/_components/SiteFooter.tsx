import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 콘텐츠 페이지(메인·개인정보처리방침) 푸터. 도구 페이지는 화면을 꽉 채우고
 * 스크롤하지 않으므로 대신 ToolShell 상단 바에 같은 링크를 둔다.
 */
export default function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="bg-point text-sm text-white">
      {/* children: 메인의 '이 사이트에 대해'처럼 페이지별 사이트 정보 */}
      {children && (
        <div className="mx-auto max-w-6xl px-5 pt-8">{children}</div>
      )}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-4 px-5 py-5">
        <nav aria-label="사이트 정보">
          <ul className="flex gap-5">
            <li>
              <Link
                href="/"
                className="font-medium text-white/80 transition-colors hover:text-white"
              >
                홈
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="font-medium text-white/80 transition-colors hover:text-white"
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
