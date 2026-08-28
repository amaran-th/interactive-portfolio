import StellarForge from "@/app/(portfolio)/playground/_sections/Works/3_StellarForge/StellarForge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "별들은 굉장한 빛메이커이다",
  description:
    "별 내부의 핵융합 순서를 따라 수소부터 철까지 원소를 합성해보세요. 항성 핵합성 머지 퍼즐.",
  icons: {
    icon: "/playground/stellar-forge.svg",
  },

  openGraph: {
    title: `별들은 굉장한 빛메이커이다`,
    description:
      "별 내부의 핵융합 순서를 따라 수소부터 철까지 원소를 합성해보세요. 항성 핵합성 머지 퍼즐.",
    images: [
      {
        url: "/playground/stellar-forge.png",
        alt: "별들은 굉장한 빛메이커이다",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `별들은 굉장한 빛메이커이다`,
    description:
      "별 내부의 핵융합 순서를 따라 수소부터 철까지 원소를 합성해보세요. 항성 핵합성 머지 퍼즐.",
    images: ["/playground/stellar-forge.png"],
  },
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
