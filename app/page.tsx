import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <p className="text-sm font-medium tracking-widest uppercase text-gray-500">
          Welcome
        </p>
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
          Interactive Portfolio
        </h1>
        <p className="text-gray-400 text-lg">
          인터랙티브 웹 포트폴리오(가 될 예정)
        </p>

        <div className="flex gap-4 mt-4">
          <Link
            href="/interaction-lab"
            className="group relative inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-medium transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5"
          >
            Interaction Lab
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
          <Link
            href="/playground"
            className="group relative inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-medium transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5"
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
