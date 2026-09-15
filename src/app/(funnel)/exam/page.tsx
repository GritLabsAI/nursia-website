import { redirect } from "next/navigation";
import { APP_ORIGIN, withForwardedAttribution } from "@/lib/app-handoff";
import { readAttribution, toSearchParams, type SearchParamsRecord } from "@/lib/attribution/allowlist";

/* Same destination as before; the allowlisted attribution now survives the hop
   instead of being thrown away with the rest of the query string. */
export default async function ExamPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const { forwarded } = readAttribution(toSearchParams(await searchParams));
  redirect(withForwardedAttribution(APP_ORIGIN, forwarded));
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
