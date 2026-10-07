import { answersFor, claimQuizResult, getSettings, releaseQuizResult, suppressedSet } from "./db";
import { LETTERS, getQuestion, type Question, type QuizToken } from "./quiz";
import { listUnsubHeader, settingsWithSecret } from "./campaigns";
import { unsubscribeUrl } from "./render";
import { sendEmail } from "./resend";

/**
 * The results email: once someone answers the last question of a daily set,
 * their score and every question, with their answer, the right one and why,
 * land in their inbox. The answer page shows the same, but the email is the
 * copy they keep.
 *
 * Built from what was recorded, not from the link they clicked, so the score
 * matches the answer page. A row in quiz_results is claimed first, so a
 * double click or a retried beacon sends it once.
 */

type Look = { name: string; app: string; bg: string; card: string; ink: string; muted: string; line: string; accent: string; accentInk: string; ok: string; okSoft: string; bad: string; badSoft: string };

const LOOK: Record<string, Look> = {
  nursia: { name: "Nursia", app: "https://app.nursia.io", bg: "#FBFAF6", card: "#FFFFFF", ink: "#14161A", muted: "#5D626B", line: "#E6E3DA", accent: "#F5E85C", accentInk: "#14161A", ok: "#0B6B62", okSoft: "#E3F2EF", bad: "#B3261E", badSoft: "#FBE9E7" },
  prepclever: { name: "PrepClever", app: "https://app.prepclever.in", bg: "#EEF1FF", card: "#FFFFFF", ink: "#131B2E", muted: "#4F5466", line: "#DDE1F3", accent: "#0020A5", accentInk: "#FFFFFF", ok: "#0E7A4F", okSoft: "#E4F5EC", bad: "#B3261E", badSoft: "#FBE9E7" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const FONT = "font-family:Helvetica,Arial,sans-serif;";

type Row = { q: Question; choice: number };

export function resultsHtml(t: Pick<QuizToken, "b" | "n">, rows: Row[], unsub: string, postal: string) {
  const L = LOOK[t.b] ?? LOOK.nursia;
  const right = rows.filter((r) => r.choice === r.q.answer).length;
  const total = rows.length;
  const utm = "utm_source=email&amp;utm_medium=quiz&amp;utm_campaign=daily_results";
  const msg = right === total ? "A clean sweep. Same time tomorrow." : right === 0 ? "A tough set. Each explanation below is worth a second read." : "Every one you missed is one you'll get right next time. The explanations are below.";

  const blocks = rows.map(({ q, choice }, i) => {
    const verdict = choice < 0 ? ["Skipped", L.muted, L.bg] : choice === q.answer ? ["Correct", L.ok, L.okSoft] : ["Not quite", L.bad, L.badSoft];
    const opts = q.options.map((text, j) => {
      const isRight = j === q.answer;
      const isTheirs = j === choice && !isRight;
      const tag = isRight ? (j === choice ? "Your answer · correct" : "Correct answer") : isTheirs ? "Your answer" : "";
      const border = isRight ? L.ok : isTheirs ? L.bad : L.line;
      const bg = isRight ? L.okSoft : isTheirs ? L.badSoft : L.card;
      const why = q.why?.[j] ? `<div style="${FONT}font-size:13px;line-height:19px;color:${L.muted};padding-top:4px;">${esc(q.why[j])}</div>` : "";
      return `<tr><td style="padding:0 0 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1.5px solid ${border};border-radius:10px;background:${bg};"><tr>
        <td width="34" valign="top" style="width:34px;padding:11px 0 11px 12px;${FONT}font-size:14px;line-height:20px;font-weight:bold;color:${isRight ? L.ok : isTheirs ? L.bad : L.ink};">${LETTERS[j]}</td>
        <td valign="top" style="padding:11px 12px 11px 4px;${FONT}font-size:15px;line-height:21px;color:${L.ink};">${esc(text)}${tag ? ` <span style="font-size:12px;font-weight:bold;color:${isRight ? L.ok : L.bad};white-space:nowrap;">${tag}</span>` : ""}${why}</td>
      </tr></table></td></tr>`;
    }).join("");
    return `<tr><td style="padding:0 0 14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${L.card};border:1px solid ${L.line};border-radius:14px;"><tr><td style="padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr>
        <td style="${FONT}font-size:12px;line-height:17px;font-weight:bold;color:${L.muted};letter-spacing:.5px;text-transform:uppercase;">Question ${i + 1}${q.topic ? ` · ${esc(q.topic)}` : ""}</td>
        <td align="right"><span style="display:inline-block;${FONT}font-size:12px;line-height:16px;font-weight:bold;color:${verdict[1]};background:${verdict[2]};border-radius:999px;padding:4px 10px;">${verdict[0]}</span></td>
      </tr></table>
      <div style="${FONT}font-size:17px;line-height:25px;font-weight:bold;color:${L.ink};padding:10px 0 14px;">${esc(q.stem)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">${opts}</table>
      ${q.rationale ? `<div style="${FONT}font-size:14px;line-height:21px;color:${L.ink};background:${L.bg};border-radius:10px;padding:12px 14px;margin:4px 0 8px;"><b style="display:block;font-size:12px;color:${L.muted};">WHY</b>${esc(q.rationale)}</div>` : ""}
    </td></tr></table></td></tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${L.name} · Your score</title></head>
<body style="margin:0;padding:0;background:${L.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${right} of ${total} today. Every answer, explained.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${L.bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 4px 16px;${FONT}font-size:22px;font-weight:bold;color:${L.ink};letter-spacing:-.5px;">${L.name}</td></tr>
  <tr><td style="padding:0 0 14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${L.accent};border-radius:16px;"><tr><td align="center" style="padding:28px 20px;">
    <div style="${FONT}font-size:13px;line-height:18px;font-weight:bold;color:${L.accentInk};letter-spacing:1px;text-transform:uppercase;">Today's score${t.n ? ` · ${esc(t.n)}` : ""}</div>
    <div style="${FONT}font-size:56px;line-height:64px;font-weight:bold;color:${L.accentInk};">${right}<span style="font-size:26px;"> / ${total}</span></div>
    <div style="${FONT}font-size:15px;line-height:22px;color:${L.accentInk};">${msg}</div>
  </td></tr></table></td></tr>
  ${blocks}
  <tr><td align="center" style="padding:6px 0 22px;"><a href="${L.app}/practice?${utm}" style="display:inline-block;background:${L.ink};color:#FFFFFF;${FONT}font-size:15px;font-weight:bold;text-decoration:none;padding:14px 26px;border-radius:999px;">Keep practising &rarr;</a>
    <div style="${FONT}font-size:13px;line-height:19px;color:${L.muted};padding-top:10px;">Tomorrow's questions arrive in your inbox.</div></td></tr>
  <tr><td align="center" style="padding:0 0 8px;${FONT}font-size:12px;line-height:18px;color:${L.muted};">You're getting this because you answered today's ${L.name} questions.<br><a href="${unsub}" style="color:${L.muted};text-decoration:underline;">Unsubscribe</a>${postal ? ` · ${L.name} · ${esc(postal)}` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

async function rowsFor(t: QuizToken): Promise<Row[]> {
  const recorded = new Map((await answersFor(t.k)).map((a) => [a.idx, a.choice]));
  const qs = await Promise.all(t.q.map((_, i) => getQuestion(t, i).catch(() => undefined)));
  return qs.flatMap((q, i) => (q ? [{ q, choice: recorded.get(i) ?? -1 }] : []));
}

/** Sends the results for a finished set, once. Returns why it didn't, if it didn't. */
export async function sendQuizResults(t: QuizToken): Promise<string> {
  const rows = await rowsFor(t);
  if (!rows.length) return "no questions";
  if ((await suppressedSet()).has(t.e.toLowerCase())) return "unsubscribed";
  const right = rows.filter((r) => r.choice === r.q.answer).length;
  if (!(await claimQuizResult({ quizKey: t.k, brand: t.b, email: t.e, right, total: rows.length }))) return "already sent";
  try {
    const stored = await getSettings();
    const s = settingsWithSecret(stored);
    const brand = stored.brands[t.b];
    const unsub = unsubscribeUrl(s, t.b, t.e);
    const exam = t.b === "nursia" ? "NCLEX" : t.n || "exam";
    await sendEmail(
      {
        from: `${brand.fromName} <${brand.fromEmail}>`,
        to: [t.e],
        reply_to: brand.replyTo || undefined,
        subject: `${right}/${rows.length} on today's ${exam} questions: every answer, explained`,
        html: resultsHtml(t, rows, unsub, brand.postalAddress),
        headers: listUnsubHeader(unsub, brand.replyTo || brand.fromEmail),
        tags: [{ name: "kind", value: "quiz_results" }, { name: "brand", value: t.b }],
      },
      `quiz_results:${t.k}`,
    );
    return "sent";
  } catch (e) {
    /* Let the next attempt try again rather than leave a claim with no email behind it. */
    await releaseQuizResult(t.k).catch(() => {});
    throw e;
  }
}
