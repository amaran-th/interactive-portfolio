interface Props {
  dotColor: string; // Tailwind bg-* class, e.g. "bg-green-400"
  label: string;
  rendered: number;
  total: number;
}

export function ListHeader({ dotColor, label, rendered, total }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
      <span className="text-xs font-medium text-white/50 uppercase tracking-widest">
        {label}
      </span>
      <span className="ml-auto text-xs font-mono text-white/30">
        {rendered} / {total.toLocaleString()} rendered
      </span>
    </div>
  );
}
