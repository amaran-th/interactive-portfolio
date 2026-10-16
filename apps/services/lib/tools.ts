// 서비스 앱의 도구 목록. 메인·카테고리 페이지가 모두 이 파일을 읽는다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type CategoryId = "life" | "text" | "creative" | "dev" | "game";

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
    id: "text",
    label: "텍스트",
    description: "글을 세고, 바꾸고, 정리하는 도구를 모았습니다.",
    badgeClass: "bg-[#c5e3b5]",
  },
  {
    id: "creative",
    label: "이미지·창작",
    description: "그림을 그리고 이야기를 만드는 창작 도구를 모았습니다.",
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
    description: "브라우저에서 바로 하는 게임을 모았습니다.",
    badgeClass: "bg-[#ffdd94]",
  },
];

export const TOOLS: Tool[] = [
  {
    slug: "knit-muffler",
    category: "game",
    title: "뜨개뜨개",
    desc: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",
    about:
      "숫자 키나 색상 팔레트로 실 색을 골라 한 코씩 뜨고, 틀린 코는 풀어서 다시 뜹니다. EASY·NORMAL·HARD 도안 22개와 도안 없이 뜨는 자유 모드가 있고, 결과에 따라 메달을 받습니다.",
    tags: ["뜨개질", "목도리", "도안", "타이핑", "메달"],
    thumb: "/playground/knit-muffler.png",
  },
  {
    slug: "visual-novel-studio",
    category: "creative",
    title: "비주얼 노벨 스튜디오",
    desc: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
    about:
      "네모네모빔에서 그린 그림을 캐릭터와 배경으로 불러오고, 컷마다 발화자·대사·배경음악을 정해 장면을 이어 붙입니다. 완성한 이야기는 같은 화면에서 바로 재생합니다.",
    tags: ["비주얼노벨", "스토리", "대사", "캐릭터", "배경음악"],
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    slug: "stellar-forge",
    category: "game",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소를 모으고 반응로를 지어 헬륨, 탄소, 산소를 거쳐 철까지 만들어 갑니다. 복사압과 중력의 균형이 무너지거나 철이 쌓이면 초신성이 터지고, 다음 세대 별이 이어서 태어납니다.",
    tags: ["우주", "별", "핵융합", "원소", "초신성", "시뮬레이션"],
    thumb: "/playground/stellar-forge.png",
  },
  {
    slug: "yearly-receipt",
    category: "life",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    about:
      "목표를 카테고리와 하위 항목으로 나눠 체크형이나 진행률형으로 기록합니다. 항목 하나를 ₩10,000짜리 품목으로 보고 달성한 만큼 결제한 영수증을 만들어 이미지로 저장합니다.",
    tags: ["목표", "회고", "체크리스트", "연말"],
    thumb: "/playground/yearly-receipt.png",
  },
  {
    slug: "nemo-nemo-beam",
    category: "creative",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    about:
      "레이어, 프레임 애니메이션, 사진 픽셀화 기능을 갖춘 픽셀아트 편집기입니다. 저장한 그림은 바탕화면 아이콘으로 쌓이고, PNG·JPG·SVG·GIF 등으로 내보냅니다.",
    tags: ["도트", "그림", "애니메이션", "스프라이트"],
    thumb: "/playground/nemo-beam.png",
  },
  {
    slug: "asset-simulator",
    category: "life",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    about:
      "보유 자산과 예정된 수입·지출·이체를 넣으면 최대 30년 동안의 자산 변화를 달마다 계산합니다. 이자 주기, 물가상승률, 목표 금액을 반영하고 시나리오 여러 개를 비교합니다.",
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
