import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, HEAD } from "@/app/meta/route";
import { ATTRIBUTION_COOKIE, NO_STORE, decodeAttributionCookie } from "@/lib/attribution/touchCookie";

const SENSITIVE = {
  access_token: "SECRET_AT",
  refresh_token: "SECRET_RT",
  provider_token: "SECRET_PT",
  id_token: "SECRET_ID",
  code: "SECRET_CODE",
  token_hash: "SECRET_HASH",
  type: "signup",
  email: "test@example.com",
  phone: "+919876543210",
  next: "https://evil.example/steal",
  redirect_to: "https://evil.example/steal",
};

function call(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  const res = GET(new NextRequest(url, init));
  const location = res.headers.get("location") ?? "";
  return { res, location, locationUrl: new URL(location) };
}

describe("GET /meta", () => {
  it("handles the exact example: 307 to app login with only approved values", () => {
    const { res, location, locationUrl } = call(
      "https://nursia.io/meta?fbclid=ABC&utm_campaign=Summer&utm_content=Ad1&access_token=SECRET&email=test@example.com",
    );
    expect(res.status).toBe(307);
    expect(`${locationUrl.origin}${locationUrl.pathname}`).toBe("https://app.nursia.io/login");
    expect(location).toBe("https://app.nursia.io/login?utm_campaign=Summer&utm_content=Ad1&fbclid=ABC");
    expect(location).not.toContain("SECRET");
    expect(location).not.toContain("example.com");

    const cookie = res.cookies.get(ATTRIBUTION_COOKIE)?.value;
    expect(cookie).toBeTruthy();
    const payload = decodeAttributionCookie(cookie, Date.now());
    expect(payload.f).toMatchObject({ fbclid: "ABC", utm_campaign: "Summer", utm_content: "Ad1", surface: "nursia_web", landing_path: "/meta" });
    expect(Buffer.from(cookie!, "base64url").toString()).not.toMatch(/SECRET|example\.com/);
  });

  it("redirects to the bare login URL when nothing is approved", () => {
    const { res, location } = call("https://nursia.io/meta");
    expect(res.status).toBe(307);
    expect(location).toBe("https://app.nursia.io/login");
    expect(res.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
  });

  it("preserves every approved parameter", () => {
    const qs = new URLSearchParams({
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "Spring Sale", utm_content: "Video A",
      utm_term: "Nurses 25-34", utm_id: "120200000000001",
      meta_campaign_id: "120200000000001", meta_adset_id: "120200000000002", meta_ad_id: "120200000000003",
      meta_site: "ig", meta_placement: "instagram_stories",
      fbclid: "IwAR_click", gclid: "Cj0KCQ", gbraid: "0AAAAA", wbraid: "Cj0wbraid", src: "meta",
      guide: "how-to-pass", resource: "cheat-sheet", experiment: "gate-v2", variant: "b",
    });
    const { locationUrl, res } = call(`https://nursia.io/meta?${qs}`);
    for (const [key, value] of qs) expect(locationUrl.searchParams.get(key)).toBe(value);

    const payload = decodeAttributionCookie(res.cookies.get(ATTRIBUTION_COOKIE)?.value, Date.now());
    expect(payload.f).toMatchObject({ meta_campaign_id: "120200000000001", meta_adset_id: "120200000000002", meta_ad_id: "120200000000003", gclid: "Cj0KCQ", gbraid: "0AAAAA", wbraid: "Cj0wbraid", src: "meta" });
    // forwarded-only keys are not persisted
    for (const key of ["guide", "resource", "experiment", "variant"]) expect(payload.f).not.toHaveProperty(key);
  });

  it("never forwards or stores any sensitive parameter", () => {
    const qs = new URLSearchParams({ utm_source: "meta", fbclid: "IwAR1", ...SENSITIVE });
    const { location, locationUrl, res } = call(`https://nursia.io/meta?${qs}`);
    for (const key of Object.keys(SENSITIVE)) expect(locationUrl.searchParams.has(key)).toBe(false);
    for (const value of Object.values(SENSITIVE)) expect(decodeURIComponent(location)).not.toContain(value);
    const stored = Buffer.from(res.cookies.get(ATTRIBUTION_COOKIE)!.value, "base64url").toString();
    for (const value of Object.values(SENSITIVE)) expect(stored).not.toContain(value);
    expect(locationUrl.host).toBe("app.nursia.io");
  });

  it("drops invalid and unapproved parameters, including an unreplaced {{ad.id}}", () => {
    const { locationUrl } = call(
      "https://nursia.io/meta?utm_source=meta&meta_ad_id={{ad.id}}&meta_adset_id=12&fbclid=bad%20value&foo=bar&utm_campaign=ok",
    );
    expect([...locationUrl.searchParams.keys()]).toEqual(["utm_source", "utm_campaign"]);
  });

  it("never reads the URL fragment", () => {
    const { location, res } = call("https://nursia.io/meta?utm_source=meta#access_token=SECRET&fbclid=FROMHASH");
    expect(location).toBe("https://app.nursia.io/login?utm_source=meta");
    expect(Buffer.from(res.cookies.get(ATTRIBUTION_COOKIE)!.value, "base64url").toString()).not.toMatch(/SECRET|FROMHASH/);
  });

  it("cannot be turned into an open redirect", () => {
    for (const url of [
      "https://nursia.io/meta?next=https://evil.example",
      "https://nursia.io/meta?redirect_to=//evil.example",
      "https://nursia.io/meta?src=//evil.example",
      "https://nursia.io/meta?utm_campaign=https://evil.example",
    ]) {
      const { locationUrl } = call(url);
      expect(locationUrl.origin).toBe("https://app.nursia.io");
      expect(locationUrl.pathname).toBe("/login");
    }
  });

  it("is private/no-store, noindex, and sets a cross-subdomain cookie", () => {
    const { res } = call("https://nursia.io/meta?utm_source=meta");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/Domain=\.nursia\.io/i);
    expect(header).toMatch(/Secure/);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).not.toMatch(/HttpOnly/i);
    expect(header).toMatch(/Max-Age=7776000/);
  });

  it("keeps the first touch from an earlier visit and updates the last touch", () => {
    const first = call("https://nursia.io/meta?utm_source=meta&meta_ad_id=120200000000003&fbclid=FIRST");
    const firstCookie = first.res.cookies.get(ATTRIBUTION_COOKIE)!.value;
    const firstT = decodeAttributionCookie(firstCookie, Date.now()).f!.t;

    const second = call("https://nursia.io/meta?utm_source=meta&meta_ad_id=120200000000999&fbclid=SECOND", {
      headers: { cookie: `${ATTRIBUTION_COOKIE}=${firstCookie}` },
    });
    const payload = decodeAttributionCookie(second.res.cookies.get(ATTRIBUTION_COOKIE)!.value, Date.now());
    expect(payload.f?.fbclid).toBe("FIRST");
    expect(payload.f?.t).toBe(firstT);
    expect(payload.l?.fbclid).toBe("SECOND");
    expect(payload.l?.meta_ad_id).toBe("120200000000999");
  });

  it("responses for different visitors don't share attribution", () => {
    const a = call("https://nursia.io/meta?utm_source=meta&fbclid=VISITOR_A");
    const b = call("https://nursia.io/meta?utm_source=meta&fbclid=VISITOR_B");
    expect(a.location).toContain("VISITOR_A");
    expect(b.location).not.toContain("VISITOR_A");
    expect(Buffer.from(b.res.cookies.get(ATTRIBUTION_COOKIE)!.value, "base64url").toString()).not.toContain("VISITOR_A");
  });

  it("HEAD behaves like GET", () => {
    const res = HEAD(new NextRequest("https://nursia.io/meta?utm_source=meta&access_token=SECRET"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.nursia.io/login?utm_source=meta");
  });
});
