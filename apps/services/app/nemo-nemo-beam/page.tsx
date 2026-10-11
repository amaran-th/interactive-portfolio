import PixelArtMaker from "@/components/works/5_PixelArtMaker/PixelArtMaker";
import { CURSOR_NORMAL } from "@/components/works/5_PixelArtMaker/cursors";
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { nemoNemoBeamGuide } from "./guide";

export const metadata: Metadata = {
  title: "네모네모빔",
  description: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
  icons: {
    icon: "/playground/nemo-beam.svg",
  },

  openGraph: {
    title: `네모네모빔`,
    description: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    images: [
      {
        url: "/playground/nemo-beam.png",
        alt: "네모네모빔",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `네모네모빔`,
    description: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    images: ["/playground/nemo-beam.png"],
  },
};

export default function PixelArtMakerPage() {
  return (
    <ToolShell guide={nemoNemoBeamGuide}>
      <main
        className="min-h-0 flex-1 w-full overflow-hidden"
        style={{ cursor: CURSOR_NORMAL }}
      >
        <PixelArtMaker />
      </main>
    </ToolShell>
  );
}
