import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Engineering Experiments",
    default: "Engineering Experiments",
  },
};

export default function ExperimentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
