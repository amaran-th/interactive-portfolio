import Script from "next/script";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1344097825263008";

/**
 * Always rendered server-side so the AdSense crawler finds the script in the
 * raw HTML (client-only gating previously hid it from non-JS crawlers, which
 * broke site verification). Portfolio playground embeds stay noindex/not
 * crawled, so serving this in the iframe case too is an accepted trade-off.
 */
export default function AdSenseLoader() {
  return (
    <Script
      src={ADSENSE_SRC}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
