import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "뜨개뜨개",
    description: `'한컴 타자 연습'에서 착안한 뜨개질 게임.
      
🎯 챌린지 모드: 난이도 별로 5개의 도안이 제공된다.
    - 이지 모드: 주어진 도안을 따라 작품을 완성해야 한다.
    - 챌린지 모드: 새로운 코를 뜰 때마다 일정 확률로 '잘못 뜬 코'가 생성된다. '잘못 뜬 코'가 남아있지 않도록 풀고 다시 뜨기를 반복하면서 작품을 완성해야 한다.
      
🎨 자유 모드: 다양한 색과 패턴의 실을 골라 길이 제한 없이 나만의 작품을 만들 수 있다.

특징:
- 색약을 위한 팔레트 모드가 제공된다.
      `,
    period: "2026.04.02 - 04.18",
    platforms: ["pc", "mobile"],
    content: <KnitMuffler />,
    thumbnail: "/playground/knit-muffler.png",
    path: "/knit-muffler",
  },
];
