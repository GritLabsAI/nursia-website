/**
 * The free resources, and the rule that decides which guide gets which.
 *
 * The rule matters more than the resources do. A single generic "free study
 * guide" offered on all fifty pages converts like a banner ad, because the
 * reader can tell it has nothing to do with what they were reading. A resource
 * that continues the specific page they are on converts several times better,
 * and the only way to get that at fifty pages is to make the assignment a
 * property of the content rather than a decision somebody makes fifty times.
 *
 * So each resource declares what it belongs to, and the seeder matches from
 * most specific to least: an explicit list of guide slugs, then the question
 * topic, then the journey stage, then the fallback. Every guide ends up with
 * something, and a new guide inherits a sensible resource the day it is
 * written without anyone remembering to attach one.
 *
 * One thing learned from running this against the real library, because it
 * shapes every `match` block below: a guide's `topic` is a weak signal outside
 * the `content` cluster. It was chosen to answer "which question set should
 * this page send people to", so a guide about choosing a state board carries
 * `safe-care` and a guide about Filipino candidates carries
 * `prioritization-delegation` — neither of which says anything about the
 * subject. Matching purely on topic put twenty of forty-five guides behind the
 * prioritization tree, including several about registration paperwork.
 *
 * Hence: topic matches are restricted to genuinely subject-bearing topics,
 * journey stage carries the process pages, and the handful the rules still get
 * wrong are named explicitly. The explicit lists are not a failure of the
 * rules — they are the rules admitting where a human already knows better.
 *
 * On what these cost the reader: an account, which is an email and a password
 * and no card. There is no separate mailing list and no PDF-for-email trade.
 * That is a deliberate constraint on this file — a resource has to be worth
 * making an account for, not worth surrendering an address for, and the
 * `promise` field is where that gets decided. "A summary of the page you just
 * read" does not clear that bar and should not be in here.
 */

import type { Cluster } from "@/lib/content";

export type ResourceDraft = {
  slug: string;
  title: string;
  kind: "checklist" | "plan" | "cheatsheet" | "questionPack" | "worked" | "template";
  promise: string;
  contains: string[];
  headline?: string;
  body?: string;
  ctaLabel: string;
  delivery: "page" | "file" | "practice";
  destination: string;
  /** Paragraphs. Becomes the Portable Text a reader sees after signing up. */
  content?: string[];
  /** Matching, most specific first. */
  match: {
    guides?: string[];
    topics?: string[];
    clusters?: Cluster[];
    fallback?: true;
  };
};

export const RESOURCES: ResourceDraft[] = [
  /* ------------------------------------------------------------- the values */
  {
    slug: "lab-values-that-repeat",
    title: "The lab values the NCLEX actually repeats",
    kind: "cheatsheet",
    promise:
      "Know which twenty-odd numbers carry the exam, what each one looks like when it goes wrong, and which direction of abnormal is the one you act on.",
    contains: [
      "The core electrolytes, ABGs, coagulation, renal and hepatic values with their reference ranges",
      "The critical value for each — the number at which you stop and report",
      "What each derangement looks like at the bedside, not just on paper",
      "The six values that appear in more items than the rest combined",
    ],
    headline: "The numbers, and what to do when they move",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the values free →",
    delivery: "page",
    destination: "/resources/lab-values-that-repeat",
    content: [
      "A reference range tells you a value is abnormal. The exam almost never asks that. It asks what you do about it, which means the number you need attached to each range is the one where a nurse stops and reports rather than documents and continues.",
      "Potassium 3.5–5.0 mEq/L, and it is the value the exam returns to most. Below 3.0 or above 6.0 is the territory where dysrhythmia is the concern and the answer involves a cardiac monitor. The clinical face of a low potassium is muscle cramps, weakness, and palpitations; of a high potassium, it is peaked T waves and the same weakness, which is why the item usually gives you the number rather than the symptom.",
      "Sodium 135–145 mEq/L. The symptoms are neurological at both ends and the speed of the change matters more than the number — a sodium that fell fast produces seizures at a level a chronically low sodium tolerates. Correcting it too quickly is its own emergency, which is why the credited answer is so often to slow an infusion rather than to speed one up.",
      "Calcium 9.0–10.5 mg/dL, magnesium 1.3–2.1 mEq/L, phosphorus 3.0–4.5 mg/dL. Calcium and phosphorus move in opposite directions; magnesium and calcium move together and produce similar pictures, which is why Chvostek and Trousseau signs belong to both. A magnesium given for preeclampsia has one antidote worth knowing cold: calcium gluconate.",
      "Arterial blood gases: pH 7.35–7.45, PaCO₂ 35–45 mm Hg, HCO₃⁻ 22–26 mEq/L, PaO₂ 80–100 mm Hg. Work them in the same order every time — pH first to name the disturbance, then CO₂ for respiratory and bicarbonate for metabolic, then whether the other one has moved to compensate. The order is the whole skill; the numbers are the easy part.",
      "Haemoglobin 12–18 g/dL, haematocrit 36–54%, platelets 150,000–400,000/mm³, WBC 5,000–10,000/mm³. Platelets under 50,000 change what a client may do — no injections, no razors, fall precautions. A WBC under 1,000 changes who may visit.",
      "Coagulation: INR 0.8–1.1 untreated and 2–3 on warfarin, aPTT 30–40 seconds untreated and 1.5–2.5 times that on heparin. Know the antidotes as a pair: vitamin K for warfarin, protamine sulfate for heparin.",
      "Renal and hepatic: BUN 10–20 mg/dL, creatinine 0.6–1.2 mg/dL, albumin 3.5–5.0 g/dL, total bilirubin 0.3–1.0 mg/dL. Creatinine is the one that matters most because it moves late — by the time it has doubled, function has fallen a long way, which is why a rise from 0.9 to 1.8 is a hold-and-report finding rather than a trend to watch.",
      "Glucose 70–110 mg/dL fasting, HbA1c under 5.7% normal and under 7% as the usual treatment target. Digoxin 0.5–2.0 ng/mL and lithium 0.6–1.2 mEq/L are the two therapeutic drug levels the exam expects you to recognise without prompting, and both have narrow enough windows that the item is usually about toxicity.",
      "The fastest way to make these stick is not to read them again. It is to meet them inside questions, where the number arrives attached to a client who is doing something about it.",
    ],
    match: {
      topics: [
        "dosage-and-labs",
        "cardiovascular",
        "renal-genitourinary",
        "endocrine",
        "respiratory",
        "gastrointestinal",
      ],
    },
  },

  /* ------------------------------------------------------ the decision tree */
  {
    slug: "prioritization-decision-tree",
    title: "The prioritization decision tree",
    kind: "template",
    promise:
      "Work any who-do-you-see-first item in the same four steps, so the answer comes from a rule you can defend rather than from whichever client sounds worst.",
    contains: [
      "The four-step order that resolves every prioritization item",
      "When ABC beats Maslow and when it does not",
      "The delegation test — what may be handed to a UAP and what never may",
      "The words in a stem that tell you which framework is being tested",
    ],
    headline: "Stop guessing which client comes first",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the tree free →",
    delivery: "page",
    destination: "/resources/prioritization-decision-tree",
    content: [
      "Prioritization items look like judgement calls and are not. They are rule application, and the rules resolve in a fixed order. Run the same four steps every time and the distractors stop being persuasive.",
      "Step one: is anyone's airway, breathing, or circulation threatened? ABC outranks everything else, in that order, and it survives every rewording. Audible gurgling around a fresh tracheostomy beats a temperature of 38.4 °C, beats post-op pain at 7 out of 10, beats a glucose of 232 — because it is the only one that can kill the client in the next few minutes.",
      "Step two: if nobody is ABC-unstable, is anything acute, unexpected, or getting worse? Actual problems outrank potential ones, and unexpected findings outrank expected ones. A post-operative client whose pain is well controlled on schedule is expected. The same client with a rigid abdomen is not.",
      "Step three: only now does Maslow apply. Physiological needs before safety, safety before love and belonging, and so on down. Maslow is the tiebreaker between two stable clients, not the opening move — reaching for it first is the single most common way to get these wrong.",
      "Step four: if the item is asking what to do rather than who to see, assess before you intervene. The nursing process is an order as well as a framework: assessment, diagnosis, planning, implementation, evaluation. When two options are both reasonable actions and one of them is gathering more information, the exam almost always credits gathering more information — unless step one applied, in which case you act.",
      "Delegation is the same question wearing different clothes. You may delegate a task; you may never delegate the nursing process. Vital signs on a stable client, ambulation of a stable client, recording intake and output — standardised, predictable, known outcome, all delegable to a UAP. Assessment, teaching, evaluation, and anything on an unstable or newly admitted client stay with the RN.",
      "The word that gives delegation items away is almost always an adjective attached to the client rather than the task. 'Stable' makes a task delegable. 'Newly admitted', 'new', 'first', and 'unstable' pull it straight back to the RN, and the task itself may not change at all between the two versions of the item.",
      "The stem tells you which framework is being tested if you read for it. 'Which client should the nurse assess first' is ABC then Maslow. 'Which action should the nurse take first' is the nursing process. 'Which task may be delegated' is scope. Three different questions that all look identical at a glance.",
    ],
    /* `safe-care` and `fundamentals` are deliberately absent. Both are used as
       catch-all topics by process guides about registration and results, which
       have nothing to do with prioritization. */
    match: { topics: ["prioritization-delegation", "basic-care"] },
  },

  /* ----------------------------------------------------------- the drug set */
  {
    slug: "high-alert-drug-cards",
    title: "High-alert drugs, with the one thing to check",
    kind: "cheatsheet",
    promise:
      "For each drug class the exam keeps returning to, the single assessment that comes before the dose and the antidote if it has gone wrong.",
    contains: [
      "The drug classes that carry most pharmacology items",
      "The one check that precedes administration for each",
      "Antidote pairs worth knowing without thinking",
      "The suffixes that tell you the class before you recognise the drug",
    ],
    headline: "The drugs that decide pharmacology items",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the cards free →",
    delivery: "page",
    destination: "/resources/high-alert-drug-cards",
    content: [
      "Pharmacology items rarely ask what a drug is for. They ask what you check before giving it, what you monitor after, and when you hold it — which means the useful unit of memory is not the drug but the drug plus its one gate.",
      "Digoxin: count an apical pulse for a full minute and hold below 60. Toxicity shows as nausea, visual disturbance with yellow-green haloes, and dysrhythmia, and a low potassium makes it far more likely — which is why a client on digoxin and furosemide together is a setup the exam loves.",
      "Heparin: aPTT, 1.5–2.5 times control. Antidote protamine sulfate. Warfarin: INR, target 2–3 for most indications. Antidote vitamin K. Learn them as a pair, because the item that gives you one is usually testing whether you reach for the other.",
      "Opioids: respiratory rate before the dose, and hold below 12. Antidote naloxone. The distractor is nearly always sedation level, which matters but comes second — a client you cannot rouse who is breathing at 18 is a different problem from one breathing at 8.",
      "Insulin: know onset and peak, because hypoglycaemia happens at peak and that is when the item is set. Regular insulin is the only one given IV. When mixing, draw clear before cloudy — regular before NPH — and that order is tested far more often than the reason for it.",
      "Magnesium sulfate in obstetrics: check deep tendon reflexes, respiratory rate, and urine output before and during. Loss of reflexes is the earliest warning. Antidote calcium gluconate.",
      "Aminoglycosides such as gentamicin: peak and trough levels, and watch creatinine and hearing — nephrotoxic and ototoxic together. Vancomycin sits alongside them for the same reasons.",
      "Potassium: never IV push, ever, under any circumstance the exam can construct. Always diluted, always on a pump, and check urine output first because a client who is not making urine cannot clear it.",
      "The suffixes do a lot of work when a drug name is unfamiliar. -olol is a beta blocker, so hold for bradycardia and hypotension. -pril is an ACE inhibitor, so expect the dry cough and watch potassium. -sartan is an ARB. -statin means check liver function and ask about muscle pain. -azole is antifungal, -cillin is penicillin, -mycin is often the aminoglycoside or macrolide worth a second look. Recognising the class is usually enough to answer the item.",
    ],
    match: { topics: ["pharmacology"] },
  },

  /* ------------------------------------------------- the format drill (set) */
  {
    slug: "ngn-format-drill",
    title: "The Next Gen format drill",
    kind: "questionPack",
    promise:
      "Work through the item types that decide most scores — select all that apply, matrix, bowtie — in the format they actually appear in, with the rationale on every one.",
    contains: [
      "Select all that apply items, scored the way the exam scores them",
      "Matrix and bowtie items in their real layout",
      "A worked rationale on every item, including the ones you get right",
      "Your weakest category named once you have answered enough to tell",
    ],
    headline: "Practise the formats, not just the content",
    body: "An account is an email and a password — no card. It opens the full set, keeps every answer, and names the category costing you the most marks.",
    ctaLabel: "Open the drill free →",
    delivery: "practice",
    destination: "/nclex-practice-questions/sata",
    match: {
      /* Every guide about an item *format* belongs here, and most of them
         carry an unrelated subject topic — `risk-reduction` on the matrix and
         case-study guides, `med-surg` on cloze. The rules cannot see that;
         naming them can. */
      guides: [
        "bowtie-questions-explained",
        "matrix-and-grid-questions",
        "cloze-and-drop-down-questions",
        "nclex-case-study-walkthrough",
        "ngn-partial-credit-scoring",
        "next-gen-changes-explained",
      ],
      topics: ["sata"],
    },
  },

  /* ------------------------------------------------- the document checklist */
  {
    slug: "international-document-checklist",
    title: "The internationally educated candidate's document checklist",
    kind: "checklist",
    promise:
      "Start the three slowest items on day one instead of month four, and know which of them your chosen board will actually accept before you pay for any of them.",
    contains: [
      "Every document a board typically asks for, in the order to request them",
      "Which three run on someone else's clock, and how early to start each",
      "The questions to ask a board before ordering an evaluation",
      "What has to be true before Pearson VUE will issue an Authorization to Test",
    ],
    headline: "The paperwork is the long part, not the exam",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the checklist free →",
    delivery: "page",
    destination: "/resources/international-document-checklist",
    content: [
      "Almost nobody's timeline is decided by how long they study. It is decided by how early they started the three items that depend on other institutions, and those are the same three everywhere: licence verification from your home regulator, transcript confirmation from your school, and the credentials evaluation report that depends on both.",
      "Start with the board, before anything else and before spending money. Boards differ on which evaluation service they accept, whether they require the full CGFNS Certification Programme or a credentials evaluation report alone, whether English proficiency can be waived, and how long their own review takes. Evaluation reports are not transferable between services, so ordering the wrong one is weeks and a fee gone.",
      "Four questions to put to the board in writing before you order anything. Which credentials evaluation services do you accept? Do you require the CGFNS Certification Programme or only an evaluation report? Under what circumstances do you waive English proficiency? And what is your current processing time once everything is received? The answers change, and a forum post from last year is not evidence.",
      "Then start the slow three on the same day, in parallel rather than in sequence. Licence verification from your home regulator, sent directly to the board or the evaluation service — never through you. Transcript confirmation from your nursing school, including theory and supervised clinical hours broken down by area. And the evaluation itself, which cannot finish until the first two arrive.",
      "The clinical hours breakdown is where evaluations stall. Most programmes need to show supervised hours across adult, paediatric, maternal-newborn, and psychiatric-mental health nursing, and a candidate whose training was split across institutions or came through a route that has since been restructured should assemble every record they have before being asked rather than after.",
      "Run English proficiency alongside, unless the board has confirmed in writing that you are exempt. IELTS Academic, TOEFL iBT, and OET are the usual accepted tests and boards set their own minimum sub-scores — a total score that clears the bar with a speaking sub-score that does not is a common and avoidable failure.",
      "Registration with Pearson VUE and payment of the exam fee happen in parallel with all of this, and this is the part that confuses people: registering does not reserve a date and does not mean you are eligible. The Authorization to Test is issued only after the board declares you eligible, and it carries a validity window you must schedule inside.",
      "Two things worth knowing now rather than later. You can sit the exam at an international Pearson VUE centre; an international scheduling surcharge applies and the result is identical. And passing is not the last step toward working in the United States — that is a separate immigration process, usually involving a VisaScreen certificate with its own credentials review and its own queue.",
    ],
    match: {
      guides: [
        "nclex-for-internationally-educated-nurses",
        "nclex-for-filipino-nurses",
        "nclex-for-indian-nurses",
        "nclex-for-nigerian-nurses",
        "credentials-evaluation-for-nclex",
        "english-proficiency-for-nclex",
        "choosing-a-state-board-for-nclex",
      ],
    },
  },

  /* ------------------------------------------------------------- the plan */
  {
    slug: "fourteen-day-plan",
    title: "The 14-day NCLEX plan",
    kind: "plan",
    promise:
      "Know what to do on each of the next fourteen days, built around question volume and rationale review rather than around re-reading content you already own.",
    contains: [
      "A day-by-day schedule with a question target for each",
      "Which two days to spend on formats rather than content",
      "The review loop that makes a wrong answer worth more than a right one",
      "What to do on the final two days, which is less than you think",
    ],
    headline: "Fourteen days, planned",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the plan free →",
    delivery: "page",
    destination: "/resources/fourteen-day-plan",
    content: [
      "The plan rests on one claim: at two weeks out, answering questions and reading rationales beats re-reading content, and it is not close. You are no longer acquiring material. You are learning to choose between four defensible-looking options under time pressure, and that is a separate skill that only questions train.",
      "Days one and two — measure, do not study. Sit a mixed set of 75 questions under time and read every rationale, including on the items you got right, because a right answer for the wrong reason is a failure that has not happened yet. Write down your two weakest categories. Everything after this is built on those two.",
      "Days three to six — weakest category first, 50 to 75 questions a day, all in that one category. Depth beats breadth here. A category you are weak in improves fastest when you meet twenty variations of the same idea in a row and start recognising the shape of the item rather than the content of it.",
      "Days seven and eight — formats, not content. Select all that apply, matrix, bowtie, cloze. These decide more scores than any single content area because candidates meet them for the first time under exam conditions. Two days is enough to stop them being a surprise, and being surprised is most of the cost.",
      "Days nine to eleven — second weakest category, same shape as days three to six. If your first category has not moved, spend one of these days on it instead. The plan is a default, not a contract.",
      "Day twelve — a full-length mixed set under time, in one sitting, at the hour your exam is booked for. This is a rehearsal of the conditions as much as the content. If you have accommodations, rehearse with them.",
      "Day thirteen — review only. Reread the rationales from day twelve and from your two weakest categories. No new questions. The point is consolidation, and adding new material now reliably makes people more anxious without making them more accurate.",
      "Day fourteen — stop. Confirm your identification and your test centre, sleep, and do nothing else. Every study on cramming the day before agrees, and candidates who ignore this arrive tired to an exam that is four hours long and adaptive.",
      "The review loop is the part that does the work, and it is the same on every day. For each item you got wrong: name why the credited answer is credited, name what would have to be different in the stem for your answer to be right, and move on. Two sentences, not a rewritten textbook chapter. If you cannot do the second one, you have found a genuine content gap rather than a reading error, and that is the thing worth twenty minutes.",
    ],
    match: {
      /* The planning guides carry whatever topic their examples came from —
         `pharmacology` on the four-week plan, `prioritization-delegation` on
         the two-week one — so topic matching sends them somewhere unhelpful
         unless they are named. */
      guides: [
        "two-week-nclex-study-plan",
        "four-week-study-plan",
        "studying-for-the-nclex-while-working",
        "nclex-pacing-and-time-management",
      ],
      clusters: ["during"],
    },
  },

  /* ------------------------------------------------------- the day and after */
  {
    slug: "test-day-and-after-planner",
    title: "The test day and results planner",
    kind: "checklist",
    promise:
      "Walk into the centre with nothing left to decide, and know what each of the next few days actually means — including which signals are real and which are folklore.",
    contains: [
      "What to bring, what is confiscated, and what the check-in involves",
      "How the breaks work and when to take them",
      "What the shut-off at any length does and does not mean",
      "The results timeline, and what to do in each of the three outcomes",
    ],
    headline: "Nothing left to decide on the day",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the planner free →",
    delivery: "page",
    destination: "/resources/test-day-and-after-planner",
    content: [
      "Everything on the day is logistics, and logistics are worth removing the night before so that none of your attention is spent on them in the morning.",
      "Bring one acceptable, unexpired, government-issued photo identification whose name matches your registration exactly — exactly, including middle names and hyphens. A mismatch is the most common reason a candidate is turned away, it cannot be argued at the desk, and it costs the fee and the appointment.",
      "Everything else goes in a locker. Phone, watch, jewellery beyond a wedding band, bag, food, drink, notes, and anything in your pockets. Check-in includes a photograph, a palm vein scan, and a signature, and you will be asked to turn out your pockets. None of this is unusual and all of it takes longer than you expect, so arrive at least thirty minutes early.",
      "The tutorial at the start does not count against your time. Use it to find the calculator, the highlighter, and the strikethrough, because hunting for the strikethrough during a select-all item is a genuine and avoidable cost.",
      "Breaks are offered at set points and the clock keeps running. Take the first one anyway. A four-hour adaptive exam punishes fatigue more than it punishes the two minutes, and candidates who skip breaks to save time reliably report the last hour felt worse.",
      "On the shut-off: the exam ends when the algorithm is confident about you, in either direction, or when you reach the maximum length or the time limit. Ending at the minimum is not good news and it is not bad news. Running to the maximum is not bad news either. The only thing the length tells you is how long the algorithm took to become confident, and confident can mean either answer.",
      "It will feel hard throughout. That is the design — an adaptive exam holds you near the edge of what you can answer, so roughly half of what you see should feel uncertain. Candidates who walk out feeling comfortable are not usually the ones who did best.",
      "Afterwards: official results come from your board of nursing, commonly within about six weeks, and many boards offer quick results for a fee about two business days after the exam. Quick results are unofficial, and your licence is not issued until the board completes everything else it needs, including the background check.",
      "Three outcomes and three responses. A pass: confirm what your board still needs from you, because the licence is a separate step from the exam. A fail: you receive a Candidate Performance Report naming where you fell below the standard — it is the most useful study document you will ever be given, and it exists only in this case. A delay: usually a document or a background check outstanding, usually resolvable by asking the board directly what is missing.",
    ],
    match: { clusters: ["after"] },
  },

  /* ---------------------------------------------------------- the fallback */
  {
    slug: "weak-topic-starter-set",
    title: "Find the category costing you the most marks",
    kind: "questionPack",
    promise:
      "Answer enough mixed questions for the system to name your weakest client-need category, then get a set built from it rather than guessing what to revise.",
    contains: [
      "A mixed set drawn across all eight client-need categories",
      "A worked rationale on every item, including the ones you get right",
      "Your weakest category named once there is enough evidence to name it",
      "Every answer kept, so the picture sharpens rather than resetting",
    ],
    headline: "Stop guessing what to revise",
    body: "An account is an email and a password — no card. It keeps every answer you give and names the category costing you the most marks.",
    ctaLabel: "Start free →",
    delivery: "practice",
    destination: "/practice",
    match: {
      /* The "where do I stand" pages. Somebody reading how hard the exam is,
         or what the pass rate is, does not want a PDF — they want to find out
         where they actually stand, which two questions answer better than
         anything we could write. Also the AI guide, whose entire argument is
         to use a reviewed bank instead of a chatbot: the honest follow-through
         is to hand them the reviewed bank. */
      guides: [
        "how-hard-is-the-nclex",
        "nclex-pass-rates",
        "using-chatgpt-to-study-for-the-nclex",
        "hesi-exit-exam-nclex-prediction",
      ],
      fallback: true,
    },
  },

  /* --------------------------------------------------- getting to the seat */
  {
    slug: "nclex-eligibility-checklist",
    title: "The eligibility and registration checklist",
    kind: "checklist",
    promise:
      "Do the five steps between deciding to test and holding an Authorization to Test in the right order, so nothing you file has to be filed twice.",
    contains: [
      "The five steps, in the order they have to happen",
      "What the board decides versus what Pearson VUE decides",
      "The two things that must be settled before you schedule anything",
      "What the ATT validity window means for when you book",
    ],
    headline: "The order that stops you filing twice",
    body: "An account is an email and a password — no card. It opens this, keeps every answer you give, and names the category costing you the most marks.",
    ctaLabel: "Unlock the checklist free →",
    delivery: "page",
    destination: "/resources/nclex-eligibility-checklist",
    content: [
      "Two organisations are involved and they do different things. Your board of nursing decides whether you may test. Pearson VUE administers the exam. Almost every expensive mistake at this stage comes from asking one of them for something only the other can give.",
      "Step one — choose the board. You apply for licensure to one state, and that board sets every requirement that follows. Choosing it late means discovering requirements after you have already paid for something else.",
      "Step two — apply to the board for licensure and start anything slow at the same time. Fingerprints and a criminal background check in most states, transcripts from your programme, and — if you are requesting testing accommodations — the accommodation request, which is the longest item on the list and belongs here rather than later.",
      "Step three — register with Pearson VUE and pay the exam fee. This runs in parallel with the board's review and does not depend on it. Registering does not make you eligible and does not reserve a date, which surprises people every year.",
      "Step four — the board declares you eligible, and Pearson VUE emails an Authorization to Test. Nothing before this point lets you book a seat. The ATT carries a validity window, usually around ninety days but set by your board, and you must sit the exam inside it.",
      "Step five — schedule. Online for most candidates; by telephone, and only by telephone, if you have approved accommodations. Book as early in the window as you are ready for, because seats at convenient centres go first and the window does not extend.",
      "Two things to settle before you schedule anything. If you requested accommodations, confirm they are listed on the ATT — nothing is provided at the centre that was not granted and recorded beforehand. And check that the name on your identification matches your registration exactly, including middle names, because a mismatch is the most common reason a candidate is turned away at the desk and it cannot be argued.",
      "If the ATT window lapses before you test, you re-register and pay again. If you need to reschedule, do it well ahead — short-notice changes carry a fee and very short-notice ones are treated as an absence, which costs the whole registration.",
      "Where fees, ATT windows, and waiting periods are concerned, treat every number you read anywhere — including here — as an indication rather than a fact. They are set per board and they change. The board's own page is the only source that is current by definition.",
    ],
    match: {
      guides: [
        "how-to-register-for-the-nclex",
        "nclex-testing-accommodations",
        "nclex-pn-vs-rn",
        "nurse-licensure-compact-states",
      ],
    },
  },
];
