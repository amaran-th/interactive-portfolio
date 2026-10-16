import type { Tool } from "@/lib/tools";
import ToolCard from "./ToolCard";

export default function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <ul className="grid gap-3 break-keep sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  );
}
