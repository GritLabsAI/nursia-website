import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { Wordmark } from "./Wordmark";

/**
 * Signed-in shell: product navigation, plus how far into the exam they are.
 *
 * Its own file rather than sitting beside <SiteHeader>: it pulls in the sign
 * out button, which pulls in Firebase Auth, and <SiteHeader> is on every
 * public page. Sharing a module put the whole auth bundle in the payload of a
 * topic page that a search engine sent someone to.
 * This chip used to count a free tier down; there is no tier to count while
 * everything is free, and a counter with a paywall behind it was the whole
 * point of it.
 */
export function AppHeader({ questionsAnswered }: { questionsAnswered: number }) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center gap-7 px-5 sm:px-8">
        <Link href="/" className="flex items-center" aria-label="Nursia — home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6">
          <span className="text-[0.9375rem] font-semibold text-ink">Practice</span>
          <Link
            href="/exam"
            className="text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
          >
            Exam
          </Link>
          <Link
            href="/guides"
            className="hidden text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal sm:block"
          >
            Guides
          </Link>
        </nav>
        <span className="eyebrow ml-auto shrink-0 rounded-sm border border-rule bg-white px-2.5 py-1.5 !text-[10px] text-ink">
          {questionsAnswered > 0 ? `${questionsAnswered} answered` : "Free access"}
        </span>

        <SignOutButton />
      </div>
    </header>
  );
}
