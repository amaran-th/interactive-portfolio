import RoughVisualNovelMaker from "@/app/(portfolio)/playground/_sections/Works/2_RoughVisualNovelMaker/RoughVisualNovelMaker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비주얼 노벨 메이커",
  description: "캐릭터와 배경을 업로드하고 나만의 비주얼 노벨을 만들어보세요.",
};

export default function RoughVisualNovelMakerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-2xl">
        <RoughVisualNovelMaker />
      </div>
    </main>
  );
}
