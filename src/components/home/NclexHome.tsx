"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HOME_FAQ } from "@/lib/content";
import { CYCLE_STAGES } from "./cycleData";
import { QTYPE_DATA } from "./qtypeData";

/* ============================================================
   The landing sections ported from the NCLEX landing-page mock.
   Styling lives in src/app/(site)/nclex-home.css, scoped under
   .nlx-home. The two auto-playing decks were plain DOM scripts
   in the mock; they are React state here.
   ============================================================ */

/* The closing band's cohort. Faces are the avatar row, COLLAGE the
   overlapped tiles behind it — both sliced from the same shoot so the
   band reads as one group of people rather than assorted stock.
   SOCIAL_PROOF is a claim: set it to the real signup count before launch. */
const SOCIAL_PROOF = "12,000+";
const FACES = ["a", "d", "b", "e", "c"] as const;
const COLLAGE = [{ id: "c" }, { id: "a" }, { id: "e" }, { id: "d" }] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/* A deck that advances on a timer, cross-fades its body, and
   restarts the timer whenever someone picks a slide by hand. */
function useDeck(length: number, intervalMs: number, fadeMs: number) {
  /* `index` is what the dots point at; `shown` lags by one fade so the
     body can cross-fade out before it swaps. `tick` restarts the clock. */
  const [{ index, shown }, setDeck] = useState({ index: 0, shown: 0 });
  const [tick, setTick] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(
      () => setDeck((d) => ({ ...d, index: (d.index + 1) % length })),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [length, intervalMs, reduced, tick]);

  useEffect(() => {
    if (index === shown) return;
    const id = setTimeout(() => setDeck((d) => ({ ...d, shown: d.index })), fadeMs);
    return () => clearTimeout(id);
  }, [index, shown, fadeMs]);

  // picking a slide also resets the auto-advance clock
  const select = useCallback((i: number) => {
    setDeck((d) => ({ ...d, index: i }));
    setTick((t) => t + 1);
  }, []);

  return { index, shown, fading: index !== shown, select };
}

const LOOP_STEPS = [
  {
    stage: "Answer",
    path: (
      <>
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    stage: "Understand",
    path: (
      <>
        <path d="M12 17h.01" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    stage: "Diagnose",
    path: <path d="M3 12h4l2-8 4 16 2-8h6" />,
  },
  {
    stage: "Retest",
    path: (
      <>
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </>
    ),
  },
  {
    stage: "Improve",
    path: (
      <>
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </>
    ),
  },
];

const AREAS = [
  { name: "Pharmacological & Parenteral Therapies", pct: 84, delta: "↑ 6%", dir: "up" },
  { name: "Management of Care", pct: 76, delta: "↑ 3%", dir: "up" },
  { name: "Safety & Infection Control", pct: 72, delta: "↓ 2%", dir: "down" },
  { name: "Physiological Adaptation", pct: 61, delta: "↑ 9%", dir: "up" },
];

const WHY_CARDS = [
  {
    kind: "wrong",
    tag: "A · Incorrect",
    option: "Administer the prescribed PRN anxiolytic.",
    reason:
      "Treats the symptom of anxiety, not the cause. Sedating the client can mask worsening hypoxia and delay recognition of a life-threatening event — never treat anxiety first when vitals suggest a physiologic emergency.",
  },
  {
    kind: "right",
    tag: "B · Correct",
    option: "Apply supplemental oxygen and notify the provider immediately.",
    reason:
      "Sudden dyspnea + pleuritic pain + tachycardia + hypoxia after immobility is the classic pulmonary embolism triad. Airway/breathing come first (ABCs): stabilize oxygenation, then escalate for imaging (CT-PA) and anticoagulation.",
  },
  {
    kind: "wrong",
    tag: "C · Incorrect",
    option: "Reposition the client to the left lateral Sims’ position.",
    reason: (
      <>
        This is the correct positioning for a suspected <em>venous air embolism</em>, not a PE — a
        different diagnosis with a different mechanism. Applying it here delays oxygen and provider
        notification without addressing the actual clot.
      </>
    ),
  },
  {
    kind: "wrong",
    tag: "D · Incorrect",
    option: "Encourage the client to use the incentive spirometer.",
    reason:
      "Useful for preventing atelectasis and pneumonia postoperatively, but far too passive for an acute hypoxic emergency — it does nothing to correct the SpO₂ of 88% right now.",
  },
];

const FEATURES = [
  {
    title: "Learn on your time",
    desc: "Study whenever it fits your schedule.",
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
  },
  {
    title: "Any device",
    desc: "Seamless experience across all devices.",
    path: (
      <>
        <rect x="3" y="4" width="13" height="10" rx="2" />
        <rect x="16" y="7" width="5" height="13" rx="1.5" />
      </>
    ),
  },
  {
    title: "Pick up where you left off",
    desc: "Your progress is always saved.",
    path: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
];

/* the readiness dial: teal filled against the paper rule, like every
   other progress track on the site */
const PLACES = [
  {
    src: "/home/place-outside.webp",
    alt: "A nurse in scrubs reviewing questions on her phone outdoors with a coffee",
    caption: "On a break",
  },
  {
    src: "/home/place-cafe.webp",
    alt: "A nurse working through questions on a tablet in a café",
    caption: "Between shifts",
  },
  {
    src: "/home/place-home.webp",
    alt: "A nursing student annotating questions on a tablet at home",
    caption: "Before bed",
  },
];


export function NclexHome() {
  const cycle = useDeck(CYCLE_STAGES.length, 2400, 220);
  const qtype = useDeck(QTYPE_DATA.length, 2600, 200);
  const stage = CYCLE_STAGES[cycle.shown];
  const card = QTYPE_DATA[qtype.shown];

  return (
    <div className="nlx-home">
      {/* ------------------------------------------------------- hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="section-eyebrow">NCLEX-RN · 1,200 questions</p>
            <h1 className="hero-heading">
              Know <span className="accent">why</span> every answer is right.
            </h1>
            <p className="hero-sub">
              1,200 questions across the whole NCSBN test plan, each with a rationale written and
              reviewed by practising nurses — and a readiness score that moves after every session.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn-pill">
                Start free →
              </Link>
              <span className="hero-note">50 free questions · No card needed</span>
            </div>
            <dl className="hero-stats">
              {[
                ["1,200", "questions across all eight test-plan categories"],
                ["Next Gen", "case studies, matrix, bowtie and SATA"],
                ["3 RNs", "write and review every single item"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {/* the stage: photograph as ground, product on top. The card
              straddles the seam so the two halves read as one image. */}
          <div className="hero-stage">
            <div className="hero-photo">
              <Image
                src="/home/hero-desk.webp"
                alt="A nursing student in scrubs working through NCLEX practice questions at her desk, a study plan on the whiteboard behind her"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>


          </div>
        </div>
      </section>

      {/* ------------------------------------------- the loop / method */}
      <section className="loop-fold">
        <div className="wrap">
          <div className="loop-fold-head">
            <p className="section-eyebrow">The loop</p>
            <h2>
              Identify your gaps and know exactly
              <br />
              what to work on next.
            </h2>
          </div>

          <div className="loop-body">
            <div className="loop">
              {LOOP_STEPS.map((s) => {
                const i = CYCLE_STAGES.findIndex((c) => c.label === s.stage);
                return (
                  <button
                    key={s.stage}
                    type="button"
                    className={`loop-step${stage.label === s.stage ? " active" : ""}`}
                    onClick={() => i !== -1 && cycle.select(i)}
                    aria-pressed={stage.label === s.stage}
                  >
                    <div className="loop-icon">
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0b6b62"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {s.path}
                      </svg>
                    </div>
                    <div className="loop-label">{s.stage}</div>
                  </button>
                );
              })}
            </div>

            {/* auto-cycling stacked screens */}
            <div className="cycle-wrap">
              <div className="cycle-stack">
                <div className="cycle-deck deck-3" />
                <div className="cycle-deck deck-2" />
                <div className="cycle-screen">
                  <div className="cycle-topbar">
                    <span className="cycle-dot" />
                    <span className="cycle-stage-label">{stage.label}</span>
                  </div>
                  <div className="cycle-subheader">
                    <div className="fill" style={{ width: stage.progress }} />
                  </div>
                  <div
                    className={`cycle-body${cycle.fading ? " fade" : ""}`}
                    dangerouslySetInnerHTML={{ __html: stage.body }}
                  />
                </div>
              </div>
              <div className="cycle-dots">
                {CYCLE_STAGES.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    className={`cdot${cycle.index === i ? " active" : ""}`}
                    onClick={() => cycle.select(i)}
                    aria-label={`Show the ${s.label} step`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- readiness score */}
      <section className="section-readiness">
        <div className="wrap">
          <div className="section-head">
            <p className="section-eyebrow">Readiness score</p>
            <h2>Watch your readiness climb, not just your accuracy.</h2>
            <p>
              One number that reflects how ready you actually are for exam day — updated after every
              session, broken down by the areas NCLEX weighs most.
            </p>
          </div>

          <div className="readiness-grid">
            <div className="readiness-card">
              <div>
                <div className="readiness-label">Overall Readiness</div>
                <div className="readiness-score-row">
                  <div className="readiness-number">78%</div>
                  <div className="readiness-delta">↑ 12% this week</div>
                </div>
                <div className="readiness-sub">
                  You&rsquo;re trending ahead of pace for your target test date. Keep the streak
                  going.
                </div>
              </div>
              <svg className="readiness-spark" viewBox="0 0 320 64" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ec99a" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6ec99a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  points="0,52 40,48 80,50 120,38 160,40 200,26 240,28 280,14 320,10"
                  fill="none"
                  stroke="#6ec99a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polygon
                  points="0,52 40,48 80,50 120,38 160,40 200,26 240,28 280,14 320,10 320,64 0,64"
                  fill="url(#sparkFill)"
                />
              </svg>
            </div>

            <div className="readiness-areas">
              {AREAS.map((a) => (
                <div key={a.name} className="area-row">
                  <div className="area-name">{a.name}</div>
                  <div className="area-pct">{a.pct}%</div>
                  <div className={`area-delta ${a.dir}`}>{a.delta}</div>
                  <div className="area-track">
                    <div className="area-fill" style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ why section */}
      <section className="section-why">
        <div className="wrap">
          <div className="section-head why-section-head">
            <p className="section-eyebrow">Rationales</p>
            <h2>See the &ldquo;why&rdquo; behind every answer.</h2>
          </div>

          <div className="why-panel">
            <div className="why-question">
              <strong>Q.</strong> A nurse is caring for a client who is 2 days postoperative
              following a total hip arthroplasty. The client suddenly becomes anxious and reports
              shortness of breath and pleuritic chest pain. Assessment reveals: HR 124/min, RR
              30/min, BP 98/62 mmHg, SpO₂ 88% on room air.
              <span className="why-priority">Which action should the nurse take first?</span>
            </div>
            <div className="why-compare why-compare-4">
              {WHY_CARDS.map((c) => (
                <div key={c.tag} className={`why-card ${c.kind}`}>
                  <span className="why-tag">{c.tag}</span>
                  <div className="why-card-option">{c.option}</div>
                  <div className="why-card-reason">{c.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- question types */}
      <section className="section-qtypes">
        <div className="wrap">
          <div className="section-head qtype-section-head">
            <p className="section-eyebrow">Question types</p>
            <h2>Built around how NCLEX actually tests you.</h2>
          </div>

          <div className="qtype-stack-wrap">
            <div className="qtype-stack">
              <div className="qtype-deck qtype-deck-3" />
              <div className="qtype-deck qtype-deck-2" />
              <div className="qtype-deck qtype-deck-1" />
              <div className="qtype-stack-front">
                <div className="qs-topbar">
                  <span className="qs-back">❮</span>
                  <span className="qs-topbar-title">{card.label}</span>
                  <span className="qs-topbar-counter">
                    {qtype.shown + 1} / {QTYPE_DATA.length}
                  </span>
                </div>
                <div className="qs-subbar">
                  <div
                    className="qs-subbar-fill"
                    style={{
                      width: `${Math.round(((qtype.shown + 1) / QTYPE_DATA.length) * 100)}%`,
                    }}
                  />
                </div>
                <div
                  className={`qs-body${qtype.fading ? " fade" : ""}`}
                  dangerouslySetInnerHTML={{ __html: card.body }}
                />
                <div className="qs-footer">
                  <span className="qs-btn qs-btn-outline">Previous</span>
                  <span className="qs-btn qs-btn-solid">Next</span>
                </div>
              </div>
            </div>
            <div className="qtype-stack-dots">
              {QTYPE_DATA.map((q, i) => (
                <button
                  key={q.label}
                  type="button"
                  className={`qsdot${qtype.index === i ? " active" : ""}`}
                  onClick={() => qtype.select(i)}
                  aria-label={`Show ${q.label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------ prepare from anywhere */}
      <section className="section-anywhere">
        <div className="wrap anywhere-top">
          <div className="anywhere-copy">
            <span className="anywhere-badge">Prepare from anywhere, anytime</span>
            <h2 className="anywhere-heading">
              The smarter way to prepare for NCLEX.
              <br />
              <span className="anywhere-heading-sub">In your space, on your time.</span>
            </h2>
            <p className="anywhere-sub">
              Access high-quality practice, track your progress, and get exam-ready—anytime,
              anywhere.
            </p>
            {/* the three promises sit in the copy column so it stands as tall
                as the photograph beside it */}
            <div className="anywhere-features anywhere-features-list">
              {FEATURES.map((f) => (
                <div key={f.title} className="af-item">
                  <div className="af-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0b6b62"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {f.path}
                    </svg>
                  </div>
                  <div className="af-title">{f.title}</div>
                  <div className="af-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
          {/* the section claims you can study anywhere; three places make
              that argument better than one photograph of a sofa */}
          <div className="anywhere-places">
            {PLACES.map((pl) => (
              <figure key={pl.src}>
                <Image
                  src={pl.src}
                  alt={pl.alt}
                  width={384}
                  height={230}
                  sizes="(max-width: 900px) 32vw, 360px"
                />
                <figcaption>{pl.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* the three device mock-ups */}
        {/* The three device mockups used to be ~135 lines of DOM behind 97 CSS
            rules. They read well on a desktop and badly on a phone, where each
            one stretched to the full column width — a "laptop" taller than it
            was wide, and 1,400px of scrolling for one decorative point. As a
            single image they keep their proportions at every size. */}
        <div className="wrap anywhere-devices">
          <Image
            src="/home/devices.webp"
            alt="Nursia on a phone, a laptop and a tablet: a readiness score of 78%, a dashboard of focus areas by category, and a question showing why one answer is right and the others are not."
            width={2400}
            height={950}
            sizes="(max-width: 900px) 92vw, 1200px"
          />
        </div>
      </section>

      {/* -------------------------------------------------- cta strip */}
      {/* ---------------------------------------------------------- faq */}
      {/* Native <details>, so every answer is in the HTML whether or not it is
          open — the same reason the question rationales are. */}
      <section className="faq-fold" id="faq">
        <div className="wrap">
          <div className="faq-head">
            <p className="section-eyebrow">Questions people ask first</p>
            <h2 className="faq-heading">Before you sign up.</h2>
          </div>
          <div className="faq-list">
            {HOME_FAQ.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>
                  <span>{f.q}</span>
                  <span className="faq-mark" aria-hidden />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="faq-more">
            More on the exam itself in the{" "}
            <Link href="/guides">guides</Link>, or on{" "}
            <Link href="/pricing">pricing</Link>.
          </p>
        </div>
      </section>

      <section className="section-cta-strip">
        <div className="cta-strip">
          <div className="cta-proof">
            <div className="cta-faces">
              {FACES.map((f) => (
                <Image
                  key={f}
                  className="cta-face"
                  src={`/home/face-${f}.webp`}
                  alt=""
                  aria-hidden
                  width={128}
                  height={128}
                />
              ))}
            </div>
            <p className="cta-proof-text">
              Join <strong>{SOCIAL_PROOF}</strong> NCLEX-RN aspirants and RNs
            </p>
          </div>
          <h2 className="cta-strip-heading">50 free questions. No card.</h2>
          <div className="cta-strip-action">
            <Link href="/signup" className="btn-pill">
              Start free →
            </Link>
            <span className="cta-strip-note">Cancel anytime</span>
          </div>
        </div>

        {/* four of them, overlapped — the band should read as a cohort, not a stock photo */}
        <div className="cta-collage" aria-hidden>
          {COLLAGE.map((c) => (
            <div key={c.id} className={`cta-tile cta-tile-${c.id}`}>
              <Image
                src={`/home/who-${c.id}.webp`}
                alt=""
                width={384}
                height={512}
                sizes="(max-width: 900px) 45vw, 22vw"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
