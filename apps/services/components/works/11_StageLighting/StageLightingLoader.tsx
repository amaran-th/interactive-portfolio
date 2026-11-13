"use client";

import dynamic from "next/dynamic";

// three 번들을 라우트 셸과 분리하고, localStorage를 읽는 화면이라 SSR을 끈다.
const StageLighting = dynamic(() => import("./StageLighting"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#050507] text-sm text-white/60">
      무대를 준비하고 있어요…
    </div>
  ),
});

export default function StageLightingLoader() {
  return <StageLighting />;
}
