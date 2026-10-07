/**
 * Builds the everyday lifecycle emails for both brands:
 *
 *   onboarding-dropoff   signed up, never finished onboarding
 *   first-practice       onboarded, hasn't answered anything
 *   checkout-reminder    started checkout, didn't pay (no discount)
 *   plans-nudge          looked at plans, didn't start checkout
 *   win-back             gone quiet
 *   exam-countdown       exam date coming up
 *
 *   node internal/email/templates/build-basics.cjs
 *
 * Header, footer and outer frame are lifted from each brand's
 * onboarding-welcome.html, so a change to those carries over on the next run.
 * Everything said about the product is checked against what exists: Nursia's
 * prices and terms come from src/lib/content.ts and /pricing; PrepClever sells
 * through its mobile app, per app.prepclever.in/paywall. Every link points to a
 * route that exists in that app. Voice follows brand-kit/guide/voice.html: no
 * exclamation marks, no urgency, no pass-rate claims.
 */

const fs = require("fs");
const path = require("path");

const BRANDS = {
  nursia: {
    name: "Nursia",
    app: "https://app.nursia.io",
    exam: '{{ exam | default: "NCLEX-RN" }}',
    hero: { bg: "#1B1E23", border: "1px solid #2C3037", radius: "8px", kicker: "#B9BCC2", h1: "#FBFAF6", body: "#B9BCC2", bodyFont: "Georgia,'Times New Roman',serif" },
    card: { bg: "#14161A", border: "1px solid #2C3037", radius: "8px", kicker: "#F5E85C", title: "#FBFAF6", text: "#A9ADB4", textFont: "Georgia,'Times New Roman',serif" },
    note: { bg: "#1B1E23", border: "1px solid #2C3037", kicker: "#A9ADB4", text: "#A9ADB4" },
    kickerFont: "'Courier New',Courier,monospace",
    kickerCase: "uppercase",
    h1Size: "32px;line-height:40px;letter-spacing:-1.2px",
    hl: (t) => `<span style="background:#F5E85C;color:#14161A;padding:0 5px;">${t}</span>`,
    btn: { bg: "#F5E85C", fg: "#14161A", radius: "6px" },
    ghost: { fg: "#F5E85C", bg: "#1B1E23", border: "#F5E85C" },
    tile: { bg: "#F5E85C", fg: "#14161A", radius: "4px", font: "'Courier New',Courier,monospace" },
    link: "#F5E85C",
  },
  prepclever: {
    name: "PrepClever",
    app: "https://app.prepclever.in",
    exam: '{{ exam | default: "your NISM exam" }}',
    hero: { bg: "#0020A5", border: "0", radius: "16px", kicker: "#DEE0FF", h1: "#FFFFFF", body: "#DEE0FF", bodyFont: "Helvetica,Arial,sans-serif" },
    card: { bg: "#F2F3FF", border: "0", radius: "12px", kicker: "#0020A5", title: "#131B2E", text: "#444654", textFont: "Helvetica,Arial,sans-serif" },
    note: { bg: "#F2F3FF", border: "0", kicker: "#444654", text: "#444654" },
    kickerFont: "Helvetica,Arial,sans-serif",
    kickerCase: "none",
    h1Size: "28px;line-height:34px;letter-spacing:-0.5px",
    hl: (t) => `<span style="background:#FFFFFF;color:#0020A5;padding:0 6px;border-radius:4px;">${t}</span>`,
    btn: { bg: "#FFFFFF", fg: "#0020A5", radius: "999px" },
    ghost: { fg: "#0020A5", bg: "#F2F3FF", border: "#0020A5" },
    tile: { bg: "#0020A5", fg: "#FFFFFF", radius: "999px", font: "Helvetica,Arial,sans-serif" },
    link: "#0020A5",
  },
};

/* ── building blocks (table layout, inline styles, like the originals) ── */

const T = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const sp = (h) => `<tr><td height="${h}" style="height:${h}px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>`;
const utm = (b, key, content) => `utm_source=email&amp;utm_medium=lifecycle&amp;utm_campaign=${key}${content ? `&amp;utm_content=${content}` : ""}`;
const href = (b, p, key, content) => `${b.app}${p}?${utm(b, key, content)}`;

function button(b, url, label, width = 260) {
  return `<tr><td><table ${T} width="${width}" style="width:${width}px;max-width:100%;"><tr><td align="center" bgcolor="${b.btn.bg}" style="border-radius:${b.btn.radius};background:${b.btn.bg};"><a href="${url}" target="_blank" style="display:block;padding:14px 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;font-weight:bold;color:${b.btn.fg};text-decoration:none;text-align:center;border-radius:${b.btn.radius};">${label}</a></td></tr></table></td></tr>`;
}

function ghostButton(b, url, label, width = 240) {
  return `<tr><td><table ${T} width="${width}" style="width:${width}px;max-width:100%;"><tr><td align="center" bgcolor="${b.ghost.bg}" style="border-radius:${b.btn.radius};background:${b.ghost.bg};border:1.5px solid ${b.ghost.border};"><a href="${url}" target="_blank" style="display:block;padding:12px 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;font-weight:bold;color:${b.ghost.fg};text-decoration:none;text-align:center;border-radius:${b.btn.radius};">${label}</a></td></tr></table></td></tr>`;
}

const kicker = (b, color, text) =>
  `<tr><td align="left" style="padding:0;font-family:${b.kickerFont};font-size:12px;line-height:17px;mso-line-height-rule:exactly;color:${color};font-weight:bold;letter-spacing:1px;text-align:left;text-transform:${b.kickerCase};">${text}</td></tr>`;

function hero(b, { kick, h1, body, cta }) {
  const h = b.hero;
  return `<tr><td bgcolor="${h.bg}" class="px" style="background:${h.bg};border-radius:${h.radius};padding:28px 24px;border:${h.border};"><table ${T} width="100%" style="width:100%;">
${kicker(b, h.kicker, kick)}${sp(12)}
<tr><td align="left" class="h1" style="padding:0;font-family:Helvetica,Arial,sans-serif;font-size:${b.h1Size};mso-line-height-rule:exactly;color:${h.h1};font-weight:bold;text-align:left;">${h1}</td></tr>${sp(12)}
<tr><td align="left" style="padding:0;font-family:${h.bodyFont};font-size:17px;line-height:27px;mso-line-height-rule:exactly;color:${h.body};text-align:left;">${body}</td></tr>${sp(22)}
${button(b, cta.url, cta.label)}
</table></td></tr>`;
}

/** A card with a short heading and numbered or ticked points. */
function steps(b, { kick, items, numbered = true, after = "" }) {
  const c = b.card;
  const tile = (i) => numbered
    ? `<table ${T}><tr><td width="30" height="30" align="center" bgcolor="${b.tile.bg}" style="width:30px;height:30px;border-radius:${b.tile.radius};font-family:${b.tile.font};font-size:14px;line-height:30px;font-weight:bold;color:${b.tile.fg};">${i + 1}</td></tr></table>`
    : `<table ${T}><tr><td width="22" height="22" align="center" style="width:22px;height:22px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:22px;font-weight:bold;color:${c.kicker};">&#10003;</td></tr></table>`;
  return `<tr><td bgcolor="${c.bg}" class="px" style="background:${c.bg};border-radius:${c.radius};padding:22px 20px;border:${c.border};"><table ${T} width="100%" style="width:100%;">
${kicker(b, c.kicker, kick)}${sp(14)}
${items.map(([title, text], i) => `<tr><td style="padding:0 0 ${i === items.length - 1 ? 0 : 14}px;"><table ${T} width="100%" style="width:100%;"><tr><td width="${numbered ? 40 : 32}" valign="top" style="width:${numbered ? 40 : 32}px;">${tile(i)}</td><td valign="top"><table ${T} width="100%" style="width:100%;">
<tr><td align="left" style="padding:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:${c.title};font-weight:bold;text-align:left;">${title}</td></tr>
${text ? `<tr><td align="left" style="padding:3px 0 0;font-family:${c.textFont};font-size:14px;line-height:21px;mso-line-height-rule:exactly;color:${c.text};text-align:left;">${text}</td></tr>` : ""}
</table></td></tr></table></td></tr>`).join("\n")}
${after}
</table></td></tr>`;
}

function note(b, { kick, text }) {
  const n = b.note;
  return `<tr><td bgcolor="${n.bg}" class="px" style="background:${n.bg};border-radius:${b.card.radius};padding:16px 18px;border:${n.border};"><table ${T} width="100%" style="width:100%;">
${kicker(b, n.kicker, kick)}${sp(6)}
<tr><td align="left" style="padding:0;font-family:${b.card.textFont};font-size:14px;line-height:21px;mso-line-height-rule:exactly;color:${n.text};text-align:left;">${text}</td></tr>
</table></td></tr>`;
}

const a = (b, url, label) => `<a href="${url}" style="color:${b.link};font-weight:bold;text-decoration:underline;">${label}</a>`;
const hi = (first, rest, capRest) => `{% if first_name != blank %}{{first_name}}, ${rest}{% else %}${capRest}{% endif %}`;

/* ── the six emails ───────────────────────────────────────────────────── */

const EMAILS = {
  "onboarding-dropoff": (b, k) => ({
    title: `Finish setting up ${b.name}`,
    pre: "About two minutes, then your first questions are ready.",
    body: [
      hero(b, {
        kick: "Finish setting up",
        h1: `${hi(b, "you're", "You're")} ${b.hl("two minutes")} from your first question.`,
        body: "You created an account but stopped before setup was done. It takes about two minutes, and then practice is ready for you.",
        cta: { url: href(b, "/login", k), label: "Finish setting up &rarr;" },
      }),
      steps(b, {
        kick: "What setup asks",
        items: b.name === "Nursia"
          ? [["Which exam you're sitting", "NCLEX-RN or NCLEX-PN, so every question matches it."], ["When you plan to sit it", "A date helps pace your practice. Skip it if you don't know yet."], ["How much time you have", "Pick what's realistic. You can change it later."]]
          : [["Which exam you're preparing for", "So every question and mock matches your syllabus."], ["Your name", "So your progress and certificates are yours."], ["Your first practice set", "Short, and it shows where you stand."]],
      }),
      note(b, { kick: "Stuck?", text: "If something didn't work during sign-up, reply to this email. A real person reads every reply." }),
    ],
  }),

  "first-practice": (b, k) => ({
    title: "Start with one question",
    pre: "Ten questions take about ten minutes.",
    body: [
      hero(b, {
        kick: "Ready when you are",
        h1: `Start with ${b.hl("one question")}. The rest gets easier.`,
        body: b.name === "Nursia"
          ? "Your account is set up, but you haven't answered anything yet. Ten questions take about ten minutes, and each one shows the reasoning behind the answer."
          : "Your account is set up, but you haven't practised yet. A short set takes about ten minutes and shows where you stand.",
        cta: { url: href(b, "/practice", k), label: "Answer my first question &rarr;" },
      }),
      steps(b, {
        kick: "Why start now",
        items: [
          ["See your weak topics early", "A few answers are enough to show where your time matters most."],
          b.name === "Nursia" ? ["It's free to start", "50 questions with full rationales, and no card needed."] : ["Practise in short sets", "Ten questions at a time fits around work or college."],
          ["Ten minutes counts", "Short sessions add up. One today is a good start."],
        ],
      }),
    ],
  }),

  "checkout-reminder": (b, k) => ({
    title: "Your checkout wasn't finished",
    pre: b.name === "Nursia" ? "You haven't been charged. Here's everything to know before you decide." : "Subscriptions happen in the app. Here's how.",
    body: [
      hero(b, {
        kick: "Your checkout",
        h1: `You were ${b.hl("one step")} from full access.`,
        body: b.name === "Nursia"
          ? "Your checkout wasn't finished, so you haven't been charged. If something got in the way, you can pick it up whenever you're ready."
          : "PrepClever subscriptions are handled in the mobile app, so the last step happens there. Sign in with this same account and subscribe from the app.",
        cta: { url: href(b, "/paywall", k), label: b.name === "Nursia" ? "Finish checkout &rarr;" : "See how to subscribe &rarr;" },
      }),
      steps(b, {
        kick: "Before you decide",
        numbered: false,
        items: b.name === "Nursia"
          ? [["$29 a month, one plan", "No tiers and no annual lock-in."], ["Cancel in one click", "Access runs to the end of the month you paid for."], ["14-day refund", "No questions asked, processed the same day."], ["Pause for up to three months", "Your progress and review list stay put."]]
          : [["Subscribe in the app", "Download PrepClever and sign in with this same account."], ["Everything unlocks", "Premium opens every feature in the app."], ["Managed by your app store", "Change or cancel any time from your Google Play or App Store subscriptions."]],
      }),
      note(b, { kick: "Questions about billing?", text: "Reply to this email. A real person reads every reply." }),
    ],
  }),

  "plans-nudge": (b, k) => ({
    title: b.name === "Nursia" ? "Free or full access: the difference" : "What Premium adds",
    pre: "Everything in one place, so you can decide without digging.",
    body: b.name === "Nursia"
      ? [
          hero(b, {
            kick: "Free vs full access",
            h1: `Here's what ${b.hl("full access")} adds.`,
            body: "You looked at the plans recently. Here's the difference in one place, so you can decide without digging.",
            cta: { url: href(b, "/paywall", k), label: "See full access &rarr;" },
          }),
          steps(b, { kick: "On the free plan", numbered: false, items: [["50 questions", ""], ["Full rationales", ""], ["Your weak topics", ""], ["No card, ever", ""]] }),
          steps(b, {
            kick: "With full access, $29 a month",
            numbered: false,
            items: [["Every question in the bank", ""], ["Next Gen case studies", ""], ["Readiness exams", ""], ["A study plan built from your results", ""], ["Review list and progress history", ""]],
            after: `${sp(16)}<tr><td align="left" style="padding:0;font-family:${b.card.textFont};font-size:14px;line-height:21px;color:${b.card.text};">Cancel in one click. 14-day refund. ${a(b, href(b, "/practice", k, "keep_free"), "Or keep practising free")}.</td></tr>`,
          }),
        ]
      : [
          hero(b, {
            kick: "PrepClever Premium",
            h1: `Prep ${b.hl("without limits")}.`,
            body: "You looked at Premium recently. Here's how it works, in one place.",
            cta: { url: href(b, "/paywall", k), label: "See Premium &rarr;" },
          }),
          steps(b, {
            kick: "How Premium works",
            items: [["Everything unlocks", "Every feature in the app, with no limits on practice."], ["Subscribe in the app", "Download PrepClever and sign in with this same account."], ["Cancel from your app store", "Your Google Play or App Store subscriptions, any time."]],
            after: `${sp(16)}<tr><td align="left" style="padding:0;font-family:${b.card.textFont};font-size:14px;line-height:21px;color:${b.card.text};">${a(b, href(b, "/practice", k, "keep_free"), "Or keep practising free")}.</td></tr>`,
          }),
        ],
  }),

  "win-back": (b, k) => ({
    title: "Pick up where you left off",
    pre: "Ten minutes today is enough to get back in.",
    body: [
      hero(b, {
        kick: "It's been a while",
        h1: `${hi(b, "pick", "Pick")} up ${b.hl("where you left off")}.`,
        body: `{% if questions_answered != blank and questions_answered != "0" %}You've answered {{questions_answered}} questions so far. {% endif %}Ten minutes is enough to get back into it, and your progress is where you left it.`,
        cta: { url: href(b, "/practice", k), label: "Do 10 questions &rarr;" },
      }),
      steps(b, {
        kick: "An easy way back",
        items: [
          ["Start with your weak topics", `They're where each minute counts most. ${a(b, href(b, "/practice/weak-areas", k, "weak_areas"), "Open weak topics")}`],
          ["Redo the ones you got wrong", `Your mistakes are saved. ${a(b, href(b, "/practice/mistakes", k, "mistakes"), "Open my mistakes")}`],
          ["Keep it short", "One session today beats a long one next week."],
        ],
      }),
      note(b, { kick: "Not preparing any more?", text: "Reply and tell us, or use the unsubscribe link below. Either is fine." }),
    ],
  }),

  "exam-countdown": (b, k) => ({
    title: "Your exam is coming up",
    pre: "A simple plan for the days you have left.",
    body: [
      hero(b, {
        kick: "Exam countdown",
        h1: `{% if days_to_exam != blank %}${b.hl("{{ days_to_exam }} days")} to go.{% else %}Your exam is ${b.hl("coming up")}.{% endif %}`,
        body: `{% if test_date != blank %}You're sitting ${b.exam} on {{ test_date }}. {% endif %}Here's a simple way to use the time you have left.`,
        cta: { url: href(b, "/mocks", k), label: "Take a mock exam &rarr;" },
      }),
      steps(b, {
        kick: "A plan for the time left",
        items: [
          ["Take a full mock this week", b.name === "Nursia" ? "A readiness exam shows where you stand under exam conditions." : "A timed mock shows where you stand under exam conditions."],
          ["Spend most of your time on weak topics", `That's where marks are easiest to win back. ${a(b, href(b, "/practice/weak-areas", k, "weak_areas"), "Open weak topics")}`],
          ["Go over your mistakes the day before", "Then rest. Cramming new material late rarely helps."],
        ],
      }),
      note(b, { kick: "Date changed?", text: `${a(b, href(b, b.name === "Nursia" ? "/settings/exam-info" : "/settings/my-exams", k, "exam_date"), "Update it in the app")} so your reminders stay right.` }),
    ],
  }),
};

/* ── assemble ─────────────────────────────────────────────────────────── */

for (const [key, b] of Object.entries(BRANDS)) {
  const src = fs.readFileSync(path.join(__dirname, key, "onboarding-welcome.html"), "utf8");
  const lines = src.split("\n");
  const frameEnd = lines.findIndex((l) => l.includes('class="w100"'));
  const footerStart = lines.findIndex((l, i) => i > frameEnd && l.startsWith('<tr><td height="10"'));
  if (frameEnd < 0 || footerStart < 0) throw new Error(`Couldn't find the frame in ${key}/onboarding-welcome.html`);

  /* The opening of the main panel, up to (not including) its first card. */
  const after = lines.slice(frameEnd + 1).join("\n");
  const firstCard = after.indexOf(key === "nursia" ? '<tr><td bgcolor="#1B1E23"' : '<tr><td bgcolor="#0020A5"');
  const panelOpen = after.slice(0, firstCard);
  const panelClose = `${sp(6)}</table></td></tr>`;
  const footer = lines.slice(footerStart).join("\n");

  for (const [name, build] of Object.entries(EMAILS)) {
    const e = build(b, name.replace(/-/g, "_"));
    const head = lines.slice(0, frameEnd + 1).join("\n")
      .replace(/<title>[^<]*<\/title>/, `<title>${b.name} · ${e.title}</title>`)
      .replace(/(<span style="display:none;[^"]*">)[^<&]*/, `$1${e.pre}`);
    const cards = e.body.join(`\n${sp(12)}\n`);
    const html = `${head}\n${panelOpen}${cards}\n${panelClose}\n${footer}`;
    fs.writeFileSync(path.join(__dirname, key, `${name}.html`), html);
    console.log(`wrote ${key}/${name}.html`);
  }
}
