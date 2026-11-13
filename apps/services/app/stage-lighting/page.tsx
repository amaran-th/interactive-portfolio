import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { stageLightingGuide } from "./guide";
import StageLightingLoader from "@/components/works/11_StageLighting/StageLightingLoader";

const DESCRIPTION =
  "무대에 인물·소품을 두고 조명기를 걸어 큐를 만들고, 객석 시점에서 페이드로 재생해 보는 3D 조명 연습 도구예요.";

export const metadata: Metadata = {
  title: "조명 연습실",
  description: DESCRIPTION,
  openGraph: { title: "조명 연습실", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "조명 연습실", description: DESCRIPTION },
};

export default function StageLightingPage() {
  return (
    <ToolShell guide={stageLightingGuide}>
      <main className="min-h-0 flex-1 overflow-hidden bg-shade text-ink">
        <StageLightingLoader />
      </main>
    </ToolShell>
  );
}
