import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { assetSimulatorGuide } from "./guide";
import AssetSimulator from "@/components/works/6_AssetSimulator/AssetSimulator";

export const metadata: Metadata = {
  title: "자산 시뮬레이터",
  description: "내 작고 귀여운 돈, 잘 모이고 있나?",
  openGraph: {
    title: "자산 시뮬레이터",
    description: "내 작고 귀여운 돈, 잘 모이고 있나?",
  },
  twitter: {
    card: "summary_large_image",
    title: "자산 시뮬레이터",
    description: "내 작고 귀여운 돈, 잘 모이고 있나?",
  },
};

export default function AssetSimulatorPage() {
  return (
    <ToolShell guide={assetSimulatorGuide}>
      <main className="min-h-0 flex-1 overflow-hidden bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 text-gray-800">
        <AssetSimulator />
      </main>
    </ToolShell>
  );
}
