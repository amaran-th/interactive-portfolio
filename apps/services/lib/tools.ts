// 서비스 앱의 도구 목록. 메인·카테고리 페이지가 모두 이 파일을 읽는다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type CategoryId = "life" | "productivity" | "text" | "creative" | "dev" | "game";

export type Category = {
  id: CategoryId;
  label: string;
  description: string;
  // 배지·칩 배경 — amaran-th.github.io 테마 팔레트의 sub 색을 빌려 쓴다.
  badgeClass: string;
};

export type Tool = {
  slug: string;
  category: CategoryId;
  title: string;
  desc: string;
  about: string;
  tags: string[];
  thumb: string | null;
};

export const CATEGORIES: Category[] = [
  {
    id: "life",
    label: "생활·계산",
    description: "생활 속 숫자를 계산하고 기록하는 도구를 모았습니다.",
    badgeClass: "bg-sub",
  },
  {
    id: "productivity",
    label: "생산성",
    description: "올해 목표는 얼마나 이뤘는지, 돈은 얼마나 모일지 궁금할 때 쓰는 도구예요.",
    badgeClass: "bg-sub",
  },
  {
    id: "text",
    label: "텍스트",
    description: "글을 세고, 바꾸고, 정리하는 도구를 모았습니다.",
    badgeClass: "bg-[#c5e3b5]",
  },
  {
    id: "creative",
    label: "창작",
    description: "네모네모빔에서 그린 그림을 비주얼 노벨 스튜디오로 가져가면 캐릭터와 배경으로 쓸 수 있어요.",
    badgeClass: "bg-[#e7a6bc]",
  },
  {
    id: "dev",
    label: "개발·웹",
    description: "웹 개발과 웹 작업에 쓰는 도구를 모았습니다.",
    badgeClass: "bg-[#d4c4f0]",
  },
  {
    id: "game",
    label: "게임",
    description: "뜨개 도안을 한 코씩 채우거나, 수소로 시작해 철이 나올 때까지 원소를 합성해요.",
    badgeClass: "bg-[#ffdd94]",
  },
];

export const TOOLS: Tool[] = [
  {
    slug: "knit-muffler",
    category: "game",
    title: "뜨개뜨개",
    desc: "한 코 한 코, 틀리지 말고 빠르게!",
    about:
      "숫자 키로 실 색을 바꿔 가며 도안대로 한 코씩 떠요. 틀린 코는 풀고 다시 뜨면 돼요. 도안 22개에 자유 모드도 있고, 다 뜨면 메달을 받아요.",
    tags: ["뜨개질", "목도리", "도안", "타이핑", "메달"],
    thumb: "/playground/knit-muffler.png",
  },
  {
    slug: "visual-novel-studio",
    category: "creative",
    title: "비주얼 노벨 스튜디오",
    desc: "내가 그린 캐릭터가 말을 하기 시작했다",
    about:
      "네모네모빔에서 그린 그림을 캐릭터와 배경으로 불러와요. 컷마다 누가 무슨 말을 할지, 어떤 음악을 깔지 정해 이어 붙이고 그 자리에서 재생해 봐요.",
    tags: ["비주얼노벨", "스토리", "대사", "캐릭터", "배경음악"],
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    slug: "stellar-forge",
    category: "game",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소를 모아 헬륨을 만들고, 헬륨으로 탄소를 만들고… 그렇게 철까지 가요. 복사압과 중력이 균형을 잃거나 철이 쌓이면 별이 터지고, 다음 별이 이어서 태어나요.",
    tags: ["우주", "별", "핵융합", "원소", "초신성", "시뮬레이션"],
    thumb: "/playground/stellar-forge.png",
  },
  {
    slug: "yearly-receipt",
    category: "productivity",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    about:
      "올해 목표를 품목으로 적고 인쇄를 누르면 프린터에서 영수증이 나와요. 해낸 만큼만 결제돼 있어서, 맨 아래 TOTAL PAID를 보면 올해가 어땠는지 보여요.",
    tags: ["목표", "회고", "체크리스트", "연말", "영수증"],
    thumb: "/playground/yearly-receipt.png",
  },
  {
    slug: "nemo-nemo-beam",
    category: "creative",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    about:
      "픽셀아트 그릴 때 필요한 건 웬만큼 다 있어요. 레이어로 나눠 그리고, 프레임을 이어 애니메이션을 만들고, 사진을 넣으면 픽셀로 바꿔 줘요.",
    tags: ["도트", "그림", "애니메이션", "스프라이트", "PNG", "GIF"],
    thumb: "/playground/nemo-beam.png",
  },
  {
    slug: "asset-simulator",
    category: "productivity",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    about:
      "지금 가진 돈과 앞으로 들어오고 나갈 돈을 넣으면, 30년 뒤까지 달마다 얼마가 될지 계산해 줘요. 이자와 물가도 반영하고, ‘이렇게 하면 어떨까’ 싶은 경우를 여러 개 만들어 비교해요.",
    tags: ["돈", "재테크", "저축", "가계부", "복리", "계산기"],
    thumb: null,
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function toolsIn(id: CategoryId): Tool[] {
  return TOOLS.filter((t) => t.category === id);
}

export function activeCategories(): Category[] {
  return CATEGORIES.filter((c) => toolsIn(c.id).length > 0);
}

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function searchTools(query: string, tools: Tool[] = TOOLS): Tool[] {
  const q = normalizeQuery(query);
  if (!q) return tools;
  return tools.filter((t) => {
    const haystack = [
      t.title,
      t.desc,
      t.about,
      ...t.tags,
      getCategory(t.category)?.label ?? "",
    ].join(" ");
    return normalizeQuery(haystack).includes(q);
  });
}
