"use client";

// 사이드바 머리줄의 '추가' 메뉴. 소품·인물·조명기를 아이콘과 함께 늘어놓는다.
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FixtureIcon, PersonIcon, PropIcon } from "./icons";
import {
  FIXTURE_KINDS,
  FIXTURE_LABELS,
  type FixtureKind,
  GENDERS,
  GENDER_LABELS,
  type Gender,
  LIMITS,
  LINE_TYPE_LABELS,
  type LineType,
  PROP_KINDS,
  PROP_SPECS,
  type PropKind,
} from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL } from "./ui";
import { useShow } from "./useShow";

export type AddItem =
  | { type: "prop"; kind: PropKind }
  | { type: "actor"; gender: Gender }
  | { type: "fixture"; kind: FixtureKind }
  | { type: "line"; lineType: LineType };
const LINE_TYPES: LineType[] = ["pipe", "boomL", "boomR"];

export default function AddMenu({
  store,
  onAdd,
  only,
}: {
  store: Store;
  onAdd: (item: AddItem) => void;
  /** 무대 요소 탭은 소품·인물만, 조명기 탭은 조명기만 보여 준다. */
  only: "elements" | "fixtures";
}) {
  const counts = useShow(store, (s) => `${s.props.length}|${s.actors.length}|${s.fixtures.length}|${s.stage.lines.length}`);
  const [nProps, nActors, nFixtures, nLines] = counts.split("|").map(Number);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (item: AddItem) => {
    setOpen(false);
    onAdd(item);
  };
  const full = (n: number, max: number) => (n >= max ? `최대 ${max}개까지 둘 수 있어요` : undefined);

  return (
    <div ref={menuRef} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={BUTTON}>
        <Plus aria-hidden className="size-4" /> 추가
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1 flex w-max gap-x-4 rounded-lg border border-white/15 bg-surface p-2">
          {only === "elements" && (
          <div className="flex flex-col gap-0.5">
            <p className={LABEL}>소품</p>
            {PROP_KINDS.map((k) => (
              <MenuItem key={k} icon={<PropIcon kind={k} />} label={PROP_SPECS[k].label} disabledReason={full(nProps, LIMITS.props)}
                onClick={() => pick({ type: "prop", kind: k })} />
            ))}
            <p className={`${LABEL} mt-1`}>인물</p>
            {GENDERS.map((g) => (
              <MenuItem key={g} icon={<PersonIcon gender={g} />} label={`인물(${GENDER_LABELS[g]})`} disabledReason={full(nActors, LIMITS.actors)}
                onClick={() => pick({ type: "actor", gender: g })} />
            ))}
          </div>
          )}
          {only === "fixtures" && (
          <div className="flex flex-col gap-0.5">
            <p className={LABEL}>조명기</p>
            {FIXTURE_KINDS.map((k) => (
              <MenuItem key={k} icon={<FixtureIcon kind={k} />} label={FIXTURE_LABELS[k]} disabledReason={full(nFixtures, LIMITS.fixtures)}
                onClick={() => pick({ type: "fixture", kind: k })} />
            ))}
            <p className={`${LABEL} mt-1`}>라인</p>
            {LINE_TYPES.map((t) => (
              <MenuItem key={t} icon={<LineIcon type={t} />} label={LINE_TYPE_LABELS[t]} disabledReason={full(nLines, LIMITS.lines)}
                onClick={() => pick({ type: "line", lineType: t })} />
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 가로 파이프(위 파이프)·세로 기둥(붐) 모양 아이콘 */
function LineIcon({ type }: { type: LineType }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      {type === "pipe" ? (
        <>
          <path d="M1.5 4h13" />
          <path d="M5 4v2.5M11 4v2.5" />
          <circle cx={5} cy={8.5} r={1.6} />
          <circle cx={11} cy={8.5} r={1.6} />
        </>
      ) : (
        <>
          <path d={type === "boomL" ? "M4 1.5v13" : "M12 1.5v13"} />
          <path d={type === "boomL" ? "M4 5h3M4 10h3" : "M12 5H9M12 10H9"} />
          <circle cx={type === "boomL" ? 9 : 7} cy={5} r={1.5} />
          <circle cx={type === "boomL" ? 9 : 7} cy={10} r={1.5} />
        </>
      )}
    </svg>
  );
}

function MenuItem({ icon, label, disabledReason, onClick }: { icon: React.ReactNode; label: string; disabledReason?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!!disabledReason} title={disabledReason}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-bold text-ink hover:bg-shade disabled:opacity-40">
      {icon}
      {label}
    </button>
  );
}
