import VisualNovelStudio from "@/app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비주얼 노벨 스튜디오",
  description: "나만의 비주얼 노벨을 만들어보세요.",
  icons: {
    icon: "/playground/visual-novel-studio.svg",
  },

  openGraph: {
    title: `비주얼 노벨 스튜디오`,
    description: "나만의 비주얼 노벨을 만들어보세요.",
    images: [
      {
        url: "/playground/visual-novel-studio.png",
        alt: "비주얼 노벨 스튜디오",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `비주얼 노벨 스튜디오`,
    description: "나만의 비주얼 노벨을 만들어보세요.",
    images: ["/playground/visual-novel-studio.png"],
  },
};

export default function VisualNovelStudioPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-2xl">
        <VisualNovelStudio />
      </div>
    </main>
  );
}
