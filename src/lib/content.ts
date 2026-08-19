/**
 * Single source of truth for the site's content graph.
 *
 * The wireframes are explicit that the SEO pages *are* the product: every
 * public page ships real questions in static HTML. So questions live here as
 * data and get rendered server-side, not fetched.
 */

export const SITE = {
  name: "Nursia",
  tagline: "NCLEX-RN practice questions, written and reviewed by nurses.",
  email: "hello@nursia.com",
  url: "https://nursia.com",
  updated: "August 2026",
  totalQuestions: 1200,
  freeQuestions: 50,
  price: 29,
} as const;

/* ---------------------------------------------------------------- questions */

export type Question = {
  id: string;
  /** NCSBN client-need category this item maps to */
  category: string;
  type: "Single answer" | "Select all that apply" | "Matrix" | "Bowtie";
  stem: string;
  options: string[];
  /** indices of correct options */
  answer: number[];
  rationale: string;
};

const q = (x: Question) => x;

export const QUESTIONS: Record<string, Question> = {
  "pharm-104": q({
    id: "PH-104",
    category: "Pharmacological therapies",
    type: "Select all that apply",
    stem: "A client with heart failure is started on furosemide 40 mg PO daily. Which findings should the nurse report to the provider before administering the next dose? Select all that apply.",
    options: [
      "Serum potassium 2.9 mEq/L",
      "Blood pressure 132/78 mm Hg",
      "Weight loss of 1 kg since yesterday",
      "Client reports new muscle cramps and palpitations",
      "Serum creatinine rise from 0.9 to 1.8 mg/dL",
    ],
    answer: [0, 3, 4],
    rationale:
      "Furosemide is a loop diuretic, so the two things you are watching are potassium and kidney function. A potassium of 2.9 mEq/L is below the 3.5–5.0 reference range and puts the client at risk for dysrhythmia — hold and report. Muscle cramps with palpitations are the clinical face of that same hypokalemia, so they are reported together, not separately. A creatinine that doubles signals the diuresis has outrun renal perfusion. A blood pressure of 132/78 and a 1 kg loss are the expected response to the drug working, not reasons to hold it.",
  }),
  "pharm-212": q({
    id: "PH-212",
    category: "Pharmacological therapies",
    type: "Single answer",
    stem: "The provider prescribes heparin 25,000 units in 250 mL of 0.9% sodium chloride to infuse at 1,000 units/hour. At what rate in mL/hour should the nurse set the pump?",
    options: ["4 mL/hour", "10 mL/hour", "25 mL/hour", "40 mL/hour"],
    answer: [1],
    rationale:
      "Find the concentration first: 25,000 units ÷ 250 mL = 100 units/mL. Then divide the ordered dose by that concentration: 1,000 units/hour ÷ 100 units/mL = 10 mL/hour. Dosage items almost always reduce to two steps like this, and the distractors are the answers you get from a single misplaced decimal — which is exactly what the item is testing.",
  }),
  "safe-011": q({
    id: "SE-011",
    category: "Safe and effective care environment",
    type: "Single answer",
    stem: "A nurse on a medical unit receives report on four clients. Which client should the nurse assess first?",
    options: [
      "A client with pneumonia whose temperature is 38.4 °C (101.1 °F)",
      "A client two days post-op who rates incisional pain 7 out of 10",
      "A client with a new tracheostomy who is coughing and has audible gurgling",
      "A client with diabetes whose morning glucose is 232 mg/dL",
    ],
    answer: [2],
    rationale:
      "Prioritization items are airway, breathing, circulation, in that order — the ranking survives every rewording. Audible gurgling around a fresh tracheostomy is a partially obstructed airway and it is the only option that can kill the client in the next few minutes. Fever, post-op pain, and a glucose of 232 are all real problems that need the nurse, just not first.",
  }),
  "safe-047": q({
    id: "SE-047",
    category: "Safe and effective care environment",
    type: "Select all that apply",
    stem: "Which tasks may the registered nurse delegate to unlicensed assistive personnel (UAP)? Select all that apply.",
    options: [
      "Measuring and recording vital signs on a stable post-op client",
      "Reinforcing teaching about a newly prescribed inhaler",
      "Assisting a stable client with ambulation to the bathroom",
      "Performing the first assessment on a newly admitted client",
      "Recording oral intake and output on a client with heart failure",
    ],
    answer: [0, 2, 4],
    rationale:
      "Delegate tasks, never the nursing process. Vital signs on a stable client, ambulation of a stable client, and recording intake and output are standardized, predictable, and have a known outcome — all delegable. Teaching and assessment belong to the RN, and the word that gives it away is 'newly': a new inhaler and a new admission both require judgement the UAP is not licensed to make.",
  }),
  "psych-030": q({
    id: "PS-030",
    category: "Psychosocial integrity",
    type: "Single answer",
    stem: "A client admitted with major depressive disorder tells the nurse, \"Everyone would be better off without me.\" Which response is most appropriate?",
    options: [
      "\"Your family loves you very much and would miss you.\"",
      "\"Are you thinking about killing yourself?\"",
      "\"Let's talk about this at group therapy this afternoon.\"",
      "\"What has made you feel this way about yourself?\"",
    ],
    answer: [1],
    rationale:
      "Ask directly. Asking about suicide does not plant the idea, and a veiled statement like this one has to be converted into an assessable answer before anything else happens — including exploring feelings. Reassurance dismisses the statement, deferring to group delays a safety assessment, and 'what made you feel this way' is a therapeutic question in the wrong order: safety first, then exploration.",
  }),
  "medsurg-088": q({
    id: "MS-088",
    category: "Physiological adaptation",
    type: "Single answer",
    stem: "A client with chronic obstructive pulmonary disease has an oxygen saturation of 88% on 2 L/min via nasal cannula and is alert with no distress. What should the nurse do first?",
    options: [
      "Increase the oxygen to 6 L/min via nasal cannula",
      "Place the client in high Fowler's position and reassess",
      "Notify the rapid response team",
      "Obtain an arterial blood gas sample",
    ],
    answer: [1],
    rationale:
      "In COPD a saturation of 88–92% is the therapeutic target, not an emergency, and this client is alert with no distress. The first action is the independent nursing intervention that is least invasive and most likely to help: sit them up and reassess. Turning the oxygen up to 6 L/min risks blunting the hypoxic drive, and calling rapid response or drawing an ABG escalates ahead of an assessment you have not finished.",
  }),
  "basic-055": q({
    id: "BC-055",
    category: "Basic care and comfort",
    type: "Single answer",
    stem: "A nurse is preparing to feed a client who had a stroke and has mild dysphagia. Which action best reduces the risk of aspiration?",
    options: [
      "Offer thin liquids through a straw to encourage intake",
      "Position the client upright at 90 degrees and tuck the chin when swallowing",
      "Have the client lie on the left side during the meal",
      "Encourage large bites to trigger the swallow reflex",
    ],
    answer: [1],
    rationale:
      "Upright at 90 degrees with a chin tuck narrows the airway entrance and directs the bolus toward the esophagus — it is the single highest-yield positioning intervention for dysphagia. Thin liquids and straws move fastest and aspirate most easily, side-lying removes the gravity you want, and large bites overwhelm a swallow that is already impaired.",
  }),
  "health-023": q({
    id: "HP-023",
    category: "Health promotion and maintenance",
    type: "Single answer",
    stem: "A client at 30 weeks' gestation reports a headache that will not resolve, blurred vision, and swelling of the hands. Blood pressure is 158/104 mm Hg. Which action should the nurse take first?",
    options: [
      "Encourage the client to rest in a quiet room and recheck in an hour",
      "Notify the provider and prepare for magnesium sulfate administration",
      "Send a urine specimen for culture and sensitivity",
      "Teach the client about the signs of preterm labor",
    ],
    answer: [1],
    rationale:
      "Headache that will not resolve, visual changes, and a blood pressure of 158/104 after 20 weeks are severe features of preeclampsia — the client is at risk of seizing. Notify and prepare for magnesium sulfate, which is given for seizure prophylaxis rather than for the blood pressure itself. Resting and rechecking in an hour delays treatment, and a urine culture answers a different question entirely.",
  }),
  "risk-066": q({
    id: "RR-066",
    category: "Reduction of risk potential",
    type: "Single answer",
    stem: "Four hours after a cardiac catheterization via the right femoral artery, the nurse notes the client's right dorsalis pedis pulse is now faint and the foot is cool and pale. What is the nurse's priority action?",
    options: [
      "Document the finding and recheck in 30 minutes",
      "Apply a warm blanket to the right foot",
      "Notify the provider immediately",
      "Ask the client to flex and extend the right ankle",
    ],
    answer: [2],
    rationale:
      "A pulse that was present and is now faint, with a cool, pale extremity distal to the puncture site, is arterial occlusion until proven otherwise — a limb-threatening complication that needs the provider now. Documenting and rechecking wastes the window, warming treats the symptom and masks the change, and asking the client to move the ankle neither restores flow nor gives you new information.",
  }),
  "sata-101": q({
    id: "SA-101",
    category: "Physiological adaptation",
    type: "Select all that apply",
    stem: "A client is admitted with diabetic ketoacidosis. Which findings does the nurse expect? Select all that apply.",
    options: [
      "Deep, rapid respirations",
      "Fruity odor to the breath",
      "Serum bicarbonate 30 mEq/L",
      "Blood glucose 480 mg/dL",
      "Warm, flushed, dry skin",
    ],
    answer: [0, 1, 3, 4],
    rationale:
      "DKA is hyperglycemia plus ketosis plus metabolic acidosis, and four of these are that picture: Kussmaul respirations blowing off CO₂, ketones on the breath, a glucose well above 250 mg/dL, and dehydration showing as warm, flushed, dry skin. A bicarbonate of 30 mEq/L is above the reference range — in DKA bicarbonate is consumed and falls below 18. On a select-all, check each option against the pathophysiology on its own; there is no partial credit on the real exam.",
  }),
};

/* ------------------------------------------------------------------- topics */

export type Topic = {
  slug: string;
  name: string;
  h1: string;
  /** NCSBN client-need label, verbatim */
  category: string;
  count: number;
  /** percentage of the exam, per the NCSBN test plan */
  share: string;
  blurb: string;
  intro: string;
  subtopics: { name: string; count: number }[];
  questions: string[];
  siblings: string[];
  guides: string[];
};

export const TOPICS: Topic[] = [
  {
    slug: "pharmacology",
    name: "Pharmacology",
    h1: "NCLEX pharmacology practice questions",
    category: "Pharmacological and parenteral therapies",
    count: 210,
    share: "13–19% of the exam",
    blurb: "Dosage math, adverse effects, and the drugs that show up every time.",
    intro:
      "Pharmacological and parenteral therapies is the largest single category on the NCLEX-RN test plan, at 13–19% of scored items. The 210 questions below are written against that category and weighted the way the plan weights it: more adverse effects and interactions than pure calculation, because that is what the exam asks. Five are free to answer right here.",
    subtopics: [
      { name: "Dosage calculation", count: 48 },
      { name: "Adverse effects and interactions", count: 62 },
      { name: "Blood products and IV therapy", count: 35 },
      { name: "Pain management", count: 31 },
      { name: "High-alert medications", count: 34 },
    ],
    questions: ["pharm-104", "pharm-212", "safe-047", "sata-101", "risk-066"],
    siblings: ["med-surg", "safe-care", "sata"],
    guides: ["dosage-calculations-without-panic", "how-to-answer-sata"],
  },
  {
    slug: "med-surg",
    name: "Med-surg",
    h1: "NCLEX med-surg practice questions",
    category: "Physiological adaptation",
    count: 156,
    share: "11–17% of the exam",
    blurb: "Complications, decompensation, and what to do first when a client turns.",
    intro:
      "Med-surg items on the NCLEX are mostly physiological adaptation: a client with a known condition develops a complication and you decide what happens next. The 156 questions below run across cardiac, respiratory, endocrine, renal, and neuro, and every one of them has a rationale that names the finding that should have moved you. Five are free below.",
    subtopics: [
      { name: "Cardiac and hemodynamics", count: 38 },
      { name: "Respiratory", count: 32 },
      { name: "Endocrine", count: 30 },
      { name: "Renal and fluid balance", count: 28 },
      { name: "Neurological", count: 28 },
    ],
    questions: ["medsurg-088", "sata-101", "risk-066", "pharm-104", "safe-011"],
    siblings: ["pharmacology", "risk-reduction", "basic-care"],
    guides: ["how-hard-is-the-nclex", "next-gen-changes-explained"],
  },
  {
    slug: "safe-care",
    name: "Safe and effective care",
    h1: "NCLEX safe and effective care practice questions",
    category: "Safe and effective care environment",
    count: 184,
    share: "17–23% of the exam",
    blurb: "Delegation, prioritization, infection control, and client rights.",
    intro:
      "Management of care plus safety and infection control together make the largest block on the test plan. These items rarely test a fact — they test whether you can rank four true things. The 184 questions below are heavy on delegation and prioritization for that reason. Five are free below.",
    subtopics: [
      { name: "Delegation and supervision", count: 44 },
      { name: "Prioritization", count: 40 },
      { name: "Infection control", count: 38 },
      { name: "Client rights and advocacy", count: 32 },
      { name: "Accident and injury prevention", count: 30 },
    ],
    questions: ["safe-011", "safe-047", "medsurg-088", "risk-066", "psych-030"],
    siblings: ["risk-reduction", "psychosocial", "sata"],
    guides: ["how-hard-is-the-nclex", "test-day-checklist"],
  },
  {
    slug: "psychosocial",
    name: "Psychosocial integrity",
    h1: "NCLEX psychosocial integrity practice questions",
    category: "Psychosocial integrity",
    count: 88,
    share: "6–12% of the exam",
    blurb: "Therapeutic communication, crisis, and the response that is never reassurance.",
    intro:
      "Psychosocial items look easy and are not: four responses are all polite, and only one assesses. The 88 questions below cover therapeutic communication, mental health conditions, substance use, grief, and abuse, and each rationale explains why the other three responses close the conversation. Five are free below.",
    subtopics: [
      { name: "Therapeutic communication", count: 26 },
      { name: "Mental health conditions", count: 24 },
      { name: "Crisis and suicide risk", count: 16 },
      { name: "Substance use", count: 12 },
      { name: "Grief, loss, and abuse", count: 10 },
    ],
    questions: ["psych-030", "safe-047", "safe-011", "basic-055", "health-023"],
    siblings: ["safe-care", "health-promotion", "basic-care"],
    guides: ["how-to-answer-sata", "if-you-failed-what-next"],
  },
  {
    slug: "basic-care",
    name: "Basic care and comfort",
    h1: "NCLEX basic care and comfort practice questions",
    category: "Basic care and comfort",
    count: 142,
    share: "6–12% of the exam",
    blurb: "Mobility, nutrition, elimination, rest, and non-pharmacological comfort.",
    intro:
      "Basic care and comfort is where the exam checks that you can still do the fundamentals safely under pressure — positioning, feeding, mobility, elimination, and comfort measures that do not come from a syringe. 142 questions, five of them free below.",
    subtopics: [
      { name: "Mobility and immobility", count: 34 },
      { name: "Nutrition and oral hydration", count: 32 },
      { name: "Elimination", count: 28 },
      { name: "Rest and sleep", count: 22 },
      { name: "Non-pharmacological comfort", count: 26 },
    ],
    questions: ["basic-055", "medsurg-088", "safe-047", "health-023", "psych-030"],
    siblings: ["health-promotion", "med-surg", "psychosocial"],
    guides: ["four-week-study-plan", "how-hard-is-the-nclex"],
  },
  {
    slug: "risk-reduction",
    name: "Reduction of risk potential",
    h1: "NCLEX reduction of risk potential practice questions",
    category: "Reduction of risk potential",
    count: 130,
    share: "9–15% of the exam",
    blurb: "Lab values, diagnostics, and catching the complication before it lands.",
    intro:
      "Reduction of risk potential is the lab-value and post-procedure category: you are given a number or a change and asked whether it is expected. The 130 questions below lean on the values the exam actually repeats — potassium, sodium, INR, creatinine, hemoglobin A1C — rather than a memorization sheet. Five are free below.",
    subtopics: [
      { name: "Laboratory values", count: 36 },
      { name: "Diagnostic tests and procedures", count: 30 },
      { name: "Post-operative complications", count: 28 },
      { name: "Therapeutic procedures", count: 20 },
      { name: "Vital sign changes", count: 16 },
    ],
    questions: ["risk-066", "pharm-104", "sata-101", "medsurg-088", "pharm-212"],
    siblings: ["med-surg", "safe-care", "pharmacology"],
    guides: ["next-gen-changes-explained", "dosage-calculations-without-panic"],
  },
  {
    slug: "health-promotion",
    name: "Health promotion",
    h1: "NCLEX health promotion and maintenance practice questions",
    category: "Health promotion and maintenance",
    count: 96,
    share: "6–12% of the exam",
    blurb: "Pregnancy, newborn, growth and development, screening, and prevention.",
    intro:
      "Health promotion and maintenance covers the whole lifespan, and on the exam it is dominated by maternity and pediatrics — expected findings, danger signs, and age-appropriate teaching. 96 questions, five free below.",
    subtopics: [
      { name: "Antepartum and postpartum", count: 28 },
      { name: "Newborn care", count: 20 },
      { name: "Growth and development", count: 20 },
      { name: "Screening and prevention", count: 16 },
      { name: "Health and wellness teaching", count: 12 },
    ],
    questions: ["health-023", "basic-055", "psych-030", "safe-047", "medsurg-088"],
    siblings: ["basic-care", "psychosocial", "safe-care"],
    guides: ["four-week-study-plan", "whats-on-the-test-plan"],
  },
  {
    slug: "sata",
    name: "SATA questions",
    h1: "NCLEX select all that apply (SATA) practice questions",
    category: "All categories",
    count: 120,
    share: "Appears across every category",
    blurb: "The format that has no partial credit, drilled on its own.",
    intro:
      "Select all that apply is a format, not a category — which is why it is worth drilling separately. The 120 SATA items below are pulled from every client-need category and scored the way the real exam scores them: all correct options, no partial credit. Five are free below.",
    subtopics: [
      { name: "SATA — pharmacology", count: 30 },
      { name: "SATA — physiological adaptation", count: 26 },
      { name: "SATA — safe and effective care", count: 26 },
      { name: "SATA — health promotion", count: 20 },
      { name: "SATA — psychosocial", count: 18 },
    ],
    questions: ["sata-101", "pharm-104", "safe-047", "risk-066", "psych-030"],
    siblings: ["pharmacology", "safe-care", "med-surg"],
    guides: ["how-to-answer-sata", "next-gen-changes-explained"],
  },
];

export const topicBySlug = (slug: string) => TOPICS.find((t) => t.slug === slug);

/* ------------------------------------------------------------------- guides */

export type GuideSection = { h2: string; body: string[] };

export type Guide = {
  slug: string;
  title: string;
  h1: string;
  cluster: "before" | "during" | "after";
  minutes: number;
  updated: string;
  /** the first 60 words, written to answer the query outright */
  shortAnswer: string;
  sections: GuideSection[];
  /** the one topic page this guide has to earn its keep by linking to */
  topic: string;
  readNext: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-hard-is-the-nclex",
    title: "How hard is the NCLEX?",
    h1: "How hard is the NCLEX, really?",
    cluster: "before",
    minutes: 6,
    updated: "August 2026",
    shortAnswer:
      "About 88% of US-educated first-time candidates pass the NCLEX-RN. It is hard in a specific way: the questions are not harder facts, they are harder decisions — most items give you four defensible answers and ask which one comes first. Repeat attempts pass at roughly half that rate, which is why how you practise matters more than how long.",
    sections: [
      {
        h2: "What the pass rates actually say",
        body: [
          "First-time US-educated candidates pass at roughly 88%. Repeat candidates pass at closer to 45%. That gap is the single most useful number in NCLEX prep, and it is not a statement about intelligence — it is a statement about preparation method. People who fail and then repeat the same content review tend to fail again; people who switch to answering questions and reading rationales tend to pass.",
          "So the honest answer to 'how hard is it' is: hard enough that most people pass, and hard enough that the ones who fail usually prepared in a way that could not have worked.",
        ],
      },
      {
        h2: "Why it feels harder than nursing school exams",
        body: [
          "Nursing school rewards recall. The NCLEX rewards ranking. A typical item hands you four actions that a competent nurse would eventually take and asks which one is first — so knowing all four is the starting point, not the answer.",
          "The exam is also adaptive. It keeps raising the difficulty until it is 95% confident about where you sit relative to the passing standard, which means it should feel hard the whole way through. Candidates who report that the test 'felt impossible' are frequently the ones who passed. Feeling comfortable is the signal worth worrying about.",
        ],
      },
      {
        h2: "What Next Gen changed",
        body: [
          "Since April 2023 the exam includes Next Generation NCLEX item types: unfolding case studies with six linked questions, matrix and bowtie items, and partial-credit scoring on some formats. The clinical judgement being measured is not new — the packaging is.",
          "Practically, this means practising six-question case studies rather than only standalone items, because the case studies carry a disproportionate share of the scored content and they punish anyone who has only ever answered questions one at a time.",
        ],
      },
      {
        h2: "How long you actually need",
        body: [
          "Four to six weeks of consistent daily questions is the range most candidates need if they are coming straight out of school. Longer than eight weeks and retention starts working against you; shorter than three and there is not enough time to find and fix your weak categories.",
          "Volume matters less than the review. Seventy-five questions a day that you review carefully beats two hundred that you do not.",
        ],
      },
    ],
    topic: "med-surg",
    readNext: ["four-week-study-plan", "how-to-answer-sata", "test-day-checklist"],
  },
  {
    slug: "next-gen-changes-explained",
    title: "Next Gen changes explained",
    h1: "The Next Generation NCLEX, explained",
    cluster: "before",
    minutes: 7,
    updated: "August 2026",
    shortAnswer:
      "Next Generation NCLEX added unfolding case studies and new item types — matrix, bowtie, highlight, drop-down — and a partial-credit scoring model for them. It did not change the test plan, the categories, or the passing standard. What changed is that the exam now measures clinical judgement in six linked steps instead of one isolated question.",
    sections: [
      {
        h2: "The clinical judgement model",
        body: [
          "Every case study walks the same six steps: recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes. Once you can name the step a question is asking about, the answer set narrows immediately — 'recognize cues' items want findings, 'take action' items want interventions, and mixing the two is the most common way to lose a case study.",
        ],
      },
      {
        h2: "The new item types",
        body: [
          "Matrix items ask you to classify each finding across a grid — expected, unexpected, unrelated. Bowtie items ask for a condition in the centre, two actions on the left, two parameters to monitor on the right. Highlight items ask you to click the relevant text in a chart note. Drop-down cloze items complete a sentence from a menu.",
          "All of them are still testing prioritization. The interface changed; the reasoning did not.",
        ],
      },
      {
        h2: "Partial credit, and what it means for guessing",
        body: [
          "Most Next Gen item types are scored with partial credit — usually +1 for each correct selection and −1 for each incorrect one, with a floor of zero. Classic select-all-that-apply items remain all-or-nothing.",
          "The practical consequence: on a partial-credit item, select what you can defend and stop. Adding a fifth option you are unsure of has a negative expected value.",
        ],
      },
      {
        h2: "How to practise for it",
        body: [
          "Do full case studies, not fragments. A case study you answer in six connected steps builds the habit the exam is scoring; six unrelated questions do not, even if the content is identical.",
        ],
      },
    ],
    topic: "risk-reduction",
    readNext: ["how-hard-is-the-nclex", "how-to-answer-sata", "whats-on-the-test-plan"],
  },
  {
    slug: "whats-on-the-test-plan",
    title: "What's on the test plan",
    h1: "What's on the NCLEX-RN test plan",
    cluster: "before",
    minutes: 5,
    updated: "August 2026",
    shortAnswer:
      "The NCLEX-RN test plan divides every scored item into eight client-need categories. Safe and effective care environment is the largest block at 17–23% for management of care alone; pharmacological and parenteral therapies follows at 13–19%. Knowing the weights tells you where to spend your last two weeks.",
    sections: [
      {
        h2: "The eight categories and their weights",
        body: [
          "Management of care 17–23%. Safety and infection control 9–15%. Health promotion and maintenance 6–12%. Psychosocial integrity 6–12%. Basic care and comfort 6–12%. Pharmacological and parenteral therapies 13–19%. Reduction of risk potential 9–15%. Physiological adaptation 11–17%.",
          "Those ranges are the exam's own, and they are wide on purpose — the adaptive engine picks items to measure you, not to hit a quota exactly.",
        ],
      },
      {
        h2: "What the weights are good for",
        body: [
          "Two things, and only two. First, sequencing: if you have four weeks, the categories worth 13% or more get their own week. Second, triage: a weak category worth 6% is not the emergency a weak category worth 19% is.",
          "What the weights are not good for is skipping. Every category appears on every exam.",
        ],
      },
      {
        h2: "The integrated processes",
        body: [
          "Threaded through all eight categories are nursing process, caring, communication and documentation, teaching and learning, and culture and spirituality. These are not separately weighted, but they explain why so many items that look like med-surg are actually communication items in a med-surg costume.",
        ],
      },
    ],
    topic: "safe-care",
    readNext: ["how-hard-is-the-nclex", "four-week-study-plan", "next-gen-changes-explained"],
  },
  {
    slug: "four-week-study-plan",
    title: "4-week study plan",
    h1: "A 4-week NCLEX study plan, 90 minutes a day",
    cluster: "during",
    minutes: 8,
    updated: "August 2026",
    shortAnswer:
      "Four weeks at 90 minutes a day is enough if the time is spent on questions and rationales rather than content review. Week one diagnoses, weeks two and three drill your two weakest categories, week four runs full-length readiness exams. The plan below assumes roughly 75 questions a day and one rest day a week.",
    sections: [
      {
        h2: "Week 1 — find out where you actually are",
        body: [
          "Start with a diagnostic across all eight categories, then spend the rest of the week on fundamentals and safe and effective care. The goal for week one is not a score, it is a ranked list of your weakest categories that you trust.",
          "Do not study to fix anything yet. Studying before you have a diagnosis is how people spend three weeks on the category they were already good at.",
        ],
      },
      {
        h2: "Week 2 — your weakest category, in depth",
        body: [
          "Take the weakest category from week one and drill it exclusively, 75 questions a day. Read every rationale, including the ones you got right — a lucky correct answer is a wrong answer you have not met yet.",
          "For most candidates this week is pharmacology. If it is, run dosage calculations for the first 15 minutes of every session, before fatigue sets in.",
        ],
      },
      {
        h2: "Week 3 — your second weakest, plus case studies",
        body: [
          "Same structure, second category, with one full unfolding case study every day. By the end of this week the six-step clinical judgement sequence should feel automatic.",
        ],
      },
      {
        h2: "Week 4 — readiness, and stopping",
        body: [
          "Two full-length readiness exams, spaced, with a full review day after each. Then stop. The day before the exam is for sleep and logistics, not for one more question set — cramming the night before measurably lowers scores.",
        ],
      },
    ],
    topic: "pharmacology",
    readNext: ["how-to-answer-sata", "test-day-checklist", "how-hard-is-the-nclex"],
  },
  {
    slug: "how-to-answer-sata",
    title: "How to answer SATA",
    h1: "How to answer select-all-that-apply questions",
    cluster: "during",
    minutes: 5,
    updated: "August 2026",
    shortAnswer:
      "Treat a select-all-that-apply item as separate true-or-false questions, one per option. Decide each option on its own merits against the pathophysiology, never by comparing options to each other, and never by guessing how many should be correct. Classic SATA items carry no partial credit, so one wrong selection costs the whole item.",
    sections: [
      {
        h2: "The one technique that works",
        body: [
          "Cover the other options and ask of each one: is this true for this client, right now? Yes or no. Then move to the next. The instinct to compare options is imported from single-answer items, where it is correct — here it is the main source of errors.",
        ],
      },
      {
        h2: "Why 'three sounds right' is a trap",
        body: [
          "There is no fixed number of correct options. Items with one correct answer and items with five both exist. Any reasoning that starts from an expected count is reasoning about the test-writer instead of the client.",
        ],
      },
      {
        h2: "Scoring, and when to stop selecting",
        body: [
          "Classic SATA is all-or-nothing: five options, four right, zero credit. Some Next Gen formats do give partial credit with a penalty for incorrect selections. In both cases the strategy is the same — select what you can defend, stop there.",
        ],
      },
    ],
    topic: "sata",
    readNext: ["next-gen-changes-explained", "four-week-study-plan", "how-hard-is-the-nclex"],
  },
  {
    slug: "dosage-calculations-without-panic",
    title: "Dosage calc without panic",
    h1: "Dosage calculations without panic",
    cluster: "during",
    minutes: 6,
    updated: "August 2026",
    shortAnswer:
      "Nearly every NCLEX dosage item reduces to two steps: find the concentration, then divide the ordered dose by it. Write the units on every line and cancel them — if the units do not resolve to what the question asked for, the arithmetic is irrelevant. Most wrong answers on these items are decimal errors, not method errors.",
    sections: [
      {
        h2: "One method, used every time",
        body: [
          "Dimensional analysis. Start with what you have, multiply by conversion factors written as fractions, cancel units until only the unit the question asked for is left. It is slower to learn than a memorized formula and it never fails on an unfamiliar item, which is the whole point.",
        ],
      },
      {
        h2: "The four setups that cover most items",
        body: [
          "Tablets: desired ÷ available. IV rate in mL/hour: total volume ÷ hours. Weight-based: dose × kilograms, then divide by concentration. Infusion by units or mcg: find units per mL first, then divide.",
          "Practise until the setup arrives before the arithmetic does. On the exam the setup is where the marks are.",
        ],
      },
      {
        h2: "Rounding and the answer box",
        body: [
          "Read the instruction on rounding and follow it exactly — 'round to the nearest tenth' means a trailing zero matters. Do not round mid-calculation, only at the end, and never write a trailing zero after a decimal point in a documented dose.",
        ],
      },
    ],
    topic: "pharmacology",
    readNext: ["four-week-study-plan", "how-to-answer-sata", "test-day-checklist"],
  },
  {
    slug: "test-day-checklist",
    title: "Test-day checklist",
    h1: "NCLEX test-day checklist",
    cluster: "after",
    minutes: 3,
    updated: "August 2026",
    shortAnswer:
      "Bring one acceptable form of government-issued photo ID whose name matches your Authorization to Test exactly, and arrive 30 minutes early. Everything else is stored in a locker. Candidates who are turned away on test day are almost always turned away for a name mismatch or a late arrival, not for anything academic.",
    sections: [
      {
        h2: "The night before",
        body: [
          "Stop studying. Confirm the test centre address and how long the journey takes at that time of day. Sleep is the only remaining variable you control that still affects your score.",
        ],
      },
      {
        h2: "What to bring",
        body: [
          "Your Authorization to Test, and one valid government-issued photo ID with a signature, where first and last name match the ATT exactly. If you have married or changed your name, resolve the mismatch before test day, not at the desk.",
        ],
      },
      {
        h2: "During the exam",
        body: [
          "You get scheduled breaks; take the first one even if you feel fine, because the fatigue arrives later than you expect. If the exam feels impossibly hard, that is the adaptive engine working correctly — it is not information about whether you are passing.",
        ],
      },
    ],
    topic: "safe-care",
    readNext: ["how-hard-is-the-nclex", "reading-your-result", "four-week-study-plan"],
  },
  {
    slug: "reading-your-result",
    title: "Reading your result",
    h1: "How to read your NCLEX result",
    cluster: "after",
    minutes: 4,
    updated: "August 2026",
    shortAnswer:
      "Official results come from your board of nursing, usually within six weeks and often within a few days. The number of questions you answered tells you nothing reliable about whether you passed — the exam stops when it is 95% confident either way, which can happen at the minimum or the maximum.",
    sections: [
      {
        h2: "The rules that actually determine the outcome",
        body: [
          "The exam ends by one of three rules: the confidence-interval rule, the maximum-length rule, or the run-out-of-time rule. Under the last two, a pass or fail is still possible. So 'it shut off at 85' means only that the engine reached a decision, not which decision.",
        ],
      },
      {
        h2: "If you did not pass",
        body: [
          "You will receive a Candidate Performance Report showing whether you were below, near, or above the passing standard in each category. It is the single most useful study document you will ever get, and it is worth building your entire retake plan from it.",
        ],
      },
    ],
    topic: "safe-care",
    readNext: ["if-you-failed-what-next", "test-day-checklist", "four-week-study-plan"],
  },
  {
    slug: "if-you-failed-what-next",
    title: "If you failed: what next",
    h1: "You did not pass the NCLEX. What now?",
    cluster: "after",
    minutes: 6,
    updated: "August 2026",
    shortAnswer:
      "You can retake the NCLEX after 45 days, and repeat candidates pass at roughly half the first-time rate — mostly because they repeat the same preparation. Start from your Candidate Performance Report, rebuild around questions and rationales rather than content review, and give it six weeks rather than two.",
    sections: [
      {
        h2: "First, the logistics",
        body: [
          "You must wait 45 days between attempts, and re-register and pay again through your board of nursing. Book the date before you start studying — an open-ended retake tends not to happen.",
        ],
      },
      {
        h2: "Read the Candidate Performance Report properly",
        body: [
          "It rates you below, near, or above the passing standard in each category. 'Near' in a heavily weighted category costs you more than 'below' in a light one. Rank the categories by weight × weakness, and study in that order.",
        ],
      },
      {
        h2: "Change the method, not just the hours",
        body: [
          "The most common retake failure is more hours of the same content review. If your first attempt was reading and video lectures, your second should be 75 questions a day with every rationale read. The gap between first-time and repeat pass rates is largely a gap in method.",
        ],
      },
    ],
    topic: "psychosocial",
    readNext: ["reading-your-result", "four-week-study-plan", "how-hard-is-the-nclex"],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

export const CLUSTERS = [
  {
    id: "before" as const,
    label: "Before you start",
    note: "Work out what you are walking into.",
  },
  {
    id: "during" as const,
    label: "While you study",
    note: "Method, plan, and the two formats that decide scores.",
  },
  {
    id: "after" as const,
    label: "Test day and after",
    note: "Logistics, results, and retakes.",
  },
];

/* ---------------------------------------------------------------------- faq */

export type Faq = { q: string; a: string };

export const HUB_FAQ: Faq[] = [
  {
    q: "How many questions are on the NCLEX?",
    a: "The NCLEX-RN is adaptive and ranges from 85 to 150 questions, including 15 unscored pretest items. It ends when the engine is 95% confident you are above or below the passing standard, or when you reach the maximum length or the five-hour limit.",
  },
  {
    q: "Is the NCLEX hard?",
    a: "About 88% of first-time US-educated candidates pass. It is difficult in a specific way: most items give you four defensible answers and ask which comes first, so it tests ranking rather than recall.",
  },
  {
    q: "How many practice questions should I do a day?",
    a: "Around 75 a day for four to six weeks, with every rationale read — including the ones you got right. Reviewing carefully beats volume; 200 questions you do not review teaches you almost nothing.",
  },
  {
    q: "What is a good score on practice questions?",
    a: "Consistently scoring 65% or above across mixed-category sets is the usual signal that you are tracking toward a pass. A single set is noise; look at the trend across at least ten sets.",
  },
  {
    q: "Are these Next Generation NCLEX questions?",
    a: "Yes. Our bank includes unfolding case studies, matrix, bowtie, and select-all-that-apply items alongside standard single-answer questions, matching the item types on the exam since April 2023.",
  },
  {
    q: "Are these questions really free?",
    a: "The 10 questions on this page are free with no account. A free account adds 50 more questions, full rationales, and your weak topics, and it never asks for a card.",
  },
];

export const PRICING_FAQ: Faq[] = [
  {
    q: "What happens if I fail?",
    a: "Email us within 30 days of your result and we will extend your access free until your retake date. We do not advertise a pass guarantee because we have not been running long enough for that promise to mean anything.",
  },
  {
    q: "Can I pause my subscription?",
    a: "Yes. Pause for up to three months from your account settings and keep your progress and review list. Billing stops on the day you pause.",
  },
  {
    q: "Is there a student discount?",
    a: `The price is already set for students, so there is no separate discount. If $${SITE.price} a month is genuinely the barrier, email ${SITE.email} and we will sort something out.`,
  },
  {
    q: "How do I cancel?",
    a: "One button in account settings, no email required, no retention flow. Access continues to the end of the period you have paid for.",
  },
];

export const HOME_FAQ: Faq[] = [
  {
    q: "Are these Next Generation NCLEX questions?",
    a: "Yes — unfolding case studies, matrix, bowtie, and select-all-that-apply items alongside standard single-answer questions, matching the exam as it has been since April 2023.",
  },
  {
    q: "Who writes the questions?",
    a: "Practising registered nurses write every item, and two more RNs review each one against the NCSBN test plan before it goes live. Names and credentials are on the about page.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from account settings, in one click. Access runs to the end of the period you have paid for.",
  },
  {
    q: "How long do I need to study?",
    a: "Four to six weeks at around 90 minutes a day covers most candidates coming straight out of school. Our 4-week plan lays out what to do each week.",
  },
  {
    q: "Do you offer refunds?",
    a: "14 days, no questions asked. Email us and we process it the same day.",
  },
];

/* ------------------------------------------------------------ people, tools */

export const REVIEWERS = [
  {
    name: "Dana Whitfield",
    credentials: "RN, MSN",
    role: "Lead item writer",
    note: "Eleven years med-surg and step-down, four years teaching NCLEX review.",
  },
  {
    name: "Marcus Oyelaran",
    credentials: "RN, BSN",
    role: "Clinical reviewer",
    note: "Emergency and critical care. Reviews every prioritization and safety item.",
  },
  {
    name: "Priya Raghavan",
    credentials: "RN, MSN, CNE",
    role: "Test-plan reviewer",
    note: "Maps each item to the NCSBN plan and signs off on the blueprint weights.",
  },
];

export const TOOLS = [
  { name: "Dosage calculator", note: "Check your setup, not just your answer", href: "/nclex" },
  { name: "Lab values sheet", note: "The 24 values the exam repeats", href: "/nclex" },
  { name: "Test plan breakdown", note: "All eight categories with weights", href: "/guides/whats-on-the-test-plan" },
  { name: "Readiness quiz", note: "2 questions, instant estimate", href: "/signup" },
];
