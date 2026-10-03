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
 * 도구 페이지 하단 설명 섹션. 서버 컴포넌트라 초기 HTML에 텍스트가 그대로
 * 들어간다 — 인터랙션 영역(<main>) 아래에 붙인다.
 */
export default function ToolGuide({ content }: { content: ToolGuideContent }) {
  const { name, intro, steps, notes, faq } = content;

  return (
    <article
      aria-labelledby="tool-guide-title"
      className="border-t border-white/10 bg-gray-950 text-gray-300"
    >
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h2
          id="tool-guide-title"
          className="text-2xl font-bold tracking-tight text-white"
        >
          {name} 안내
        </h2>
        <div className="mt-4 flex flex-col gap-3 leading-relaxed">
          {intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <section className="mt-12">
          <h3 className="text-lg font-semibold text-white">사용 방법</h3>
          <ol className="mt-4 flex flex-col gap-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-white">{step.title}</p>
                  <p className="mt-1 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h3 className="text-lg font-semibold text-white">알아 두면 좋은 점</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {notes.map((note) => (
              <div
                key={note.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <h4 className="font-medium text-white">{note.title}</h4>
                <p className="mt-2 text-sm leading-relaxed">{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h3 className="text-lg font-semibold text-white">자주 묻는 질문</h3>
          <dl className="mt-4 flex flex-col divide-y divide-white/10">
            {faq.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="font-medium text-white">{item.q}</dt>
                <dd className="mt-1 leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </article>
  );
}
