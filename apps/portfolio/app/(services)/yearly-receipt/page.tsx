import YearlyReceipt from "@/app/(portfolio)/playground/_sections/Works/4_YearlyReceipt/YearlyReceipt";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `올해의 영수증 만들기`,
  description: "올해의 목표 달성 현황을 나만의 영수증으로 만들어보세요~!",

  icons: {
    icon: "/playground/yearly-receipt.svg",
  },

  openGraph: {
    title: `올해의 영수증 만들기`,
    description: "올해의 목표 달성 현황을 나만의 영수증으로 만들어보세요~!",
    images: [
      {
        url: "/playground/yearly-receipt.png",
        alt: "올해의 영수증 만들기",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `올해의 영수증 만들기`,
    description: "올해의 목표 달성 현황을 나만의 영수증으로 만들어보세요~!",
    images: ["/playground/yearly-receipt.png"],
  },
};

export default function YearlyReceiptPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-2xl">
        <YearlyReceipt />
      </div>
    </main>
  );
}
