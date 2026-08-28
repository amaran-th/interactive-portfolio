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
    thumb: "/playground/knit-muffler.png",
  },
  {
    path: "/visual-novel-studio",
    title: "비주얼 노벨 스튜디오",
    desc: "캐릭터와 대사로 짧은 이야기를 연출한다",
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    path: "/stellar-forge",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    thumb: "/playground/stellar-forge.png",
  },
  {
    path: "/yearly-receipt",
    title: "올해의 영수증 만들기",
    desc: "목표 달성 현황을 영수증으로 뽑는다",
    thumb: "/playground/yearly-receipt.png",
  },
  {
    path: "/nemo-nemo-beam",
    title: "네모네모빔",
    desc: "바탕화면처럼 작품이 쌓이는 픽셀아트 편집기",
    thumb: "/playground/nemo-beam.png",
  },
  {
    path: "/asset-simulator",
    title: "자산 시뮬레이터",
    desc: "수입·지출·이체 일정으로 미래 자산 추이를 계산한다",
    thumb: null,
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-gray-950 px-6 py-16 text-white">
      <h1 className="text-3xl font-bold tracking-tight">amaranth</h1>
      <p className="mt-2 text-gray-400">브라우저에서 바로 쓰는 작은 도구 모음</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
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
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
