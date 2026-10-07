import { LETTERS } from "./quiz";
import type { Brand } from "./db";

/**
 * The AMP version of the daily quiz email: the questions are answered inside
 * the email, the way QuizMails does it. Gmail, Yahoo and Mail.ru show this
 * part to senders they've registered; everyone else (and Gmail before
 * registration, or 30 days after sending) gets the HTML part, whose options
 * are answer links to /q/….
 *
 * One question shows at a time, in the same space: answering swaps in the
 * next one under a one-line verdict, so the email never grows. The full
 * explanations go out in the results email after the last question.
 *
 * The scoreboard (today, lifetime correct, accuracy, streak) loads from
 * /api/quiz/amp as the email opens (amp-list), then follows each answer's
 * reply, so it's current every time the email is opened.
 *
 * Each question is an amp-form posting to /api/quiz/amp. Tapping an option
 * stores the pick (p0, p1, …: 'o2' or 'skip', as a bare 0 reads as unset)
 * and submits; the reply lands in a0, a1, …, and its scores and verdict are
 * copied into plain values (tr, lc, lv, …). Not into a shared object: setState
 * merges objects, so a second reply would overwrite the first. No answer is in
 * the markup, so reading the source doesn't give it away, and nothing is
 * recorded until someone taps, so link-scanning mail filters can't answer.
 */

type Look = { name: string; app: string; bg: string; card: string; cardInk: string; cardMuted: string; track: string; tile: string; optInk: string; letter: string; ok: string; okSoft: string; bad: string; badSoft: string; panel: string; panelInk: string; panelMuted: string; button: string; buttonInk: string; footer: string; footerInk: string };

const LOOK: Record<Brand, Look> = {
  prepclever: {
    name: "PrepClever", app: "https://app.prepclever.in", bg: "#E2E7FF", card: "#0020A5", cardInk: "#FFFFFF", cardMuted: "#DEE0FF", track: "#3A55D6", tile: "#1A37BD",
    optInk: "#131B2E", letter: "#0020A5", ok: "#0E7A4F", okSoft: "#E4F5EC", bad: "#B3261E", badSoft: "#FBE9E7",
    panel: "#FEFEFF", panelInk: "#131B2E", panelMuted: "#444654", button: "#131B2E", buttonInk: "#FFFFFF", footer: "#131B2E", footerInk: "#B1BAFF",
  },
  nursia: {
    name: "Nursia", app: "https://app.nursia.io", bg: "#FBFAF6", card: "#14161A", cardInk: "#FFFFFF", cardMuted: "#B9BCC2", track: "#3A3F47", tile: "#24282E",
    optInk: "#14161A", letter: "#14161A", ok: "#0B6B62", okSoft: "#E3F2EF", bad: "#B3261E", badSoft: "#FBE9E7",
    panel: "#FFFFFF", panelInk: "#14161A", panelMuted: "#5D626B", button: "#F5E85C", buttonInk: "#14161A", footer: "#14161A", footerInk: "#A9ADB4",
  },
};

export type AmpQuestion = { topic: string; stem: string; options: string[]; token: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function css(L: Look) {
  return `
body{margin:0;padding:0;background:${L.bg};font-family:Helvetica,Arial,sans-serif;color:${L.optInk}}
.wrap{max-width:600px;margin:0 auto;padding:24px 10px}
.sheet{background:${L.panel};border-radius:20px;padding:22px 12px 12px}
.logo{text-align:center;padding:4px 0 20px}
.logo a{text-decoration:none;color:${L.panelInk}}
.word{font-size:26px;font-weight:bold;letter-spacing:-1px}
.mark{display:inline-block;width:30px;height:30px;line-height:30px;border-radius:8px;background:#F5E85C;color:#14161A;font-weight:bold;font-size:20px;text-align:center;margin-right:6px;vertical-align:top}
.card{background:${L.card};border-radius:16px;padding:22px 20px;color:${L.cardInk}}
.top{display:flex;justify-content:space-between;align-items:center}
.pill{display:inline-block;background:#FFFFFF;color:#131B2E;border-radius:999px;padding:5px 12px;font-size:13px;line-height:18px;font-weight:bold}
.bar{display:flex;margin:14px 0 16px}
.bar span{flex:1;height:4px;background:${L.track};margin-right:4px}
.bar span:last-child{margin-right:0}
.bar span.on{background:#FFFFFF}
.bar span.ok{background:#3DD68C}
.bar span.bad{background:#FF8A80}
.board{display:flex}
.row{margin:0 0 18px}
.tile{flex:1;background:${L.tile};border-radius:10px;padding:9px 6px;text-align:center;margin-right:6px}
.tile:last-child{margin-right:0}
.tile b{display:block;font-size:19px;line-height:24px;color:#FFFFFF}
.tile span{display:block;font-size:11px;line-height:14px;color:${L.cardMuted}}
.flash{border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:14px;line-height:20px;font-weight:bold}
.flash.v-right{background:${L.okSoft};color:${L.ok}}
.flash.v-wrong{background:${L.badSoft};color:${L.bad}}
.flash.v-skip{background:#FFFFFF;color:${L.optInk}}
.topic{font-size:12px;line-height:17px;font-weight:bold;letter-spacing:1px;color:${L.cardMuted};margin-bottom:8px}
.stem{font-size:20px;line-height:28px;font-weight:bold;margin:0 0 16px}
.opt{display:block;background:#FFFFFF;color:${L.optInk};border:2px solid #FFFFFF;border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:15px;line-height:20px;font-weight:bold;cursor:pointer}
.opt input{position:absolute;opacity:0;width:0;height:0;margin:0}
.opt .l{color:${L.letter};margin-right:8px}
.opt.picked{border-color:${L.cardMuted};opacity:.85}
.opt.off{opacity:.55}
.skipper{display:block;width:200px;margin:8px auto 0;text-align:center;border:1.5px solid ${L.cardMuted};border-radius:999px;padding:10px 18px;font-size:14px;line-height:20px;font-weight:bold;color:${L.cardInk};cursor:pointer}
.skipper input{position:absolute;opacity:0;width:0;height:0;margin:0}
.skipper.gone{display:none}
.note{font-size:13px;line-height:19px;color:${L.cardMuted};margin:10px 0 0}
.err{font-size:14px;color:#FFD6D2;text-align:center;margin:8px 0 0}
.hint{text-align:center;font-size:13px;line-height:19px;color:${L.cardMuted};margin:14px 0 0}
.done{text-align:center}
.done .k{font-size:13px;font-weight:bold;letter-spacing:1px;color:${L.cardMuted}}
.done .n{font-size:56px;line-height:64px;font-weight:bold}
.recap{text-align:left;margin:14px 0 0}
.recap div{font-size:14px;line-height:20px;padding:8px 12px;border-radius:8px;background:${L.tile};margin-bottom:6px}
.panel{background:${L.panel};border:1px solid #D2D9F4;border-radius:12px;padding:22px 18px;margin-top:12px;text-align:center;color:${L.panelInk}}
.panel h2{font-size:19px;line-height:25px;margin:0 0 6px}
.panel p{font-size:14px;line-height:20px;color:${L.panelMuted};margin:0 0 16px}
.btn{display:inline-block;background:${L.button};color:${L.buttonInk};border-radius:999px;padding:14px 26px;font-size:15px;font-weight:bold;text-decoration:none}
.foot{background:${L.footer};border-radius:20px;padding:20px 24px;margin-top:10px;font-size:13px;line-height:22px;color:${L.footerInk}}
.foot a{color:#EEF0FF}
.foot .small{font-size:12px;line-height:18px;margin-top:10px}
`;
}

const tile = (value: string, label: string) => `<div class="tile"><b>${value}</b><span>${label}</span></div>`;

/** The scoreboard: from the server as the email opens, then from each answer's reply. */
function board(statsUrl: string, total: number) {
  const tiles = (today: string, correct: string, accuracy: string, streak: string) =>
    tile(today, "Today") + tile(correct, "Lifetime correct") + tile(accuracy, "Accuracy") + tile(streak, "Day streak");
  return `
    <div class="row" [hidden]="!!lv">
      <amp-list src="${statsUrl}" layout="fixed-height" height="56" items="items">
        <template type="amp-mustache"><div class="board">${tiles("{{today}}/{{todayTotal}}", "{{correct}}", "{{accuracy}}%", "{{streak}}")}</div></template>
        <div placeholder class="board">${tiles(`0/${total}`, "–", "–", "–")}</div>
        <div fallback class="board">${tiles(`0/${total}`, "–", "–", "–")}</div>
      </amp-list>
    </div>
    <div class="board row" hidden [hidden]="!lv">
      <div class="tile"><b [text]="tr + '/' + tt"></b><span>Today</span></div>
      <div class="tile"><b [text]="lc"></b><span>Lifetime correct</span></div>
      <div class="tile"><b [text]="la + '%'"></b><span>Accuracy</span></div>
      <div class="tile"><b [text]="ls"></b><span>Day streak</span></div>
    </div>`;
}

/** The latest reply's verdict and scores, as plain values. */
const LATEST = "lv: event.response.verdict, lh: event.response.headline, le: event.response.earlier, tr: event.response.today.right, tt: event.response.today.total, lc: event.response.life.correct, la: event.response.life.accuracy, ls: event.response.life.streak";

const optClass = (i: number, j: number) => `p${i} ? (p${i} == 'o${j}' ? 'opt picked' : 'opt off') : 'opt'`;

/** Question i shows once the one before is answered, and gives way when it is. */
const showWhen = (i: number) => (i === 0 ? `!!a0` : `!a${i - 1} || !!a${i}`);

function question(q: AmpQuestion, i: number, endpoint: string) {
  const options = q.options.map((text, j) => `
    <label class="opt" [class]="${optClass(i, j)}">
      <input type="radio" name="pick${i}" value="${j}" [disabled]="!!p${i}" on="change:AMP.setState({p${i}: 'o${j}', e${i}: false}),f${i}.submit">
      <span class="l">${LETTERS[j]}</span>${esc(text)}
    </label>`).join("");

  return `
  <form id="f${i}" method="post" action-xhr="${endpoint}"${i ? " hidden" : ""} [hidden]="${showWhen(i)}"
    on="submit-success:AMP.setState({a${i}: event.response, ${LATEST}});submit-error:AMP.setState({p${i}: null, e${i}: true})">
    <input type="hidden" name="t" value="${q.token}">
    <input type="hidden" name="c" value="" [value]="p${i}">
    <div class="topic">${esc(cap(q.topic || "Today's question"))}</div>
    <p class="stem">${esc(q.stem)}</p>
    ${options}
    <label class="skipper" [class]="p${i} ? 'skipper gone' : 'skipper'">
      <input type="radio" name="pick${i}" value="skip" on="change:AMP.setState({p${i}: 'skip', e${i}: false}),f${i}.submit">Skip this one
    </label>
    <p class="err" hidden [hidden]="!e${i}">That didn't save. Tap your answer again.</p>
  </form>`;
}

export function quizAmpHtml(opts: {
  brand: Brand;
  site: string;
  set: AmpQuestion[];
  exam: string;
  unsubscribeUrl: string;
  postalAddress: string;
}) {
  const L = LOOK[opts.brand] ?? LOOK.prepclever;
  const site = opts.site.replace(/\/$/, "");
  const endpoint = `${site}/api/quiz/amp`;
  const total = opts.set.length;
  const last = total - 1;
  const utm = "utm_source=email&amp;utm_medium=quiz_amp&amp;utm_campaign=daily_question";

  const logo = opts.brand === "prepclever"
    ? `<amp-img src="${site}/brand/prepclever-logo.png" width="190" height="44" alt="PrepClever"></amp-img>`
    : `<span class="mark">n</span><span class="word">nursia</span>`;

  /* "Question 2 of 3", counting answered ones; "Done for today" after the last. */
  const step = opts.set.reduceRight((acc, _, i) => `a${i} ? ${acc} : 'Question ${i + 1} of ${total}'`, "'Done for today'");

  const bar = opts.set.map((_, i) =>
    `<span class="${i === 0 ? "on" : ""}" [class]="a${i} ? (a${i}.verdict == 'right' ? 'ok' : (a${i}.verdict == 'wrong' ? 'bad' : 'on')) : (${i === 0 ? "true" : `!!a${i - 1}`} ? 'on' : '')"></span>`).join("");

  return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
<meta charset="utf-8">
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
<script async custom-element="amp-bind" src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"></script>
<script async custom-element="amp-list" src="https://cdn.ampproject.org/v0/amp-list-0.1.js"></script>
<script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
<style amp4email-boilerplate>body{visibility:hidden}</style>
<style amp-custom>${css(L)}</style>
</head>
<body>
<div class="wrap"><div class="sheet">
  <div class="logo"><a href="${L.app}/?${utm}">${logo}</a></div>
  <div class="card">
    <div class="top"><span class="pill" [text]="${step}">Question 1 of ${total}</span></div>
    <div class="bar">${bar}</div>
    ${board(`${endpoint}?t=${encodeURIComponent(opts.set[0].token)}`, total)}
    <div class="flash" hidden [hidden]="!lv" [class]="'flash v-' + lv" [text]="lh"></div>
    ${opts.set.map((q, i) => question(q, i, endpoint)).join("")}
    <div class="done" hidden [hidden]="!a${last}">
      <div class="k">TODAY'S SCORE</div>
      <div class="n" [text]="tr + ' / ' + tt"></div>
      <div class="recap">${opts.set.map((_, i) => `<div [text]="a${i} ? 'Q${i + 1}  ' + a${i}.headline : ''"></div>`).join("")}</div>
      <p class="note">Every answer, explained, is on its way to your inbox. Tomorrow's questions arrive in the morning.</p>
    </div>
    <p class="note" hidden [hidden]="!le">You'd already answered that one, so your first answer is the one that counts.</p>
    <p class="hint" [hidden]="!!a${last}">Answer all ${total} to add to your lifetime score. Every answer, explained, comes to your inbox.</p>
  </div>
  <div class="panel">
    <h2>Keep the streak going</h2>
    <p>Sign in to see every rationale and the topics you're weakest in.</p>
    <a class="btn" href="${L.app}/practice?${utm}">Practise more in ${L.name} &rarr;</a>
  </div>
</div>
<div class="foot">
  <b style="color:#EEF0FF;font-size:16px">${L.name}</b><br>
  <a href="${L.app}/login?${utm}">Sign in</a> &nbsp;·&nbsp; <a href="${esc(opts.unsubscribeUrl)}">Unsubscribe</a>
  <div class="small">You're receiving ${total} ${esc(opts.exam)} questions a day because you joined ${L.name} daily practice.${opts.postalAddress ? `<br>${L.name} · ${esc(opts.postalAddress)}` : ""}</div>
</div>
</div>
</body>
</html>`;
}
