import { MinimalFooter } from "@/components/SiteFooter";

/** /signup and /try: one job per page, so the full sitemap footer stays off. */
export default function FunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="flex-1">
        {children}
      </main>
      <MinimalFooter />
    </div>
  );
}
