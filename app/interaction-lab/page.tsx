import Link from "next/link";

export default function InteractionLabPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="max-w-5xl mx-auto mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-4"
        >
          &larr; Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Interaction Lab</h1>
        <p className="text-gray-400 mt-2">UX 연구 기록</p>
      </header>

      <main className="max-w-5xl mx-auto space-y-16">test</main>
    </div>
  );
}
