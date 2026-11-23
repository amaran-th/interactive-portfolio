import localFont from "next/font/local";

/** Galmuri11 (OFL-1.1, npm `galmuri`) — 12px 배수에서 도트가 또렷하다. 영수증·보이저가 함께 쓴다 */
export const galmuri = localFont({
  src: [
    { path: "../../../../../node_modules/galmuri/dist/Galmuri11.woff2", weight: "400", style: "normal" },
    { path: "../../../../../node_modules/galmuri/dist/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-galmuri",
  display: "swap",
});
