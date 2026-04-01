import Link from "next/link";
import Works from "./_sections/Works";
import Interactions from "./_sections/Interactions";

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
        <h1 className="text-4xl font-bold tracking-tight">Playground</h1>
        <p className="text-gray-400 mt-2">인터랙션 아이디어 모음</p>
      </header>

      <main className="max-w-5xl mx-auto space-y-16">
        <Works />
        <Interactions />
      </main>
    </div>
  );
}
