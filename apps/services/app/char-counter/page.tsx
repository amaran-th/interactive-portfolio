import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { charCounterGuide } from "./guide";
import CharCounter from "@/components/works/12_CharCounter/CharCounter";

const TITLE = "글자수 세기";
const DESCRIPTION =
  "공백 포함·제외 글자 수, 바이트, 단어, 줄을 바로 세요. 목표 글자 수를 정하면 남은 글자를 보여 줘서 자기소개서나 과제 분량을 맞추기 좋아요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/playground/char-counter.png", alt: "글자수 세기 미리보기 이미지" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/playground/char-counter.png"],
  },
};

export default function CharCounterPage() {
  return (
    <ToolShell guide={charCounterGuide}>
      <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f5] text-ink">
        <CharCounter />
      </main>
    </ToolShell>
  );
}
