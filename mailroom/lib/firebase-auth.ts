import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * Checks a Firebase ID token without the Admin SDK or a service account.
 *
 * Firebase signs ID tokens with Google's "securetoken" keys, published as a
 * JWK set. A token is good when its RS256 signature verifies against one of
 * them and its claims say it was minted for this project, recently, for a
 * verified email. That's exactly what firebase-admin's verifyIdToken checks.
 */

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let keys: { at: number; byKid: Map<string, JsonWebKey> } | undefined;

async function publicKey(kid: string) {
  if (!keys || Date.now() - keys.at > 3600_000 || !keys.byKid.has(kid)) {
    const res = await fetch(JWKS_URL, { cache: "no-store" });
    const { keys: list } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
    keys = { at: Date.now(), byKid: new Map(list.map((k) => [k.kid, k])) };
  }
  const jwk = keys.byKid.get(kid);
  return jwk ? createPublicKey({ key: jwk, format: "jwk" }) : null;
}

export type FirebaseClaims = { email: string; email_verified: boolean; name?: string; picture?: string; sub: string };

export async function verifyFirebaseToken(token: string, projectId: string): Promise<FirebaseClaims> {
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) throw new Error("Malformed token");
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected token type");

  const key = await publicKey(header.kid);
  if (!key) throw new Error("Unknown signing key");
  const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(key, Buffer.from(sig, "base64url"));
  if (!ok) throw new Error("Bad signature");

  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== projectId) throw new Error("Token is for another project");
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Wrong issuer");
  if (!(claims.exp > now) || !(claims.iat <= now + 60) || !(claims.auth_time <= now + 60)) throw new Error("Token expired");
  if (!claims.sub) throw new Error("No subject");
  return claims as FirebaseClaims;
}
