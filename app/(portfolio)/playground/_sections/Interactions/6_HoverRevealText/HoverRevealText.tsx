import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/(portfolio)/playground/_sections/Interactions/6_HoverRevealText",
);

export default function HoverRevealText() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="Hover Reveal Text"
      description="텍스트 위에 마우스를 올리면 글자가 한 글자씩 나타나는 효과. 각 글자를 span으로 감싸고 opacity에 stagger delay를 적용하여 순차적으로 드러난다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
