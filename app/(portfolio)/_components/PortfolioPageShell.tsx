import Link from "next/link";

export default function PortfolioPageShell({
  title,
  description,
  children,
  contentClassName = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <>
      <header className="mx-auto mb-12 max-w-5xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-white"
        >
          &larr; Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 text-gray-400">{description}</p>
        ) : null}
      </header>

      <main className={`mx-auto max-w-5xl ${contentClassName}`}>{children}</main>
    </>
  );
}
