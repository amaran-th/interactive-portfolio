import PixelArtMaker from "@/app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "픽셀아트 메이커",
  description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
  icons: {
    icon: "/playground/pixel-art-maker.svg",
  },

  openGraph: {
    title: `픽셀아트 메이커`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: [
      {
        url: "/playground/pixel-art-maker.png",
        alt: "픽셀아트 메이커",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `픽셀아트 메이커`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: ["/playground/pixel-art-maker.png"],
  },
};

export default function PixelArtMakerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-4xl">
        <PixelArtMaker />
      </div>
    </main>
  );
}
