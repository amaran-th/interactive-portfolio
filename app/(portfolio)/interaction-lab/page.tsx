import PortfolioPageShell from "../_components/PortfolioPageShell";
import Researches from "./_sections/Researches";

export const metadata = {
  title: "Interaction Lab",
  description: "UX 연구 기록",
};

export default function InteractionLabPage() {
  return (
    <PortfolioPageShell
      title={metadata.title}
      description={metadata.description}
    >
      <Researches />
    </PortfolioPageShell>
  );
}
