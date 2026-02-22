import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/practice/interaction/_sections/4_StaggeredList",
);

export default function StaggeredList() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="Staggered List"
      description="버튼 클릭 시 리스트 아이템들이 순차적으로 나타나는 효과. 각 아이템에 인덱스별로 다른 animation-delay를 적용하여 위에서 아래로 하나씩 등장한다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
