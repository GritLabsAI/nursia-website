/**
 * What firestore.rules actually allows.
 *
 * There is no server in this project, so these rules are the whole of the
 * access control. Every claim the rules file makes in a comment is asserted
 * here against the real emulator, because a rule that silently stopped working
 * looks exactly like a rule that works.
 *
 *   npx firebase emulators:start --only firestore --project nursia-local
 *   node scripts/test-rules.mjs
 */

import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "nursia-rules-test";

const attempt = (over = {}) => ({
  questionId: "CV-001",
  surface: "drill",
  topic: "cardiovascular",
  correct: false,
  picked: [2],
  answer: [1],
  answeredAt: new Date().toISOString(),
  ...over,
});

let passed = 0;
const failures = [];

async function check(name, run) {
  try {
    await run();
    passed += 1;
  } catch (error) {
    failures.push(`${name}\n    ${error.message}`);
  }
}

const env = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: {
    host: "127.0.0.1",
    port: 8098,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});

await env.clearFirestore();

const mine = env.authenticatedContext("me").firestore();
const theirs = env.authenticatedContext("someone-else").firestore();
const nobody = env.unauthenticatedContext().firestore();

const myAttempt = (db, id = "a1") => doc(db, "users/me/attempts", id);

await check("owner can write an attempt", () =>
  assertSucceeds(setDoc(myAttempt(mine), attempt())),
);

await check("another account cannot read my attempts", () =>
  assertFails(getDoc(myAttempt(theirs))),
);

await check("a signed-out browser cannot read my attempts", () =>
  assertFails(getDoc(myAttempt(nobody))),
);

await check("another account cannot write to my attempts", () =>
  assertFails(setDoc(myAttempt(theirs, "a2"), attempt())),
);

/* The point of create-only: history cannot be rewritten into a better score. */
await check("an attempt cannot be turned from wrong into right", () =>
  assertFails(updateDoc(myAttempt(mine), { correct: true })),
);

await check("an attempt with a bad surface is rejected", () =>
  assertFails(setDoc(myAttempt(mine, "a3"), attempt({ surface: "cheating" }))),
);

/* Omitted rather than set to undefined: the SDK refuses to send undefined at
   all, so passing it would test the client library instead of the rules. */
await check("an attempt without a questionId is rejected", () => {
  const { questionId, ...withoutId } = attempt();
  void questionId;
  return assertFails(setDoc(myAttempt(mine, "a4"), withoutId));
});

await check("an oversized picked list is rejected", () =>
  assertFails(setDoc(myAttempt(mine, "a5"), attempt({ picked: Array(50).fill(0) }))),
);

await check("the owner can clear an attempt out", () =>
  assertSucceeds(deleteDoc(myAttempt(mine))),
);

await check("owner can write their own mastery record", () =>
  assertSucceeds(
    setDoc(doc(mine, "users/me/questions", "CV-001"), { questionId: "CV-001", attempts: 1 }),
  ),
);

await check("another account cannot read my mastery records", () =>
  assertFails(getDoc(doc(theirs, "users/me/questions", "CV-001"))),
);

await check("owner can write a daily counter", () =>
  assertSucceeds(setDoc(doc(mine, "users/me/daily", "2026-09-02"), { answered: 3 })),
);

await check("another account cannot read my daily counters", () =>
  assertFails(getDoc(doc(theirs, "users/me/daily", "2026-09-02"))),
);

await check("owner can write their stats summary", () =>
  assertSucceeds(setDoc(doc(mine, "users/me/stats", "summary"), { answered: 10 })),
);

/* The bank: readable to an account, writable by nobody with a browser. */
await env.withSecurityRulesDisabled((ctx) =>
  setDoc(doc(ctx.firestore(), "questions", "CV-001"), { id: "CV-001", stem: "…" }),
);

await check("a signed-in account can read the bank", () =>
  assertSucceeds(getDoc(doc(mine, "questions", "CV-001"))),
);

await check("a signed-out browser cannot read the bank", () =>
  assertFails(getDoc(doc(nobody, "questions", "CV-001"))),
);

await check("no browser can write to the bank", () =>
  assertFails(setDoc(doc(mine, "questions", "CV-002"), { id: "CV-002" })),
);

await check("nothing outside the named collections is open", () =>
  assertFails(setDoc(doc(mine, "anything-else", "x"), { a: 1 })),
);

await env.cleanup();

console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exitCode = 1;
}
