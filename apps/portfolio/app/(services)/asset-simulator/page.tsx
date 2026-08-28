import type { Metadata } from "next";
import AssetSimulator from "@/app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator";

export const metadata: Metadata = {
  title: "자산 시뮬레이터",
  description:
    "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  openGraph: {
    title: "자산 시뮬레이터",
    description:
      "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "자산 시뮬레이터",
    description:
      "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  },
};

export default function AssetSimulatorPage() {
  return (
    <main className="h-dvh overflow-hidden bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 text-gray-800">
      <AssetSimulator />
    </main>
  );
}
