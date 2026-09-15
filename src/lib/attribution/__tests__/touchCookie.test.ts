import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_S,
  NO_STORE,
  applyAttributionCookie,
  cookieDomainFor,
  decodeAttributionCookie,
  encodeAttributionCookie,
  makeTouch,
  mergeTouch,
  type AttributionCookie,
} from "../touchCookie";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-15T12:00:00Z");

const raw = (obj: unknown) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");

function setCookieHeader(res: NextResponse): string {
  return res.headers.get("set-cookie") ?? "";
}

function cookieValue(res: NextResponse): string | undefined {
  return res.cookies.get(ATTRIBUTION_COOKIE)?.value;
}

describe("merge rules", () => {
  const meta = makeTouch({ utm_source: "meta", fbclid: "IwAR_first" }, "/meta", NOW - 10 * DAY);
  const google = makeTouch({ utm_source: "google", gclid: "Cj0later" }, "/lp/google", NOW);

  it("first visit becomes both first and last touch", () => {
    const merged = mergeTouch({ v: 1 }, meta);
    expect(merged.f).toEqual(meta);
    expect(merged.l).toEqual(meta);
  });

  it("a later visit replaces last touch and never first touch", () => {
    const merged = mergeTouch(mergeTouch({ v: 1 }, meta), google);
    expect(merged.f).toEqual(meta);
    expect(merged.l).toEqual(google);
  });

  it("an older visit cannot replace a newer last touch, but becomes first if earlier", () => {
    const older = makeTouch({ utm_source: "reddit" }, "/lp/reddit", NOW - 20 * DAY);
    const merged = mergeTouch(mergeTouch({ v: 1 }, meta), older);
    expect(merged.f).toEqual(older);
    expect(merged.l).toEqual(meta);
  });

  it("a whole touch replaces the last touch (no key mixing between visits)", () => {
    const merged = mergeTouch(mergeTouch({ v: 1 }, meta), google);
    expect(merged.l?.fbclid).toBeUndefined();
  });
});

describe("decodeAttributionCookie", () => {
  it("round-trips an encoded payload", () => {
    const payload: AttributionCookie = mergeTouch({ v: 1 }, makeTouch({ utm_source: "meta", meta_ad_id: "120200000000003" }, "/meta", NOW));
    expect(decodeAttributionCookie(encodeAttributionCookie(payload), NOW)).toEqual(payload);
  });

  it("returns an empty payload for garbage, wrong versions and oversized values", () => {
    expect(decodeAttributionCookie("not-base64-json", NOW)).toEqual({ v: 1 });
    expect(decodeAttributionCookie(raw({ v: 2, f: { t: NOW, surface: "nursia_web", utm_source: "meta" } }), NOW)).toEqual({ v: 1 });
    expect(decodeAttributionCookie("a".repeat(9000), NOW)).toEqual({ v: 1 });
    expect(decodeAttributionCookie(undefined, NOW)).toEqual({ v: 1 });
  });

  it("strips injected keys and invalid values from a tampered cookie", () => {
    const tampered = raw({
      v: 1,
      f: {
        t: NOW - DAY, surface: "nursia_web", utm_source: "meta",
        access_token: "SECRET", email: "a@b.c", meta_ad_id: "{{ad.id}}", __proto__: { polluted: true },
        landing_path: "/x?access_token=SECRET",
      },
    });
    const out = decodeAttributionCookie(tampered, NOW);
    expect(out.f).toEqual({ t: NOW - DAY, surface: "nursia_web", utm_source: "meta" });
    expect(JSON.stringify(out)).not.toContain("SECRET");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("drops touches without a signal, with a bad surface, or with a future time", () => {
    expect(decodeAttributionCookie(raw({ v: 1, f: { t: NOW, surface: "nursia_web", src: "lp" } }), NOW).f).toBeUndefined();
    expect(decodeAttributionCookie(raw({ v: 1, f: { t: NOW, surface: "evil", utm_source: "meta" } }), NOW).f).toBeUndefined();
    expect(decodeAttributionCookie(raw({ v: 1, f: { t: NOW + DAY, surface: "nursia_web", utm_source: "meta" } }), NOW).f).toBeUndefined();
  });

  it("expires first touch after 90 days and last touch after 30 days", () => {
    const cookie = raw({
      v: 1,
      f: { t: NOW - 91 * DAY, surface: "nursia_web", utm_source: "meta" },
      l: { t: NOW - 31 * DAY, surface: "nursia_web", utm_source: "google" },
    });
    expect(decodeAttributionCookie(cookie, NOW)).toEqual({ v: 1 });
    const kept = raw({
      v: 1,
      f: { t: NOW - 89 * DAY, surface: "nursia_web", utm_source: "meta" },
      l: { t: NOW - 29 * DAY, surface: "app_web", utm_source: "google" },
    });
    const out = decodeAttributionCookie(kept, NOW);
    expect(out.f?.utm_source).toBe("meta");
    expect(out.l?.utm_source).toBe("google");
  });

  it("promotes a surviving last touch to first when the first touch has expired, before the next visit merges", () => {
    const cookie = raw({
      v: 1,
      f: { t: NOW - 100 * DAY, surface: "nursia_web", utm_source: "old-campaign" },
      l: { t: NOW - 20 * DAY, surface: "nursia_web", utm_source: "meta", fbclid: "L20" },
    });
    const decoded = decodeAttributionCookie(cookie, NOW);
    expect(decoded.f?.fbclid).toBe("L20");
    expect(decoded.l?.fbclid).toBe("L20");

    const visit = makeTouch({ utm_source: "google", gclid: "NOW" }, "/lp/google", NOW);
    const merged = mergeTouch(decoded, visit);
    expect(merged.f).toEqual({ t: NOW - 20 * DAY, surface: "nursia_web", utm_source: "meta", fbclid: "L20" });
    expect(merged.l).toEqual(visit);
    expect(JSON.stringify(merged)).not.toContain("old-campaign");
  });
});

describe("encodeAttributionCookie", () => {
  it("keeps the value within cookie limits by shrinking free text, never click ids or Meta ids", () => {
    const long = "x".repeat(256);
    const touch = makeTouch(
      {
        utm_source: "meta", utm_medium: long, utm_campaign: long, utm_content: long, utm_term: long,
        meta_campaign_id: "120200000000001", meta_ad_id: "120200000000003", fbclid: "F".repeat(512),
      },
      "/" + "p".repeat(500),
      NOW,
    );
    const value = encodeAttributionCookie({ v: 1, f: touch, l: touch });
    expect(value.length).toBeLessThanOrEqual(3600);
    const out = decodeAttributionCookie(value, NOW);
    expect(out.f?.meta_ad_id).toBe("120200000000003");
    expect(out.f?.fbclid).toBe("F".repeat(512));
    expect(out.f?.utm_source).toBe("meta");
  });
});

describe("cookieDomainFor", () => {
  it("shares across Nursia hosts only", () => {
    expect(cookieDomainFor("nursia.io")).toBe(".nursia.io");
    expect(cookieDomainFor("www.nursia.io")).toBe(".nursia.io");
    expect(cookieDomainFor("app.nursia.io")).toBe(".nursia.io");
    expect(cookieDomainFor("localhost")).toBeUndefined();
    expect(cookieDomainFor("nursia-website-production.up.railway.app")).toBeUndefined();
    expect(cookieDomainFor("evilnursia.io")).toBeUndefined();
  });
});

describe("applyAttributionCookie", () => {
  it("sets the cookie with the approved attributes and marks the response no-store", () => {
    const req = new NextRequest("https://nursia.io/lp/meta?utm_source=meta&fbclid=IwAR1&email=a@b.c");
    const res = NextResponse.next();
    expect(applyAttributionCookie(req, res, NOW)).toBe(true);

    const header = setCookieHeader(res);
    expect(header).toContain(`${ATTRIBUTION_COOKIE}=`);
    expect(header).toMatch(/Domain=\.nursia\.io/i);
    expect(header).toMatch(/Path=\//);
    expect(header).toMatch(new RegExp(`Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_S}`));
    expect(header).toMatch(/Secure/);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).not.toMatch(/HttpOnly/i);
    expect(res.headers.get("cache-control")).toBe(NO_STORE);

    const payload = decodeAttributionCookie(cookieValue(res), NOW);
    expect(payload.f).toEqual({ utm_source: "meta", fbclid: "IwAR1", t: NOW, surface: "nursia_web", landing_path: "/lp/meta" });
    expect(Buffer.from(cookieValue(res)!, "base64url").toString()).not.toContain("a@b.c");
  });

  it("does nothing without a valid signal", () => {
    const res = NextResponse.next();
    expect(applyAttributionCookie(new NextRequest("https://nursia.io/lp/meta?src=lp&meta_ad_id={{ad.id}}"), res, NOW)).toBe(false);
    expect(setCookieHeader(res)).toBe("");
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("keeps the existing first touch and replaces last touch on a later visit", () => {
    const first = NextResponse.next();
    applyAttributionCookie(new NextRequest("https://nursia.io/meta?utm_source=meta&meta_ad_id=120200000000003"), first, NOW - 5 * DAY);
    const existing = cookieValue(first)!;

    const second = NextResponse.next();
    const req = new NextRequest("https://www.nursia.io/lp/google?utm_source=google&gclid=Cj0later", {
      headers: { cookie: `${ATTRIBUTION_COOKIE}=${existing}` },
    });
    applyAttributionCookie(req, second, NOW);
    const payload = decodeAttributionCookie(cookieValue(second), NOW);
    expect(payload.f?.meta_ad_id).toBe("120200000000003");
    expect(payload.f?.t).toBe(NOW - 5 * DAY);
    expect(payload.l?.gclid).toBe("Cj0later");
    expect(payload.l?.meta_ad_id).toBeUndefined();
  });

  it("takes the public host from Host / X-Forwarded-Host, as `next start` behind a proxy sees it", () => {
    // next start: request.url is the server's own address; the public host is in the headers.
    const viaHost = NextResponse.next();
    applyAttributionCookie(new NextRequest("http://localhost:8080/meta?utm_source=meta", { headers: { host: "nursia.io" } }), viaHost, NOW);
    expect(setCookieHeader(viaHost)).toMatch(/Domain=\.nursia\.io/i);

    const viaForwarded = NextResponse.next();
    applyAttributionCookie(
      new NextRequest("http://localhost:8080/lp/meta?utm_source=meta", { headers: { host: "localhost:8080", "x-forwarded-host": "www.nursia.io, proxy.internal" } }),
      viaForwarded,
      NOW,
    );
    expect(setCookieHeader(viaForwarded)).toMatch(/Domain=\.nursia\.io/i);

    const lookalike = NextResponse.next();
    applyAttributionCookie(new NextRequest("http://localhost:8080/meta?utm_source=meta", { headers: { host: "evilnursia.io" } }), lookalike, NOW);
    expect(setCookieHeader(lookalike)).not.toMatch(/Domain=/i);
  });

  it("uses a host-only cookie off the Nursia domain", () => {
    const res = NextResponse.next();
    applyAttributionCookie(new NextRequest("http://localhost:3000/lp/meta?utm_source=meta"), res, NOW);
    expect(setCookieHeader(res)).not.toMatch(/Domain=/i);
  });
});
