import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { textEncodingGuide } from "./guide";
import TextEncoding from "@/components/works/7_TextEncoding/TextEncoding";

const DESCRIPTION =
  "글자를 넣으면 UTF-8·UTF-16·EUC-KR·ASCII 바이트를 표로 보여 주고, 바이트나 코드를 글자로 되돌려요.";

export const metadata: Metadata = {
  title: "문자 인코딩 변환기",
  description: DESCRIPTION,
  openGraph: { title: "문자 인코딩 변환기", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "문자 인코딩 변환기", description: DESCRIPTION },
};

export default function TextEncodingPage() {
  return (
    <ToolShell guide={textEncodingGuide}>
      <main className="min-h-0 flex-1 overflow-hidden bg-shade text-ink">
        <TextEncoding />
      </main>
    </ToolShell>
  );
}
