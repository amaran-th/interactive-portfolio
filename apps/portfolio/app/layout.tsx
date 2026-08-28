import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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
    template: "%s | Interactive Portfolio",
    default: "Interactive Portfolio",
  },
  description: "인터랙티브 웹 개발 기록",
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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1344097825263008"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="antialiased bg-gray-950 text-white">{children}</body>
    </html>
  );
}
