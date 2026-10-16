import Image from "next/image";
import Link from "next/link";
import { getCategory, type Tool } from "@/lib/tools";
import ServiceThumbFallback from "./ServiceThumbFallback";

// 굵은 외곽선 + 어긋난 단색 그림자 — 썸네일의 손그림 톤에 맞춘 "스티커" 카드
export const STICKER =
  "rounded-lg border-2 border-point bg-white shadow-[3px_3px_0_0_var(--color-point)]";

export default function ToolCard({ tool }: { tool: Tool }) {
  const category = getCategory(tool.category);
  return (
    <Link
      href={`/${tool.slug}`}
      className={`group relative grid h-full grid-cols-[auto_1fr] overflow-hidden sm:flex sm:flex-col transition-[translate,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_var(--color-point)] ${STICKER}`}
    >
      <div className="relative m-3 mr-0 aspect-square w-20 shrink-0 self-start overflow-hidden border-2 border-point bg-shade sm:m-0 sm:w-auto sm:self-stretch sm:border-0 sm:border-b-2">
        {tool.thumb ? (
          <Image
            src={tool.thumb}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 80px"
            className="object-cover"
          />
        ) : (
          <ServiceThumbFallback title={tool.title} />
        )}
      </div>
      {/* 모바일: 썸네일 오른쪽에 유형·이름·한 줄 소개, 설명은 그 아래 전체 폭
          sm 이상: 썸네일 아래로 모두 세로로 쌓는다 */}
      <div className="flex flex-col justify-center p-3 sm:justify-start sm:px-3 sm:pt-3 sm:pb-0 sm:pointer-fine:pb-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`shrink-0 rounded-full border-[1.5px] border-point px-1.5 py-px text-[11px] font-bold text-point ${category?.badgeClass ?? ""}`}
          >
            {category?.label}
          </span>
          <p className="min-w-0 font-bold text-point">{tool.title}</p>
        </div>
        <p className="mt-0.5 text-xs font-medium text-main">{tool.desc}</p>
      </div>
      {/* 설명: 모바일·터치 기기는 카드 아래에, 마우스가 있는 데스크톱은
          썸네일 위 오버레이로 hover·키보드 포커스 때만 보인다(sm 이상 + 정밀 포인터) */}
      <p className="col-span-2 px-3 pb-3 text-[13px] leading-relaxed text-ink/85 sm:mt-1.5 sm:px-3 sm:pb-3 sm:pointer-fine:absolute sm:pointer-fine:inset-x-0 sm:pointer-fine:top-0 sm:pointer-fine:m-0 sm:pointer-fine:flex sm:pointer-fine:aspect-square sm:pointer-fine:items-center sm:pointer-fine:bg-point/90 sm:pointer-fine:p-4 sm:pointer-fine:text-xs sm:pointer-fine:text-white sm:pointer-fine:opacity-0 sm:pointer-fine:transition-opacity sm:pointer-fine:group-hover:opacity-100 sm:pointer-fine:group-focus-visible:opacity-100">
        {tool.about}
      </p>
    </Link>
  );
}
