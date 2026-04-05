import fs from "fs";
import path from "path";
import InteractionCard from "../InteractionCard";

const dir = path.join(
  process.cwd(),
  "app/playground/_sections/Interactions/1_TiltCard",
);

export default function TiltCard() {
  const htmlCode = fs.readFileSync(path.join(dir, "answer.html"), "utf-8");
  const cssCode = fs.readFileSync(path.join(dir, "answer.css"), "utf-8");
  const jsCode = fs.readFileSync(path.join(dir, "answer.js"), "utf-8");

  return (
    <InteractionCard
      title="3D Tilt Card"
      description="마우스 위치에 따라 카드가 3D로 기울어지는 효과. perspective + rotateX/Y로 입체감을 표현하고, 마우스 좌표에 따른 광택(shine) 오버레이를 추가한다."
      html={htmlCode}
      css={cssCode}
      jsCode={jsCode}
    />
  );
}
