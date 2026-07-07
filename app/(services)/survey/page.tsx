import GoalsPassport from "@/app/(portfolio)/playground/_sections/Works/4_GoalsPassport/GoalsPassport";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "올해의 영수증",
  description:
    "올해의 목표와 하위 항목을 관리하고, 달성 현황을 감열지 영수증으로 출력해보세요. 달성할수록 결제액(TOTAL PAID)이 쌓입니다.",
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
