import { redirect } from "next/navigation";
import { APP_URL, type SearchParams, withCarried } from "@/lib/app-handoff";

/*
 * A redirect that keeps its job and stops discarding the reason people arrived
 * (NUR-01). A bare redirect() drops the query string, which is how a campaign
 * ends up bidding toward a conversion it cannot attribute. The app has no
 * per-page route for this, so the visitor lands on its root with everything
 * carried.
 */
export default async function ExamPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  redirect(withCarried(APP_URL, await searchParams));
}

// import type { Metadata } from "next";
// import { ExamClient } from "@/components/exam/ExamClient";
//
// export const metadata: Metadata = {
//   title: "The 50-question exam",
//   description: "Fifty NCLEX-RN questions under exam conditions, scored into a category report.",
//   robots: { index: false, follow: false },
// };
//
// /**
//  * Behind the gate, and noindex: the public pages are what rank, and a page
//  * that only makes sense with a session on it has nothing to offer a crawler.
//  */
// export default function ExamPage() {
//   return <ExamClient />;
// }
