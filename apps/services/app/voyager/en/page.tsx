import type { Metadata } from "next";
import ToolShell from "../../_components/ToolShell";
import { voyagerGuideEn } from "../guide";
import VoyagerTimeline from "@/components/works/13_Voyager/VoyagerTimeline";

const TITLE = "49 Years to One Light-Day";
const DESCRIPTION =
  "Voyager 1 has reached the distance light travels from Earth in one day. Follow its original photos and records from the 1977 launch to one light-day in an 8-bit chronicle.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/voyager/en", languages: { ko: "/voyager", en: "/voyager/en" } },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/playground/voyager.png", alt: "49 Years to One Light-Day preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/playground/voyager.png"],
  },
};

export default function VoyagerEnPage() {
  return (
    <ToolShell guide={voyagerGuideEn} lang="en" langPaths={{ ko: "/voyager", en: "/voyager/en" }}>
      <main lang="en" className="min-h-0 flex-1 overflow-hidden bg-[#0b0d2a]">
        <VoyagerTimeline lang="en" />
      </main>
    </ToolShell>
  );
}
