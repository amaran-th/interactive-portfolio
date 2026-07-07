import GoalsPassport from "@/app/(portfolio)/playground/_sections/Works/4_GoalsPassport/GoalsPassport";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2026 중간 결산",
  description: "올해의 목표 달성 현황을 나만의 영수증으로 만들어보세요~!",
};

export default function GoalsPassportPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-2xl">
        <GoalsPassport />
      </div>
    </main>
  );
}
