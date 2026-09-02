/**
 * Push the question bank into Firestore.
 *
 * The bank in `src/lib/bank` stays the source of truth and stays the thing the
 * site renders: the public pages ship their questions in the server HTML, and
 * that only works if the questions are in the bundle. This mirrors that bundle
 * up so the data exists somewhere a person can query — which item is missed
 * most, which topic is thin, what changed between two releases — without
 * shipping an admin app to find out.
 *
 * Idempotent. Every write is a merge keyed by the question id, so running it
 * twice changes nothing and running it after an edit updates exactly what
 * moved. Questions that have left the bank are reported and, with --prune,
 * deleted.
 *
 * Usage:
 *   node scripts/seed-questions.mjs --dry-run     # say what would happen
 *   node scripts/seed-questions.mjs               # write
 *   node scripts/seed-questions.mjs --prune       # write, and delete strays
 *   node scripts/seed-questions.mjs --emulator    # against the local emulator
 *
 * Credentials, in the order they are looked for:
 *   FIREBASE_SERVICE_ACCOUNT       the service account JSON, inline
 *   GOOGLE_APPLICATION_CREDENTIALS a path to that JSON file
 *   --emulator                     no credentials needed
 *
 * A service account key is a real secret, unlike everything in .env.local.
 * Keep it out of the repo: pass it through the environment, and rotate it in
 * the Firebase console if it ever lands somewhere it should not.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const ROOT = process.cwd();
const BANK = join(ROOT, "src", "lib", "bank");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const prune = args.has("--prune");
const emulator = args.has("--emulator");

/* Firestore caps a batch at 500 operations. 400 leaves room and keeps each
   round trip small enough that a failure costs little to retry. */
const BATCH = 400;

/**
 * Read the bank the same way the site does — from the generated modules, not
 * by re-parsing the mockup. Anything the site cannot import is not in the
 * bank, so this cannot drift from what a candidate is actually answering.
 */
function readBank() {
  /* counts.ts is TypeScript and Node will not import it, so the topic list is
     read out of the file. It is generated, so its shape is predictable. */
  const source = readFileSync(join(BANK, "counts.ts"), "utf8");
  const slugs = [...source.matchAll(/"([a-z-]+)":\s*\d+/g)].map((m) => m[1]);
  if (!slugs.length) throw new Error("No topics found in src/lib/bank/counts.ts");

  const bank = [];
  for (const slug of slugs) {
    /* The generated modules are a `const questions: BankQuestion[] = [...]`
       literal and an export. Stripping the two type annotations leaves JSON
       that Node can parse, which avoids putting a TypeScript loader in the
       dependency list for one script. */
    const text = readFileSync(join(BANK, `${slug}.ts`), "utf8");
    /* From the `=`, not from the first bracket — the first bracket in the file
       belongs to the `BankQuestion[]` annotation. */
    const start = text.indexOf("[", text.indexOf("="));
    const end = text.lastIndexOf("]");
    if (start < 0 || end < 0) throw new Error(`Could not find the array in ${slug}.ts`);
    const questions = JSON.parse(text.slice(start, end + 1));
    for (const q of questions) bank.push({ ...q, topic: slug });
  }
  return bank;
}

/**
 * A content hash per question, so a re-run can say what actually changed
 * rather than reporting every document as touched.
 */
const hashOf = (q) =>
  createHash("sha1")
    .update(JSON.stringify([q.stem, q.options, q.answer, q.rationale, q.why]))
    .digest("hex")
    .slice(0, 12);

function connect() {
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8098";
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nursia-local" });
    return getFirestore();
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!inline && !path) {
    throw new Error(
      "No credentials. Set FIREBASE_SERVICE_ACCOUNT to the service account JSON, or " +
        "GOOGLE_APPLICATION_CREDENTIALS to its path, or pass --emulator.",
    );
  }
  const account = JSON.parse(inline ?? readFileSync(path, "utf8"));
  initializeApp({ credential: cert(account), projectId: account.project_id });
  return getFirestore();
}

async function main() {
  const bank = readBank();
  const byTopic = {};
  for (const q of bank) byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;

  console.log(
    `bank: ${bank.length} questions across ${Object.keys(byTopic).length} topics` +
      (dryRun ? "  (dry run — nothing will be written)" : ""),
  );

  const ids = new Set();
  for (const q of bank) {
    if (ids.has(q.id)) throw new Error(`Duplicate question id in the bank: ${q.id}`);
    ids.add(q.id);
  }

  if (dryRun) {
    for (const [topic, n] of Object.entries(byTopic).sort()) console.log(`  ${topic}  ${n}`);
    return;
  }

  const db = connect();
  const now = new Date().toISOString();

  /* What is up there already, so the run can report adds and changes rather
     than a flat "wrote 200". One read of the whole collection is cheap and
     turns a silent overwrite into a reviewable diff. */
  const existing = new Map();
  const snap = await db.collection("questions").get();
  snap.forEach((d) => existing.set(d.id, d.data()));

  let added = 0;
  let changed = 0;
  let same = 0;

  for (let i = 0; i < bank.length; i += BATCH) {
    const chunk = bank.slice(i, i + BATCH);
    const batch = db.batch();
    let writes = 0;

    for (const q of chunk) {
      const hash = hashOf(q);
      const before = existing.get(q.id);
      if (!before) added += 1;
      else if (before.hash !== hash) changed += 1;
      else {
        same += 1;
        continue;
      }

      batch.set(
        db.collection("questions").doc(q.id),
        {
          id: q.id,
          topic: q.topic,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          rationale: q.rationale,
          why: q.why ?? [],
          hash,
          updatedAt: now,
        },
        { merge: true },
      );
      writes += 1;
    }

    if (writes) await batch.commit();
  }

  const strays = [...existing.keys()].filter((id) => !ids.has(id));
  if (strays.length) {
    if (prune) {
      for (let i = 0; i < strays.length; i += BATCH) {
        const batch = db.batch();
        for (const id of strays.slice(i, i + BATCH)) {
          batch.delete(db.collection("questions").doc(id));
        }
        await batch.commit();
      }
      console.log(`pruned ${strays.length} question(s) no longer in the bank`);
    } else {
      console.log(
        `${strays.length} question(s) in Firestore are no longer in the bank ` +
          `(${strays.slice(0, 5).join(", ")}${strays.length > 5 ? ", …" : ""}). ` +
          `Re-run with --prune to delete them.`,
      );
    }
  }

  /* One document that says what is down there, so a client or a dashboard can
     check the bank version without paging the whole collection. */
  await db
    .collection("meta")
    .doc("bank")
    .set(
      { total: bank.length, byTopic, updatedAt: now, seededAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

  console.log(`done — ${added} added, ${changed} updated, ${same} unchanged`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
