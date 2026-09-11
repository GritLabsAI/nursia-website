import { BookIcon, DocumentTextIcon, PackageIcon, HeartIcon, SplitHorizontalIcon, TagIcon, UserIcon, WarningOutlineIcon } from "@sanity/icons";
import type { StructureResolver } from "sanity/structure";

/**
 * The Studio sidebar, arranged around the two jobs this content has: ranking
 * and converting.
 *
 * The default "list of every document type" is fine for a blog. It is the
 * wrong shape here, because the question that gets asked of this library is
 * never "show me all guides" — it is "which of these pages is collecting
 * nothing", "what did the last pipeline run create", and "what is stale". So
 * those are the lists, and they are queries rather than folders.
 *
 * The "Not converting" list in particular is the whole point of the CMS. A
 * guide with no free resource is a page that ranks and collects nobody, and
 * without a list like this one it is invisible — it looks exactly like a
 * finished page from every other angle.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Nursia")
    .items([
      S.listItem()
        .title("Guides")
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title("Guides")
            .items([
              S.listItem()
                .title("Everything, newest first")
                .icon(DocumentTextIcon)
                .child(
                  S.documentTypeList("guide")
                    .title("All guides")
                    .defaultOrdering([{ field: "updatedAt", direction: "desc" }]),
                ),
              S.divider(),
              ...(
                [
                  ["before", "Before the exam"],
                  ["during", "During the exam"],
                  ["content", "What to study"],
                  ["after", "After the exam"],
                ] as const
              ).map(([value, title]) =>
                S.listItem()
                  .title(title)
                  .child(
                    S.documentList()
                      .title(title)
                      .filter('_type == "guide" && cluster == $cluster')
                      .params({ cluster: value })
                      .defaultOrdering([{ field: "title", direction: "asc" }]),
                  ),
              ),
            ]),
        ),

      S.listItem()
        .title("Review pages")
        .icon(BookIcon)
        .child(
          S.list()
            .title("Review pages")
            .items([
              S.listItem()
                .title("Everything, newest first")
                .icon(BookIcon)
                .child(
                  S.documentTypeList("seoPage")
                    .title("All review pages")
                    .defaultOrdering([{ field: "updatedAt", direction: "desc" }]),
                ),
              S.divider(),
              /* By test plan category rather than by kind, because that is how
                 a candidate thinks about what is left to revise — and how the
                 gaps in the programme become visible. */
              S.listItem()
                .title("By test plan category")
                .child(
                  S.documentTypeList("seoPage")
                    .title("By category")
                    .defaultOrdering([
                      { field: "examCategory", direction: "asc" },
                      { field: "title", direction: "asc" },
                    ]),
                ),
              S.listItem()
                .title("Not converting — no free resource")
                .child(
                  S.documentList()
                    .title("No free resource")
                    .filter('_type == "seoPage" && !defined(leadMagnet)')
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Orphaned — nothing links to it")
                .child(
                  S.documentList()
                    .title("No inbound links")
                    .filter(
                      '_type == "seoPage" && count(*[_type in ["seoPage", "guide"] && references(^._id)]) == 0',
                    )
                    .apiVersion("2026-02-01"),
                ),
            ]),
        ),

      /*
       * The nursing library.
       *
       * A thousand documents, so "everything, newest first" is the least useful
       * entry rather than the main one — nobody scrolls a thousand rows. The
       * lists that earn their place answer a question an editor actually has:
       * which pages are thin, which are orphaned, which collect nothing.
       */
      S.listItem()
        .title("Nursing library")
        .icon(HeartIcon)
        .child(
          S.list()
            .title("Nursing library")
            .items([
              S.listItem()
                .title("By kind and title")
                .icon(HeartIcon)
                .child(
                  S.documentTypeList("nursingPage")
                    .title("By kind")
                    .defaultOrdering([
                      { field: "family", direction: "asc" },
                      { field: "title", direction: "asc" },
                    ]),
                ),
              S.listItem()
                .title("Everything, newest first")
                .child(
                  S.documentTypeList("nursingPage")
                    .title("All nursing pages")
                    .defaultOrdering([{ field: "updatedAt", direction: "desc" }]),
                ),
              S.divider(),
              /* Thin pages, by the only measure a query has: reading time. The
                 pipeline's gate already holds anything under 520 words, so a
                 published page at three minutes is one the gate passed and a
                 person should still look at. */
              S.listItem()
                .title("Thinnest first")
                .child(
                  S.documentList()
                    .title("Thinnest first")
                    .filter('_type == "nursingPage" && minutes <= 4')
                    .defaultOrdering([{ field: "minutes", direction: "asc" }])
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Not converting — no free resource")
                .child(
                  S.documentList()
                    .title("No free resource")
                    .filter('_type == "nursingPage" && !defined(leadMagnet)')
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Orphaned — nothing links to it")
                .child(
                  S.documentList()
                    .title("No inbound links")
                    .filter(
                      '_type == "nursingPage" && count(*[_type in ["nursingPage", "guide", "seoPage"] && references(^._id)]) == 0',
                    )
                    .apiVersion("2026-02-01"),
                ),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title("Needs attention")
        .icon(WarningOutlineIcon)
        .child(
          S.list()
            .title("Needs attention")
            .items([
              S.listItem()
                .title("Not converting — no free resource")
                .child(
                  S.documentList()
                    .title("No free resource")
                    .filter('_type == "guide" && !defined(leadMagnet)')
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Orphaned — nothing reads next to it")
                .child(
                  S.documentList()
                    .title("No inbound links")
                    .filter(
                      '_type == "guide" && count(*[_type == "guide" && references(^._id)]) == 0',
                    )
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Going stale — not updated in six months")
                .child(
                  S.documentList()
                    .title("Going stale")
                    .filter('_type == "guide" && updatedAt < $cutoff')
                    .params({
                      cutoff: new Date(Date.now() - 182 * 864e5)
                        .toISOString()
                        .slice(0, 10),
                    })
                    .defaultOrdering([{ field: "updatedAt", direction: "asc" }])
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("Thin — fewer than three sections")
                .child(
                  S.documentList()
                    .title("Thin guides")
                    .filter('_type == "guide" && count(sections) < 3')
                    .apiVersion("2026-02-01"),
                ),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title("Free resources")
        .icon(PackageIcon)
        .child(S.documentTypeList("leadMagnet").title("Free resources")),
      S.listItem()
        .title("Experiments")
        .icon(SplitHorizontalIcon)
        .child(
          S.list()
            .title("Experiments")
            .items([
              S.listItem()
                .title("Running")
                .child(
                  S.documentList()
                    .title("Running")
                    .filter('_type == "experiment" && status == "running"')
                    .apiVersion("2026-02-01"),
                ),
              S.listItem()
                .title("All experiments")
                .child(S.documentTypeList("experiment").title("All experiments")),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title("Question topics")
        .icon(TagIcon)
        .child(S.documentTypeList("topic").title("Question topics")),
      S.listItem()
        .title("Authors")
        .icon(UserIcon)
        .child(S.documentTypeList("author").title("Authors")),
    ]);
