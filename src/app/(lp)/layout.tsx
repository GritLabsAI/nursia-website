import { MinimalFooter } from "@/components/SiteFooter";

/**
 * Paid landing pages. No site header and no sitemap footer — the only nav a
 * page bought with ad money should offer is the CTA and the legal links the
 * ad platforms require.
 */
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="flex-1">
        {children}
      </main>
      <MinimalFooter />
    </div>
  );
}
