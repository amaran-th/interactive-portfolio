import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import AdSenseLoader from "./_components/AdSenseLoader";

const pretendard = localFont({
  src: "../../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s",
    default: "브라우저에서 바로 쓰는 작은 서비스 모음",
  },
  description: "브라우저에서 바로 쓰는 작은 서비스 모음",
  verification: {
    google: "GYxbiNXZ79bcXCmZMoBUWuI9DTE4nXL-6tk3bY5aDeU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`bg-shade ${pretendard.variable} ${geistMono.variable}`}
    >
      <body className="antialiased bg-shade text-ink">
        <AdSenseLoader />
        {children}
      </body>
    </html>
  );
}
