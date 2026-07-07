import StellarForge from "@/app/(portfolio)/playground/_sections/Works/3_StellarForge/StellarForge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "별의 연금술",
  description:
    "별 내부의 핵융합 순서를 따라 수소부터 철까지 원소를 합성해보세요. 항성 핵합성 머지 퍼즐.",
};

export default function StellarForgePage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-2xl">
        <StellarForge />
      </div>
    </main>
  );
}
