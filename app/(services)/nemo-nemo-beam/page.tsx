import PixelArtMaker from "@/app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "네모네모빔",
  description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
  icons: {
    icon: "/playground/nemo-beam.svg",
  },

  openGraph: {
    title: `네모네모빔`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: [
      {
        url: "/playground/nemo-beam.png",
        alt: "네모네모빔",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `네모네모빔`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: ["/playground/nemo-beam.png"],
  },
};

export default function PixelArtMakerPage() {
  return (
    <main className="h-dvh w-full overflow-hidden p-4">
      <PixelArtMaker />
    </main>
  );
}
