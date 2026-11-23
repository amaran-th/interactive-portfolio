export type ToolGuideContent = {
  /** 섹션 제목에 쓰는 도구 이름 */
  name: string;
  /** 도구의 목적 — 문단 단위 */
  intro: string[];
  /** 실제 UI 기준 사용 방법 — 순서대로 */
  steps: { title: string; body: string }[];
  /** 도구 주제와 관련된 정보 */
  notes: { title: string; body: string }[];
  faq: { q: string; a: string }[];
};

/**
 * 도구 안내 본문. 서버 컴포넌트라 초기 HTML에 텍스트가 그대로 들어간다 —
 * ToolShell 상단 바의 '사용 안내' 드로어(GuideDialog) 안에서 렌더된다.
 */
const LABELS = {
  ko: { guide: (n: string) => `${n} 안내`, steps: "사용 방법", notes: "알아 두면 좋은 점", faq: "자주 묻는 질문" },
  en: { guide: (n: string) => `About ${n}`, steps: "How to use", notes: "Good to know", faq: "FAQ" },
};

export default function ToolGuide({ content, lang = "ko" }: { content: ToolGuideContent; lang?: "ko" | "en" }) {
  const { name, intro, steps, notes, faq } = content;
  const l = LABELS[lang];

  return (
    <article aria-labelledby="tool-guide-title" className="text-ink">
      <div className="px-6 py-8">
        <h2
          id="tool-guide-title"
          className="text-2xl font-extrabold tracking-tight text-point"
        >
          {l.guide(name)}
        </h2>
        <div className="mt-4 flex flex-col gap-3 leading-relaxed">
          {intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <section className="mt-12">
          <h3 className="text-lg font-bold text-point">{l.steps}</h3>
          <ol className="mt-4 flex flex-col gap-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-point bg-sub text-sm font-bold text-point">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-point">{step.title}</p>
                  <p className="mt-1 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h3 className="text-lg font-bold text-point">{l.notes}</h3>
          <div className="mt-4 grid gap-4">
            {notes.map((note) => (
              <div
                key={note.title}
                className="rounded-lg border-2 border-point bg-shade p-4"
              >
                <h4 className="font-bold text-point">{note.title}</h4>
                <p className="mt-2 text-sm leading-relaxed">{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h3 className="text-lg font-bold text-point">{l.faq}</h3>
          <dl className="mt-4 flex flex-col divide-y-2 divide-sub">
            {faq.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="font-bold text-point">{item.q}</dt>
                <dd className="mt-1 leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </article>
  );
}
