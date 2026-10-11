import VisualNovelStudio from "@/components/works/2_VisualNovelStudio/VisualNovelStudio";
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { visualNovelStudioGuide } from "./guide";

export const metadata: Metadata = {
  title: "비주얼 노벨 스튜디오",
  description: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
  icons: {
    icon: "/playground/visual-novel-studio.svg",
  },

  openGraph: {
    title: `비주얼 노벨 스튜디오`,
    description: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
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
    description: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
    images: ["/playground/visual-novel-studio.png"],
  },
};

export default function VisualNovelStudioPage() {
  return (
    <ToolShell guide={visualNovelStudioGuide}>
      <main className="flex min-h-0 flex-1 justify-center overflow-hidden">
        <div className="h-full w-full max-w-2xl">
          <VisualNovelStudio />
        </div>
      </main>
    </ToolShell>
  );
}
