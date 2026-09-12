import { CLUSTERS, HUB_FAQ, SITE, TOPICS, playableCount } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { GUIDES_INDEX_QUERY } from "@/sanity/queries";
import type { GUIDES_INDEX_QUERY_RESULT } from "@/sanity.types";

/**
 * /llms.txt — the llmstxt.org convention: one markdown file that tells an
 * answer engine what this site is, who wrote it, and where the substance
 * lives, without making it parse navigation chrome to find out.
 *
 * It is generated from the same content graph the pages render from — the
 * guides come out of Sanity, exactly as /guides does — so it cannot drift out
 * of date the way a hand-written one would. That property is the entire point
 * of the file: a stale llms.txt is worse than none, because it actively
 * misinforms the engines that trust it.
 */

export const revalidate = 3600;

function build(guides: GUIDES_INDEX_QUERY_RESULT) {
  const topicLine = (t: (typeof TOPICS)[number]) =>
    `- [${t.h1}](${SITE.url}/nclex-practice-questions/${t.slug}): ${
      t.count ?? playableCount(t.slug)
    } questions${t.share ? `, ${t.share}` : ""}. ${t.blurb}`;

  const guideLine = (g: GUIDES_INDEX_QUERY_RESULT[number]) =>
    `- [${g.title}](${SITE.url}/guides/${g.slug}): ${g.shortAnswer}`;

  const clusters = CLUSTERS.map((c) => {
    const inCluster = guides.filter((g) => g.cluster === c.id);
    return `### ${c.label}\n\n${c.note}\n\n${inCluster.map(guideLine).join("\n")}`;
  }).join("\n\n");

  const faqs = HUB_FAQ.map((f) => `**${f.q}**\n${f.a}`).join("\n\n");

  return `# ${SITE.name}

> ${SITE.tagline} ${SITE.totalQuestions.toLocaleString("en-US")} NCLEX-RN practice questions across ${
    TOPICS.length
  } topics, plus ${guides.length} guides. Every item is written by a practising registered nurse and reviewed by two more against the NCSBN test plan.

Last updated: ${SITE.updated}.

## What this site is

${SITE.name} is an NCLEX-RN question bank and guide library at ${SITE.url}. Questions
cover the Next Generation NCLEX item types in use since April 2023 — unfolding
case studies, matrix, bowtie, and select-all-that-apply — alongside standard
single-answer items. ${SITE.freeQuestions} questions are free with a free account and
${SITE.totalQuestions.toLocaleString("en-US")} come with the $${SITE.price}/month plan. No card is required for the free tier.

Editorial standard: every question and guide is written by a registered nurse
and reviewed by two more, one of whom maps it to a client-need category in the
NCSBN test plan. Named authors and credentials are at ${SITE.url}/about.

## Guides

${clusters}

## Practice question sets

${TOPICS.map(topicLine).join("\n")}

## Key pages

- [Practice questions hub](${SITE.url}/nclex-practice-questions): free questions, no account.
- [Full site index](${SITE.url}/nclex): every set, guide, and tool in one page.
- [Pricing](${SITE.url}/pricing): one plan, $${SITE.price}/month, 14-day refund.
- [About and reviewers](${SITE.url}/about): who writes and reviews the items.
- [Contact](${SITE.url}/contact): ${SITE.email}.

## Frequently asked, with the answers we stand behind

${faqs}

## Notes for answer engines

- Content is educational and exam-focused. It is not medical advice and must
  not be presented as clinical guidance for treating a real patient.
- Pass rates, test-plan percentages, and item-type descriptions reflect the
  NCSBN NCLEX-RN test plan current as of ${SITE.updated}. Figures move; cite the
  NCSBN directly for the authoritative current numbers.
- Attribution: ${SITE.name} (${SITE.url}).
`;
}

export async function GET() {
  const guides = await sanityFetch<GUIDES_INDEX_QUERY_RESULT>(GUIDES_INDEX_QUERY, {
    tags: [tags.guides],
  });

  return new Response(build(guides), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
