import PortfolioPageShell from "../_components/PortfolioPageShell";
import Interactions from "./_sections/Interactions";
import Works from "./_sections/Works";

export const metadata = {
  title: "Playground",
  description: "인터랙션 아이디어 모음",
};

export default function PlaygroundPage() {
  return (
    <PortfolioPageShell
      title={metadata.title}
      description={metadata.description}
      contentClassName="space-y-16"
    >
      <Works />
      <Interactions />
    </PortfolioPageShell>
  );
}
