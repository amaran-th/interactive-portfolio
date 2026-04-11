"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface WorkItem {
  id: number;
  title: string;
  description: string;
  period?: string;
  platforms?: ("mobile" | "pc")[];
  skills?: { icon: string | null; name: string }[];
  thumbnail?: string;
  content: React.ReactNode;
  path?: string;
}

interface WorkProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

const STEP_ANGLE = 28;
const RADIUS = 320;
const TILT_DEG = 12;
const DRAG_PX_PER_STEP = RADIUS * Math.sin((STEP_ANGLE * Math.PI) / 180);
const CENTER_COMPENSATION = RADIUS * Math.sin((TILT_DEG * Math.PI) / 180);
const WORK_THUMBNAIL_THEME = "from-[#1f2733] via-[#2d3a4d] to-[#465f80]";

export default function Work({ items, onItemClick }: WorkProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const didDrag = useRef(false);
  const clickedIndex = useRef<number>(-1);
  const wheelSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelDeltaAccum = useRef(0);

  const containerRotationY =
    -activeIndex * STEP_ANGLE + (dragDelta / DRAG_PX_PER_STEP) * STEP_ANGLE;

  const go = (dir: -1 | 1) =>
    setActiveIndex((i) => Math.max(0, Math.min(items.length - 1, i + dir)));

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelDeltaAccum.current -= delta;
      setDragDelta(wheelDeltaAccum.current);
      setIsDragging(true);

      if (wheelSnapTimer.current) clearTimeout(wheelSnapTimer.current);
      wheelSnapTimer.current = setTimeout(() => {
        const steps = Math.round(-wheelDeltaAccum.current / DRAG_PX_PER_STEP);
        wheelDeltaAccum.current = 0;
        setActiveIndex((i) =>
          Math.max(0, Math.min(items.length - 1, i + steps)),
        );
        setDragDelta(0);
        setIsDragging(false);
      }, 50);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [items.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    didDrag.current = false;
    setIsDragging(true);
    const el = (e.target as HTMLElement).closest("[data-index]");
    clickedIndex.current = el ? parseInt(el.getAttribute("data-index")!) : -1;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 4) didDrag.current = true;
    setDragDelta(delta);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (didDrag.current) {
      const steps = Math.round(-dragDelta / DRAG_PX_PER_STEP);
      setActiveIndex((i) => Math.max(0, Math.min(items.length - 1, i + steps)));
    } else {
      const idx = clickedIndex.current;
      if (idx !== -1) {
        if (idx === activeIndex) onItemClick(items[idx]);
        else setActiveIndex(idx);
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) go(-1);
        else go(1);
      }
    }
    setDragDelta(0);
  };

  return (
    <div
      ref={carouselRef}
      className="relative flex items-center justify-center h-52 overflow-hidden select-none"
      style={{ perspective: "800px", cursor: isDragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setIsDragging(false);
        setDragDelta(0);
      }}
      onPointerLeave={() => {
        setIsDragging(false);
        setDragDelta(0);
      }}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => go(-1)}
        disabled={activeIndex === 0}
        className="absolute left-0 z-10 w-8 h-8 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        ‹
      </button>

      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          transform: `translateY(-${CENTER_COMPENSATION}px) rotateX(-${TILT_DEG}deg) rotateY(${containerRotationY}deg)`,
          transition: isDragging
            ? "none"
            : "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {items.map((work, index) => {
          const itemRotationY = index * STEP_ANGLE;
          const worldAngle =
            (((containerRotationY + itemRotationY) % 360) + 360) % 360;
          const normalizedAngle =
            worldAngle > 180 ? worldAngle - 360 : worldAngle;
          if (Math.abs(normalizedAngle) > 100) return null;

          const t = Math.abs(normalizedAngle) / 100;
          const opacity = Math.max(0.15, 1 - t * 0.85);
          const scale = Math.max(0.55, 1 - t * 0.45);
          const brightness = Math.max(0.25, 1 - t * 0.75);
          const isActive = index === activeIndex && !isDragging;

          return (
            <div
              key={work.id}
              data-index={index}
              className="absolute flex flex-col items-center gap-2"
              style={{
                transform: `rotateY(${itemRotationY}deg) translateZ(${RADIUS}px) scale(${scale})`,
                opacity,
                filter: `brightness(${brightness})`,
                backfaceVisibility: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                className={`relative w-24 h-24 rounded-full overflow-hidden bg-linear-to-br ${WORK_THUMBNAIL_THEME}
                  ring-2 transition-all duration-300
                  ${isActive ? "ring-white/40 shadow-2xl" : "ring-transparent"}`}
              >
                {work.thumbnail ? (
                  <Image
                    src={work.thumbnail}
                    alt={work.title}
                    fill
                    className="object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold tracking-tight text-center px-3 leading-tight">
                      {work.title}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`text-xs ${isActive ? "text-white/70" : "text-gray-600"}`}
              >
                {work.title}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => go(1)}
        disabled={activeIndex === items.length - 1}
        className="absolute right-0 z-10 w-8 h-8 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        ›
      </button>
    </div>
  );
}
