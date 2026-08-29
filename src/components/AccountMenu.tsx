"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { hasAuthHint } from "@/lib/auth-hint";
import type { Session } from "@/lib/session";

/**
 * The right-hand end of the header: two links when signed out, a profile menu
 * when signed in.
 *
 * The header sits on every public page, so this must not drag Firebase Auth
 * into the bundle of a topic page that a search engine sent someone to. It
 * does not import the auth module at all — it reads the one-bit hint (see
 * lib/auth-hint), and only a browser that might be signed in pays to load the
 * real thing, asynchronously, after paint.
 *
 * First paint is always the signed-out markup, which is what the server
 * rendered, so hydration matches. A signed-in reader sees the menu swap in a
 * moment later. That is the right way round: the flash belongs to the small
 * signed-in audience, not to the anonymous majority.
 */
export function AccountMenu() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  /** the loaded module, kept so signing out does not import it a second time */
  const auth = useRef<typeof import("@/lib/session") | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasAuthHint()) return;

    let live = true;
    let stop: (() => void) | undefined;

    void import("@/lib/session").then((mod) => {
      if (!live) return;
      auth.current = mod;
      const sync = () => setSession(mod.getSnapshot());
      stop = mod.subscribe(sync);
      sync();
    });

    return () => {
      live = false;
      stop?.();
    };
  }, []);

  /* Click outside and Escape both close it — a menu that can only be dismissed
     by its own button is a trap on a phone. */
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!session) {
    return (
      <>
        <Link
          href="/login"
          className="text-sm font-medium text-ink-2 transition-colors hover:text-teal sm:text-[0.9375rem]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="btn btn-primary !min-h-0 !px-3.5 !py-2 !text-[0.8125rem] sm:!px-[1.375rem] sm:!py-2.5 sm:!text-sm"
        >
          Start free
        </Link>
      </>
    );
  }

  const label = session.name || session.email;
  const initial = (label[0] ?? "?").toUpperCase();

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-9 items-center gap-2 rounded-sm border border-rule bg-white px-2 py-1 transition-colors hover:border-ink"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal font-mono text-[11px] font-semibold text-white">
          {initial}
        </span>
        {/* The address is the only name we have, and it is too long for a
            phone header — so it appears from sm up and the initial carries it
            below that. */}
        <span className="hidden max-w-[11rem] truncate text-[0.875rem] text-ink-2 sm:block">
          {label}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="reveal absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 rounded-sm border border-ink bg-white p-1.5 shadow-[0_18px_40px_-24px_rgba(20,22,26,0.6)]"
        >
          <p className="truncate px-2.5 py-2 font-mono text-[11px] text-muted" title={session.email}>
            {session.email}
          </p>
          <div className="my-1 h-px bg-rule" aria-hidden />

          {[
            { href: "/try", label: "Your practice" },
            { href: "/exam", label: "The 50-question exam" },
            { href: "/practice", label: "Drill by topic" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-sm px-2.5 py-2 text-[0.875rem] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}

          <div className="my-1 h-px bg-rule" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void auth.current?.signOut().then(() => router.push("/"));
            }}
            className="block w-full rounded-sm px-2.5 py-2 text-left text-[0.875rem] text-ink-2 transition-colors hover:bg-paper-2 hover:text-wrong"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
