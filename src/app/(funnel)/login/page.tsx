import { redirect } from "next/navigation";
import { APP_LOGIN_URL, withForwardedAttribution } from "@/lib/app-handoff";
import { readAttribution, toSearchParams, type SearchParamsRecord } from "@/lib/attribution/allowlist";

/* Straight to the app's login screen now, not the app root: this route is
   named /login, so it should not make a visitor sit through the root's
   splash-then-redirect on the way there. The allowlisted attribution still
   survives the hop. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const { forwarded } = readAttribution(toSearchParams(await searchParams));
  redirect(withForwardedAttribution(APP_LOGIN_URL, forwarded));
}

// import type { Metadata } from "next";
// import { SignupForm } from "@/components/SignupForm";
// import { FunnelHeader } from "@/components/FunnelHeader";
//
// export const metadata: Metadata = {
//   title: "Log in",
//   robots: { index: false, follow: true },
// };
//
// export default function LoginPage() {
//   return (
//     <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
//       <FunnelHeader altHref="/signup" altLabel="Start free" />
//
//       <div className="mx-auto max-w-md pb-16 pt-8 sm:pt-12">
//         <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2rem]">Welcome back</h1>
//         <p className="mt-3 font-body text-[1.0625rem] leading-[1.6] text-ink-2">
//           Your progress, review list, and free-question count are waiting where you left them.
//         </p>
//         <div className="mt-6">
//           {/* The form carries the "no account yet?" line itself, in both modes. */}
//           <SignupForm mode="login" />
//         </div>
//       </div>
//     </div>
//   );
// }
