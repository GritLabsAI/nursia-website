/**
 * The second wave of guides.
 *
 * These live in their own module for one reason: content.ts is the site's
 * content *graph* — topics, questions, clusters, FAQs — and guides are the
 * only part of it that grows every month. Keeping the prose here means a new
 * guide is a one-file diff, and content.ts stays readable as a map.
 *
 * Every guide in here is written to the same contract as the originals:
 *
 *   - `shortAnswer` answers the query outright in ~60 words. It is the AEO
 *     surface: the paragraph a snippet, an assistant, or an overview quotes.
 *   - `sections` do the arguing, in the order someone actually asks.
 *   - `faqs` catch the long-tail phrasings the body cannot address without
 *     turning into a list. They render as visible copy *and* as FAQPage
 *     schema — never schema-only, which is a manual action waiting to happen.
 *   - `topic` is the one question set the guide has to earn its keep by
 *     sending readers to.
 */

import type { Guide } from "./content";

export const EXTRA_GUIDES: Guide[] = [
  /* ------------------------------------------------------------------------
     BEFORE YOU START — the mechanics people search before they book a date
  ------------------------------------------------------------------------ */
  {
    slug: "how-many-questions-is-the-nclex",
    title: "How many questions is the NCLEX?",
    h1: "How many questions is the NCLEX-RN?",
    cluster: "before",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "The NCLEX-RN gives you a minimum of 85 questions and a maximum of 150, within a five-hour limit. Fifteen of those are unscored pretest items. The test is adaptive, so it stops the moment it is 95% confident you are above or below the passing standard — which is why the number of questions you get says almost nothing about whether you passed.",
    sections: [
      {
        h2: "85, 150, and the five-hour clock",
        body: [
          "Every NCLEX-RN sits between 85 and 150 questions. Fifteen of them are unscored pretest items being trialled for future exams, scattered so you cannot tell which. Under the Next Generation format you will also see at least three unfolding case studies, each carrying six linked questions, and those six count as six items against your total.",
          "The clock runs for five hours including the tutorial and both optional breaks. Almost nobody runs out of time — the average candidate finishes around three hours — but the people who do tend to be the ones re-reading every stem three times. Ninety seconds an item is the pace that gets you to 150 comfortably.",
        ],
      },
      {
        h2: "Why the exam stops when it stops",
        body: [
          "The NCLEX is a computerized adaptive test. After each scored item it re-estimates your ability and re-chooses the next question to sit right at the edge of what you can do. It shuts off under one of three rules: the 95% confidence rule, when it is statistically certain you are above or below the standard; the maximum-length rule, when you hit 150 and it grades on your final estimate; or the run-out-of-time rule, which grades on the last 60 items.",
          "This is the source of every myth about question counts. Shutting off at 85 means the engine was confident — it does not tell you which direction. Running to 150 means you sat close to the line the whole way, which is uncomfortable and entirely survivable.",
        ],
      },
      {
        h2: "What the number of questions actually predicts",
        body: [
          "Nothing you can use. Candidates who shut off at 85 pass at high rates and fail at meaningful rates; candidates who run to 150 do both too. Walking out and counting your questions is the single most reliable way to spend 48 hours miserable over a number that carries no information.",
          "The one thing worth noticing is difficulty. If the questions felt hard the whole way through, the engine was working — it is designed to keep you near 50% accuracy. Candidates who report the exam felt easy are more often the ones who receive bad news.",
        ],
      },
      {
        h2: "How this changes the way you practise",
        body: [
          "Practise in sets long enough to rehearse the endurance the real thing demands. If your longest ever sitting is 25 questions, item 90 on exam day will be the first time you have ever had to think clearly while tired, and fatigue errors on an adaptive test are expensive — they pull your estimate down at exactly the point the engine is deciding.",
          "Build to at least one 75-question sitting a week with no phone and no pausing. Then review it properly. The endurance is the point; the score on that particular set is not.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is 85 questions a good sign on the NCLEX?",
        a: "It is a neutral sign. Shutting off at 85 means the engine reached 95% confidence quickly — it can be confident you passed or confident you did not. Pass rates for 85-question exams are high mainly because most candidates pass overall, not because a short exam predicts anything.",
      },
      {
        q: "How long does the NCLEX take?",
        a: "Up to five hours including the tutorial and two optional breaks. Most candidates finish in two to three and a half hours. The clock keeps running during breaks, so a ten-minute break costs you ten minutes of exam time.",
      },
      {
        q: "How many questions do you need to get right to pass?",
        a: "There is no percentage cutoff. The NCLEX scores you on the difficulty of the items you answer correctly, not on how many. A candidate answering 55% of very hard items correctly can pass while a candidate answering 75% of easy items correctly does not.",
      },
    ],
    topic: "safe-care",
    readNext: ["nclex-scoring-explained", "how-hard-is-the-nclex", "test-day-checklist"],
  },
  {
    slug: "nclex-scoring-explained",
    title: "How the NCLEX is scored",
    h1: "How the NCLEX is scored, and what the passing standard means",
    cluster: "before",
    minutes: 7,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "The NCLEX has no percentage score and no curve. Every item carries a difficulty value, and the exam estimates your ability on a logit scale from the items you answer correctly. You pass by sitting above the passing standard — currently 0.00 logits for the RN exam — with 95% statistical confidence. Result: pass or fail, no number.",
    sections: [
      {
        h2: "There is no percentage, and that is the whole point",
        body: [
          "Two candidates can answer the same number of items correctly and get opposite results, because the exam is not counting answers — it is estimating ability. Each item has a calibrated difficulty. Getting a hard item right moves your estimate up more than getting an easy one right; getting an easy item wrong pulls it down harder than missing a hard one.",
          "This is why 'what percentage do I need' has no answer, and why practice-question percentages are only a rough proxy. A 65% average on a mixed bank of realistically hard items means something. A 90% average on easy recall items means you have found an easy bank.",
        ],
      },
      {
        h2: "The passing standard and the logit scale",
        body: [
          "The NCSBN sets the passing standard in logits, reviewed every three years against what entry-level practice now demands. The RN standard has sat at 0.00 logits since 2023. Zero is not 'zero questions right' — it is a fixed point on an ability scale, and your job is to be measurably above it.",
          "Because the standard is fixed rather than curved, you are never competing against other candidates on the day. Everyone who is above the line passes, even if that is everyone in the room.",
        ],
      },
      {
        h2: "Partial credit on Next Gen items",
        body: [
          "Next Generation item types are scored with polytomous models rather than right-or-wrong. Most use plus-minus scoring: each correct selection earns a point, each incorrect one loses a point, and the item floors at zero rather than going negative. Some use rationale scoring, where a bowtie's action and its matching parameter are graded as a linked pair.",
          "The strategic consequence is small but real: on a partial-credit item, choose what you can defend and stop. A fifth uncertain selection on a matrix item has negative expected value. Classic select-all-that-apply items remain all-or-nothing, so the same restraint applies there for a different reason.",
        ],
      },
      {
        h2: "What the Candidate Performance Report tells you",
        body: [
          "If you fail, you receive a Candidate Performance Report placing you in each of the eight client-need categories as Below, Near, or Above the passing standard. It is the most actionable document in NCLEX prep and most candidates read it once, in a bad mood, and file it.",
          "Read it as a study plan. Two or three Below categories tell you exactly where the retake has to be spent — not in a general re-review, which is what most repeat candidates do and why repeat pass rates sit around half the first-time rate.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is a passing score on the NCLEX?",
        a: "There is no numeric passing score reported to candidates. The result is pass or fail, decided by whether your estimated ability sits above the passing standard — 0.00 logits on the RN exam — with 95% confidence.",
      },
      {
        q: "Does the NCLEX have a curve?",
        a: "No. The passing standard is fixed and reviewed every three years by the NCSBN. Your result depends only on your own performance against that standard, never on how other candidates did.",
      },
      {
        q: "Do all NCLEX questions count the same?",
        a: "No. Each item carries its own calibrated difficulty, and 15 pretest items do not count at all. Answering harder items correctly moves your ability estimate further than answering easier ones.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "how-many-questions-is-the-nclex",
      "reading-your-result",
      "whats-on-the-test-plan",
    ],
  },
  {
    slug: "nclex-pass-rates",
    title: "NCLEX pass rates, read properly",
    h1: "NCLEX-RN pass rates and what they actually tell you",
    cluster: "before",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Roughly 88% of US-educated first-time candidates pass the NCLEX-RN. Repeat candidates pass at around 45%, and internationally educated first-time candidates at around 50%. The first-time-versus-repeat gap is the number that matters: it is not about ability, it is about whether the second attempt changed method or just repeated content review.",
    sections: [
      {
        h2: "The four numbers worth knowing",
        body: [
          "US-educated, first attempt: about 88%. US-educated, repeat attempt: about 45%. Internationally educated, first attempt: about 50%. Internationally educated, repeat: lower still. Those figures move a point or two year to year and by quarter, but the shape has been stable for a decade and the shape is what you can act on.",
          "Quarterly figures also swing because of who is sitting. The spring quarter is full of fresh graduates and reads high; later quarters carry more repeat candidates and read lower. A pass rate is always a statement about a cohort before it is a statement about a test.",
        ],
      },
      {
        h2: "Why repeat rates halve",
        body: [
          "The obvious explanation — that candidates who fail are weaker — is only part of it, and the smaller part. The bigger driver is method. The typical response to a fail is to buy a longer content review and read it more carefully, which reinforces recall, and recall was not the thing that failed.",
          "Candidates who move from reading to answering, and who spend more time on rationales than on content, pass retakes at meaningfully higher rates than the headline 45%. If you are preparing a second attempt, treat the Candidate Performance Report as the syllabus and questions as the method.",
        ],
      },
      {
        h2: "What your school's pass rate means for you",
        body: [
          "Program pass rates are published by most state boards, and they correlate with things like faculty ratio and admission selectivity. They do not transfer to you as an individual. A candidate from a 75% program who does 2,000 reviewed questions is in a better position than a candidate from a 98% program who does 300.",
          "Use the program number for one decision only — choosing a school. After graduation it is history.",
        ],
      },
      {
        h2: "The one predictor you can control",
        body: [
          "Across studies, the strongest available predictor of passing is consistent performance on realistic practice items over time, not a single readiness exam and not GPA. That is convenient, because it is also the only one you can still change.",
          "Set the bar at a 65% rolling average across mixed-category sets, sustained for at least ten sets. One set is noise. Ten sets is a signal, and the trend line matters more than any single number in it.",
        ],
      },
    ],
    faqs: [
      {
        q: "What percentage of people pass the NCLEX first time?",
        a: "About 88% of US-educated first-time candidates pass the NCLEX-RN. Internationally educated first-time candidates pass at roughly 50%, largely reflecting differences in exam format familiarity rather than clinical knowledge.",
      },
      {
        q: "What is the NCLEX pass rate for second attempts?",
        a: "Around 45% for US-educated repeat candidates. The gap from the first-time rate is driven mostly by method — repeating content review rather than switching to reviewed practice questions.",
      },
      {
        q: "How many times can you take the NCLEX?",
        a: "The NCSBN allows eight attempts per year with a 45-day wait between them, but individual state boards can set stricter limits, including a lifetime cap. Check your board's rule before you plan a retake date.",
      },
    ],
    topic: "med-surg",
    readNext: ["how-hard-is-the-nclex", "if-you-failed-what-next", "nclex-scoring-explained"],
  },
  {
    slug: "how-to-register-for-the-nclex",
    title: "How to register for the NCLEX",
    h1: "How to register for the NCLEX, step by step",
    cluster: "before",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Registration is two separate things that people confuse: you apply for licensure with your state board of nursing, and you register with Pearson VUE and pay the $200 exam fee. Once your board declares you eligible, Pearson VUE emails an Authorization to Test. Only then can you schedule, and the ATT expires — usually in 90 days.",
    sections: [
      {
        h2: "The two applications, in order",
        body: [
          "First, apply for licensure or registration with the board of nursing in the state where you want to be licensed. This is the slow half: it typically involves a fee, fingerprinting, a criminal background check, and your school submitting proof of program completion. Timelines vary from days to two months depending on the board and on how quickly your school files.",
          "Second, register with Pearson VUE and pay the $200 exam fee. You can do this before your board declares you eligible — the registration sits open for up to 365 days waiting on the board — but paying does not make you eligible and the fee is not refundable if you never test.",
        ],
      },
      {
        h2: "The ATT, and the clock it starts",
        body: [
          "When your board tells Pearson VUE you are eligible, you receive an Authorization to Test by email. It carries a validity window set by your board, most commonly 90 days, and that window cannot be extended for convenience. If it lapses, you re-register and pay the fee again.",
          "Book your seat the day the ATT arrives, even if the date you want is eight weeks out. Seats near graduation season fill, and you can reschedule once at no charge if you give more than 24 hours' notice — rescheduling inside 24 hours forfeits the fee entirely.",
        ],
      },
      {
        h2: "What you must bring on the day",
        body: [
          "One acceptable, unexpired, government-issued photo ID whose first and last name match your ATT exactly — character for character. A married name on the ID and a maiden name on the ATT is the single most common reason candidates are turned away at the door, and there is no discretion at the test centre.",
          "If the names do not match, contact your board of nursing well before the date, not the week of. Fixing it requires the board to reissue, and reissuing takes days.",
        ],
      },
      {
        h2: "Choosing a date you can actually hold",
        body: [
          "Pick a date four to six weeks out and treat it as fixed. An open-ended 'when I feel ready' schedule reliably drifts, and drift costs more than the extra fortnight ever adds — retention on the material you learned in week one is already decaying by week ten.",
          "Book a morning slot if you have any choice. Test centres run to schedule best early, and a five-hour exam that begins at 2pm ends when your concentration does.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much does the NCLEX cost?",
        a: "The exam fee is $200 in the US, paid to Pearson VUE. Your state board of nursing charges a separate licensure application fee, typically $75–$200, plus fingerprinting and background-check costs.",
      },
      {
        q: "How long is the Authorization to Test valid?",
        a: "The validity window is set by your board of nursing and is most often 90 days. It cannot be extended — if it expires before you test, you must register and pay the exam fee again.",
      },
      {
        q: "How soon can I take the NCLEX after graduating?",
        a: "As soon as your board declares you eligible and issues an ATT, which usually takes two to six weeks after your school confirms program completion. Most candidates test four to eight weeks after graduation.",
      },
    ],
    topic: "fundamentals",
    readNext: ["test-day-checklist", "four-week-study-plan", "nclex-results-timeline"],
  },

  /* ------------------------------------------------------------------------
     WHILE YOU STUDY — plan, volume, and the head you sit the exam with
  ------------------------------------------------------------------------ */
  {
    slug: "how-many-practice-questions-before-nclex",
    title: "How many practice questions do you need?",
    h1: "How many practice questions should you do before the NCLEX?",
    cluster: "during",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Between 1,500 and 3,000 reviewed questions is the range that works for most candidates — roughly 75 a day for four to six weeks. The number is a by-product, not a target. A question you review carefully teaches you something; a question you answer and move past teaches you almost nothing, and 5,000 of those change nothing.",
    sections: [
      {
        h2: "The number, and why it is the wrong thing to chase",
        body: [
          "1,500 to 3,000 is where most successful candidates land, and it maps to 75 a day across four to six weeks. But the causation runs the other way from how people use it: candidates who prepare well end up around that number, rather than reaching that number and thereby being prepared.",
          "The trap is visible in anyone who has done 4,000 questions and is still averaging 55%. Volume without review is repetition of the same error with new stems attached.",
        ],
      },
      {
        h2: "The 2:1 review rule",
        body: [
          "Spend twice as long reviewing a set as answering it. Twenty-five questions in fifteen minutes, thirty minutes of review. That ratio feels wasteful and it is the entire mechanism.",
          "Review means reading the rationale for every item, including the ones you got right — because 'right' includes lucky, and a lucky answer you never examine will be a wrong answer on the exam. For each miss, name the reason out loud: did I not know the content, misread the stem, or rank the options wrong? Those three failures need three different fixes, and most candidates treat all of them as 'study more'.",
        ],
      },
      {
        h2: "Mixed sets beat topic sets after week two",
        body: [
          "Topic-locked sets are the right tool early, when you are building content in a category and want the repetition. They flatter you after that: knowing every question is a cardiac question does half the work the exam expects you to do yourself.",
          "By week three, most of your volume should be mixed-category. That is where the real skill lives — reading a stem cold with no idea whether it wants a pharmacology answer or a delegation answer.",
        ],
      },
      {
        h2: "What percentage means you are ready",
        body: [
          "A 65% rolling average across mixed sets, sustained across at least ten sets, is the usual signal. Below 60% and there is content missing. Above 75% consistently on a realistically hard bank and you are ready now, and waiting is costing you retention.",
          "Track the trend, not the set. Individual sets swing ten points on category mix alone, and reading a single bad set as a verdict is how candidates talk themselves into postponing a date they were ready for.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is 2,000 practice questions enough for the NCLEX?",
        a: "Yes, if they were reviewed. Two thousand questions with rationales read and misses categorized is more than enough for most candidates. Two thousand answered quickly for the score is not.",
      },
      {
        q: "How many NCLEX questions should I do a day?",
        a: "About 75, in sets of 25 to 75, with roughly twice as long spent reviewing as answering. That is around 90 minutes to two hours of real work a day.",
      },
      {
        q: "What percentage on practice questions predicts a pass?",
        a: "A 65% rolling average on mixed-category sets of realistic difficulty, held across at least ten sets. The trend across sets matters far more than any individual result.",
      },
    ],
    topic: "med-surg",
    readNext: ["four-week-study-plan", "two-week-nclex-study-plan", "how-to-answer-sata"],
  },
  {
    slug: "two-week-nclex-study-plan",
    title: "2-week NCLEX study plan",
    h1: "A 2-week NCLEX study plan for when the date is already booked",
    cluster: "during",
    minutes: 7,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Two weeks is enough to sharpen, not to rebuild. Week one goes to the three heaviest categories — management of care, pharmacology, and reduction of risk — at 75 questions a day. Week two goes to mixed sets and full-length endurance sittings. Do not open a content review book: at fourteen days, questions and rationales are the only study with a payback period short enough to matter.",
    sections: [
      {
        h2: "What two weeks can and cannot do",
        body: [
          "It can convert knowledge you already have into exam performance: recognizing item types, ranking options, spotting the safety answer, working at ninety seconds an item. That conversion is fast and it is worth several points.",
          "It cannot build a category from nothing. If endocrine is genuinely blank, two weeks will not fill it and trying will cost you the sharpening the other categories need. Take the 6–12% hit and protect the 17–23% one.",
        ],
      },
      {
        h2: "Week one: the heavy categories, 75 a day",
        body: [
          "Days 1–2, management of care and delegation. It is the largest block on the test plan at 17–23%, and it is the most learnable in a hurry because it runs on rules rather than recall — scope of practice, the five rights of delegation, who can be assigned to whom.",
          "Days 3–4, pharmacology, weighted toward adverse effects and high-alert drugs rather than pure calculation. Days 5–6, reduction of risk: labs, procedures, complications. Day 7, redo every question you missed that week. Not a fresh set — the same items. If you cannot now say why the right answer is right, the gap is content and you have found it while there is still time.",
        ],
      },
      {
        h2: "Week two: mixed sets and endurance",
        body: [
          "Days 8–11, mixed-category sets of 75, one a day, timed. No topic labels, no pausing. This is the week your reading speed and your ranking instinct actually improve, because nothing in the set tells you what kind of question you are looking at.",
          "Day 12, one full-length sitting of at least 100 items in one block, at the time of day your exam is booked. It will be unpleasant. That is the rehearsal — item 90 on exam day should not be the first time you have thought clearly while tired.",
        ],
      },
      {
        h2: "The last 48 hours",
        body: [
          "Day 13: lab values, the ones that repeat, plus your own personal miss list. Nothing new. Ninety minutes maximum.",
          "Day 14: stop. Confirm your ID matches your ATT name exactly, pack, sleep. Cramming the night before an adaptive exam trades a point of recall for several points of judgement, and judgement is what is being scored.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I pass the NCLEX studying for 2 weeks?",
        a: "Yes, if you are coming straight out of a nursing program and the knowledge is already there. Two weeks of reviewed practice questions is enough to convert that knowledge into exam performance. It is not enough to learn categories from scratch.",
      },
      {
        q: "Should I use a content review book in the last two weeks?",
        a: "No, apart from targeted lookups when a rationale exposes a gap. At two weeks out, questions and rationales have a far shorter payback period than reading, and reading crowds them out.",
      },
      {
        q: "What should I do the day before the NCLEX?",
        a: "Nothing substantial. Check your ID name matches your ATT exactly, confirm the test centre route, and sleep. Studies of testing performance consistently favour rest over last-day cramming for judgement-based exams.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: ["four-week-study-plan", "test-day-checklist", "nclex-test-anxiety"],
  },
  {
    slug: "nclex-test-anxiety",
    title: "Test anxiety on the NCLEX",
    h1: "Test anxiety on the NCLEX, and what actually helps",
    cluster: "during",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "The NCLEX is designed to feel hard the whole way through — the adaptive engine holds you near 50% accuracy on purpose, so feeling like you are failing is the normal experience of passing. The two interventions with real evidence behind them are rehearsing the conditions (timed, full-length, same time of day) and a fixed reset routine you can run mid-exam.",
    sections: [
      {
        h2: "Why the exam feels like you are failing",
        body: [
          "An adaptive test targets the edge of your ability. Answer correctly and it hands you something harder; miss and it eases off slightly. The equilibrium sits near 50% accuracy, which means a well-calibrated exam feels roughly like a coin flip for its entire length — for the candidates who pass as much as for the ones who do not.",
          "So 'it felt awful' is not a data point about your result. Candidates who report the test felt manageable are, if anything, slightly more likely to have received bad news, because an exam that feels easy is often one that stopped raising difficulty.",
        ],
      },
      {
        h2: "Rehearsal beats reassurance",
        body: [
          "The intervention with the best evidence is exposure: do timed, full-length, uninterrupted sittings, at the hour your exam is booked, before test day. Anxiety is largely a novelty response, and you cannot reason your way out of a novelty you have never practised through.",
          "Three or four sittings of 75 to 100 items in the fortnight before is enough to move test day from an unknown to a repeat. It also surfaces the practical failures — that you get a headache at hour two, that you need to eat at the first break — while they are still cheap to fix.",
        ],
      },
      {
        h2: "A reset routine for mid-exam",
        body: [
          "Decide now what you will do when you hit the item that empties your head, because you will. A workable script: hands off the mouse, one slow exhale twice as long as the inhale, re-read the last sentence of the stem only, then eliminate the two options you can defend eliminating and choose between what is left.",
          "The point is not the breathing. It is having a pre-made decision so the spiral has somewhere to go other than into the next four questions. Untreated, one bad item routinely costs three more.",
        ],
      },
      {
        h2: "When it is more than nerves",
        body: [
          "If anxiety is stopping you sleeping for weeks, or you have frozen in a previous exam to the point of leaving, that is worth treating rather than out-studying. Cognitive behavioural approaches for test anxiety have good evidence, several sessions can be enough, and Pearson VUE grants testing accommodations through your board of nursing for documented conditions.",
          "Apply for accommodations early — they go through the board, not the test centre, and approval takes weeks.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is it normal for the NCLEX to feel hard?",
        a: "Yes, and it is the expected experience. The adaptive engine targets the edge of your ability and holds you near 50% accuracy, so the exam feels difficult all the way through for passing and failing candidates alike.",
      },
      {
        q: "Does feeling like you failed the NCLEX mean anything?",
        a: "No. There is no reliable relationship between how the exam felt and the result, which is exactly why the adaptive design produces so much post-exam anxiety.",
      },
      {
        q: "Can I get testing accommodations for the NCLEX?",
        a: "Yes. Accommodations for documented disabilities and conditions are requested through your state board of nursing, not Pearson VUE, and approval can take several weeks — so apply well before you want to test.",
      },
    ],
    topic: "mental-health",
    readNext: ["test-day-checklist", "two-week-nclex-study-plan", "how-hard-is-the-nclex"],
  },

  /* ------------------------------------------------------------------------
     KNOW THE CONTENT COLD — the deep dives the topic sets sit under
  ------------------------------------------------------------------------ */
  {
    slug: "nclex-lab-values-to-memorize",
    title: "The lab values worth memorizing",
    h1: "NCLEX lab values: the 24 worth memorizing",
    cluster: "content",
    minutes: 8,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "You need about two dozen lab values cold, not the whole panel. Potassium 3.5–5.0, sodium 135–145, and the therapeutic drug ranges account for a disproportionate share of items, because the exam does not test recall of a number — it tests what you do about it. Memorize the value with its nursing action attached or the number is worthless.",
    sections: [
      {
        h2: "Electrolytes: the six that carry the questions",
        body: [
          "Potassium 3.5–5.0 mEq/L, sodium 135–145 mEq/L, calcium 9.0–10.5 mg/dL, magnesium 1.3–2.1 mEq/L, phosphorus 3.0–4.5 mg/dL, chloride 98–106 mEq/L.",
          "Potassium is the one to know perfectly. It appears constantly because it kills, and the exam wants the action: below 3.5 with a client on digoxin means toxicity risk; above 5.0 means peaked T waves and hold the potassium-sparing diuretic; never IV push, always diluted and on a pump. Magnesium is potassium's shadow — a potassium that will not correct is usually a magnesium problem, and that inference is a classic item.",
        ],
      },
      {
        h2: "Renal, glucose, and the numbers that trigger a hold",
        body: [
          "BUN 10–20 mg/dL, creatinine 0.6–1.2 mg/dL, GFR above 90, fasting glucose 70–110 mg/dL, HbA1c below 5.7%.",
          "Creatinine is the one that reads as boring and functions as a trap. A rise from 0.9 to 1.8 is still inside 'not that high' for anyone reading the number alone, and it is a doubling — the trigger to hold the nephrotoxic drug, hold the contrast, and call. The exam repeatedly rewards candidates who read trend rather than threshold.",
        ],
      },
      {
        h2: "Haematology and coagulation",
        body: [
          "Hemoglobin 12–18 g/dL, hematocrit 36–52%, platelets 150,000–400,000, WBC 5,000–10,000. INR 0.8–1.1 normal and 2.0–3.0 therapeutic on warfarin; aPTT 30–40 seconds normal and 46–70 therapeutic on heparin; PT 11–12.5 seconds.",
          "Learn the therapeutic windows as pairs with their antidote: warfarin with vitamin K, heparin with protamine sulfate. A large share of coagulation items are really antidote items wearing a lab coat.",
        ],
      },
      {
        h2: "Therapeutic drug levels and ABGs",
        body: [
          "Digoxin 0.5–2.0 ng/mL, lithium 0.6–1.2 mEq/L, phenytoin 10–20 mcg/mL, theophylline 10–20 mcg/mL. All four have narrow windows, all four have a signature toxicity picture, and all four turn up as 'which finding do you report' items.",
          "ABGs: pH 7.35–7.45, PaCO2 35–45 mm Hg, HCO3 22–26 mEq/L, PaO2 80–100 mm Hg. Do not memorize interpretation tables — run ROME on the spot. Respiratory Opposite, Metabolic Equal: pH down and CO2 up is respiratory acidosis; pH down and bicarb down is metabolic acidosis. Two comparisons, no table.",
        ],
      },
      {
        h2: "How to actually retain them",
        body: [
          "Do not study lab values as a list. Study them inside questions, where the number arrives attached to a client who is on a drug and has a symptom, because that is the only form in which the exam ever presents one.",
          "The retrieval you need on the day is 'potassium 2.9 in a client on furosemide and digoxin → report before the next dose', and that path never gets built by reading a table.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many lab values do I need to know for the NCLEX?",
        a: "Around 24 carry nearly all the items: six electrolytes, the renal and glucose values, the haematology and coagulation set, four therapeutic drug levels, and the four ABG values. Each needs its nursing action attached, not just its range.",
      },
      {
        q: "What is the most important lab value on the NCLEX?",
        a: "Potassium, 3.5–5.0 mEq/L. It appears more than any other because abnormal potassium is immediately dangerous, interacts with digoxin and diuretics, and drives a clear nursing action.",
      },
      {
        q: "Are lab value ranges given to you on the NCLEX?",
        a: "No. Some Next Generation case studies display a chart with reference ranges alongside the results, but standalone items routinely give a bare number and expect you to know whether it is a problem.",
      },
    ],
    topic: "dosage-and-labs",
    readNext: [
      "dosage-calculations-without-panic",
      "drug-suffixes-cheat-sheet",
      "prioritization-and-delegation-questions",
    ],
  },
  {
    slug: "prioritization-and-delegation-questions",
    title: "Prioritization and delegation questions",
    h1: "How to answer NCLEX prioritization and delegation questions",
    cluster: "content",
    minutes: 8,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Prioritization items ask who is least stable, not who is sickest. Delegation items ask what falls inside the scope of an LPN or a UAP: stable, predictable, routine tasks with unchanging outcomes. When two answers both look defensible, the tie-break is airway, then acute over chronic, then unexpected over expected.",
    sections: [
      {
        h2: "The question behind every prioritization item",
        body: [
          "'Which client should the nurse see first' never means 'which client is sickest'. It means 'which client will deteriorate soonest without me'. A client with a chronic and stable condition, however serious, waits behind a client with a new and unexplained finding.",
          "Run three filters in order. Airway, breathing, circulation — a compromised airway wins every time. Then acute over chronic: new-onset confusion outranks long-standing dementia. Then unexpected over expected: post-op day one pain is expected; post-op day one absent pedal pulse is not.",
        ],
      },
      {
        h2: "Stable and predictable: the delegation test",
        body: [
          "The RN keeps assessment, teaching, evaluation, and any unstable client — that is the line, and the exam does not move it. An LPN can reinforce teaching the RN has already delivered, monitor a stable client, administer many routine medications, and perform sterile procedures such as urinary catheterization within state scope. A UAP can take vitals on stable clients, assist with ADLs, reposition, ambulate, feed, and measure intake and output.",
          "The test to apply is 'stable and predictable, with no assessment and no judgement required'. Feeding a client who is stable is delegable. Feeding a client at risk of aspiration is not, because it now requires ongoing assessment — the task looks identical and the answer flips.",
        ],
      },
      {
        h2: "The five rights of delegation",
        body: [
          "Right task, right circumstance, right person, right direction and communication, right supervision and evaluation. Items are usually written to violate exactly one of them, and naming which one takes you to the answer faster than reasoning from scratch.",
          "'Delegate to the UAP to check the blood pressure of a client admitted with hypertensive crisis' fails right circumstance — the task is fine, the client is not stable. Delegation never transfers accountability: the RN remains responsible for the outcome, which is why 'the nurse delegated appropriately and does not need to follow up' is almost always wrong.",
        ],
      },
      {
        h2: "Assignment sequencing questions",
        body: [
          "A second family of items hands you four clients at the start of a shift and asks about assignment rather than order. The rule shifts: match acuity to licence. Give the LPN the stable chronic clients, keep the fresh post-op and the newly admitted for yourself, and never assign a client whose plan of care has not yet been established.",
          "Float nurses get the assignment closest to their home unit's competency. A med-surg nurse floated to telemetry takes the stable telemetry clients, not the drip titration.",
        ],
      },
      {
        h2: "Practising the format",
        body: [
          "These items are unusually trainable. The content is shallow — you rarely need a fact you do not have — and the ranking is a skill that improves with repetition faster than almost anything else on the exam.",
          "Do them in blocks so the pattern surfaces. Twenty prioritization items in a row will teach you more about the exam's model of urgency than a chapter on it will.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which client should the nurse see first on the NCLEX?",
        a: "The one who will deteriorate soonest without intervention — not necessarily the sickest. Apply airway, breathing, circulation first, then acute over chronic, then unexpected findings over expected ones.",
      },
      {
        q: "What can be delegated to a UAP on the NCLEX?",
        a: "Stable, predictable, routine tasks requiring no assessment or judgement: vital signs on stable clients, ADLs, repositioning, ambulating, feeding clients with no aspiration risk, and measuring intake and output.",
      },
      {
        q: "Can an LPN do sterile procedures?",
        a: "Yes, within state scope — urinary catheterization and many sterile dressing changes are standard LPN tasks. What an LPN cannot do is the initial assessment, the initial teaching, evaluation of outcomes, or care of an unstable client.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "abcs-maslow-and-the-nursing-process",
      "infection-control-precautions",
      "how-to-answer-sata",
    ],
  },
  {
    slug: "abcs-maslow-and-the-nursing-process",
    title: "ABCs, Maslow, and the nursing process",
    h1: "ABCs, Maslow, and the nursing process: the three tie-breakers",
    cluster: "content",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "When two NCLEX answers both look correct, three frameworks break the tie, in this order: ABCs for anything physiologically urgent, the nursing process when the options are actions at different stages, and Maslow when nothing is acutely unstable. Applying them in the wrong order is why candidates who know all three still miss the item.",
    sections: [
      {
        h2: "ABCs, and the exception that decides items",
        body: [
          "Airway, breathing, circulation. A client who cannot maintain an airway outranks everything, and a breathing problem outranks a circulation problem. This resolves a large share of 'see first' items on its own.",
          "The exception matters more than the rule: in cardiac arrest the sequence is CAB — compressions first. If an item describes an unresponsive, pulseless client, chest compressions precede airway. Candidates who apply ABC everywhere miss that one reliably.",
        ],
      },
      {
        h2: "The nursing process as an ordering tool",
        body: [
          "Assessment, diagnosis, planning, implementation, evaluation. When the options sit at different stages, the earlier stage usually wins — you assess before you intervene, and the exam punishes acting on incomplete data harder than it punishes waiting.",
          "The trap is that 'assess first' is not universal. If the stem already gives you the assessment data, or the client is in immediate danger, the answer is the action. A client with an oxygen saturation of 84% does not need another assessment; they need the head of the bed up and oxygen on.",
        ],
      },
      {
        h2: "Maslow, once nobody is unstable",
        body: [
          "Physiological needs, then safety, then love and belonging, then esteem, then self-actualization. Maslow is the tie-break for items where all four options are reasonable and nothing is acute — common in psychosocial, health promotion, and long-term-care items.",
          "The usual misuse is reaching for Maslow first. Between 'listen to the client's fears about surgery' and 'reposition the client with an oxygen saturation of 88%', Maslow and ABCs agree — but on an item where one option is airway and another is a physiological need lower down, ABCs decide, not the pyramid.",
        ],
      },
      {
        h2: "Safety and the risk-management overlay",
        body: [
          "Sitting across all three is a preference for the answer that removes risk from the client and everyone else. Given a choice between assessing a client who has fallen and a client actively climbing over a bed rail, you go to the one still falling.",
          "The same logic decides many equipment and infection-control items. If one option contains ongoing harm and another contains documentation, notification, or teaching, stop the harm first — the paperwork answer is almost never first, and it is almost never wrong later.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I use ABCs or Maslow first on the NCLEX?",
        a: "ABCs first. Maslow is the tie-breaker only when no option involves an airway, breathing, or circulation threat. Using Maslow first is a common source of misses on prioritization items.",
      },
      {
        q: "Is 'assess first' always the right answer?",
        a: "No. Assessment comes first when data is missing, but if the stem already supplies the assessment or the client is in immediate danger, the correct answer is the intervention.",
      },
      {
        q: "When does CAB replace ABC?",
        a: "In cardiac arrest. For an unresponsive, pulseless client, compressions come before airway. Everywhere else, airway leads.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "prioritization-and-delegation-questions",
      "nclex-case-study-walkthrough",
      "how-to-answer-sata",
    ],
  },
  {
    slug: "infection-control-precautions",
    title: "Isolation precautions, decided fast",
    h1: "NCLEX isolation precautions: airborne, droplet, contact",
    cluster: "content",
    minutes: 7,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Three transmission-based precautions sit on top of standard precautions. Airborne needs a negative-pressure room and an N95 — measles, TB, varicella. Droplet needs a private room and a surgical mask within three to six feet — influenza, pertussis, meningitis. Contact needs gown and gloves — C. difficile, MRSA, scabies. Items usually test the room and the mask, not the disease.",
    sections: [
      {
        h2: "Airborne: the small-particle three",
        body: [
          "Measles, tuberculosis, varicella — remember them as My Chicken Hez TB if you need a hook, but three items is a short list to hold directly. These organisms travel on droplet nuclei small enough to stay suspended, so the control is the room, not the distance.",
          "A negative-pressure room with the door closed, and an N95 respirator that has been fit-tested. A surgical mask is the wrong answer for airborne every time, and 'the nurse applies a surgical mask before entering the room of a client with active TB' is a stem written to be caught.",
        ],
      },
      {
        h2: "Droplet: bigger particles, shorter range",
        body: [
          "Influenza, pertussis, mumps, rubella, meningococcal meningitis, group A strep, adenovirus. Droplets fall within about three to six feet, so a private room and a surgical mask on entry are enough — no negative pressure, no N95.",
          "The client wears a surgical mask when transported. That transport detail is a common item on its own, and it applies to airborne too: the client masks, the corridor does not become an isolation zone.",
        ],
      },
      {
        h2: "Contact, and the C. diff exception",
        body: [
          "Gown and gloves for entry, dedicated equipment, private room where possible: MRSA, VRE, RSV, scabies, impetigo, draining wounds, C. difficile.",
          "C. difficile carries two exceptions the exam loves. Soap and water, not alcohol-based rub, because alcohol does not kill spores — and bleach-based cleaning for the room. Any item pairing C. diff with hand sanitizer is testing precisely this.",
        ],
      },
      {
        h2: "Protective isolation, which runs the other way",
        body: [
          "Neutropenic or protective isolation protects the client from the environment rather than the environment from the client: positive-pressure room, no fresh flowers, no raw fruit or vegetables, no visitors with any infection, and a mask on anyone entering.",
          "Positive versus negative pressure is the single distinction to get right. Negative pressure keeps air in for an infectious client; positive pressure keeps air out for a vulnerable one, and reversing them is the most consequential error in this content area.",
        ],
      },
      {
        h2: "PPE order, both ways",
        body: [
          "On: gown, mask, goggles, gloves. Off: gloves, goggles, gown, mask. The logic is that gloves are dirtiest so they come off first, and the mask stays on longest because you are still in the room's air until you leave.",
          "Doffing order appears more often than donning order, because it is where contamination actually happens. If an item offers a sequence, check the first item removed before you read anything else.",
        ],
      },
    ],
    faqs: [
      {
        q: "What are the three types of transmission-based precautions?",
        a: "Airborne (negative-pressure room, N95), droplet (private room, surgical mask within three to six feet), and contact (gown and gloves). All three sit on top of standard precautions, which apply to every client.",
      },
      {
        q: "Why can't you use hand sanitizer for C. difficile?",
        a: "Alcohol-based rubs do not kill C. difficile spores. Hand hygiene must be soap and water with mechanical friction, and the room requires a bleach-based cleaning agent.",
      },
      {
        q: "What is the correct order for removing PPE?",
        a: "Gloves, goggles, gown, then mask. Gloves are the most contaminated so they come off first, and the mask comes off last, after leaving the room.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "prioritization-and-delegation-questions",
      "nclex-lab-values-to-memorize",
      "whats-on-the-test-plan",
    ],
  },
  {
    slug: "drug-suffixes-cheat-sheet",
    title: "Drug suffixes that decode the question",
    h1: "NCLEX drug suffixes: decoding a drug you have never seen",
    cluster: "content",
    minutes: 7,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "You cannot memorize every drug, and the exam knows it. Around thirty generic-name suffixes tell you the class, and the class tells you the adverse effect the item is asking about: -olol beta blockers, -pril ACE inhibitors, -statin, -azole, -mycin, -pam. Learn the suffix with its one signature nursing concern attached.",
    sections: [
      {
        h2: "Cardiovascular: the six that carry most items",
        body: [
          "-olol beta blockers: hold for a heart rate below 60, never stop abruptly, and they mask the tachycardia of hypoglycemia — which is why a diabetic client on metoprolol is a whole item on its own. -pril ACE inhibitors: dry persistent cough and hyperkalemia; angioedema means stop and call. -sartan ARBs: the alternative when the cough drives the switch.",
          "-dipine calcium channel blockers: peripheral edema and no grapefruit juice. -statin: muscle pain that could be rhabdomyolysis, check liver enzymes, take in the evening. -pine at the end of amlodipine and nifedipine is the same family; digoxin stands alone with its 0.5–2.0 ng/mL window and its potassium interaction.",
        ],
      },
      {
        h2: "Anti-infectives",
        body: [
          "-cillin penicillins: allergy history first, always. -mycin and -micin aminoglycosides: nephrotoxic and ototoxic, so trough levels and hearing. -floxacin fluoroquinolones: tendon rupture, especially in older adults and clients on steroids. -cycline tetracyclines: not in pregnancy, not under eight, no dairy within two hours. -azole antifungals: hepatotoxicity. -sulfa: rash, fluids, and a Stevens-Johnson watch.",
          "The pattern to internalize is that anti-infective items are toxicity items. Once you know the suffix, the question is nearly always which lab you monitor or which finding you report.",
        ],
      },
      {
        h2: "Neuro and psych",
        body: [
          "-pam and -lam benzodiazepines: sedation, fall risk, flumazenil as the antidote, and never with alcohol. -barbital barbiturates: respiratory depression. -triptyline tricyclics: anticholinergic effects and cardiac risk in overdose. -oxetine SSRIs: two to four weeks to effect, and serotonin syndrome if combined with an MAOI.",
          "Lithium is not a suffix and is unmissable anyway: 0.6–1.2 mEq/L therapeutic, steady sodium and fluid intake, and toxicity presenting as tremor, vomiting, and confusion.",
        ],
      },
      {
        h2: "Endocrine, GI, and pain",
        body: [
          "-prazole proton pump inhibitors: before meals, long-term fracture and B12 risk. -tidine H2 blockers. -ase thrombolytics: bleeding, strict time windows. -parin anticoagulants: protamine sulfate as the antidote, watch platelets for HIT. -metformin and the -glipizide sulfonylureas: hypoglycemia for the sulfonylurea, lactic acidosis and hold-before-contrast for metformin.",
          "-one for corticosteroids such as prednisone: hyperglycemia, immunosuppression, never stop abruptly. That last rule — taper, do not stop — is shared with beta blockers and is worth a note of its own, because the exam tests it in both.",
        ],
      },
      {
        h2: "How to use suffixes without being caught by them",
        body: [
          "Suffixes get you the class. They do not get you the exception, and exam writers are aware of them. When a suffix and the stem disagree, the stem wins: a client on a -olol with a heart rate of 48 needs the dose held regardless of what the class usually does.",
          "Practise them inside questions, not on a chart. The retrieval you need is 'lisinopril plus a potassium-sparing diuretic equals hyperkalemia', and that link only forms when both arrive in the same stem.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I have to memorize brand names for the NCLEX?",
        a: "No. The NCLEX uses generic names only. Learning generic suffixes by class is far more efficient than memorizing individual drugs, since the class predicts the adverse effect the item is asking about.",
      },
      {
        q: "What does the suffix -olol mean?",
        a: "A beta blocker — metoprolol, atenolol, propranolol. The nursing concerns are holding for a heart rate below 60, never stopping abruptly, and the masking of hypoglycemia symptoms in diabetic clients.",
      },
      {
        q: "Which drug classes appear most on the NCLEX?",
        a: "Cardiovascular drugs, anticoagulants, insulins, and the high-alert medications, because they carry the most immediate risk. Pharmacological and parenteral therapies is 13–19% of the test plan.",
      },
    ],
    topic: "pharmacology",
    readNext: [
      "nclex-lab-values-to-memorize",
      "dosage-calculations-without-panic",
      "prioritization-and-delegation-questions",
    ],
  },
  {
    slug: "therapeutic-communication-questions",
    title: "Therapeutic communication questions",
    h1: "How to answer NCLEX therapeutic communication questions",
    cluster: "content",
    minutes: 6,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "The correct answer keeps the client talking, stays with the feeling they raised, and does not reassure, advise, or change the subject. Eliminate anything containing 'why', 'don't worry', 'everything will be fine', or a story about the nurse. What remains is usually an open question or a reflection of what the client just said.",
    sections: [
      {
        h2: "Eliminate before you choose",
        body: [
          "Four patterns are wrong nearly every time. False reassurance — 'I'm sure it will be fine' — closes the conversation and lies. Advice — 'What you should do is' — moves the decision to the nurse. Asking why demands justification and reads as challenge. Redirecting to the nurse's own experience makes the client the audience.",
          "Cross those out first. On most therapeutic communication items three of the four options fall to this pass, and you have the answer without needing to judge which remaining phrasing sounds warmest.",
        ],
      },
      {
        h2: "Stay with the feeling, not the fact",
        body: [
          "When a client says 'I don't think I'm going to get better', the answer is not information about the prognosis. It is 'You sound frightened about what comes next' or 'Tell me more about that'. The exam consistently prefers the response that names or explores the emotion over the one that corrects the content.",
          "Reflection, silence, and open-ended invitations are the three tools. Silence is a real option and it is right more often than candidates expect — 'the nurse sits quietly with the client' is a valid intervention, not a non-answer.",
        ],
      },
      {
        h2: "Where the rule bends",
        body: [
          "Safety overrides communication. If the client is describing a plan to harm themselves, the answer is a direct, closed question — 'Do you have a plan?' — not an open exploration. Asking directly about suicide does not plant the idea, and the exam tests that belief deliberately.",
          "Delusions and hallucinations get their own rules: do not argue, do not agree, present reality once and move to the feeling. 'I don't hear the voices, but I can see this is frightening you' is the shape of the right answer.",
        ],
      },
      {
        h2: "Why these items feel unfair, and are not",
        body: [
          "Candidates dislike these questions because two options often sound kind. Kindness is not the criterion — therapeutic function is. 'You have such a supportive family' is warm and it closes a door.",
          "Read every option asking one thing: does this leave the client with somewhere to go? The one that does is the answer, even when it feels less comforting than the alternatives.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why is asking 'why' wrong in therapeutic communication?",
        a: "'Why' asks the client to justify a feeling, which reads as challenge and typically shuts down disclosure. Open invitations such as 'Tell me more about that' get the same information without the defensiveness.",
      },
      {
        q: "Is silence a correct answer on the NCLEX?",
        a: "Often, yes. Sitting quietly with a client is a recognized therapeutic technique that gives them space to continue, and it appears as a correct option more frequently than candidates expect.",
      },
      {
        q: "How should the nurse respond to a client's hallucination?",
        a: "Do not argue and do not play along. State your own reality once — that you do not hear the voices — and move immediately to the client's feeling and safety.",
      },
    ],
    topic: "mental-health",
    readNext: [
      "abcs-maslow-and-the-nursing-process",
      "nclex-test-anxiety",
      "prioritization-and-delegation-questions",
    ],
  },
  {
    slug: "nclex-case-study-walkthrough",
    title: "An unfolding case study, step by step",
    h1: "Walking through a Next Gen NCLEX case study, step by step",
    cluster: "content",
    minutes: 8,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Every unfolding case study runs the same six steps: recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes. Each step has its own question type and its own kind of answer. Name the step before you read the options and the answer set narrows immediately — most case-study losses come from giving a step-five answer to a step-one question.",
    sections: [
      {
        h2: "The six steps and what each one wants",
        body: [
          "Recognize cues wants findings — which pieces of the chart are relevant. Analyze cues wants meaning — what those findings suggest. Prioritize hypotheses wants the most likely or most dangerous explanation. Generate solutions wants appropriate interventions in the abstract. Take action wants the intervention you perform now. Evaluate outcomes wants the finding that shows whether it worked.",
          "The step is signalled by the verb in the stem and by the item type. Highlight and matrix items cluster at the front of the case; drop-down and bowtie items at the back. Read the verb first, every time.",
        ],
      },
      {
        h2: "Step one, worked: the chart arrives",
        body: [
          "A case opens with a nurses' note: a 68-year-old two days post-op hip arthroplasty, reporting new shortness of breath, respiratory rate 28, heart rate 112, oxygen saturation 89% on room air, calf tender and swollen, temperature 37.4°C. You are asked to highlight the findings that require follow-up.",
          "Select the abnormal and the relevant: respiratory rate, heart rate, saturation, calf findings, the new dyspnea. Do not select the temperature — it is normal, and on a partial-credit item each wrong selection costs a point. This is the discipline the format is built to reward: select what you can defend, then stop.",
        ],
      },
      {
        h2: "Steps two and three: from findings to hypothesis",
        body: [
          "Analyze cues is typically a matrix: classify each finding as consistent with pulmonary embolism, consistent with pneumonia, or consistent with heart failure. The same finding can support more than one, and that is the point — the exam is checking whether you can hold competing explanations.",
          "Prioritize hypotheses then asks for the most likely. Post-op day two, immobile, unilateral calf swelling, sudden dyspnea with hypoxia and tachycardia: pulmonary embolism. Note that 'most likely' and 'most dangerous' usually converge here, and when they do not, the exam wants the dangerous one.",
        ],
      },
      {
        h2: "Steps four to six: doing and checking",
        body: [
          "Generate solutions and take action are often a bowtie: the condition in the centre, two actions on the left, two parameters to monitor on the right. For the PE case, actions are high-Fowler's position with supplemental oxygen and notifying the provider; parameters are oxygen saturation and respiratory rate. Anticoagulation appears as a distractor action because it needs an order.",
          "Evaluate outcomes closes the loop: which findings indicate the interventions worked. Saturation rising to 95%, respiratory rate falling to 18, dyspnea resolving. A resolved calf swelling would not — it does not respond in an hour, and the exam checks whether you know the timescale of your own interventions.",
        ],
      },
      {
        h2: "How to practise case studies",
        body: [
          "Do them whole. Six unrelated standalone questions on pulmonary embolism will not build the habit the case study is scoring, even if the content is identical, because the skill is carrying an evolving picture across six linked decisions.",
          "You will see at least three case studies on the exam, worth six items each — around 18 of your scored items before you answer a single standalone question. That is too large a share to meet for the first time on test day.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many case studies are on the NCLEX?",
        a: "At least three unfolding case studies, each with six linked questions, so around 18 scored items. Every candidate receives them regardless of how the adaptive engine is otherwise behaving.",
      },
      {
        q: "What are the six steps of the clinical judgement model?",
        a: "Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, and evaluate outcomes. Each step maps to a different question type and a different kind of correct answer.",
      },
      {
        q: "Do case study questions have partial credit?",
        a: "Most do. Typical plus-minus scoring awards a point per correct selection and deducts one per incorrect selection, with a floor of zero — so selecting extra options you cannot defend actively costs you.",
      },
    ],
    topic: "risk-reduction",
    readNext: [
      "next-gen-changes-explained",
      "abcs-maslow-and-the-nursing-process",
      "how-to-answer-sata",
    ],
  },

  /* ------------------------------------------------------------------------
     TEST DAY AND AFTER — the 48 hours nobody prepares for
  ------------------------------------------------------------------------ */
  {
    slug: "pearson-vue-trick-explained",
    title: "The Pearson VUE trick, honestly",
    h1: "The Pearson VUE trick: how it works and why we would not do it",
    cluster: "after",
    minutes: 5,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "The Pearson VUE trick means attempting to re-register for the NCLEX hours after testing: if the system blocks you with a 'delivery successful' pop-up, candidates read it as a pass; if it lets you pay, as a fail. It is not official, it has never been validated, and it has been wrong often enough that no result from it is worth acting on.",
    sections: [
      {
        h2: "What the trick actually is",
        body: [
          "After your exam, you sign back into your Pearson VUE account and start registering for the NCLEX again, going as far as entering payment details. If the system refuses and shows a pop-up saying your registration cannot be processed because a delivery was successful, candidates call that a 'good pop-up' and read it as a pass. If it accepts the payment page, they read it as a fail.",
          "The mechanism people believe in is that a result has already posted to your record and the system will not sell an exam to someone who no longer needs one.",
        ],
      },
      {
        h2: "Why it is unreliable",
        body: [
          "Pearson VUE has never endorsed it, and the behaviour depends on registration and result-posting states that change without notice and vary between boards. Candidates report bad pop-ups followed by passes and good pop-ups followed by fails — not often, but often enough that the trick's accuracy is unknowable and its confidence is unearned.",
          "It has also broken outright after platform updates, sometimes for weeks, with candidates in that window reading stale behaviour as a verdict.",
        ],
      },
      {
        h2: "The cost nobody mentions",
        body: [
          "There is a real risk of accidentally completing a registration and being charged $200 for an exam you do not need, and untangling that takes days. A duplicate registration can also complicate a genuine retake booking if you do need one.",
          "The larger cost is what it does to the 48 hours. A bad pop-up sends people into a grief they may not owe, and a good one produces a certainty that makes the official result — if it disagrees — considerably worse.",
        ],
      },
      {
        h2: "What to do instead",
        body: [
          "Quick Results are available in most states 48 hours after testing for a small fee, and they are official in the sense that they come from the NCSBN. Your board of nursing posts the licence, usually within two to six weeks, and that is the thing that lets you work.",
          "Two days is a short time to hold an unknown, and it is shorter than the time you will spend re-reading forum threads about pop-ups. Put your phone somewhere else and sleep.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the Pearson VUE trick accurate?",
        a: "It is unofficial and unvalidated. Pearson VUE has never endorsed it, its behaviour changes with platform updates, and candidates report both false passes and false fails — so no result from it should be treated as reliable.",
      },
      {
        q: "Can the Pearson VUE trick charge me?",
        a: "Yes. Going far enough into the registration flow can complete a booking and charge the $200 exam fee, and reversing that takes days of contact with Pearson VUE and your board.",
      },
      {
        q: "When do official NCLEX results come out?",
        a: "Quick Results are available in most states about 48 hours after testing for a small fee. Your board of nursing posts the official licence, typically within two to six weeks.",
      },
    ],
    topic: "safe-care",
    readNext: ["nclex-results-timeline", "reading-your-result", "if-you-failed-what-next"],
  },
  {
    slug: "nclex-results-timeline",
    title: "When NCLEX results arrive",
    h1: "NCLEX results: how long they take and what arrives when",
    cluster: "after",
    minutes: 5,
    updated: "August 2026",
    updatedISO: "2026-08-27",
    shortAnswer:
      "Quick Results are available from the NCSBN about 48 hours after you test, in most states, for a small fee. Your official result comes from your board of nursing within roughly six weeks, and in many states the licence number appears on the public verification register within days — often before any email reaches you.",
    sections: [
      {
        h2: "The 48-hour Quick Results",
        body: [
          "Most boards participate in Quick Results, which post unofficial results to your NCSBN account two business days after your exam for a fee of around $8. Two business days is doing real work in that sentence: test on a Friday and Monday is not the day.",
          "Quick Results are unofficial in the legal sense — they do not authorize you to practise — but they are generated from the same scored record, so they do not disagree with the official result.",
        ],
      },
      {
        h2: "The board of nursing, and the register",
        body: [
          "Your board issues the official result and the licence. Six weeks is the outer edge for most boards and many are considerably faster, but the variable is administrative rather than clinical — background checks, application completeness, and the board's own cycle.",
          "The fastest signal is often the public licence verification register, which most boards run as a searchable database. A licence number appearing under your name is the most definitive answer available, and it regularly beats the email by days.",
        ],
      },
      {
        h2: "If you did not pass",
        body: [
          "You receive a Candidate Performance Report with your position — Below, Near, or Above the passing standard — in each of the eight client-need categories. It is the most useful document you will get and it is worth reading with a pen, twice, once the first day has passed.",
          "You may retest after the waiting period set by the NCSBN and your board, most commonly 45 days. Re-register with Pearson VUE, pay the fee again, and wait for a new ATT — the old one does not carry over.",
        ],
      },
      {
        h2: "Before the licence arrives",
        body: [
          "Many employers will hold a start date on a Quick Result, and many states issue a temporary or interim permit that lets you work under supervision while the licence processes. Ask your prospective employer what they accept — this is a routine question for a nurse recruiter, not an awkward one.",
          "Do not accept a role that requires you to represent yourself as licensed before the register says you are. That is the one part of this timeline with consequences beyond inconvenience.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does it take to get NCLEX results?",
        a: "Quick Results are available about 48 hours (two business days) after testing in most states for a small fee. The official result and licence come from your board of nursing, usually within two to six weeks.",
      },
      {
        q: "How long do I have to wait to retake the NCLEX?",
        a: "Most commonly 45 days, set by the NCSBN and your board of nursing. You must re-register and pay the exam fee again, and a new Authorization to Test is issued before you can schedule.",
      },
      {
        q: "Can I work as a nurse before my licence is posted?",
        a: "Only if your state issues a temporary or interim permit and your employer accepts it. Never represent yourself as licensed before the licence appears on your board's public verification register.",
      },
    ],
    topic: "safe-care",
    readNext: ["reading-your-result", "pearson-vue-trick-explained", "if-you-failed-what-next"],
  },
];
