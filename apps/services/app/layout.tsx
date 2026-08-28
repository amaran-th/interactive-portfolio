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
    default: "amaranth",
  },
  description: "amaranth 서비스 모음",
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
      className={`dark bg-gray-950 ${pretendard.variable} ${geistMono.variable}`}
    >
      <body className="antialiased bg-gray-950 text-white">
        <AdSenseLoader />
        {children}
      </body>
    </html>
  );
}
