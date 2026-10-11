import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ServiceThumbFallback from "./_components/ServiceThumbFallback";
import SiteFooter from "./_components/SiteFooter";

export const metadata: Metadata = {
  title: "Amaranth Site",
  description: "간단 웹 서비스 모음",
};

type ServiceCategory = "게임" | "창작" | "생산성";

// 서비스 유형 배지 색 — amaran-th.github.io 테마 팔레트의 sub 색을 빌려 쓴다.
const CATEGORY_STYLE: Record<ServiceCategory, string> = {
  게임: "bg-[#ffdd94]",
  창작: "bg-[#e7a6bc]",
  생산성: "bg-sub",
};

const services: {
  path: string;
  category: ServiceCategory;
  title: string;
  desc: string;
  about: string;
  thumb: string | null;
}[] = [
  {
    path: "/knit-muffler",
    category: "게임",
    title: "뜨개뜨개",
    desc: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",
    about:
      "숫자 키나 색상 팔레트로 실 색을 골라 한 코씩 뜨고, 틀린 코는 풀어서 다시 뜹니다. EASY·NORMAL·HARD 도안 22개와 도안 없이 뜨는 자유 모드가 있고, 결과에 따라 메달을 받습니다.",
    thumb: "/playground/knit-muffler.png",
  },
  {
    path: "/visual-novel-studio",
    category: "창작",
    title: "비주얼 노벨 스튜디오",
    desc: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
    about:
      "네모네모빔에서 그린 그림을 캐릭터와 배경으로 불러오고, 컷마다 발화자·대사·배경음악을 정해 장면을 이어 붙입니다. 완성한 이야기는 같은 화면에서 바로 재생합니다.",
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    path: "/stellar-forge",
    category: "게임",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소를 모으고 반응로를 지어 헬륨, 탄소, 산소를 거쳐 철까지 만들어 갑니다. 복사압과 중력의 균형이 무너지거나 철이 쌓이면 초신성이 터지고, 다음 세대 별이 이어서 태어납니다.",
    thumb: "/playground/stellar-forge.png",
  },
  {
    path: "/yearly-receipt",
    category: "생산성",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    about:
      "목표를 카테고리와 하위 항목으로 나눠 체크형이나 진행률형으로 기록합니다. 항목 하나를 ₩10,000짜리 품목으로 보고 달성한 만큼 결제한 영수증을 만들어 이미지로 저장합니다.",
    thumb: "/playground/yearly-receipt.png",
  },
  {
    path: "/nemo-nemo-beam",
    category: "창작",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    about:
      "레이어, 프레임 애니메이션, 사진 픽셀화 기능을 갖춘 픽셀아트 편집기입니다. 저장한 그림은 바탕화면 아이콘으로 쌓이고, PNG·JPG·SVG·GIF 등으로 내보냅니다.",
    thumb: "/playground/nemo-beam.png",
  },
  {
    path: "/asset-simulator",
    category: "생산성",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    about:
      "보유 자산과 예정된 수입·지출·이체를 넣으면 최대 30년 동안의 자산 변화를 달마다 계산합니다. 이자 주기, 물가상승률, 목표 금액을 반영하고 시나리오 여러 개를 비교합니다.",
    thumb: null,
  },
];

// 굵은 외곽선 + 어긋난 단색 그림자 — 썸네일의 손그림 톤에 맞춘 "스티커" 카드
const STICKER =
  "rounded-lg border-2 border-point bg-white shadow-[3px_3px_0_0_var(--color-point)]";

export default function Home() {
  return (
    <div className="min-h-dvh bg-shade text-ink">
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-12">
        <header>
          <h1 className="text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
            Amaranth Site
          </h1>
          <p className="mt-1.5 text-sm text-ink/80">간단 웹서비스 모음</p>
        </header>

        <section aria-labelledby="services-title" className="mt-6">
          <h2 id="services-title" className="sr-only">
            서비스 목록
          </h2>
          <ul className="grid gap-3 break-keep sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {services.map((s) => (
              <li key={s.path}>
                <Link
                  href={s.path}
                  className={`group relative grid h-full grid-cols-[auto_1fr] overflow-hidden sm:flex sm:flex-col transition-[translate,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_var(--color-point)] ${STICKER}`}
                >
                  <div className="relative m-3 mr-0 aspect-square w-20 shrink-0 self-start overflow-hidden border-2 border-point bg-shade sm:m-0 sm:w-auto sm:self-stretch sm:border-0 sm:border-b-2">
                    {s.thumb ? (
                      <Image
                        src={s.thumb}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 80px"
                        className="object-cover"
                      />
                    ) : (
                      <ServiceThumbFallback title={s.title} />
                    )}
                  </div>
                  {/* 모바일: 썸네일 오른쪽에 유형·이름·한 줄 소개, 설명은 그 아래 전체 폭
                      sm 이상: 썸네일 아래로 모두 세로로 쌓는다 */}
                  <div className="flex flex-col justify-center p-3 sm:justify-start sm:px-3 sm:pt-3 sm:pb-0 sm:pointer-fine:pb-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`shrink-0 rounded-full border-[1.5px] border-point px-1.5 py-px text-[11px] font-bold text-point ${CATEGORY_STYLE[s.category]}`}
                      >
                        {s.category}
                      </span>
                      <p className="min-w-0 font-bold text-point">{s.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-main">
                      {s.desc}
                    </p>
                  </div>
                  {/* 설명: 모바일·터치 기기는 카드 아래에, 마우스가 있는 데스크톱은
                      썸네일 위 오버레이로 hover·키보드 포커스 때만 보인다(sm 이상 + 정밀 포인터) */}
                  <p className="col-span-2 px-3 pb-3 text-[13px] leading-relaxed text-ink/85 sm:mt-1.5 sm:px-3 sm:pb-3 sm:pointer-fine:absolute sm:pointer-fine:inset-x-0 sm:pointer-fine:top-0 sm:pointer-fine:m-0 sm:pointer-fine:flex sm:pointer-fine:aspect-square sm:pointer-fine:items-center sm:pointer-fine:bg-point/90 sm:pointer-fine:p-4 sm:pointer-fine:text-xs sm:pointer-fine:text-white sm:pointer-fine:opacity-0 sm:pointer-fine:transition-opacity sm:pointer-fine:group-hover:opacity-100 sm:pointer-fine:group-focus-visible:opacity-100">
                    {s.about}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="about-title"
          className={`mt-10 max-w-3xl p-2 break-keep`}
        >
          <h2 id="about-title" className="font-bold text-point">
            이 사이트에 대해
          </h2>
          <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              본 페이지는 웹 서비스를 제공하고 있습니다. 별도의 설치나 회원가입
              절차를 필요로 하지 않습니다.
            </p>
            <p>
              서비스에 저장되는 데이터는 사용자의 브라우저에 저장됩니다. 사용
              방법과 자주 묻는 질문은 각 서비스 화면 위쪽의 &lsquo;사용
              안내&rsquo; 버튼을 누르면 볼 수 있습니다.
            </p>
            <p>
              사이트는 개발자 개인이 직접 만들고 운영합니다. 다른 작업물은{" "}
              <a
                href="https://amaranth-portfolio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-point underline decoration-main decoration-2 underline-offset-4 hover:text-main"
              >
                포트폴리오
              </a>
              에서 볼 수 있습니다.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
