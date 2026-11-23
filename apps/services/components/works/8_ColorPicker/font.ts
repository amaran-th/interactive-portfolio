import { Nanum_Pen_Script } from "next/font/google";

/** 손글씨 글꼴(OFL). next/font가 빌드 때 받아 이 사이트에서 직접 서빙한다 */
export const penFont = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pen",
  display: "swap",
});
