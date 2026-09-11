#!/usr/bin/env python3
"""Real search volumes from Google Ads Keyword Planner.

This is the instrument Google Trends is not. Trends reports *relative* interest
and refuses to say anything at all about long-tail phrases — ask it about
"nclex testing accommodations" and it returns a flat zero meaning "below our
reporting threshold". Keyword Planner reports absolute average monthly searches,
including for the long tail, which is what a thousand-page content plan actually
has to be built on.

READ ONLY. The single API call here is GenerateKeywordIdeas, which creates
nothing and changes nothing in the account. That matters because the credential
this borrows is write-capable: nothing in this file mutates, and nothing in this
file should ever be made to.

## Credentials live somewhere else on purpose

The OAuth token and developer token belong to the NismReady ads tooling folder,
which is gitignored precisely because those files are live secrets. This script
is version-controlled and reads them by path instead, so the code can be
reviewed in git while the secrets stay out of it. Never copy them here.

    GOOGLE_ADS_TOOLING   directory holding ads-oauth-token.json and .env
    GOOGLE_ADS_CUSTOMER  the account to bill the planner quota to

## Usage

    python keyword_ideas.py --seeds seeds.txt --out ideas.json
    python keyword_ideas.py --seeds seeds.txt --out ideas.json --geo 2840

Run it with the tooling venv, which already has google-ads installed:

    /d/gritlabsai/NismReady/website/tooling/google-ads-api/.venv/Scripts/python.exe \
        pipeline/keywords/keyword_ideas.py ...
"""
import argparse
import json
import os
import sys
import time

# The nursia ad account (633-182-5613). Keyword ideas must be requested against
# a non-manager account, so this cannot be the MCC.
DEFAULT_CUSTOMER = "6331825613"
DEFAULT_LOGIN_CUSTOMER = "2413682517"  # PrepClever Manager MCC
DEFAULT_TOOLING = r"D:\gritlabsai\NismReady\website\tooling\google-ads-api"

# Google's limit is 20 seed keywords per GenerateKeywordIdeas request.
SEEDS_PER_REQUEST = 20
# Between requests. The planner has a daily quota and bursting wastes it.
PAUSE_SECONDS = 1.0

LANGUAGE_ENGLISH = "languageConstants/1000"
GEO_UNITED_STATES = "2840"


def build_client(tooling: str):
    """A GoogleAdsClient from the tooling folder's stored refresh token."""
    from dotenv import load_dotenv
    from google.ads.googleads.client import GoogleAdsClient
    from google.oauth2.credentials import Credentials

    load_dotenv(os.path.join(tooling, ".env"))
    dev_token = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
    if not dev_token:
        raise SystemExit(
            f"GOOGLE_ADS_DEVELOPER_TOKEN not found in {tooling}\\.env"
        )

    token_file = os.path.join(tooling, "ads-oauth-token.json")
    if not os.path.exists(token_file):
        raise SystemExit(f"No OAuth token at {token_file}")

    creds = Credentials.from_authorized_user_file(
        token_file, scopes=["https://www.googleapis.com/auth/adwords"]
    )
    # The login-customer-id header names the *manager* you are acting through,
    # and it is only correct when the target account actually sits under that
    # manager. The nursia account (6331825613) is granted to this user directly
    # rather than through the PrepClever MCC, so sending the MCC header makes
    # Google reject the call with USER_PERMISSION_DENIED — an error that reads
    # like missing access and is really a mismatched header. Empty means
    # "direct access", which is what that account needs.
    login = os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER", "")
    kwargs = {
        "credentials": creds,
        "developer_token": dev_token,
        "use_proto_plus": True,
    }
    if login:
        kwargs["login_customer_id"] = login
    return GoogleAdsClient(**kwargs)


def generate(client, customer_id: str, seeds: list, geo: str) -> dict:
    """One GenerateKeywordIdeas call. Returns {keyword: row}."""
    service = client.get_service("KeywordPlanIdeaService")
    request = client.get_type("GenerateKeywordIdeasRequest")

    request.customer_id = customer_id
    request.language = LANGUAGE_ENGLISH
    request.geo_target_constants = [f"geoTargetConstants/{geo}"]
    # Search only. Including partners inflates the numbers with traffic we
    # cannot rank for organically, which is the whole point of the exercise.
    request.keyword_plan_network = (
        client.enums.KeywordPlanNetworkEnum.GOOGLE_SEARCH
    )
    request.include_adult_keywords = False
    request.keyword_seed.keywords.extend(seeds)

    out = {}
    for idea in service.generate_keyword_ideas(request=request):
        metrics = idea.keyword_idea_metrics
        # Twelve months of history, so the caller can see seasonality rather
        # than a single averaged number that hides a June spike.
        monthly = [
            {"year": m.year, "month": m.month.name, "searches": m.monthly_searches}
            for m in metrics.monthly_search_volumes
        ]
        out[idea.text] = {
            "keyword": idea.text,
            "avg_monthly_searches": metrics.avg_monthly_searches or 0,
            "competition": metrics.competition.name if metrics.competition else "UNKNOWN",
            "competition_index": metrics.competition_index or 0,
            # Micros -> currency units. These are the clearest available proxy
            # for commercial intent: what advertisers pay says more about
            # whether a searcher buys than volume does.
            "low_bid": round((metrics.low_top_of_page_bid_micros or 0) / 1_000_000, 2),
            "high_bid": round((metrics.high_top_of_page_bid_micros or 0) / 1_000_000, 2),
            "monthly": monthly,
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", required=True, help="file with one seed per line")
    ap.add_argument("--out", required=True, help="where to write the JSON")
    ap.add_argument("--geo", default=GEO_UNITED_STATES)
    ap.add_argument("--customer", default=os.environ.get("GOOGLE_ADS_CUSTOMER", DEFAULT_CUSTOMER))
    ap.add_argument("--tooling", default=os.environ.get("GOOGLE_ADS_TOOLING", DEFAULT_TOOLING))
    args = ap.parse_args()

    with open(args.seeds, encoding="utf-8") as fh:
        seeds = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

    if not seeds:
        raise SystemExit(f"No seeds in {args.seeds}")

    client = build_client(args.tooling)

    print(f"Keyword Planner: {len(seeds)} seeds, geo {args.geo}, account {args.customer}")

    ideas = {}
    batches = [
        seeds[i : i + SEEDS_PER_REQUEST]
        for i in range(0, len(seeds), SEEDS_PER_REQUEST)
    ]
    for n, batch in enumerate(batches, 1):
        print(f"  batch {n}/{len(batches)}: {len(batch)} seeds", flush=True)
        try:
            found = generate(client, args.customer, batch, args.geo)
        except Exception as err:  # noqa: BLE001 - surface the API's own message
            # One bad batch should not lose the batches that already worked.
            print(f"    failed: {err}", file=sys.stderr)
            continue
        new = len(set(found) - set(ideas))
        ideas.update(found)
        print(f"    +{new} new ({len(ideas)} total)", flush=True)
        time.sleep(PAUSE_SECONDS)

    rows = sorted(
        ideas.values(), key=lambda r: r["avg_monthly_searches"], reverse=True
    )

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(
            {
                "source": "google-ads-keyword-planner",
                "geo": args.geo,
                "language": "en",
                "network": "GOOGLE_SEARCH",
                "seeds": seeds,
                "generatedAt": time.strftime("%Y-%m-%d"),
                "note": (
                    "avg_monthly_searches is Google's own rounded average over the "
                    "trailing 12 months for the exact keyword, US, English, Search "
                    "network only. Unlike Google Trends this is an absolute volume "
                    "and it reports on long-tail phrases."
                ),
                "keywords": rows,
            },
            fh,
            indent=2,
        )

    print(f"\n{len(rows)} keywords -> {args.out}")
    if rows:
        print("Top 10 by volume:")
        for r in rows[:10]:
            print(f"  {r['avg_monthly_searches']:>8,}  {r['competition']:<7}  {r['keyword']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
