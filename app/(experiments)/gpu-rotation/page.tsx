import type { Metadata } from "next";
import GpuRotationClient from "./_sections/GpuRotationClient";

export const metadata: Metadata = {
  title: "GPU Rotation — Raster vs Vector",
  description:
    "GPU 가속이 빠지면(래스터 폴백) 왜 지도 회전(heading)이 사라지는지를 WebGL 버텍스 셰이더 회전과 CPU 비트맵 회전으로 비교 재현하는 인터랙티브 실험",
  openGraph: {
    title: "GPU Rotation — Raster vs Vector",
    description:
      "GPU 가속이 빠지면(래스터 폴백) 왜 지도 회전이 사라지는지를 WebGL과 CPU 비트맵 회전으로 비교 재현하는 인터랙티브 실험",
    type: "website",
  },
};

export default function GpuRotationPage() {
  return <GpuRotationClient />;
}
