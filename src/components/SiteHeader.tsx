"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
 *
 * The five links used to sit on a second scrollable rail on small screens,
 * which cost 210px of a 844px phone — a quarter of the viewport, pinned,
 * on every scroll. They live in a sheet now, so the phone bar carries the
 * wordmark and the one action and nothing else.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // a tap on a link inside the sheet does not unmount the header, so close by route
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-sm">
      {/* From lg up: three columns, so the nav centres on the bar itself and does
          not drift when the wordmark or the buttons change width. Below lg the nav
          is display:none, which would take it out of the grid entirely and let the
          buttons auto-place into the empty middle column — so small screens use a
          plain flex row that keeps them on the right gutter. */}
      <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between gap-6 px-5 sm:h-16 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
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

        <div className="col-start-3 flex items-center gap-2 justify-self-end sm:gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-ink-2 transition-colors hover:text-teal sm:block sm:text-[0.9375rem]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary !min-h-0 !px-3.5 !py-2 !text-[0.8125rem] sm:!px-[1.375rem] sm:!py-2.5 sm:!text-sm"
          >
            Start free
          </Link>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-sm text-ink transition-colors hover:bg-paper-2 lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* The sheet: full-width rows, thumb-sized, and it never renders on lg. */}
      <div
        id="site-menu"
        hidden={!open}
        className="border-t border-rule bg-paper lg:hidden"
      >
        <nav aria-label="Sections" className="mx-auto max-w-[1140px] px-5 py-2 sm:px-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-12 items-center border-b border-rule/70 text-[1rem] font-medium text-ink transition-colors last:border-b-0 hover:text-teal"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="flex min-h-12 items-center border-t border-rule/70 font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2 transition-colors hover:text-teal"
          >
            Log in
          </Link>
        </nav>
      </div>
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
