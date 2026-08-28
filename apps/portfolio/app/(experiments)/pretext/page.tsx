import type { Metadata } from "next";
import PretextClient from "./_sections/PretextClient";

export const metadata: Metadata = {
  title: "Pretext vs DOM",
  description: "DOM 레이아웃 계산을 최적화하는 Pretext 라이브러리와 일반 DOM 조작의 렌더링 성능을 비교하는 인터랙티브 벤치마크",
  openGraph: {
    title: "Pretext vs DOM — Interactive Benchmark",
    description: "DOM 레이아웃 계산을 최적화하는 Pretext 라이브러리와 일반 DOM 조작의 렌더링 성능을 비교하는 인터랙티브 벤치마크",
    type: "website",
  },
};

export default function PretextPage() {
  return <PretextClient />;
}
