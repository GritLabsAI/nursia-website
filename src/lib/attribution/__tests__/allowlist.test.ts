import { describe, expect, it } from "vitest";
import {
  FORWARD_KEYS,
  SIGNAL_KEYS,
  STORED_KEYS,
  cleanLandingPath,
  cleanValue,
  readAttribution,
  toSearchParams,
} from "../allowlist";

const SENSITIVE = [
  "access_token",
  "refresh_token",
  "provider_token",
  "id_token",
  "code",
  "token_hash",
  "type",
  "email",
  "phone",
  "next",
  "redirect_to",
];

describe("allowlist definition", () => {
  it("stores exactly the approved keys and forwards four more", () => {
    expect([...STORED_KEYS]).toEqual([
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
      "meta_campaign_id", "meta_adset_id", "meta_ad_id", "meta_site", "meta_placement",
      "fbclid", "gclid", "gbraid", "wbraid", "src",
    ]);
    expect(FORWARD_KEYS.slice(STORED_KEYS.length)).toEqual(["guide", "resource", "experiment", "variant"]);
  });

  it("never allows a sensitive key", () => {
    for (const key of SENSITIVE) {
      expect((FORWARD_KEYS as readonly string[]).includes(key)).toBe(false);
      expect(cleanValue(key, "anything")).toBeUndefined();
    }
  });

  it("signals are a subset of stored keys", () => {
    for (const key of SIGNAL_KEYS) expect((STORED_KEYS as readonly string[]).includes(key)).toBe(true);
  });
});

describe("cleanValue", () => {
  it("accepts valid values", () => {
    expect(cleanValue("meta_campaign_id", "120200000000001")).toBe("120200000000001");
    expect(cleanValue("fbclid", "IwAR2F4-dbP0l7Mn1IawQ_qa2ofr")).toBe("IwAR2F4-dbP0l7Mn1IawQ_qa2ofr");
    expect(cleanValue("gbraid", "0AAAAA.x-y_z")).toBe("0AAAAA.x-y_z");
    expect(cleanValue("utm_campaign", "Spring Sale – Nurses 25–34")).toBe("Spring Sale – Nurses 25–34");
    expect(cleanValue("meta_site", "ig")).toBe("ig");
    expect(cleanValue("meta_placement", "instagram_stories")).toBe("instagram_stories");
    expect(cleanValue("src", "lp-meta")).toBe("lp-meta");
    expect(cleanValue("utm_source", "  meta  ")).toBe("meta");
  });

  it("drops unreplaced Meta tokens and malformed IDs", () => {
    expect(cleanValue("meta_ad_id", "{{ad.id}}")).toBeUndefined();
    expect(cleanValue("meta_adset_id", "1234")).toBeUndefined();
    expect(cleanValue("meta_campaign_id", "1".repeat(26))).toBeUndefined();
    expect(cleanValue("meta_site", "Instagram")).toBeUndefined();
    expect(cleanValue("meta_placement", "feed; drop")).toBeUndefined();
  });

  it("drops malformed click ids and oversized values", () => {
    expect(cleanValue("fbclid", "bad fbclid")).toBeUndefined();
    expect(cleanValue("gclid", "a".repeat(513))).toBeUndefined();
    expect(cleanValue("utm_content", "a".repeat(257))).toBeUndefined();
    expect(cleanValue("utm_campaign", "line\nbreak")).toBeUndefined();
    expect(cleanValue("src", "has space")).toBeUndefined();
  });

  it("drops any value that carries an auth credential", () => {
    expect(cleanValue("utm_campaign", "x access_token=abc")).toBeUndefined();
    expect(cleanValue("utm_content", "refresh_token")).toBeUndefined();
    expect(cleanValue("src", "provider_token")).toBeUndefined();
  });

  it("rejects prototype keys", () => {
    expect(cleanValue("__proto__", "x")).toBeUndefined();
    expect(cleanValue("constructor", "x")).toBeUndefined();
  });
});

describe("cleanLandingPath", () => {
  it("keeps plain paths and refuses queries, fragments and tokens", () => {
    expect(cleanLandingPath("/lp/meta")).toBe("/lp/meta");
    expect(cleanLandingPath("/meta?x=1")).toBeUndefined();
    expect(cleanLandingPath("/meta#access_token=x")).toBeUndefined();
    expect(cleanLandingPath("relative")).toBeUndefined();
    expect(cleanLandingPath("/a b")).toBeUndefined();
  });
});

describe("readAttribution", () => {
  it("handles the exact Meta example: keeps approved values, drops the token and email", () => {
    const params = new URLSearchParams(
      "fbclid=ABC&utm_campaign=Summer&utm_content=Ad1&access_token=SECRET&email=test@example.com",
    );
    const { forwarded, stored, hasSignal } = readAttribution(params);
    expect(forwarded.toString()).toBe("utm_campaign=Summer&utm_content=Ad1&fbclid=ABC");
    expect(stored).toEqual({ utm_campaign: "Summer", utm_content: "Ad1", fbclid: "ABC" });
    expect(hasSignal).toBe(true);
    expect(forwarded.toString()).not.toContain("SECRET");
    expect(forwarded.toString()).not.toContain("example.com");
  });

  it("forwards but does not store the funnel-context keys", () => {
    const { forwarded, stored } = readAttribution(
      new URLSearchParams("utm_source=meta&guide=how-to-pass&resource=cheat-sheet&experiment=gate-v2&variant=b"),
    );
    expect(forwarded.get("guide")).toBe("how-to-pass");
    expect(forwarded.get("variant")).toBe("b");
    expect(Object.keys(stored)).toEqual(["utm_source"]);
  });

  it("drops every sensitive and unknown parameter", () => {
    const qs = new URLSearchParams({ utm_source: "meta", foo: "bar" });
    for (const key of SENSITIVE) qs.set(key, "secret-value");
    const { forwarded } = readAttribution(qs);
    expect([...forwarded.keys()]).toEqual(["utm_source"]);
  });

  it("uses only the first value of a repeated key", () => {
    const { forwarded } = readAttribution(new URLSearchParams("utm_source=meta&utm_source=evil"));
    expect(forwarded.getAll("utm_source")).toEqual(["meta"]);
  });

  it("derives Meta IDs from numeric UTMs for Meta sources (stored only)", () => {
    const { stored, forwarded } = readAttribution(
      new URLSearchParams("utm_source=facebook&utm_campaign=220200000000001&utm_term=220200000000002&utm_content=220200000000003"),
    );
    expect(stored.meta_campaign_id).toBe("220200000000001");
    expect(stored.meta_adset_id).toBe("220200000000002");
    expect(stored.meta_ad_id).toBe("220200000000003");
    expect(forwarded.has("meta_ad_id")).toBe(false);
  });

  it("does not derive IDs for other sources or names", () => {
    expect(readAttribution(new URLSearchParams("utm_source=google&utm_campaign=220200000000001")).stored.meta_campaign_id).toBeUndefined();
    expect(readAttribution(new URLSearchParams("utm_source=meta&utm_campaign=Spring")).stored.meta_campaign_id).toBeUndefined();
  });

  it("a visit without a signal is not attributed", () => {
    expect(readAttribution(new URLSearchParams("src=lp-meta&utm_campaign=Summer")).hasSignal).toBe(false);
    expect(readAttribution(new URLSearchParams("meta_ad_id={{ad.id}}")).hasSignal).toBe(false);
    expect(readAttribution(new URLSearchParams("")).hasSignal).toBe(false);
  });

  it("each signal key alone attributes a visit", () => {
    const samples: Record<string, string> = {
      utm_source: "meta", fbclid: "IwAR1", gclid: "Cj0KCQ", gbraid: "0AAAA", wbraid: "Cj0wb",
      meta_campaign_id: "120200000000001", meta_adset_id: "120200000000002", meta_ad_id: "120200000000003",
    };
    for (const key of SIGNAL_KEYS) {
      expect(readAttribution(new URLSearchParams({ [key]: samples[key] })).hasSignal).toBe(true);
    }
  });
});

describe("toSearchParams", () => {
  it("takes the first value of arrays and ignores undefined", () => {
    const qs = toSearchParams({ utm_source: ["meta", "x"], fbclid: "A", gclid: undefined });
    expect(qs.toString()).toBe("utm_source=meta&fbclid=A");
  });
});
