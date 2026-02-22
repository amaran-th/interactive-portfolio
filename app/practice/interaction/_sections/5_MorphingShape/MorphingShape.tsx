import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/practice/interaction/_sections/5_MorphingShape",
);

export default function MorphingShape() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");

  return (
    <InteractionCard
      title="Morphing Shape"
      description="도형이 자동으로 변형되는 루프 애니메이션. @keyframes로 border-radius 값을 변화시켜 원→사각형→물방울 등으로 모양이 바뀐다. JS 없이 CSS만으로 구현."
      html={htmlCode}
      css={cssCode}
    />
  );
}
