import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/practice/interaction/_sections/7_SlidingDoor",
);

export default function SlidingDoor() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="Sliding Door"
      description="드래그로 미닫이 문을 열고 닫는 효과. 비스듬한 시점에서 본 2D 문과 문틈으로 새어나오는 빛, 바닥에 드리워지는 빛줄기를 표현한다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
