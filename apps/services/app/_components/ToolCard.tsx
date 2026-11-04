import Image from "next/image";
import Link from "next/link";
import type { Tool } from "@/lib/tools";
import ServiceThumbFallback from "./ServiceThumbFallback";

// 굵은 외곽선 + 어긋난 단색 그림자 — 썸네일의 손그림 톤에 맞춘 "스티커" 스타일
export const STICKER =
  "rounded-lg border-2 border-point bg-white shadow-[3px_3px_0_0_var(--color-point)]";

// 큰 카드 상자 없이 썸네일 타일만 스티커로 띄우고 글자는 바탕에 바로 놓는다(앱 아이콘처럼).
export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group grid grid-cols-[4.5rem_1fr] gap-x-3 sm:flex sm:flex-col"
    >
      <div
        className={`relative aspect-square overflow-hidden bg-shade transition-[translate,rotate,box-shadow] duration-150 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:-rotate-2 group-hover:shadow-[1px_1px_0_0_var(--color-point)] ${STICKER}`}
      >
        {tool.thumb ? (
          <Image
            src={tool.thumb}
            alt=""
            fill
            sizes="(min-width: 640px) 180px, 72px"
            className="object-cover"
          />
        ) : (
          <ServiceThumbFallback title={tool.title} />
        )}
        {/* 설명: 마우스가 있는 데스크톱에서만 hover·키보드 포커스 때 썸네일 위에 띄운다 */}
        <p className="hidden sm:pointer-fine:absolute sm:pointer-fine:inset-0 sm:pointer-fine:flex sm:pointer-fine:items-center sm:pointer-fine:bg-point/90 sm:pointer-fine:p-3 sm:pointer-fine:text-[11px] sm:pointer-fine:leading-snug sm:pointer-fine:text-white sm:pointer-fine:opacity-0 sm:pointer-fine:transition-opacity sm:pointer-fine:group-hover:opacity-100 sm:pointer-fine:group-focus-visible:opacity-100">
          {tool.about}
        </p>
      </div>
      <div className="min-w-0 self-center sm:mt-2.5 sm:self-auto">
        <p className="font-bold text-point group-hover:underline group-hover:underline-offset-4">
          {tool.title}
        </p>
        <p className="mt-0.5 text-xs font-medium text-main">{tool.desc}</p>
      </div>
      {/* 모바일·터치 기기: 설명을 아래 전체 폭에 */}
      <p className="col-span-2 mt-2 text-[13px] leading-relaxed text-ink/85 sm:pointer-fine:hidden sm:text-xs">
        {tool.about}
      </p>
    </Link>
  );
}
