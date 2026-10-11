import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import AdSlot from "./AdSlot";
import GuideDialog from "./GuideDialog";
import ToolGuide, { type ToolGuideContent } from "./ToolGuide";

/**
 * 도구 페이지 공통 틀 — 상단 얇은 바(사이트 이동·사용 안내·개인정보처리방침)
 * 아래로 도구가 남은 화면을 꽉 채운다. 페이지 자체는 스크롤되지 않는다.
 * children은 도구를 감싼 <main>이며 `min-h-0 flex-1`로 남은 높이를 받아야 한다.
 */
export default function ToolShell({
  guide,
  children,
}: {
  guide: ToolGuideContent;
  children: React.ReactNode;
}) {
  return (
    // 서비스 페이지는 사이트 기본 배경(하늘색) 대신 어두운 배경을 쓴다 — 폭이 좁은
    // 서비스의 양옆 여백과, 글자색을 따로 지정하지 않은 서비스의 흰 글자를 유지한다.
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
          <Link
            href="/privacy"
            className="text-xs font-medium text-neutral-400 transition-colors hover:text-white"
          >
            개인정보처리방침
          </Link>
          <GuideDialog toolName={guide.name}>
            <ToolGuide content={guide} />
          </GuideDialog>
        </nav>
      </header>
      {/* 모바일 광고 칸 — 서비스 위에 덮지 않고 이 칸만큼 서비스 높이가 줄어든다.
          광고 단위 ID(NEXT_PUBLIC_ADSENSE_TOOL_SLOT)가 없으면 렌더하지 않는다. */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_TOOL_SLOT} />
      {children}
    </div>
  );
}
