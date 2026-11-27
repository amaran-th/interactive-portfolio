import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import AdSlot from "./AdSlot";
import GuideDialog from "./GuideDialog";
import ShellBackdrop from "./ShellBackdrop";
import ToolGuide, { type ToolGuideContent } from "./ToolGuide";

/**
 * 도구 페이지 공통 틀 — 상단 얇은 바(사이트 이동·사용 안내·개인정보처리방침)
 * 아래로 도구가 남은 화면을 꽉 채운다. 페이지 자체는 스크롤되지 않는다.
 * children은 도구를 감싼 <main>이며 `min-h-0 flex-1`로 남은 높이를 받아야 한다.
 */
export default function ToolShell({
  guide,
  lang = "ko",
  langPaths,
  children,
}: {
  guide: ToolGuideContent;
  /** 안내 드로어 언어(상단 바의 사이트 이동·개인정보처리방침은 한국어 그대로) */
  lang?: "ko" | "en";
  /** 언어판이 여럿인 도구만: 언어별 주소. 주면 상단 바에 한국어/English 선택기를 띄운다 */
  langPaths?: { ko: string; en: string };
  children: React.ReactNode;
}) {
  return (
    // 서비스 페이지는 사이트 기본 배경(하늘색) 대신 어두운 배경을 쓴다 — 글자색을 따로
    // 지정하지 않은 서비스의 흰 글자를 유지한다. 폭이 좁은 서비스의 양옆 여백은
    // ShellBackdrop이 서비스 자체 배경색으로 칠한다.
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 bg-neutral-900 px-3 text-white sm:px-4">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/"
            aria-label="전체 서비스 목록"
            title="전체 서비스 목록"
            className="flex shrink-0 items-center rounded-md p-1 transition-colors hover:bg-white/10"
          >
            <LayoutGrid className="size-4" strokeWidth={2.5} />
          </Link>
          <span aria-hidden className="text-neutral-600">
            /
          </span>
          <span className="truncate font-bold">{guide.name}</span>
        </p>
        <nav
          aria-label="서비스 정보"
          className="ml-auto flex shrink-0 items-center gap-3"
        >
          {langPaths && (
            <span
              role="group"
              aria-label={lang === "en" ? "Language" : "언어"}
              className="flex items-center rounded-full border border-white/20 p-0.5 text-xs font-bold"
            >
              {(
                [
                  ["ko", "한국어"],
                  ["en", "English"],
                ] as const
              ).map(([code, label]) => (
                <Link
                  key={code}
                  href={langPaths[code]}
                  hrefLang={code}
                  lang={code}
                  aria-label={label}
                  aria-current={lang === code ? "page" : undefined}
                  className={`rounded-full px-2.5 py-0.5 transition-colors ${
                    lang === code ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">{code.toUpperCase()}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
            </span>
          )}
          <Link
            href="/privacy"
            className="hidden text-xs font-medium text-neutral-400 transition-colors hover:text-white sm:inline"
          >
            개인정보처리방침
          </Link>
          <GuideDialog toolName={guide.name} lang={lang}>
            <ToolGuide content={guide} lang={lang} />
          </GuideDialog>
        </nav>
      </header>
      {/* 모바일 광고 칸 — 서비스 위에 덮지 않고 이 칸만큼 서비스 높이가 줄어든다.
          광고 단위 ID(NEXT_PUBLIC_ADSENSE_TOOL_SLOT)가 없으면 렌더하지 않는다. */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_TOOL_SLOT} />
      {children}
      <ShellBackdrop />
    </div>
  );
}
