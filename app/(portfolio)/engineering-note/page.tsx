import PortfolioPageShell from "../_components/PortfolioPageShell";
import Notes from "./_sections/Notes";

export const metadata = {
  title: "Engineering Note",
  description: "기술적 문제 해결과정 기록",
};

export default function EngineeringNotePage() {
  return (
    <PortfolioPageShell
      title={metadata.title}
      description={metadata.description}
    >
      <Notes />
    </PortfolioPageShell>
  );
}
