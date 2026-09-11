import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Section } from "@/components/Blocks";
import { PortableBody } from "@/components/PortableBody";
import { ResourceUnlock } from "@/components/ResourceUnlock";
import { buildClient, sanityFetch, tags } from "@/sanity/client";
import { LEAD_MAGNET_BY_SLUG_QUERY } from "@/sanity/queries";
import type { LEAD_MAGNET_BY_SLUG_QUERYResult } from "@/sanity.types";

/**
 * Where a free resource actually lives.
 *
 * Deliberately plain. This page is the end of a promise rather than a place to
 * make another one — somebody arrived here because they made an account to
 * read a specific thing, and putting a second offer above it is how a brand
 * teaches people that its free things come with a catch. There is one link out
 * at the bottom, to the practice set the resource is about.
 *
 * `noindex`, and disallowed in robots.ts. The guide that offers the resource
 * is the page built to rank; this one exists for people who are already
 * through the door.
 */

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await buildClient.fetch<string[]>(
    `*[_type == "leadMagnet" && delivery == "page" && defined(slug.current)].slug.current`,
  );
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const r = await sanityFetch<LEAD_MAGNET_BY_SLUG_QUERYResult>(
    LEAD_MAGNET_BY_SLUG_QUERY,
    { params: { slug }, tags: [tags.leadMagnets] },
  );
  if (!r) return {};
  return {
    title: { absolute: `${r.title} | Nursia` },
    description: r.promise,
    alternates: { canonical: `/resources/${r.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function ResourcePage({ params }: Params) {
  const { slug } = await params;
  const r = await sanityFetch<LEAD_MAGNET_BY_SLUG_QUERYResult>(
    LEAD_MAGNET_BY_SLUG_QUERY,
    { params: { slug }, tags: [tags.leadMagnets] },
  );
  if (!r) notFound();

  /* A resource whose delivery is a question set or a file has no page of its
     own — it *is* the destination. Landing here means a stale link, and
     forwarding is better than a 404 for someone who has just made an account
     specifically to get this. */
  if (r.delivery !== "page") {
    if (r.delivery === "file" && r.file) redirect(r.file);
    if (r.destination) redirect(r.destination);
  }

  const trail = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: r.title! },
  ];

  return (
    <Section className="pt-10 pb-14">
      <div className="max-w-[42rem]">
        <Breadcrumbs trail={trail} />

        <p className="eyebrow">Free with your account</p>
        <h1 className="mt-3 text-[2.125rem] leading-[1.05] sm:text-[2.5rem]">{r.title}</h1>
        <p className="mt-5 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.125rem]">
          {r.promise}
        </p>

        <ResourceUnlock slug={r.slug!} kind={r.kind} title={r.title!}>
          <div className="prose-ns mt-10 border-t border-rule pt-8">
            <PortableBody value={r.content} />
          </div>

          {r.destination && (
            <div className="mt-12 border-t border-rule pt-5">
              <p className="eyebrow">Now use it</p>
              <p className="mt-3 font-body text-[0.9375rem] leading-relaxed text-ink-2">
                Reading this once will not move a score. Meeting the same material inside questions
                will.
              </p>
              <Link href="/practice" className="btn btn-ghost mt-4 inline-flex">
                Open a question set →
              </Link>
            </div>
          )}
        </ResourceUnlock>
      </div>
      <CtaBand />
    </Section>
  );
}
