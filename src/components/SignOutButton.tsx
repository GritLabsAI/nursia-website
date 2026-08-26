"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/session";

/**
 * There was no way out of the signed-in shell before there were real accounts
 * to be signed into. Sends you home rather than leaving you on a page that is
 * about to become a gate.
 *
 * Its own file so <SiteHeader> stays a server component: it is on every public
 * page, and none of them should be paying for the auth bundle.
 */
export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        void signOut().then(() => router.push("/"));
      }}
      className="shrink-0 text-[0.8125rem] font-medium text-muted transition-colors hover:text-ink"
    >
      Sign out
    </button>
  );
}
