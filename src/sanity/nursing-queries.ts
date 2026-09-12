import { defineQuery } from "next-sanity";

/**
 * The queries for the nursing library at /nursing.
 *
 * A separate file from `queries.ts` rather than an addition to it, for one
 * practical reason: TypeGen scans every file under `src/`, so the split costs
 * nothing, and the guides and review programmes are being edited in parallel
 * with this one. Two programmes appending to one file is a merge conflict per
 * query for no benefit.
 *
 * The rules from `queries.ts` still hold, and matter more here than there:
 * project only the fields the page renders, and resolve `internalLink`
 * annotations to a slug in the query rather than dereferencing in the
 * renderer. At a thousand pages, a component that resolves a reference while
 * rendering turns one query into one query per link, on pages whose entire
 * value proposition is arriving fast from a search result.
 */

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

const authorFragment = /* groq */ `
  name,
  honorific,
  jobTitle,
  knowsAbout,
  sameAs
`;

/** Slugs only, for generateStaticParams. */
export const NURSING_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "nursingPage" && defined(slug.current)].slug.current
`);

/** One page, fully expanded — the page query. */
export const NURSING_PAGE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "nursingPage" && slug.current == $slug][0]{
    "slug": slug.current,
    title,
    h1,
    family,
    entity,
    shortAnswer,
    minutes,
    publishedAt,
    updatedAt,
    seo,
    sections[]{ _key, h2, ${bodyFragment} },
    faqs[]{ q, a },
    "topic": topic->{ "slug": slug.current, "title": name },
    "author": author->{ ${authorFragment} },
    "reviewedBy": reviewedBy->{ name, honorific },
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
    },
    "readNext": readNext[]->{ "slug": slug.current, title, entity, family, minutes },
    "relatedGuides": relatedGuides[]->{ "slug": slug.current, title, shortAnswer }
  }
`);

/** Just what generateMetadata needs, so the head does not pull a whole page. */
export const NURSING_PAGE_SEO_QUERY = defineQuery(/* groq */ `
  *[_type == "nursingPage" && slug.current == $slug][0]{
    "slug": slug.current,
    title,
    h1,
    shortAnswer,
    publishedAt,
    updatedAt,
    seo,
    "authorName": author->name,
    "authorHonorific": author->honorific
  }
`);

/**
 * The index, grouped by question-bank topic.
 *
 * Ordered by topic then title so the hub renders as a browsable structure
 * rather than a thousand-item list in publication order. A list nobody can
 * navigate is a list a crawler discovers one page of.
 */
export const NURSING_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "nursingPage" && defined(slug.current)]
    | order(topic->name asc, title asc){
      "slug": slug.current,
      title,
      entity,
      family,
      minutes,
      shortAnswer,
      "topic": topic->{ "slug": slug.current, "title": name }
    }
`);

/** Slug and date only — the sitemap must not pull bodies for a thousand rows. */
export const NURSING_SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "nursingPage" && defined(slug.current) && seo.noIndex != true]{
    "slug": slug.current,
    updatedAt
  }
`);
