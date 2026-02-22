import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/practice/interaction/_sections/3_RippleClick",
);

export default function RippleClick() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="Ripple Click Effect"
      description="클릭한 지점에서 물결이 퍼져나가는 Material Design 스타일 효과. 클릭 좌표에 원형 요소를 생성하고 scale(0)→scale(1) 애니메이션 후 제거한다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
