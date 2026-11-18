import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { colorPickerGuide } from "./guide";
import ColorPicker from "@/components/works/8_ColorPicker/ColorPicker";

const DESCRIPTION =
  "이미지를 붙여 넣고 원하는 곳을 누르면 HEX·RGB·HSL 코드를 알려 주고, 많이 쓰인 색을 컬러 팔레트로 골라 이미지와 함께 PNG로 저장해요. 크롬·엣지에서는 화면 어디서나 색상을 추출해요.";

export const metadata: Metadata = {
  title: "색상 추출기",
  description: DESCRIPTION,
  openGraph: { title: "색상 추출기", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "색상 추출기", description: DESCRIPTION },
};

export default function ColorPickerPage() {
  return (
    <ToolShell guide={colorPickerGuide}>
      <main className="min-h-0 flex-1 overflow-y-auto bg-shade text-ink">
        <ColorPicker />
      </main>
    </ToolShell>
  );
}
