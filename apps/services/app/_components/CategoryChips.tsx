import Link from "next/link";
import { activeCategories, type CategoryId } from "@/lib/tools";

function chipClass(active: boolean, bg: string) {
  return `inline-block rounded-full border-[1.5px] border-point px-3 py-1 text-xs font-bold transition-colors ${
    active ? "bg-point text-white" : `${bg} text-point hover:bg-white`
  }`;
}

/** '전체' + 도구가 있는 카테고리 칩. current가 없으면 '전체'가 현재 위치. */
export default function CategoryChips({ current }: { current?: CategoryId }) {
  return (
    <nav aria-label="카테고리">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/"
            aria-current={current === undefined ? "page" : undefined}
            className={chipClass(current === undefined, "bg-white")}
          >
            전체
          </Link>
        </li>
        {activeCategories().map((c) => (
          <li key={c.id}>
            <Link
              href={`/category/${c.id}`}
              aria-current={current === c.id ? "page" : undefined}
              className={chipClass(current === c.id, c.badgeClass)}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
