import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s",
    default: "Interactive Portfolio",
  },
};

export default function ServicesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
