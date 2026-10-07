import { LETTERS, signQuiz, type Question, type QuizToken } from "./quiz";

/**
 * The page an answer link opens. Plain HTML, styled per brand, because it's
 * the continuation of the email and should feel like it.
 *
 * Opening the page doesn't record the answer; a script on it does. Corporate
 * mail scanners open every link in an email before the person sees it, and
 * would otherwise "answer" all four options. They don't run scripts.
 */

type Theme = {
  name: string;
  app: string;
  font: string;
  fontLink: string;
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  ok: string;
  okSoft: string;
  bad: string;
  badSoft: string;
  logo: string;
};

const THEMES: Record<string, Theme> = {
  nursia: {
    name: "Nursia",
    app: "https://app.nursia.io",
    font: "'Bricolage Grotesque', system-ui, sans-serif",
    fontLink: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap",
    bg: "#FBFAF6",
    card: "#FFFFFF",
    ink: "#14161A",
    muted: "#5D626B",
    line: "#E6E3DA",
    accent: "#F5E85C",
    accentInk: "#14161A",
    ok: "#0B6B62",
    okSoft: "#E3F2EF",
    bad: "#B3261E",
    badSoft: "#FBE9E7",
    logo: `<span style="display:inline-grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#F5E85C;color:#14161A;font-weight:800;font-size:20px">n</span><span style="font-weight:800;font-size:24px;letter-spacing:-1px">nursia</span>`,
  },
  prepclever: {
    name: "PrepClever",
    app: "https://app.prepclever.in",
    font: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontLink: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
    bg: "#EEF1FF",
    card: "#FFFFFF",
    ink: "#131B2E",
    muted: "#4F5466",
    line: "#DDE1F3",
    accent: "#0020A5",
    accentInk: "#FFFFFF",
    ok: "#0E7A4F",
    okSoft: "#E4F5EC",
    bad: "#B3261E",
    badSoft: "#FBE9E7",
    logo: `<img src="/brand/prepclever-logo.png" alt="PrepClever" width="150" height="35" style="display:block">`,
  },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type Marked = { question: Question; choice: number | "skip"; recordedEarlier: boolean };

function shell(t: Theme, title: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · ${t.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${t.fontLink}" rel="stylesheet">
<style>
:root{--bg:${t.bg};--card:${t.card};--ink:${t.ink};--muted:${t.muted};--line:${t.line};--accent:${t.accent};--accent-ink:${t.accentInk};--ok:${t.ok};--ok-soft:${t.okSoft};--bad:${t.bad};--bad-soft:${t.badSoft}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ${t.font};-webkit-font-smoothing:antialiased}
main{max-width:680px;margin:0 auto;padding:24px 16px 64px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:22px}
header a{display:flex;align-items:center;gap:8px;color:var(--ink);text-decoration:none}
.progress{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--muted)}
.dots{display:flex;gap:5px}.dots i{width:22px;height:6px;border-radius:3px;background:var(--line)}
.dots i.ok{background:var(--ok)}.dots i.bad{background:var(--bad)}.dots i.skip{background:var(--muted)}.dots i.now{background:var(--ink)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px}
.card+.card{margin-top:16px}
.verdict{display:flex;gap:12px;align-items:center;border-radius:12px;padding:14px 16px;margin:-6px -6px 20px;font-weight:700;font-size:17px}
.verdict.ok{background:var(--ok-soft);color:var(--ok)}.verdict.bad{background:var(--bad-soft);color:var(--bad)}.verdict.skip{background:var(--bg);color:var(--ink)}
.verdict b{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;color:#fff;flex:none}
.verdict.ok b{background:var(--ok)}.verdict.bad b{background:var(--bad)}.verdict.skip b{background:var(--muted)}
.topic{font-size:13px;font-weight:700;color:var(--muted);text-transform:capitalize;margin-bottom:6px}
h1{font-size:21px;line-height:1.4;margin:0 0 18px;letter-spacing:-.01em}
ol.opts{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.opt{border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:30px 1fr;gap:4px 10px}
.opt .l{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:800;font-size:14px;background:var(--bg);grid-row:span 2}
.opt .w{grid-column:2;font-size:14px;color:var(--muted);font-family:${t === THEMES.nursia ? "'Source Serif 4', Georgia, serif" : "inherit"}}
.opt.right{border-color:var(--ok);background:var(--ok-soft)}.opt.right .l{background:var(--ok);color:#fff}
.opt.wrong{border-color:var(--bad);background:var(--bad-soft)}.opt.wrong .l{background:var(--bad);color:#fff}
.tag{font-size:12px;font-weight:700;margin-left:6px;white-space:nowrap}.right .tag{color:var(--ok)}.wrong .tag{color:var(--bad)}
.why{margin-top:18px;padding:14px 16px;border-radius:12px;background:var(--bg);font-size:15px}
.why strong{display:block;font-size:13px;color:var(--muted);margin-bottom:2px}
.score{display:flex;justify-content:space-between;align-items:center;margin-top:18px;font-weight:700}
.score span{color:var(--muted);font-weight:600;font-size:14px}
a.choice{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;text-decoration:none;color:var(--ink);border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);transition:border-color .15s,transform .15s}
a.choice:hover,a.choice:focus-visible{border-color:var(--ink);transform:translateY(-1px)}
a.choice .l{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:800;font-size:14px;background:var(--accent);color:var(--accent-ink)}
.next-label{font-size:14px;font-weight:700;color:var(--muted);margin-bottom:8px}
.skip{display:inline-block;margin-top:12px;font-size:14px;color:var(--muted)}
.final{text-align:center;padding:34px 26px}
.big{font-size:64px;font-weight:800;letter-spacing:-.04em;line-height:1}
.big small{font-size:28px;color:var(--muted)}
.recap{list-style:none;padding:0;margin:22px 0 0;text-align:left;display:grid;gap:8px}
.recap li{display:flex;gap:10px;align-items:center;font-size:15px;padding:10px 12px;border-radius:10px;background:var(--bg)}
.recap b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;flex:none}
.btn{display:inline-block;margin-top:22px;background:var(--accent);color:var(--accent-ink);font-weight:800;text-decoration:none;padding:14px 22px;border-radius:12px}
.note{color:var(--muted);font-size:14px;margin-top:12px}
footer{text-align:center;color:var(--muted);font-size:13px;margin-top:28px}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><main>${body}</main>${script}</body></html>`;
}

function dots(r: string, total: number, now: number) {
  return `<span class="dots" aria-hidden="true">${Array.from({ length: total }, (_, i) =>
    `<i class="${r[i] === "1" ? "ok" : r[i] === "0" ? "bad" : r[i] === "s" ? "skip" : i === now ? "now" : ""}"></i>`).join("")}</span>`;
}

/** The page after answering question `t.i`. */
export function answerPage(
  t: QuizToken,
  marked: Marked,
  next: Question | undefined,
  all: (Question | undefined)[],
  site: string,
) {
  const th = THEMES[t.b] ?? THEMES.nursia;
  const q = marked.question;
  const total = t.q.length;
  const choice = marked.choice;
  const result = choice === "skip" ? "s" : choice === q.answer ? "1" : "0";
  const r = t.r + result;
  const right = [...r].filter((x) => x === "1").length;
  const done = t.i + 1 >= total;
  const utm = `utm_source=email&utm_medium=quiz&utm_campaign=daily_question`;

  const verdict = result === "1"
    ? `<div class="verdict ok" role="status"><b>&#10003;</b>Correct.</div>`
    : result === "0"
      ? `<div class="verdict bad" role="status"><b>&#10005;</b>Not quite. The answer is ${LETTERS[q.answer]}.</div>`
      : `<div class="verdict skip" role="status"><b>&#8250;</b>Skipped. The answer is ${LETTERS[q.answer]}.</div>`;

  const options = q.options.map((text, i) => {
    const cls = i === q.answer ? "right" : i === choice ? "wrong" : "";
    const tag = i === q.answer ? `<span class="tag">Correct answer</span>` : i === choice ? `<span class="tag">Your answer</span>` : "";
    return `<li class="opt ${cls}"><span class="l">${LETTERS[i]}</span><span>${esc(text)}${tag}</span>${q.why?.[i] ? `<span class="w">${esc(q.why[i])}</span>` : ""}</li>`;
  }).join("");

  const answered = `<section class="card" aria-labelledby="q">
    ${verdict}
    <div class="topic">${esc(q.topic || t.n || "")}</div>
    <h1 id="q">${esc(q.stem)}</h1>
    <ol class="opts">${options}</ol>
    ${q.rationale ? `<div class="why"><strong>Why</strong>${esc(q.rationale)}</div>` : ""}
    ${marked.recordedEarlier ? `<p class="note">You'd already answered this one, so your first answer is the one that counts.</p>` : ""}
    <div class="score">Score so far <span>${right} of ${r.length}</span></div>
  </section>`;

  let after = "";
  if (!done && next) {
    const nextToken = signQuiz({ ...t, i: t.i + 1, r });
    after = `<section class="card" aria-labelledby="nq">
      <div class="next-label">Question ${t.i + 2} of ${total}</div>
      <div class="topic">${esc(next.topic || "")}</div>
      <h1 id="nq">${esc(next.stem)}</h1>
      <div class="opts" style="display:grid;gap:10px">${next.options.map((text, i) =>
        `<a class="choice" href="${site}/q/${nextToken}?c=${i}"><span class="l">${LETTERS[i]}</span><span>${esc(text)}</span></a>`).join("")}</div>
      <a class="skip" href="${site}/q/${nextToken}?c=skip">Skip this one</a>
    </section>`;
  } else {
    const msg = right === total ? "A clean sweep." : right === 0 ? "Tough set. Each explanation above is worth a second read." : "Every wrong answer is one you'll get right next time.";
    after = `<section class="card final" aria-labelledby="fs">
      <div class="next-label" id="fs">Today's score</div>
      <div class="big">${right}<small> / ${total}</small></div>
      <p class="note">${msg}</p>
      <ol class="recap">${all.map((x, i) => `<li><b style="background:${r[i] === "1" ? th.ok : r[i] === "0" ? th.bad : th.muted}">${r[i] === "1" ? "&#10003;" : r[i] === "0" ? "&#10005;" : "&#8250;"}</b><span style="text-transform:capitalize">${esc(x?.topic || `Question ${i + 1}`)}</span></li>`).join("")}</ol>
      <a class="btn" href="${th.app}/practice?${utm}">Keep practising</a>
      <p class="note">Tomorrow's questions arrive in your inbox.</p>
    </section>`;
  }

  const body = `<header><a href="${th.app}/?${utm}" aria-label="${th.name}">${th.logo}</a>
    <div class="progress">Question ${t.i + 1} of ${total} ${dots(r, total, t.i + 1)}</div></header>
    ${answered}${after}
    <footer>${th.name}${t.n ? ` · ${esc(t.n)}` : ""}</footer>`;

  /* Recording happens here, not on the server render — see the note at the top. */
  const script = marked.recordedEarlier || choice === undefined ? "" : `<script>
    try { navigator.sendBeacon("/api/quiz/record", new Blob([JSON.stringify({ t: ${JSON.stringify(signQuiz(t))}, c: ${JSON.stringify(choice)} })], { type: "application/json" })); } catch (e) {}
  </script>`;
  return shell(th, `Question ${t.i + 1}`, body, script);
}

export function expiredPage(brand?: string) {
  const th = THEMES[brand ?? "nursia"] ?? THEMES.nursia;
  return shell(th, "Link expired", `<header><a href="${th.app}">${th.logo}</a></header>
    <section class="card"><h1>This question link doesn't work any more.</h1>
    <p class="note">It may have been cut off by your email app. Today's questions are waiting in the app too.</p>
    <a class="btn" href="${th.app}/practice">Open practice</a></section>`);
}
