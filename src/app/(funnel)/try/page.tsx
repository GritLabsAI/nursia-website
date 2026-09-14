import { redirect } from "next/navigation";
import { APP_URL, type SearchParams, withCarried } from "@/lib/app-handoff";

/*
 * A redirect that keeps its job and stops discarding the reason people arrived
 * (NUR-01). A bare redirect() drops the query string, which is how a campaign
 * ends up bidding toward a conversion it cannot attribute. The app has no
 * per-page route for this, so the visitor lands on its root with everything
 * carried.
 */
export default async function TryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  redirect(withCarried(APP_URL, await searchParams));
}

// import type { Metadata } from "next";
// import { TryClient } from "@/components/TryClient";
//
// export const metadata: Metadata = {
//   title: "Practice — your first session",
//   description: "Pick where to start: a diagnostic, or a topic you already know is weak.",
//   robots: { index: false, follow: false },
// };
//
// /**
//  * /try is behind the gate now. Everything that used to make this page the
//  * public proof — the sample questions — moved out to the homepage, the hub, and
//  * the eight topic pages, which are the pages that rank anyway.
//  */
// export default function TryPage() {
//   return <TryClient />;
// }
