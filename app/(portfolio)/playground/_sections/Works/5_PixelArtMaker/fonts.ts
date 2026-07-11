import localFont from "next/font/local";

export const monaFont = localFont({
  src: [
    { path: "../../../../../../public/fonts/Mona12.ttf", weight: "400", style: "normal" },
    { path: "../../../../../../public/fonts/Mona12-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});
