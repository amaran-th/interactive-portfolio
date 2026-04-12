import KnitMuffler from "@/app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "뜨개뜨개",
  description: "도안을 따라 뜨거나 자유롭게 색을 골라 작품을 완성하는 인터랙션",

  icons: {
    icon: "/playground/knit-muffler.svg",
  },

  openGraph: {
    title: "뜨개뜨개",
    description:
      "도안을 따라 뜨거나 자유롭게 색을 골라 작품을 완성하는 인터랙션",
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
    description:
      "도안을 따라 뜨거나 자유롭게 색을 골라 작품을 완성하는 인터랙션",
    images: ["/playground/knit-muffler.png"],
  },
};

export default function KnitMufflerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden text-stone-900">
      <div className="h-full w-full max-w-5xl">
        <KnitMuffler />
      </div>
    </main>
  );
}
