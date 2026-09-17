import { describe, expect, it } from "vitest";
import { nextViewContent, viewContentFor } from "@/lib/metaViewContent";

describe("Meta ViewContent on the pages that show the offer", () => {
  it("landing pages, guides and pricing map to content_name / content_category", () => {
    expect(viewContentFor("/lp/meta")).toEqual({ content_name: "meta", content_category: "landing_page" });
    expect(viewContentFor("/lp/meta-ten-minutes/")).toEqual({ content_name: "meta-ten-minutes", content_category: "landing_page" });
    expect(viewContentFor("/guides/nclex-pharmacology")).toEqual({ content_name: "nclex-pharmacology", content_category: "guide" });
    expect(viewContentFor("/pricing")).toEqual({ content_name: "pricing", content_category: "pricing" });
    expect(viewContentFor("/pricing?utm_source=meta#plans")).toEqual({ content_name: "pricing", content_category: "pricing" });
  });

  it("every other page, including the guides index, sends no ViewContent", () => {
    for (const path of ["/", "/guides", "/lp", "/about", "/contact", "/lp/meta/extra", "/pricing-old", "/nclex-review"]) {
      expect(viewContentFor(path)).toBeNull();
    }
  });

  it("every view counts, the first load included; a repeat of the same path does not", () => {
    let state = nextViewContent(null, "/lp/meta");
    expect(state.params?.content_name).toBe("meta"); // first load: the base code sends PageView only
    state = nextViewContent(state.last, "/lp/meta"); // Strict Mode / re-render
    expect(state.params).toBeNull();
    state = nextViewContent(state.last, "/about");
    expect(state.params).toBeNull();
    state = nextViewContent(state.last, "/lp/meta"); // came back: a new view
    expect(state.params?.content_name).toBe("meta");
  });
});
