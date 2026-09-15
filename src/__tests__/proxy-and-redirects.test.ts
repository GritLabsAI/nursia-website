import { NextRequest } from "next/server";
import { getRedirectStatusCodeFromError, getURLFromRedirectError } from "next/dist/client/components/redirect";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";
import { SIGNAL_KEYS } from "@/lib/attribution/allowlist";
import { ATTRIBUTION_COOKIE, NO_STORE, decodeAttributionCookie } from "@/lib/attribution/touchCookie";
import ExamPage from "@/app/(funnel)/exam/page";
import LoginPage from "@/app/(funnel)/login/page";
import SignupPage from "@/app/(funnel)/signup/page";
import TryPage from "@/app/(funnel)/try/page";

describe("proxy", () => {
  it("matcher runs only for signal query keys, and excludes /meta and internals", () => {
    const keys = config.matcher.map((m) => m.has[0].key).sort();
    expect(keys).toEqual([...SIGNAL_KEYS].sort());
    for (const m of config.matcher) {
      expect(m.has).toHaveLength(1);
      expect(m.has[0].type).toBe("query");
      expect(m.source).toContain("meta$|meta/");
      expect(m.source).toContain("_next/");
      expect(m.source).toContain("api/");
      expect(m.source).toContain("studio");
    }
  });

  it("records an attributed landing and marks the page no-store", () => {
    const res = proxy(new NextRequest("https://nursia.io/lp/meta?utm_source=meta&meta_ad_id=120200000000003&access_token=SECRET"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    const payload = decodeAttributionCookie(res.cookies.get(ATTRIBUTION_COOKIE)?.value, Date.now());
    expect(payload.f).toMatchObject({ utm_source: "meta", meta_ad_id: "120200000000003", landing_path: "/lp/meta" });
    expect(res.headers.get("set-cookie")).not.toContain("SECRET");
  });

  it("passes through without a cookie when no valid signal is present", () => {
    const res = proxy(new NextRequest("https://nursia.io/lp/meta?utm_source=&fbclid=bad%20value"));
    expect(res.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();
    expect(res.headers.get("cache-control")).toBeNull();
  });
});

async function redirectOf(page: (props: { searchParams: Promise<Record<string, string>> }) => Promise<never | void>, query: Record<string, string>) {
  try {
    await page({ searchParams: Promise.resolve(query) });
  } catch (error) {
    return { url: getURLFromRedirectError(error as never), status: getRedirectStatusCodeFromError(error as never) };
  }
  throw new Error("page did not redirect");
}

describe("funnel redirects", () => {
  const pages = { signup: SignupPage, login: LoginPage, exam: ExamPage, try: TryPage };

  for (const [name, page] of Object.entries(pages)) {
    it(`/${name} still redirects to the app, now with only approved attribution`, async () => {
      const bare = await redirectOf(page, {});
      expect(bare.url).toBe("https://app.nursia.io");
      expect(bare.status).toBe(307);

      const attributed = await redirectOf(page, {
        utm_source: "meta", fbclid: "IwAR1", gbraid: "0AAAAA", meta_ad_id: "120200000000003",
        access_token: "SECRET", email: "test@example.com", next: "https://evil.example",
      });
      expect(attributed.url).toBe("https://app.nursia.io?utm_source=meta&meta_ad_id=120200000000003&fbclid=IwAR1&gbraid=0AAAAA");
      expect(attributed.status).toBe(307);
    });
  }
});
