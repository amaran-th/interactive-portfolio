import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "amaranth",
  description: "브라우저에서 바로 쓰는 작은 도구 모음",
};

const services = [
  {
    path: "/knit-muffler",
    title: "뜨개뜨개",
    desc: "도안을 따라 한 코씩 떠서 작품을 완성한다",
    about:
      "숫자 키나 색상 팔레트로 실 색을 골라 한 코씩 뜨고, 틀린 코는 풀어서 다시 뜹니다. EASY·NORMAL·HARD 도안 22개와 도안 없이 뜨는 자유 모드가 있고, 결과에 따라 메달을 받습니다.",
    thumb: "/playground/knit-muffler.png",
  },
  {
    path: "/visual-novel-studio",
    title: "비주얼 노벨 스튜디오",
    desc: "캐릭터와 대사로 짧은 이야기를 연출한다",
    about:
      "네모네모빔에서 그린 그림을 캐릭터와 배경으로 불러오고, 컷마다 발화자·대사·배경음악을 정해 장면을 이어 붙입니다. 완성한 이야기는 같은 화면에서 바로 재생합니다.",
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    path: "/stellar-forge",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소를 모으고 반응로를 지어 헬륨, 탄소, 산소를 거쳐 철까지 만들어 갑니다. 복사압과 중력의 균형이 무너지거나 철이 쌓이면 초신성이 터지고, 다음 세대 별이 이어서 태어납니다.",
    thumb: "/playground/stellar-forge.png",
  },
  {
    path: "/yearly-receipt",
    title: "올해의 영수증 만들기",
    desc: "목표 달성 현황을 영수증으로 뽑는다",
    about:
      "목표를 카테고리와 하위 항목으로 나눠 체크형이나 진행률형으로 기록합니다. 항목 하나를 ₩10,000짜리 품목으로 보고 달성한 만큼 결제한 영수증을 만들어 이미지로 저장합니다.",
    thumb: "/playground/yearly-receipt.png",
  },
  {
    path: "/nemo-nemo-beam",
    title: "네모네모빔",
    desc: "바탕화면처럼 작품이 쌓이는 픽셀아트 편집기",
    about:
      "레이어, 프레임 애니메이션, 사진 픽셀화 기능을 갖춘 픽셀아트 편집기입니다. 저장한 그림은 바탕화면 아이콘으로 쌓이고, PNG·JPG·SVG·GIF 등으로 내보냅니다.",
    thumb: "/playground/nemo-beam.png",
  },
  {
    path: "/asset-simulator",
    title: "자산 시뮬레이터",
    desc: "수입·지출·이체 일정으로 미래 자산 추이를 계산한다",
    about:
      "보유 자산과 예정된 수입·지출·이체를 넣으면 최대 30년 동안의 자산 변화를 달마다 계산합니다. 이자 주기, 물가상승률, 목표 금액을 반영하고 시나리오 여러 개를 비교합니다.",
    thumb: null,
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-gray-950 px-6 py-16 text-white">
      <h1 className="text-3xl font-bold tracking-tight">amaranth</h1>
      <p className="mt-2 text-gray-400">브라우저에서 바로 쓰는 작은 도구 모음</p>

      <section aria-labelledby="about-title" className="mt-10">
        <h2 id="about-title" className="text-lg font-semibold">
          amaranth 소개
        </h2>
        <div className="mt-3 flex flex-col gap-3 leading-relaxed text-gray-300">
          <p>
            amaranth는 설치나 회원가입 없이 브라우저에서 바로 여는 도구 여섯 가지를
            모은 사이트입니다. 뜨개질 게임, 비주얼 노벨 편집기, 항성 핵합성
            시뮬레이션, 목표 영수증, 픽셀아트 편집기, 자산 시뮬레이터가 있습니다.
          </p>
          <p>
            도구에 입력한 내용은 서버로 보내지 않고 사용하는 브라우저 안에서
            처리합니다. 각 도구 페이지 아래에 사용 방법과 자주 묻는 질문을
            정리해 두었습니다.
          </p>
          <p>
            웹 인터랙션을 공부하면서 익힌 기법을 실제로 쓸 만한 도구로 만들어
            보았고, 그렇게 하나둘 쌓인 결과물을 이곳에 모았습니다.
          </p>
          <p>
            사이트는 프론트엔드 개발자 한 명이 직접 만들고 운영합니다. 다른
            작업물은{" "}
            <a
              href="https://amaranth-portfolio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-4 hover:text-gray-200"
            >
              포트폴리오
            </a>
            에서 볼 수 있습니다.
          </p>
        </div>
      </section>

      <h2 className="mt-12 text-lg font-semibold">도구 목록</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.path}>
            <Link
              href={s.path}
              className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-white/5">
                {s.thumb ? (
                  <Image src={s.thumb} alt="" fill className="object-cover" />
                ) : null}
              </div>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  {s.about}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
