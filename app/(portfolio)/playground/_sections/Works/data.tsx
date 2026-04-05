import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "목도리 뜨기",
    description:
      "'한컴 타자 연습'에서 착안한 목도리 뜨기 게임.\n\n 🎯 챌린지 모드: 주어진 도안을 따라 목도리를 완성해야 한다. 새로운 코를 뜰 때마다 일정 확률로 생성되는 '잘못 뜬 코'를 풀고 다시 떠가면서 실수 없이 목도리를 완성하는 것이 목표이다.\n\n 🎨 자유 모드: 다양한 색과 패턴의 실을 골라 목도리 길이에 제한 없이 나만의 목도리를 만들 수 있다.",
    period: "2026.04.02 - 04.04",
    platforms: ["pc", "mobile"],
    content: <KnitMuffler />,
    thumbnail: "/playground/knit-muffler.png",
    path: "/playground/knit-muffler",
  },
  {
    id: 2,
    title: "Project B",
    description: "프로젝트 설명이 들어갈 자리.",
    period: "2026.02",
    platforms: ["pc"],
    content: <p>Project B 내용 컴포넌트</p>,
  },
];
