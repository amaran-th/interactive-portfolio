import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/2 h-90 w-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 blur-3xl sm:h-115 sm:w-115 lg:h-150 lg:w-150" />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium tracking-widest uppercase text-gray-500">
          Welcome
        </p>
        <h1 className="bg-linear-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
          Interactive Portfolio
        </h1>
        <p className="max-w-xl text-base text-gray-400 sm:text-lg">
          인터랙티브 웹 포트폴리오(가 될 예정)
        </p>

        <div className="mt-4 grid w-full max-w-sm gap-3 sm:max-w-none sm:grid-cols-3 sm:gap-4">
          <Link
            href="/engineering-note"
            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
          >
            Engineering Note
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
          <Link
            href="/interaction-lab"
            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
          >
            Interaction Lab
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
          <Link
            href="/playground"
            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
          >
            Playground
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
