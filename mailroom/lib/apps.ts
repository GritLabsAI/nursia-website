/**
 * PrepClever ships one Android app per exam family. The family is the
 * `brand_id` on PrepClever's `exam_series`; the package is the app on Google
 * Play (developer "PrepClever"). Families without an entry (SBI, IBPS, NABARD,
 * SEBI) have no app yet, so their people aren't asked to install one.
 *
 * Only NISM's package is in PrepClever's `brands` table; the other two were
 * read off the Play listing, so add new ones here when an app goes live.
 */

export type App = { name: string; exams: string; playUrl: string };

const play = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}`;

export const PREPCLEVER_APPS: Record<string, App> = {
  nism: { name: "NISM Exam Prep", exams: "NISM certifications", playUrl: play("com.nismready.app") },
  jaiib_caiib: { name: "JAIIB CAIIB Prep", exams: "IIBF exams: JAIIB, CAIIB and certificates", playUrl: play("com.gritlabs.jaiibcaiib") },
  ic38: { name: "IC-38 Exam Prep", exams: "IRDAI and III insurance exams", playUrl: play("com.gritlabs.ic38") },
};

export const NURSIA_PLAY_URL = play("com.nclexmaster.app");
