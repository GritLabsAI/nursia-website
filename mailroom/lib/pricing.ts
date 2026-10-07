import { hogql, table } from "./audiences";

/**
 * Nursia prices in each person's own currency, for the emails that quote one
 * (cart recovery, the paywall email, the checkout reminder).
 *
 * Prices come from the app's own Dodo price cache: a USD base and the
 * authored local prices (INR, PHP). Which currency someone pays in follows the
 * app's rule: their country through `country_currency`, USD for everywhere
 * else. Someone who started checkout gets the plan and currency of that
 * checkout; anyone else gets the monthly plan in their country's currency,
 * the country being PostHog's geo-IP for them.
 *
 * Everything is read once and kept for ten minutes, so a send to hundreds of
 * people reads it once.
 */

export type Plan = "nclex_7d" | "nclex_1m" | "nclex_6m";

/* Dodo product ids per plan; the price cache has no plan key of its own. */
const PRODUCTS: Record<Plan, { dodo: string; name: string }> = {
  nclex_7d: { dodo: "pdt_0NoQxJiddc28FUwRmbJ9g", name: "7-day pass" },
  nclex_1m: { dodo: "pdt_0NoQwBOIvIyUCdnMjZiAq", name: "1 month" },
  nclex_6m: { dodo: "pdt_0NoQxbcUBiNZ4z8OKix61", name: "6 months" },
};

const FORMAT: Record<string, (minor: number) => string> = {
  INR: (m) => `₹${Math.round(m / 100).toLocaleString("en-IN")}`,
  PHP: (m) => `₱${Math.round(m / 100).toLocaleString("en-US")}`,
  USD: (m) => `$${(m / 100).toFixed(2)}`,
};

type Data = {
  /** plan -> currency -> price in minor units (cents, paise, centavos) */
  prices: Map<Plan, Map<string, number>>;
  currencyOf: Map<string, string>;
  /** user id -> their latest checkout that didn't complete */
  checkout: Map<string, { plan: Plan; currency: string }>;
  /** distinct id -> ISO country from PostHog geo-IP */
  country: Map<string, string>;
};

let cache: { at: number; data: Promise<Data> } | undefined;

async function load(): Promise<Data> {
  const [rows, cc, orders, geo] = await Promise.all([
    table<{ dodo_product_id: string; base_price: number; base_currency: string; localized: { amount: number; currency: string }[] }>("nursia", "dodo_price_cache", "select=dodo_product_id,base_price,base_currency,localized"),
    table<{ country: string; currency: string }>("nursia", "country_currency", "select=country,currency"),
    table<{ user_id: string; product_id: string; currency: string; status: string; created_at: string }>("nursia", "dodo_orders", "select=user_id,product_id,currency,status,created_at&order=created_at.asc"),
    hogql(`select pdi.distinct_id, any(p.properties.$geoip_country_code)
             from person_distinct_ids as pdi join persons as p on p.id = pdi.person_id
            where p.properties.$geoip_country_code is not null group by pdi.distinct_id limit 100000`).catch(() => [] as unknown[][]),
  ]);
  const prices = new Map<Plan, Map<string, number>>();
  for (const [plan, p] of Object.entries(PRODUCTS) as [Plan, (typeof PRODUCTS)[Plan]][]) {
    const r = rows.find((x) => x.dodo_product_id === p.dodo);
    if (!r) continue;
    prices.set(plan, new Map([[r.base_currency, r.base_price], ...r.localized.map((l) => [l.currency, l.amount] as [string, number])]));
  }
  const checkout = new Map<string, { plan: Plan; currency: string }>();
  for (const o of orders) if (o.product_id in PRODUCTS) checkout.set(o.user_id, { plan: o.product_id as Plan, currency: o.currency });
  return {
    prices,
    currencyOf: new Map(cc.map((r) => [r.country, r.currency])),
    checkout,
    country: new Map((geo as [string, string][]).map(([id, c]) => [String(id).toLowerCase(), String(c)])),
  };
}

const data = () => {
  if (!cache || Date.now() - cache.at > 600_000) cache = { at: Date.now(), data: load() };
  return cache.data;
};

/**
 * The merge fields a priced email reads: plan_name, plan_price, plan_discount
 * (FLAT50's 50%), plan_total and plan_currency. Blank when the price isn't
 * known, so a template can fall back.
 */
export async function pricingFor(userId: string | undefined): Promise<Record<string, string>> {
  const d = await data().catch(() => undefined);
  if (!d) return {};
  const started = userId ? d.checkout.get(userId) : undefined;
  const country = userId ? d.country.get(userId.toLowerCase()) : undefined;
  let plan: Plan = started?.plan ?? "nclex_1m";
  let currency = started?.currency ?? d.currencyOf.get(country ?? "") ?? "USD";
  let price = d.prices.get(plan)?.get(currency);
  /* A currency the app no longer prices in: fall back to USD for that plan. */
  if (price === undefined) { currency = "USD"; price = d.prices.get(plan)?.get("USD"); }
  if (price === undefined) { plan = "nclex_1m"; price = d.prices.get(plan)?.get(currency); }
  if (price === undefined || !FORMAT[currency]) return {};
  const fmt = FORMAT[currency];
  const half = Math.round(price / 2);
  return {
    plan_name: PRODUCTS[plan].name,
    plan_price: fmt(price),
    plan_discount: fmt(price - half),
    plan_total: fmt(half),
    plan_currency: currency,
  };
}
