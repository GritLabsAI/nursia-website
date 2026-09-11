import { defineQuery } from "next-sanity";

/**
 * Every GROQ query the site runs, in one file so TypeGen can find them and so
 * nobody adds a fortieth variant of "fetch a guide" in a page component.
 *
 * Two rules hold throughout: project only the fields the page renders, and
 * resolve `internalLink` annotations down to a slug here rather than
 * dereferencing in the renderer. The second one matters more than it looks —
 * a Portable Text component that has to resolve a reference turns one query
 * into one query per link, on a page whose whole job is to arrive fast.
 */

/* The annotations on body copy, resolved to something renderable. Spelled out
   once per field name because TypeGen reads these interpolations statically —
   it parses the source, it does not run it, so a `.replace()` here would type
   as `any` and quietly take the whole page's types with it. */
const blockFragment = /* groq */ `
  ...,
  _type == "block" => {
    ...,
    markDefs[]{
      ...,
      _type == "internalLink" => {
        "docType": reference->_type,
        "slug": reference->slug.current
      }
    }
  }
`;

const bodyFragment = /* groq */ `body[]{ ${blockFragment} }`;

const contentFragment = /* groq */ `content[]{ ${blockFragment} }`;

/** Author, with the parts that schema.org actually reads. */
const authorFragment = /* groq */ `
  name,
  honorific,
  jobTitle,
  knowsAbout,
  sameAs
`;

/**
 * The conversion block: the free resource and whichever experiment is running
 * on it. `variants` come through whole because assignment happens in the
 * browser — the server cannot know which arm this reader is in without either
 * a cookie read (which would make the page dynamic) or a guess.
 */
const conversionFragment = /* groq */ `
  "leadMagnet": leadMagnet->{
    title,
    "slug": slug.current,
    kind,
    promise,
    contains,
    headline,
    body,
    ctaLabel,
    delivery,
    destination,
    "file": file.asset->url
  },
  "experiment": experiment->{
    "key": key.current,
    status,
    metric,
    variants[]{ _key, key, weight, headline, body, ctaLabel, placement }
  }
`;

/** Slugs only, for generateStaticParams. */
export const GUIDE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && defined(slug.current)].slug.current
`);

/** One guide, fully expanded — the page query. */
export const GUIDE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && slug.current == $slug][0]{
    _id,
    title,
    h1,
    "slug": slug.current,
    cluster,
    minutes,
    shortAnswer,
    publishedAt,
    updatedAt,
    seo,
    sections[]{ _key, h2, ${bodyFragment} },
    faqs[]{ _key, q, a },
    "topic": topic->{
      name,
      "slug": slug.current,
      category,
      share
    },
    "author": author->{ ${authorFragment} },
    "reviewedBy": reviewedBy->{ name, honorific },
    ${conversionFragment},
    "readNext": readNext[]->{
      title,
      "slug": slug.current,
      minutes,
      cluster
    },
    "relatedReviews": relatedReviews[]->{
      title,
      "slug": slug.current,
      minutes,
      kind
    }
  }
`);

/** Just the metadata, for generateMetadata — no body, no conversion block. */
export const GUIDE_SEO_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && slug.current == $slug][0]{
    title,
    h1,
    "slug": slug.current,
    shortAnswer,
    publishedAt,
    updatedAt,
    seo,
    "authorName": author->name,
    "authorHonorific": author->honorific
  }
`);

/** The /guides index, grouped by cluster in the page. */
export const GUIDES_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && defined(slug.current)] | order(cluster asc, title asc){
    _id,
    title,
    "slug": slug.current,
    cluster,
    minutes,
    shortAnswer,
    updatedAt,
    "topicSlug": topic->slug.current,
    "hasResource": defined(leadMagnet)
  }
`);

/** Slug plus lastmod, for the sitemap. */
export const GUIDES_SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && defined(slug.current) && seo.noIndex != true]{
    "slug": slug.current,
    updatedAt
  }
`);

/**
 * Guides pointing at one topic, for the topic page's further-reading rail.
 *
 * A reverse reference rather than a curated list of slugs. The curated version
 * was correct on the day it was written and has no way of knowing that five
 * guides have been published since — this one gains a guide the moment one
 * points at the topic, which is exactly when it should.
 */
export const GUIDES_FOR_TOPIC_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && topic->slug.current == $topic] | order(title asc)[0...6]{
    _id,
    title,
    "slug": slug.current,
    minutes
  }
`);

/** Named guides, for the handful of places that link to specific ones. */
export const GUIDES_BY_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "guide" && slug.current in $slugs]{
    _id,
    title,
    "slug": slug.current,
    minutes
  }
`);

/** One free resource, for the page that delivers it after signup. */
export const LEAD_MAGNET_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "leadMagnet" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    kind,
    promise,
    contains,
    delivery,
    destination,
    "file": file.asset->url,
    ${contentFragment}
  }
`);

/* ------------------------------------------------------------ review pages */

/**
 * The review programme: one page per exam subject, published in batches by the
 * pipeline in `pipeline/nclex/`.
 *
 * These queries are separate from the guide ones rather than generalised across
 * both types, even though the two shapes rhyme. Sharing them would mean every
 * projection carries the union of both documents' fields and every page
 * component guards against the half it does not use — and the first time the
 * two shapes genuinely diverge, the shared query becomes the reason neither can
 * change. The conversion fragment *is* shared, because that part is the same
 * offer by design.
 */

/** Slugs only, for generateStaticParams. */
export const SEO_PAGE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && defined(slug.current)].slug.current
`);

/** One review page, fully expanded — the page query. */
export const SEO_PAGE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && slug.current == $slug][0]{
    _id,
    title,
    h1,
    "slug": slug.current,
    kind,
    examCategory,
    cluster,
    minutes,
    shortAnswer,
    keyPoints,
    examTip,
    publishedAt,
    updatedAt,
    seo,
    sections[]{ _key, h2, ${bodyFragment} },
    faqs[]{ _key, q, a },
    "topic": topic->{
      name,
      "slug": slug.current,
      category,
      share
    },
    "author": author->{ ${authorFragment} },
    "reviewedBy": reviewedBy->{ name, honorific },
    ${conversionFragment},
    "readNext": readNext[]->{
      title,
      "slug": slug.current,
      minutes,
      kind,
      examCategory
    },
    "relatedGuides": relatedGuides[]->{
      title,
      "slug": slug.current,
      minutes
    }
  }
`);

/** Just the metadata, for generateMetadata — no body, no conversion block. */
export const SEO_PAGE_SEO_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && slug.current == $slug][0]{
    title,
    h1,
    "slug": slug.current,
    shortAnswer,
    publishedAt,
    updatedAt,
    seo,
    "authorName": author->name,
    "authorHonorific": author->honorific
  }
`);

/** The /nclex-review index, grouped by test plan category in the page. */
export const SEO_PAGES_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && defined(slug.current)] | order(examCategory asc, title asc){
    _id,
    title,
    "slug": slug.current,
    kind,
    examCategory,
    minutes,
    shortAnswer,
    updatedAt,
    "topicSlug": topic->slug.current
  }
`);

/** Slug plus lastmod, for the sitemap. */
export const SEO_PAGES_SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && defined(slug.current) && seo.noIndex != true]{
    "slug": slug.current,
    updatedAt
  }
`);

/**
 * Review pages pointing at one question set, for the topic page's rail.
 *
 * A reverse reference, like the guide equivalent, and it is doing more work
 * than it looks: it is the inbound link that stops a newly published review
 * page being reachable only from the sitemap. The topic pages already rank, so
 * a link from one is worth considerably more than a link from the new index.
 */
export const SEO_PAGES_FOR_TOPIC_QUERY = defineQuery(/* groq */ `
  *[_type == "seoPage" && topic->slug.current == $topic] | order(title asc)[0...6]{
    _id,
    title,
    "slug": slug.current,
    kind,
    minutes
  }
`);
