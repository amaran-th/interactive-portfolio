"use client";

// 3D 화면 위에 떠 있는 반투명 사이드바. 무대 설정 / 무대 요소 / 조명기 탭으로 나누고,
// 탭마다 위는 요소 목록, 아래는 고른 요소의 속성.
// 넓은 화면은 오른쪽(왼쪽 가장자리를 끌어 260–480px), 좁은 화면은 아래쪽 시트. 접으면 손잡이만 남는다.
import { ChevronLeft, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SidebarTab = "stage" | "elements" | "fixtures";
export const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
  { id: "stage", label: "무대 설정" },
  { id: "elements", label: "무대 요소" },
  { id: "fixtures", label: "조명기" },
];

const MIN_W = 260;
const MAX_W = 480;

type Props = {
  open: boolean;
  onOpen: (open: boolean) => void;
  tab: SidebarTab;
  onTab: (tab: SidebarTab) => void;
  /** 탭 머리줄 오른쪽(추가 메뉴 등). 없으면 비운다. */
  actions?: React.ReactNode;
  /** 무대 설정 탭은 목록 없이 속성만 보여 준다. */
  outliner?: React.ReactNode;
  inspector: React.ReactNode;
  /** 넓은 화면에서 사이드바 왼쪽에 따로 붙는 패널(무대 설정 탭의 좌석 미리보기). 접으면 세로 탭만 남는다. */
  side?: { title: string; content: React.ReactNode };
  /** 사이드바가 덮는 오른쪽·아래 크기(px). 접으면 0. */
  onInset: (right: number, bottom: number) => void;
};

export default function Sidebar({ open, onOpen, tab, onTab, actions, outliner, inspector, side, onInset }: Props) {
  const [width, setWidth] = useState(320);
  const [sideOpen, setSideOpen] = useState(true);
  const sideRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const ref = useRef<HTMLElement>(null);
  const insetRef = useRef(onInset);
  useEffect(() => {
    insetRef.current = onInset;
  });

  // 넓은 화면은 오른쪽을, 좁은 화면(아래쪽 시트)은 아래를 덮는다.
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) {
      insetRef.current(0, 0);
      return;
    }
    const measure = () => {
      const parent = el.parentElement!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const sheet = r.width > parent.width * 0.8;
      // 왼쪽에 붙은 패널이 보이면 그만큼 더 덮는다(좁은 화면에서는 숨겨져 크기가 0)
      const sideRect = sideRef.current?.getBoundingClientRect();
      const left = sideRect && sideRect.width > 0 ? Math.min(r.left, sideRect.left) : r.left;
      insetRef.current(sheet ? 0 : Math.round(parent.right - left), sheet ? Math.round(parent.bottom - r.top) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(el.parentElement!);
    if (sideRef.current) ro.observe(sideRef.current);
    return () => ro.disconnect();
  }, [open, side?.title, sideOpen]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpen(true)}
        aria-label="사이드바 펼치기"
        title="사이드바 펼치기"
        className="absolute right-0 bottom-3 z-20 flex h-24 w-6 items-center justify-center rounded-l-lg border border-r-0 border-white/50 bg-white/70 text-point shadow-lg backdrop-blur-md md:top-1/2 md:bottom-auto md:-translate-y-1/2"
      >
        <PanelRightOpen aria-hidden className="size-4" />
      </button>
    );
  }

  return (
    <aside
      ref={ref}
      aria-label="무대 요소와 속성"
      style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
      className="absolute inset-x-2 bottom-2 z-20 flex h-[45%] flex-col rounded-xl border border-white/50 bg-white/70 text-ink shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:h-auto md:w-[var(--sidebar-w)]"
    >
      <div
        aria-hidden
        title="끌어서 너비 바꾸기"
        className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-ew-resize touch-none hover:bg-point/20 md:block"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, w: width };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setWidth(Math.min(MAX_W, Math.max(MIN_W, d.w - (e.clientX - d.x))));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      {side &&
        (sideOpen ? (
          <div
            ref={sideRef}
            role="region"
            aria-label={side.title}
            className="absolute top-0 right-[calc(100%+0.5rem)] hidden max-h-full w-72 flex-col rounded-xl border border-white/50 bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md md:flex"
          >
            <div className="flex items-center justify-between border-b border-point/15 py-1 pr-1 pl-3">
              <h2 className="text-xs font-bold text-point">{side.title}</h2>
              <button type="button" onClick={() => setSideOpen(false)} aria-label={`${side.title} 접기`} title="접기"
                className="flex size-7 items-center justify-center rounded-md text-point hover:bg-point/10">
                <PanelRightClose aria-hidden className="size-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">{side.content}</div>
          </div>
        ) : (
          <button type="button" onClick={() => setSideOpen(true)} aria-label={`${side.title} 펼치기`} title={`${side.title} 펼치기`}
            className="absolute top-3 right-full hidden items-center gap-1 rounded-l-lg border border-r-0 border-white/50 bg-white/70 px-1 py-3 text-xs font-bold text-point shadow-lg backdrop-blur-md [writing-mode:vertical-rl] md:flex">
            <ChevronLeft aria-hidden className="size-3.5 rotate-90" />
            {side.title}
          </button>
        ))}
      <div className="flex items-center justify-between border-b border-point/15 py-1 pr-1 pl-2">
        <div role="tablist" aria-label="사이드바" className="flex gap-0.5">
          {SIDEBAR_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}
              className="rounded-md px-2 py-1 text-xs font-bold text-point/70 hover:bg-point/10 aria-selected:bg-point aria-selected:text-white">
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={() => onOpen(false)}
            aria-label="사이드바 접기"
            title="사이드바 접기"
            className="flex size-7 items-center justify-center rounded-md text-point hover:bg-point/10"
          >
            <PanelRightClose aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      {outliner && <div className="max-h-[40%] shrink-0 overflow-auto px-1">{outliner}</div>}
      <div className={`min-h-0 flex-1 overflow-auto ${outliner ? "border-t-2 border-point/20" : ""}`}>{inspector}</div>
    </aside>
  );
}
