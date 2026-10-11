import KnitMuffler from "@/components/works/1_KnitMuffler/KnitMuffler";
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { knitMufflerGuide } from "./guide";

export const metadata: Metadata = {
  title: "뜨개뜨개",
  description: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",

  icons: {
    icon: "/playground/knit-muffler.svg",
  },

  openGraph: {
    title: "뜨개뜨개",
    description: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",
    images: [
      {
        url: "/playground/knit-muffler.png",
        alt: "뜨개뜨개 미리보기 이미지",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "뜨개뜨개",
    description: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",
    images: ["/playground/knit-muffler.png"],
  },
};

export default function KnitMufflerPage() {
  return (
    <ToolShell guide={knitMufflerGuide}>
      <main className="flex min-h-0 flex-1 justify-center overflow-hidden text-stone-900">
        <div className="h-full w-full max-w-5xl">
          <KnitMuffler />
        </div>
      </main>
    </ToolShell>
  );
}
