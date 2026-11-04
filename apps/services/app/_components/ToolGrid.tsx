import type { Tool } from "@/lib/tools";
import ToolCard from "./ToolCard";

const DEFAULT_COLS = "sm:grid-cols-4 lg:grid-cols-6";

/** cols: sm 이상 열 수 클래스. 좁은 칸 안에 넣을 때 바꾼다. */
export default function ToolGrid({
  tools,
  cols = DEFAULT_COLS,
}: {
  tools: Tool[];
  cols?: string;
}) {
  return (
    <ul className={`grid gap-x-5 gap-y-6 break-keep ${cols}`}>
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  );
}
