import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import RoughVisualNovelMaker from "./2_RoughVisualNovelMaker/RoughVisualNovelMaker";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "뜨개뜨개",
    description: `'한컴 타자 연습'에서 착안하여 개발한 뜨개질 컨셉의 플래시 게임입니다.
      
🎯 챌린지 모드: 난이도 별로 10x10, 20x20 도안이 제공됩니다.
    - 🌱 EASY 난이도: 주어진 도안을 따라 적절한 색상으로 작품을 완성해야 합니다.
    - ⭐️ NORMAL 난이도: 새로운 코를 뜰 때마다 일정 확률로 '잘못 뜬 코'가 떠집니다. 잘못 뜬 코가 없게끔 풀었다 지우는 패턴을 반복해 작품을 완성해야 합니다.
    - 🔥 HARD 난이도: 뜰 수 있는 코의 종류가 늘어나 코의 종류를 전환하는 인터랙션이 추가됩니다.
      
🎨 자유 모드: 다양한 색상과 코 종류를 조합해 길이 제한 없이 나만의 작품을 만들 수 있습니다.

특징:
- 색약 사용자를 위한 색약 모드가 제공됩니다. 색약 모드를 활성화하면 플레이에 사용되는 팔레트 색상이 변경됩니다.
- 배경음악과 효과음이 제공됩니다.
- 데스크탑 모드의 경우 키보드 단축키로도 플레이가 가능합니다.
      `,
    period: "2026.04.02 - 04.19",
    platforms: ["pc", "mobile"],
    content: <KnitMuffler />,
    thumbnail: "/playground/knit-muffler.png",
    path: "/knit-muffler",
  },
  {
    id: 2,
    title: "비주얼 노벨 메이커",
    description: `캐릭터와 배경 이미지를 업로드하고, 컷마다 등장 캐릭터·발화자·대사를 설정해 간단한 비주얼 노벨을 만들 수 있는 도구입니다.

🖼️ 자산 등록: 캐릭터(이름 + 이미지)와 배경 이미지를 자유롭게 추가할 수 있습니다. 자산은 편집 중에도 추가 가능합니다.

✂️ 컷 편집: 컷마다 배경 선택, 등장 캐릭터 선택, 발화자(캐릭터 또는 나레이션) 지정, 대사 입력이 가능합니다.

▶️ 재생 모드: 완성된 비주얼 노벨을 순서대로 감상할 수 있습니다. 클릭 또는 키보드로 컷을 넘길 수 있습니다.`,
    period: "2026.04.20 - ",
    platforms: ["pc", "mobile"],
    content: <RoughVisualNovelMaker />,
    path: "/rough-visual-novel-maker",
  },
];
