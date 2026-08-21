/**
 * A question as it comes out of the bank: one correct option, a rationale, and
 * a line on every option saying why it wins or loses.
 *
 * Deliberately not `Question` from content.ts. Those eleven items are
 * hand-written for the SEO pages and carry an NCSBN category and a format; the
 * bank is the drilling material behind /practice and the topic pages.
 */
export type BankQuestion = {
  id: string;
  stem: string;
  options: string[];
  /** index of the correct option */
  answer: number;
  /** the one thing to take away, shown after answering */
  rationale: string;
  /** parallel to `options` — why that option is right or wrong */
  why: string[];
};
