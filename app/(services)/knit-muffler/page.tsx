import KnitMuffler from "@/app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "뜨개뜨개",
  description: "도안을 따라 뜨거나 자유롭게 색을 골라 작품을 완성하는 인터랙션",
};

export default function KnitMufflerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden text-stone-900">
      <div className="h-full w-full max-w-3xl">
        <KnitMuffler />
      </div>
    </main>
  );
}
