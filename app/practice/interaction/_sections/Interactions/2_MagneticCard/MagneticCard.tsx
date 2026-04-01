import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/practice/interaction/_sections/Interactions/2_MagneticCard",
);
export default function MagneticCard() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="Magnetic Button"
      description="마우스가 버튼 근처에 오면 버튼이 마우스 방향으로 끌려오는 자석 효과. 마우스-중심 거리를 계산해 transform: translate를 적용하고, 떠나면 원위치로 복귀한다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
