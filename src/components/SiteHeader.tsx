import Link from "next/link";
import { Wordmark } from "./Wordmark";

const NAV = [
  { label: "Practice", href: "/nclex-practice-questions" },
  { label: "Guides", href: "/guides" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/**
 * Five links, "Log in" as plain text, "Start free" as the only solid button.
 * The wording of that button never changes anywhere on the site.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-sm">
      {/* Three columns rather than a flex row, so the nav centres on the bar
          itself and does not drift when the wordmark or the buttons change width. */}
      <div className="mx-auto grid h-16 max-w-[1140px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center justify-self-start" aria-label="Nursia — home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 justify-self-center lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.9375rem] font-medium tracking-[-0.01em] text-ink-2 transition-colors hover:text-teal"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-self-end sm:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-ink-2 transition-colors hover:text-teal sm:text-[0.9375rem]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary !px-3.5 !py-2 !text-[0.8125rem] sm:!px-[1.375rem] sm:!py-2.5 sm:!text-sm"
          >
            Start free
          </Link>
        </div>
      </div>

      {/* Small screens: the five links move to a scrollable rail rather than
          a hamburger — one tap instead of two, and the sitemap stays visible. */}
      <nav
        aria-label="Sections"
        className="flex gap-5 overflow-x-auto border-t border-rule px-5 py-2.5 lg:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 text-sm font-medium text-ink-2 transition-colors hover:text-teal"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/** Signed-in shell: product navigation, plus the free-tier counter. */
export function AppHeader({ questionsLeft }: { questionsLeft: number }) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center gap-7 px-5 sm:px-8">
        <Link href="/" className="flex items-center" aria-label="Nursia — home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6">
          <span className="text-[0.9375rem] font-semibold text-ink">Practice</span>
          <Link
            href="/nclex"
            className="text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
          >
            Progress
          </Link>
          <Link
            href="/guides"
            className="hidden text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal sm:block"
          >
            Guides
          </Link>
        </nav>
        <span className="eyebrow ml-auto shrink-0 rounded-sm border border-rule bg-white px-2.5 py-1.5 !text-[10px] text-ink">
          {questionsLeft} free left
        </span>
      </div>
    </header>
  );
}
