export default function CopyToast({ message }: { message: string | null }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
    >
      {message && (
        <span className="rounded-full bg-point px-4 py-2 text-sm font-bold text-white shadow-lg">
          {message}
        </span>
      )}
    </div>
  );
}
