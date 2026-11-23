import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { voyagerGuide } from "./guide";
import VoyagerTimeline from "@/components/works/13_Voyager/VoyagerTimeline";

const TITLE = "49년만에 도달한 1일";
const DESCRIPTION =
  "보이저 1호가 지구에서 빛으로 하루 걸리는 거리에 닿았어요. 1977년 발사부터 1광일까지, 보이저가 찍은 원본 사진과 기록을 8비트 연대기로 따라가요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/voyager", languages: { ko: "/voyager", en: "/voyager/en" } },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/playground/voyager.png", alt: "49년만에 도달한 1일 미리보기 이미지" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/playground/voyager.png"],
  },
};

export default function VoyagerPage() {
  return (
    <ToolShell guide={voyagerGuide} langPaths={{ ko: "/voyager", en: "/voyager/en" }}>
      <main className="min-h-0 flex-1 overflow-hidden bg-[#0b0d2a]">
        <VoyagerTimeline />
      </main>
    </ToolShell>
  );
}
