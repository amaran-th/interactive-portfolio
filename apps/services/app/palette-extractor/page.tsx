import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { paletteExtractorGuide } from "./guide";
import PaletteExtractor from "@/components/works/9_PaletteExtractor/PaletteExtractor";

const DESCRIPTION =
  "이미지를 넣으면 많이 쓰인 색을 3~12개 골라 비율과 함께 보여 주고, HEX·CSS 변수·JSON으로 복사해요.";

export const metadata: Metadata = {
  title: "팔레트 추출기",
  description: DESCRIPTION,
  openGraph: { title: "팔레트 추출기", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "팔레트 추출기", description: DESCRIPTION },
};

export default function PaletteExtractorPage() {
  return (
    <ToolShell guide={paletteExtractorGuide}>
      <main className="min-h-0 flex-1 overflow-y-auto bg-shade text-ink">
        <PaletteExtractor />
      </main>
    </ToolShell>
  );
}
