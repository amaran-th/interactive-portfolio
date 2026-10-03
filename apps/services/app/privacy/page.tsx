import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | amaranth",
  description:
    "amaranth가 브라우저에 저장하는 정보, 광고 쿠키, 쿠키 관리 방법을 안내합니다.",
};

// 사이트 코드가 브라우저에 직접 저장하는 항목 — 코드의 저장 키와 1:1로 맞춘다.
// 키를 추가·변경하면 이 표도 함께 고친다.
const STORAGE_ITEMS: { tool: string; where: string; keys: string[]; what: string }[] = [
  {
    tool: "뜨개뜨개",
    where: "localStorage",
    keys: ["knit-muffler-history"],
    what: "챌린지 기록(시간·정확도·실수 횟수), 자유 모드 작품",
  },
  {
    tool: "비주얼 노벨 스튜디오",
    where: "localStorage",
    keys: ["vn-studio-slots", "vn-studio-slot-(작품 ID)"],
    what: "작품 슬롯 목록, 컷·캐릭터·배경 구성",
  },
  {
    tool: "비주얼 노벨 스튜디오",
    where: "IndexedDB",
    keys: ["vn-studio-images"],
    what: "사용자가 올린 배경음악·효과음 오디오 파일",
  },
  {
    tool: "별들은 굉장한 빛메이커이다",
    where: "localStorage",
    keys: ["stellar-sim-v2"],
    what: "게임 진행 상태(자원, 반응로, 세대, 마지막 접속 시각)",
  },
  {
    tool: "올해의 영수증 만들기",
    where: "localStorage",
    keys: ["yearly-receipt-state"],
    what: "목표·하위 항목과 영수증 스타일",
  },
  {
    tool: "네모네모빔",
    where: "localStorage",
    keys: [
      "playground-asset-library",
      "pixel-art-desktop-layout",
      "pixel-art-desktop-order-mobile",
      "pixel-art-desktop-wallpaper",
      "pixel-art-desktop-wallpaper-mobile",
      "pixel-art-last-canvas-size",
      "pixel-art-maker:palette-sets",
    ],
    what: "픽셀아트 작품, 바탕화면 아이콘 배치, 배경화면, 마지막 캔버스 크기, 팔레트",
  },
  {
    tool: "자산 시뮬레이터",
    where: "localStorage",
    keys: ["asset-simulator-onboarding-seen"],
    what: "사용법 안내를 이미 봤는지 여부(입력한 자산 정보는 저장하지 않음)",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 flex flex-col gap-3 leading-relaxed">{children}</div>
    </section>
  );
}

const linkClass = "text-white underline underline-offset-4 hover:text-gray-200";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-gray-950 px-6 py-16 text-gray-300">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        개인정보처리방침
      </h1>
      <p className="mt-3 text-sm text-gray-400">
        시행일: 2026년 10월 4일
      </p>
      <p className="mt-6 leading-relaxed">
        amaranth(amaranth-project.vercel.app, 이하 &lsquo;사이트&rsquo;)는
        브라우저에서 바로 쓰는 도구를 제공합니다. 이 방침은 사이트가 어떤 정보를
        어디에 저장하고, 광고와 관련해 어떤 쿠키가 쓰이는지 설명합니다.
      </p>

      <Section title="1. 사이트가 직접 수집하는 개인정보">
        <p>
          사이트에는 회원가입, 로그인, 문의 입력 양식이 없습니다. 도구에 입력한
          내용과 불러온 파일은 사용자의 브라우저 안에서만 처리하며, 사이트
          운영자의 서버로 전송하지 않습니다.
        </p>
      </Section>

      <Section title="2. 사용자 기기(브라우저)에 저장하는 정보">
        <p>
          작업 내용을 다음 방문 때 이어서 쓸 수 있도록, 일부 도구는 브라우저의
          localStorage 또는 IndexedDB에 데이터를 저장합니다. 이 데이터는 사용자의
          기기에만 남고 서버로 전송되지 않습니다. 사이트 코드가 직접 설정하는
          쿠키는 없습니다.
        </p>
        <ul className="mt-2 flex flex-col gap-3 text-sm">
          {STORAGE_ITEMS.map((item) => (
            <li
              key={`${item.tool}-${item.where}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="font-medium text-white">
                {item.tool}{" "}
                <span className="font-normal text-gray-400">· {item.where}</span>
              </p>
              <p className="mt-1">{item.what}</p>
              <p className="mt-2 font-mono text-xs break-all text-gray-400">
                저장 이름: {item.keys.join(", ")}
              </p>
            </li>
          ))}
        </ul>
        <p>
          저장된 데이터는 브라우저 설정의 &lsquo;사이트 데이터 삭제&rsquo;로 언제든
          지울 수 있습니다. 뜨개뜨개의 &lsquo;기록 초기화&rsquo;, 별들은 굉장한
          빛메이커이다의 &lsquo;전체 초기화&rsquo;, 네모네모빔의 &lsquo;포맷&rsquo;
          아이콘처럼 도구 안의 초기화 기능으로도 지워집니다.
        </p>
      </Section>

      <Section title="3. 사용자가 직접 실행할 때만 쓰는 브라우저 기능">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            파일 선택: 네모네모빔의 이미지 불러오기, 비주얼 노벨 스튜디오의 오디오
            등록은 선택한 파일을 브라우저 안에서만 읽습니다.
          </li>
          <li>
            클립보드: 네모네모빔에서 붙여넣기나 복사 버튼을 누를 때만 클립보드를
            읽거나 씁니다.
          </li>
          <li>
            공유: 뜨개뜨개의 공유하기 버튼을 누르면 기기의 공유 창에 페이지 주소를
            넘깁니다.
          </li>
          <li>
            파일 저장: 이미지·CSV·JSON 내보내기는 사용자의 기기에 파일을 내려받는
            방식으로만 동작합니다.
          </li>
        </ul>
        <p>사이트는 위치 정보를 요청하거나 수집하지 않습니다.</p>
      </Section>

      <Section title="4. 광고와 쿠키 (Google AdSense)">
        <p>
          사이트는 Google AdSense 광고 스크립트를 모든 페이지에서 불러옵니다.
          광고 제공 과정에서 Google과 제3자 공급업체는 사용자의 브라우저에 쿠키를
          저장하거나 읽을 수 있습니다.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Google을 포함한 제3자 공급업체는 쿠키를 사용해 사용자가 이 사이트나
            다른 웹사이트를 이전에 방문한 기록을 바탕으로 광고를 게재합니다.
          </li>
          <li>
            Google은 광고 쿠키를 사용해, Google과 파트너가 사용자의 이 사이트 및
            인터넷상의 다른 사이트 방문 기록을 바탕으로 사용자에게 광고를 게재할 수
            있게 합니다.
          </li>
          <li>
            사용자는{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              광고 설정(https://adssettings.google.com)
            </a>
            에서 맞춤 광고를 해제할 수 있습니다.
          </li>
        </ul>
        <p>
          Google이 파트너 사이트에서 수집한 정보를 어떻게 사용하는지는{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Google 파트너 사이트 데이터 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </p>
      </Section>

      <Section title="5. 쿠키 관리 방법">
        <p>
          대부분의 브라우저는 설정에서 쿠키를 차단하거나 삭제하는 기능을
          제공합니다. Chrome은 &lsquo;설정 → 개인정보 보호 및 보안 → 서드 파티
          쿠키&rsquo;, Safari는 &lsquo;설정 → 개인정보 보호&rsquo;, Firefox는
          &lsquo;설정 → 개인 정보 및 보안&rsquo;에서 관리합니다. 쿠키를 차단해도
          사이트의 도구는 그대로 쓸 수 있지만, 맞춤 광고 대신 일반 광고가 보일 수
          있습니다.
        </p>
      </Section>

      <Section title="6. 외부 서비스로 전송되는 정보">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Google AdSense(pagead2.googlesyndication.com): 광고 스크립트와 광고를
            불러올 때 브라우저가 Google 서버에 접속하며, 이때 IP 주소와 브라우저
            정보, 쿠키가 함께 전달될 수 있습니다.
          </li>
          <li>
            jsDelivr(cdn.jsdelivr.net): 뜨개뜨개에서 쓰는 글꼴 파일을 이 CDN에서
            내려받습니다. 글꼴 요청 과정에서 IP 주소 같은 일반 접속 정보가 CDN에
            전달됩니다.
          </li>
          <li>
            Vercel: 사이트는 Vercel에서 호스팅합니다. 페이지를 전달하는 과정에서
            IP 주소, 브라우저 종류 같은 접속 정보가 호스팅 서버에서 처리될 수
            있으며, 처리 방식은{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Vercel 개인정보처리방침
            </a>
            을 따릅니다.
          </li>
        </ul>
        <p>
          사이트는 별도의 방문자 분석 도구(Google Analytics 등)를 사용하지
          않습니다.
        </p>
      </Section>

      <Section title="7. 방침의 변경">
        <p>
          이 방침의 내용이 바뀌면 이 페이지에 변경 내용과 새 시행일을
          게시합니다.
        </p>
      </Section>

      <Section title="8. 문의처">
        <p>
          개인정보 처리와 관련한 문의는 아래 이메일로 보내 주세요.
        </p>
        <p>
          이메일:{" "}
          <a href="mailto:songsy405@naver.com" className={linkClass}>
            songsy405@naver.com
          </a>
        </p>
      </Section>

      <p className="mt-16 text-sm">
        <Link href="/" className={linkClass}>
          홈으로 돌아가기
        </Link>
      </p>
    </main>
  );
}
