import YearlyReceipt from "@/components/works/4_YearlyReceipt/YearlyReceipt";
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { yearlyReceiptGuide } from "./guide";

export const metadata: Metadata = {
  title: `올해의 영수증 만들기`,
  description: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",

  icons: {
    icon: "/playground/yearly-receipt.svg",
  },

  openGraph: {
    title: `올해의 영수증 만들기`,
    description: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
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
    description: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    images: ["/playground/yearly-receipt.png"],
  },
};

export default function YearlyReceiptPage() {
  return (
    <ToolShell guide={yearlyReceiptGuide}>
      <main className="flex min-h-0 flex-1 justify-center overflow-hidden">
        <div className="h-full w-full max-w-2xl">
          <YearlyReceipt />
        </div>
      </main>
    </ToolShell>
  );
}
