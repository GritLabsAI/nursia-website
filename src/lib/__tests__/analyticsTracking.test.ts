import { readFileSync } from "node:fs";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* posthog-js with the SDK's own loaded flag and captured events. */
const ph = vi.hoisted(() => ({
  __loaded: false,
  captures: [] as Array<[string, Record<string, unknown>]>,
  props: {} as Record<string, unknown>,
  capture(event: string, properties: Record<string, unknown>) {
    this.captures.push([event, properties]);
  },
  get_property(key: string) {
    return this.props[key];
  },
}));
vi.mock("posthog-js", () => ({ default: ph }));

import { redactAnalyticsString, redactCapture, redactDeep } from "@/lib/analyticsRedaction";
import {
  INITIAL_KEYS,
  capturePostHog,
  flushPendingPostHog,
  hasRegisteredInitialTouch,
  initialAttributionProperties,
  pendingPostHogEvents,
} from "@/lib/posthogBridge";
import { nextPageView } from "@/lib/pageViews";
import SignupPage from "@/app/(funnel)/signup/page";

const g = globalThis as { window?: unknown };
let gtag: ReturnType<typeof vi.fn>;
let fbq: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ph.__loaded = true;
  ph.captures = [];
  ph.props = {};
  gtag = vi.fn();
  fbq = vi.fn();
  g.window = { gtag, fbq };
});
afterEach(() => {
  delete g.window;
});

describe("analytics redaction (PostHog before_send)", () => {
  const AT = "eyJhbGciOiJIUzI1NiJ9.payload.sig";
  it("removes session tokens: whole fragment when it carries one, value elsewhere", () => {
    expect(redactAnalyticsString(`https://nursia.io/x?utm_source=meta#access_token=${AT}&refresh_token=RT1&provider_token=PT1`)).toBe("https://nursia.io/x?utm_source=meta");
    expect(redactAnalyticsString(`/cb?access_token=${AT}&keep=1`)).toBe("/cb?access_token=[redacted]&keep=1");
    expect(redactAnalyticsString("/cb?id_token=IDT&provider_refresh_token=PRT")).not.toMatch(/IDT|PRT/);
  });

  it("removes contact details and one-time codes in URL parameter position only", () => {
    expect(redactAnalyticsString("https://nursia.io/?utm_source=meta&email=a%40b.co&phone=919876543210&code=X1&token_hash=T#otp=1")).toBe(
      "https://nursia.io/?utm_source=meta&email=[redacted]&phone=[redacted]&code=[redacted]&token_hash=[redacted]#otp=[redacted]",
    );
    for (const s of ["https://nursia.io/q?exam_code=RN", "type the code=ABC", "https://nursia.io/guides/nclex"]) {
      expect(redactAnalyticsString(s)).toBe(s);
    }
  });

  it("walks every property of a capture, $set_once and replay meta included, without copying untouched payloads", () => {
    const capture = redactCapture({
      properties: { $current_url: `https://nursia.io/#access_token=${AT}`, $snapshot_data: [{ data: { href: "https://nursia.io/?email=a@b.co" } }] },
      $set_once: { $initial_current_url: "https://nursia.io/?phone=919876543210" },
    });
    expect(JSON.stringify(capture)).not.toMatch(/eyJhbGci|a@b\.co|919876543210/);
    const clean = { properties: { a: "b" } };
    expect(redactDeep(clean)).toBe(clean);
    expect(redactCapture(null)).toBeNull();
  });
});

describe("track() → GA4 + PostHog (one pipeline)", () => {
  it("every tracked event reaches both, with undefined dropped", async () => {
    const analytics = await import("@/lib/analytics");
    analytics.guideViewed({ guide: "nclex-pharm", topic: undefined } as never);
    const [event, props] = ph.captures.at(-1)!;
    expect(event).toBe("guide_viewed");
    expect(Object.values(props)).not.toContain(undefined);
    expect(gtag).toHaveBeenCalledWith("event", "guide_viewed", props);
  });

  it("events fired before PostHog initialises are queued (capped) and flushed once", () => {
    ph.__loaded = false;
    for (let i = 0; i < 60; i++) capturePostHog("guide_viewed", { i });
    expect(pendingPostHogEvents()).toHaveLength(50);
    expect(ph.captures).toHaveLength(0);
    ph.__loaded = true;
    flushPendingPostHog();
    flushPendingPostHog();
    expect(ph.captures).toHaveLength(50);
    expect(pendingPostHogEvents()).toHaveLength(0);
  });

  it("resource_clicked → GA4 and PostHog only; never a Meta Lead (Lead means an account was created)", async () => {
    const analytics = await import("@/lib/analytics");
    analytics.resourceClicked({ guide: "nclex-pharm", resource: "cheat-sheet", placement: "inline" } as never);
    const [, props] = ph.captures.find(([e]) => e === "resource_clicked")!;
    expect(typeof props.event_id).toBe("string");
    expect(gtag).toHaveBeenCalledWith("event", "resource_clicked", expect.objectContaining({ event_id: props.event_id }));
    expect(fbq).not.toHaveBeenCalled();
  });

  it("sign_up on this site sends no Meta CompleteRegistration (that is the app's onboarding event now)", async () => {
    const analytics = await import("@/lib/analytics");
    analytics.signedUp("email", { guide: "nclex-pharm" } as never);
    expect(gtag).toHaveBeenCalledWith("event", "sign_up", expect.objectContaining({ method: "email" }));
    expect(fbq).not.toHaveBeenCalled();
  });
});

describe("first-touch super properties", () => {
  const NOW = Date.parse("2026-09-15T12:00:00Z");

  it("validated Phase 2 allowlist values, initial_-prefixed, with landing path and time", () => {
    expect(
      initialAttributionProperties("?utm_source=meta&utm_medium=paid_social&utm_content=120200000000003&fbclid=IwAR1&gbraid=0AAA&wbraid=1BBB&src=lp-pharm&guide=x", "/lp/pharm", NOW),
    ).toEqual({
      initial_utm_source: "meta",
      initial_utm_medium: "paid_social",
      initial_utm_content: "120200000000003",
      initial_meta_ad_id: "120200000000003",
      initial_fbclid: "IwAR1",
      initial_gbraid: "0AAA",
      initial_wbraid: "1BBB",
      initial_src: "lp-pharm",
      initial_landing_path: "/lp/pharm",
      initial_touched_at: "2026-09-15T12:00:00.000Z",
    });
  });

  it("no attribution signal (direct, src only, invalid values) → no first touch", () => {
    for (const q of ["", "?src=lp-pharm", "?fbclid=bad%20value", "?utm_source=", "?guide=a&foo=b"]) {
      expect(initialAttributionProperties(q, "/", NOW)).toEqual({});
    }
  });

  it("never stores tokens, contact details or unknown parameters", () => {
    const props = initialAttributionProperties("?utm_source=meta&access_token=SECRET&email=a@b.co&next=https://evil.example&utm_campaign=x%20access_token=abc", "/", NOW);
    expect(JSON.stringify(props)).not.toMatch(/SECRET|a@b|evil|access_token/);
  });

  it("written as a whole only when no first touch is registered yet (app or site)", () => {
    const get = (props: Record<string, unknown>) => (key: string) => props[key];
    expect(hasRegisteredInitialTouch(get({}))).toBe(false);
    expect(hasRegisteredInitialTouch(get({ initial_gclid: "G1" }))).toBe(true);
    expect(hasRegisteredInitialTouch(get({ initial_touched_at: "2026-09-01T00:00:00Z" }))).toBe(true);
    expect(hasRegisteredInitialTouch(get({ $initial_referrer: "x", last_utm_source: "meta" }))).toBe(false);
    expect(INITIAL_KEYS).toContain("initial_meta_ad_id");
  });
});

describe("Meta PageView", () => {
  it("first path is covered by the base code; repeats (Strict Mode, remounts) never double-count", () => {
    let state = nextPageView(null, "/guides");
    expect(state.fire).toBe(false);
    state = nextPageView(state.last, "/guides");
    expect(state.fire).toBe(false);
    state = nextPageView(state.last, "/guides/nclex");
    expect(state.fire).toBe(true);
    state = nextPageView(state.last, "/guides/nclex");
    expect(state.fire).toBe(false);
  });
});

describe("resource gate → app handoff", () => {
  it("the gate links with the forward-only allowlist names, which /signup carries to the app", async () => {
    const gate = readFileSync("src/components/ResourceGate.tsx", "utf8");
    expect(gate).toMatch(/&resource=\$\{/);
    expect(gate).toMatch(/&guide=\$\{/);
    expect(gate).not.toMatch(/&r=\$\{|&g=\$\{|&x=\$\{|&v=\$\{/);
    let url = "";
    try {
      await SignupPage({ searchParams: Promise.resolve({ next: "/guides/x/resources/y", resource: "cheat-sheet", guide: "nclex-pharm", experiment: "gate-copy", variant: "b", utm_source: "meta" }) });
    } catch (error) {
      url = getURLFromRedirectError(error as never) ?? "";
    }
    expect(url).toBe("https://app.nursia.io?utm_source=meta&guide=nclex-pharm&resource=cheat-sheet&experiment=gate-copy&variant=b");
  });
});

describe("PostHog URL masking list", () => {
  it("covers every credential and contact parameter the redactor handles", async () => {
    const { PERSONAL_URL_PARAMS } = await import("@/lib/analyticsRedaction");
    for (const key of PERSONAL_URL_PARAMS) {
      expect(redactAnalyticsString(`https://nursia.io/?${key}=SENSITIVEVALUE`)).not.toContain("SENSITIVEVALUE");
    }
    const provider = readFileSync("src/components/PostHogProvider.tsx", "utf8");
    expect(provider).toMatch(/mask_personal_data_properties: true/);
    expect(provider).toMatch(/custom_personal_data_properties: \[\.\.\.PERSONAL_URL_PARAMS\]/);
    expect(provider).toMatch(/before_send: redactCapture/);
  });
});
