import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { QuestionSet } from "@/components/QuestionSet";
import { QUESTIONS, TOPICS } from "@/lib/content";

/** A 404 is still a page. It gets a question, like everything else here. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[1140px] px-5 py-16 sm:px-8">
          <p className="eyebrow">404</p>
          <h1 className="mt-4 max-w-xl text-[2.25rem] leading-[1.05] sm:text-[2.75rem]">
            That page does not exist. <span className="mark">This question does.</span>
          </h1>
          <p className="mt-5 max-w-lg font-body text-[1.0625rem] leading-relaxed text-ink-2">
            Either we moved something or the link was wrong. Answer this while you decide where to
            go next.
          </p>

          <div className="mt-9 max-w-2xl">
            <QuestionSet questions={[QUESTIONS["safe-011"]]} />
          </div>

          <div className="mt-12 border-t border-rule pt-5">
            <p className="eyebrow">Try one of these</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <li>
                <Link href="/nclex-practice-questions" className="cell h-full">
                  <p className="font-display text-[0.9375rem] font-bold text-ink">
                    10 free questions
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">the practice hub</p>
                </Link>
              </li>
              <li>
                <Link href="/guides" className="cell h-full">
                  <p className="font-display text-[0.9375rem] font-bold text-ink">Guides</p>
                  <p className="mt-1 font-mono text-[11px] text-muted">nine of them</p>
                </Link>
              </li>
              <li>
                <Link href="/nclex" className="cell h-full">
                  <p className="font-display text-[0.9375rem] font-bold text-ink">
                    Everything on the site
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">full index</p>
                </Link>
              </li>
              <li>
                <Link href={`/nclex-practice-questions/${TOPICS[0].slug}`} className="cell h-full">
                  <p className="font-display text-[0.9375rem] font-bold text-ink">
                    {TOPICS[0].name}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">{TOPICS[0].count} questions</p>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
