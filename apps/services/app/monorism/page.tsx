import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { monorismGuide } from "./guide";
import Monorism from "@/components/works/10_Monorism/Monorism";

const DESCRIPTION =
  "앞뒤 색이 다른 원형 칩을 딱 소리와 함께 뒤집고, 빼고, 놓아서 그리는 3D 모자이크예요.";

export const metadata: Metadata = {
  title: "모노리즘",
  description: DESCRIPTION,
  openGraph: { title: "모노리즘", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "모노리즘", description: DESCRIPTION },
};

export default function MonorismPage() {
  return (
    <ToolShell guide={monorismGuide}>
      <main className="min-h-0 flex-1 overflow-hidden bg-shade text-ink">
        <Monorism />
      </main>
    </ToolShell>
  );
}
