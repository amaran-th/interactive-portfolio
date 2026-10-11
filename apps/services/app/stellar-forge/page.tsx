import StellarForge from "@/components/works/3_StellarForge/StellarForge";
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { stellarForgeGuide } from "./guide";

export const metadata: Metadata = {
  title: "별들은 굉장한 빛메이커이다",
  description: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
  icons: {
    icon: "/playground/stellar-forge.svg",
  },

  openGraph: {
    title: `별들은 굉장한 빛메이커이다`,
    description: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    images: [
      {
        url: "/playground/stellar-forge.png",
        alt: "별들은 굉장한 빛메이커이다",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `별들은 굉장한 빛메이커이다`,
    description: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    images: ["/playground/stellar-forge.png"],
  },
};

export default function StellarForgePage() {
  return (
    <ToolShell guide={stellarForgeGuide}>
      <main className="flex min-h-0 flex-1 justify-center overflow-hidden">
        <div className="h-full w-full max-w-2xl">
          <StellarForge />
        </div>
      </main>
    </ToolShell>
  );
}
