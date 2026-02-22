import Link from "next/link";
import TiltCard from "./_sections/1_TiltCard/TiltCard";
import MagneticCard from "./_sections/2_MagneticCard/MagneticCard";
import RippleClick from "./_sections/3_RippleClick/RippleClick";
import StaggeredList from "./_sections/4_StaggeredList/StaggeredList";
import MorphingShape from "./_sections/5_MorphingShape/MorphingShape";
import HoverRevealText from "./_sections/6_HoverRevealText/HoverRevealText";

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="max-w-5xl mx-auto mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-4"
        >
          &larr; Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">
          Interaction Archive
        </h1>
        <p className="text-gray-400 mt-2">
          학습용 인터랙션 애니메이션 예제 모음
        </p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <TiltCard />
        <MagneticCard />
        <RippleClick />
        <StaggeredList />
        <MorphingShape />
        <HoverRevealText />
      </main>
    </div>
  );
}
