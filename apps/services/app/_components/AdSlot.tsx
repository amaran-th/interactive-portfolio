"use client";

import { useEffect, useRef, useState } from "react";

const AD_CLIENT = "ca-pub-1344097825263008";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 서비스 페이지 상단(헤더 바로 아래)의 모바일 광고 칸.
 *
 * 광고가 서비스 위에 덮이지 않도록 레이아웃의 한 칸(shrink-0)으로 자리를
 * 차지하고, 서비스 <main>은 남은 높이만큼 줄어든다.
 *
 * 실수 클릭 방지(AdSense 정책) 원칙:
 * - 위치: 조작 UI가 몰린 서비스 하단이 아니라 헤더와 서비스 사이에 둔다.
 * - 구분: '광고' 라벨과 경계선으로 서비스 화면·메뉴와 구분하고, 헤더 버튼과
 *   광고 사이에 라벨 줄과 여백을 둔다.
 * - 높이 예약: 광고가 늦게 떠도 아래 서비스가 밀리지 않도록 칸 높이를 미리
 *   잡는다(밀린 화면에서 버튼 대신 광고를 누르는 사고 방지).
 * - 숨김: 광고가 안 채워졌을 때, 화면 높이가 낮을 때, 포트폴리오 iframe 안일 때.
 *
 * slot(광고 단위 ID)이 없으면 아무것도 렌더하지 않는다 — AdSense 승인 전에는
 * 환경 변수를 비워 두어 꺼 둔다.
 */
export default function AdSlot({ slot }: { slot: string | undefined }) {
  const insRef = useRef<HTMLModElement>(null);
  const [framed, setFramed] = useState(false);

  useEffect(() => {
    // 포트폴리오에서 iframe으로 띄운 경우 — 남의 사이트 안의 광고가 되므로 숨긴다.
    if (window.self !== window.top) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFramed(true);
      return;
    }
    const ins = insRef.current;
    // StrictMode 이중 실행·재마운트에서 같은 <ins>에 두 번 push하면 에러가 난다.
    if (!ins || ins.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 스크립트가 없으면 조용히 빈 칸으로 둔다(아래 CSS가 접는다).
    }
  }, []);

  if (!slot || framed) return null;

  return (
    <aside
      aria-label="광고"
      // sm 이상(데스크톱·태블릿)에서는 아직 칸을 두지 않는다.
      // 화면 높이가 낮으면(가로 모드·키보드) 서비스 공간을 우선한다.
      // 광고가 채워지지 않으면(data-ad-status="unfilled") 칸 전체를 접는다.
      className="flex shrink-0 flex-col items-center border-b border-white/10 bg-neutral-900 pt-1 pb-2 sm:hidden [@media(max-height:560px)]:hidden has-[ins[data-ad-status=unfilled]]:hidden"
    >
      <span className="mb-1 text-[10px] leading-none text-neutral-500">
        광고
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "inline-block", width: 320, height: 50 }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
      />
    </aside>
  );
}
