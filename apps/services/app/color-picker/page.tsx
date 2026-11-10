import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { colorPickerGuide } from "./guide";
import ColorPicker from "@/components/works/8_ColorPicker/ColorPicker";

const DESCRIPTION =
  "이미지를 붙여 넣고 원하는 곳을 누르면 HEX·RGB·HSL 코드를 알려 줘요. 크롬·엣지에서는 화면 어디서든 색을 뽑아요.";

export const metadata: Metadata = {
  title: "색상 스포이트",
  description: DESCRIPTION,
  openGraph: { title: "색상 스포이트", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "색상 스포이트", description: DESCRIPTION },
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
