"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1344097825263008";

const emptySubscribe = () => () => {};

function getIsTopLevel() {
  try {
    return window.self === window.top;
  } catch {
    // cross-origin access throws → we're framed
    return false;
  }
}

/**
 * Loads the AdSense script only when the page is the top-level document.
 * When the services app is embedded (portfolio playground iframe) the script
 * is never injected — ad impressions stay on the services domain only.
 */
export default function AdSenseLoader() {
  const isTopLevel = useSyncExternalStore(
    emptySubscribe,
    getIsTopLevel,
    () => false,
  );

  if (!isTopLevel) return null;

  return (
    <Script
      src={ADSENSE_SRC}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
