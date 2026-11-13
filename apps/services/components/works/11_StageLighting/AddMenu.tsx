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
  PROP_KINDS,
  PROP_SPECS,
  type PropKind,
} from "./show";
import type { Store } from "./store";
import { BUTTON, LABEL } from "./ui";
import { useShow } from "./useShow";

export type AddItem = { type: "prop"; kind: PropKind } | { type: "actor"; gender: Gender } | { type: "fixture"; kind: FixtureKind };

export default function AddMenu({ store, onAdd }: { store: Store; onAdd: (item: AddItem) => void }) {
  const counts = useShow(store, (s) => `${s.props.length}|${s.actors.length}|${s.fixtures.length}`);
  const [nProps, nActors, nFixtures] = counts.split("|").map(Number);
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
        <div className="absolute top-full right-0 z-30 mt-1 grid w-max grid-cols-2 gap-x-4 gap-y-1 rounded-lg border-2 border-point bg-white p-2 shadow-[3px_3px_0_0_var(--color-point)]">
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
          <div className="flex flex-col gap-0.5">
            <p className={LABEL}>조명기</p>
            {FIXTURE_KINDS.map((k) => (
              <MenuItem key={k} icon={<FixtureIcon kind={k} />} label={FIXTURE_LABELS[k]} disabledReason={full(nFixtures, LIMITS.fixtures)}
                onClick={() => pick({ type: "fixture", kind: k })} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, disabledReason, onClick }: { icon: React.ReactNode; label: string; disabledReason?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!!disabledReason} title={disabledReason}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-bold text-point hover:bg-shade disabled:opacity-40">
      {icon}
      {label}
    </button>
  );
}
