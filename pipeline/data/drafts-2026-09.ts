/**
 * The fourth wave — the five gaps stage 2 found.
 *
 * Same contract as the three files in src/lib: `shortAnswer` answers the query
 * outright, `sections` argue in the order somebody asks, `faqs` render as
 * visible copy *and* as schema, and `topic` is the question set the guide has
 * to earn its keep by sending readers to.
 *
 * These five were not chosen by feel. Stage 2 ranked twenty-six observed
 * queries against the forty-five guides already in the library and these are
 * what survived the dedupe — see pipeline/data/briefs-run-2026-09-11.json for
 * the scores and the rejections.
 *
 * The rule that governs all of them, and it is the same rule the existing
 * guides follow: where a fact belongs to a regulator rather than to us — a
 * fee, a waiting period, which evaluation service a state accepts, which
 * states are in the compact this month — the guide says to check the board
 * rather than freezing a number that changes without warning. A confidently
 * wrong filing deadline is worse than no guide at all.
 */

import type { Guide } from "@/lib/content";

const UPDATED = "September 2026";
const UPDATED_ISO = "2026-09-11";

export const DRAFT_GUIDES: Guide[] = [
  /* ------------------------------------------------------------------ after
     The licence you get afterwards, and where it does and does not work
  ------------------------------------------------------------------------ */
  {
    slug: "nurse-licensure-compact-states",
    title: "The compact licence, and what passing actually buys you",
    h1: "The nurse licensure compact, explained for someone who has just passed",
    cluster: "after",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Passing the NCLEX does not give you a licence — a state board does, and only one state is your home state. If that state is in the Nurse Licensure Compact and you meet the uniform requirements, it can issue a multistate licence that lets you practise in every other compact state without applying again. If it is not, you hold a single-state licence and every additional state means licensure by endorsement.",
    sections: [
      {
        h2: "Home state is a residency question, not a preference",
        body: [
          "The compact works off your primary state of residence, and that is a legal fact about where you live rather than a box you choose. It is the state on your driver's licence, your tax return, and your voter registration, and boards do check when the answer looks convenient. You cannot hold multistate licences from two states at once, and you cannot keep a multistate licence from a state you have moved away from.",
          "This catches new graduates more than anyone else, because the year after nursing school is the year people move. If you are about to relocate, the order matters: applying in the state you are leaving gets you a licence you will have to transfer within a few weeks of arriving, which is the same paperwork twice and a fee each time.",
        ],
      },
      {
        h2: "What the multistate licence actually covers",
        body: [
          "It covers practice — physical, telehealth, and telephone triage — in any other compact state, on the licence your home state issued. That is genuinely useful and it is the whole reason travel nursing works the way it does. What it does not cover is a state outside the compact, and roughly a fifth of the country, including several of the largest employers of nurses, is outside it.",
          "It also does not override the practice act of the state you are working in. You practise under the rules of the state where the patient is, not the state that issued your licence, and the scope differences between states are real — most visibly in what an RN may delegate and in the rules around controlled substances. The licence travels; the rulebook does not.",
        ],
      },
      {
        h2: "The uniform requirements, and the one that surprises people",
        body: [
          "Every compact state applies the same list: a licence in good standing, graduation from an approved programme, passing the NCLEX-RN or NCLEX-PN, English proficiency where the nursing programme was taught in another language, a federal and state criminal background check with fingerprints, and no disqualifying convictions or active discipline.",
          "The background check is where timelines go. It is a separate process from the licence application, it involves a third party, and in several states it is the single longest step — long enough that candidates who file everything else the week they pass still wait. Start it early. Nothing else on the list is under anyone else's control the way this one is.",
          "The list of participating states is not static. Pennsylvania implemented in July 2025 and Connecticut in October 2025, and more are partway through legislation at any given moment — a state can have passed a compact bill and still not be issuing multistate licences. Check nursys.com for what is live today rather than trusting a map, including this paragraph.",
        ],
      },
      {
        h2: "If your state is not in the compact",
        body: [
          "Then you hold a single-state licence, which is a completely normal thing to hold, and additional states come one at a time through licensure by endorsement — an application to that state's board showing you already hold an unencumbered licence elsewhere. It is slower and it costs a fee per state, but it is not a re-examination. You do not sit the NCLEX again for a second state. You sit the NCLEX once, ever, unless you fail it.",
          "Endorsement is also the route when you have a multistate licence and want to work in a non-compact state. The two systems sit side by side rather than replacing each other, and plenty of nurses end up holding a multistate licence plus one endorsed single-state licence for the place they actually work.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does passing the NCLEX give me a licence?",
        a: "No. It satisfies the examination requirement. The licence is issued by the board of nursing you applied to, after it has also cleared your background check and any remaining documents, and that can take weeks after your result arrives.",
      },
      {
        q: "Can I work in another state right after passing?",
        a: "Only if your home state issued you a multistate licence and the other state is in the compact. Otherwise you need licensure by endorsement in that state first, which is an application rather than another exam.",
      },
      {
        q: "Can I hold multistate licences from two states?",
        a: "No. You get one multistate licence, from your primary state of residence. Additional states are single-state licences by endorsement, and moving home state means transferring rather than accumulating.",
      },
      {
        q: "How many states are in the compact?",
        a: "Roughly forty jurisdictions, and it changes as legislatures act. A state can have passed a compact law and not yet be issuing multistate licences, so check nursys.com rather than a map for what is live today.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "choosing-a-state-board-for-nclex",
      "nclex-results-timeline",
      "reading-your-result",
    ],
  },

  /* ----------------------------------------------------------------- during
     Readiness, and what a predictor score is actually telling you
  ------------------------------------------------------------------------ */
  {
    slug: "hesi-exit-exam-nclex-prediction",
    title: "What your HESI or ATI predictor score really predicts",
    h1: "What a HESI exit or ATI predictor score actually tells you",
    cluster: "during",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A high score is strong evidence you will pass; a low score is weak evidence you will fail. The published validity runs in one direction. Students scoring at or above the HESI benchmark pass the NCLEX at rates above 95%, and an ATI Level 2 carries a predicted pass probability above 90% — but plenty of students below those cut points pass anyway, because the predictors were built to identify who is safe, not to identify who is doomed.",
    sections: [
      {
        h2: "The asymmetry, and why it exists",
        body: [
          "Predictive-validity studies on both instruments report the same shape. Score high and your first-attempt pass rate is in the high nineties. Score low and your pass rate drops — but it drops to something like a coin flip, not to zero. The instruments are good at confirming readiness and much worse at ruling it out.",
          "That is not a flaw, it is what they were built for. A school using an exit exam wants to know which students can safely be sent to the NCLEX now. Getting that call right matters more to a programme's pass rate than correctly sorting the students who still have work to do, so the cut scores are set where the evidence is strongest. Reading a low score as a verdict is reading the instrument backwards.",
        ],
      },
      {
        h2: "What a low score is actually evidence of",
        body: [
          "Usually one of three things, and they need completely different responses. It can be a content gap, which is the good case — it is specific, the report names it, and four weeks of targeted questions closes it. It can be a test-taking problem, where you know the material and keep choosing the reasonable-sounding answer over the credited one, which practice questions with real rationales fix faster than re-reading content ever will. Or it can be the conditions: an exit exam sat in week fifteen of a semester, after finals, on a morning you did not sleep.",
          "The score alone cannot tell you which. The category breakdown can, and it is the part of the report most people skim past on the way to the number. A score that is uniformly mediocre across all categories is a different problem from one that is strong everywhere except pharmacology, and only the second one has an obvious fix.",
        ],
      },
      {
        h2: "It is not the same exam, and the difference matters",
        body: [
          "Neither predictor is adaptive. The NCLEX is — it targets items at the edge of your ability and keeps you there, which is why it feels harder than any practice test you have taken and why feeling terrible afterwards tells you nothing. A fixed-length predictor cannot reproduce that sensation, and it does not try to.",
          "The item mix differs too. Predictors under-represent the newer Next Generation formats relative to what you will meet, partly because those formats are harder to build. If your exit exam contained two bowtie items and no case studies, it has not told you much about how you handle the format that now carries a meaningful share of the scored exam.",
        ],
      },
      {
        h2: "What to do with the number",
        body: [
          "Above the benchmark: book the exam. The most common expensive mistake at this point is delaying — a candidate scores well, decides to spend another two months being certain, and tests ten weeks later slightly worse, because retention decays and the material was already there. Readiness is perishable.",
          "Below it: do not book yet, and do not panic either. Take the category breakdown, spend two to four weeks on questions in the two weakest categories, reading the rationale on every item including the ones you got right, then re-test. That loop moves scores reliably, and it moves them because it is the same skill the NCLEX measures — not recall, but choosing between four defensible-looking actions.",
        ],
      },
    ],
    faqs: [
      {
        q: "What HESI score means I will pass the NCLEX?",
        a: "Studies commonly use 850 as the benchmark, with first-attempt pass rates above 95% at or beyond it. It is strong evidence of readiness, not a guarantee, and your school may set its own cut score higher.",
      },
      {
        q: "I failed my exit exam. Will I fail the NCLEX?",
        a: "Not necessarily. A low score predicts much less reliably than a high one — a substantial share of students below the benchmark still pass. Treat it as a signal to work on specific categories, not as a verdict.",
      },
      {
        q: "Is the HESI harder than the NCLEX?",
        a: "It is different rather than harder. The NCLEX is adaptive, so it holds you near the limit of what you can answer and feels harder throughout regardless of how you are doing. A fixed-length predictor cannot reproduce that.",
      },
      {
        q: "How long should I wait to test after a low predictor score?",
        a: "Two to four weeks of targeted question practice in your weakest categories, then re-assess. Longer than that and you start losing the content you already had.",
      },
    ],
    topic: "med-surg",
    readNext: [
      "how-many-practice-questions-before-nclex",
      "nclex-scoring-explained",
      "two-week-nclex-study-plan",
    ],
  },

  /* ----------------------------------------------------------------- during
     The fastest-rising study-method query, answered honestly
  ------------------------------------------------------------------------ */
  {
    slug: "using-chatgpt-to-study-for-the-nclex",
    title: "Using AI to study for the NCLEX, honestly",
    h1: "Using ChatGPT and other AI to study for the NCLEX",
    cluster: "during",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Good for explaining something you already half-know, bad for generating practice questions. A general chatbot answers what is clinically reasonable, and the NCLEX frequently credits the nursing action over the medically correct one — so it will confidently recommend ordering a troponin when the credited answer was to assess the client. Use it to unstick yourself on a concept; do not use it as a question bank.",
    sections: [
      {
        h2: "The specific way it gets NCLEX items wrong",
        body: [
          "It is not random hallucination, which is what most warnings about AI focus on. It is a systematic bias, and once you have seen it you cannot unsee it: a general model trained on medical text answers the question a clinician would answer. The NCLEX is not testing whether you know what should happen to the patient. It is testing what the nurse does next, within the nurse's scope, with the information currently available.",
          "So the model recommends ordering the lab, starting the drug, or calling for the scan — actions that are medically sound and outside an RN's independent scope, which on the exam makes them distractors. Studies evaluating chatbots against NCLEX-style items find they perform respectably on knowledge recall and much worse on exactly this class of judgement item, which is the class that decides most scores.",
          "The second failure is subtler and worse: the rationale is fluent. A wrong answer with a confident, well-written explanation teaches you a wrong rule, and you will carry it into the exam with more conviction than if you had never asked.",
        ],
      },
      {
        h2: "What it is genuinely good at",
        body: [
          "Explaining a mechanism you have already met and not quite got. Why does furosemide drop potassium, why does a chin tuck protect the airway, what is actually happening in DKA — these are well-covered in the training data, the answers are checkable against your own notes, and having it explained four different ways until one lands is something no textbook does.",
          "It is also good at the things around studying rather than the studying itself: turning a messy list into a schedule, generating mnemonics, drafting a plan for the next fortnight, or rephrasing a rationale you read six times and did not absorb. Low stakes, easily verified, no clinical judgement involved.",
          "And it is good as a tutor on a question you have already answered, with the real rationale in front of you. Paste the item and the credited answer and ask why the one you picked was wrong. You are using it to explain a known-correct answer rather than to produce one, which removes the failure mode entirely.",
        ],
      },
      {
        h2: "The rule that keeps you safe",
        body: [
          "Never let it be the source of truth for what the right answer is. Ask it to explain an answer you already have from a reviewed bank, a textbook, or your instructor. The moment it is generating both the question and the answer, nothing in the loop can catch an error, and the errors are not obvious — they are plausible, well-written, and wrong in the direction your clinical instinct already leans.",
          "If you want a sense of how far this goes: ask it for ten NCLEX-style prioritization items, then check them against the ABC and Maslow ordering you already know. A reliable fraction will have a credited answer that is the most medically urgent rather than the one a nurse does first, and a few will have two defensible answers with no way to choose — which is the one thing a real item is never allowed to have.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can ChatGPT write good NCLEX practice questions?",
        a: "Not reliably. It tends to credit the clinically reasonable action, which on the NCLEX is often the physician's action and therefore wrong, and it sometimes writes items with two defensible answers. Use a reviewed bank for questions and AI for explanations.",
      },
      {
        q: "Is it safe to use AI to study for the NCLEX at all?",
        a: "Yes, for explaining concepts and rationales you already have a verified answer for. The risk comes from letting it generate both the question and the credited answer, where nothing in the loop can catch a confident mistake.",
      },
      {
        q: "Why does AI get prioritization questions wrong?",
        a: "It answers what is medically correct rather than what the nurse does next. Prioritization items test scope and sequence — assess before intervene, airway before circulation — and a model optimised on clinical text does not reliably reproduce that ordering.",
      },
      {
        q: "What is the best way to use AI for nursing school?",
        a: "As a tutor on answers you already have. Paste a question you got wrong along with the official rationale and ask it to explain why your choice failed. That plays to what it is good at and removes the part it is bad at.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "abcs-maslow-and-the-nursing-process",
      "prioritization-and-delegation-questions",
      "how-many-practice-questions-before-nclex",
    ],
  },

  /* ----------------------------------------------------------------- before
     Completing the internationally educated set
  ------------------------------------------------------------------------ */
  {
    slug: "nclex-for-nigerian-nurses",
    title: "The NCLEX for Nigerian nurses",
    h1: "The NCLEX for Nigerian nurses",
    cluster: "before",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "The exam is the same one every US candidate sits. What stands between you and it is a state board: verification of your licence from the NMCN, a credentials evaluation showing your NANNM-era training matches a US programme, and — despite English being the language of Nigerian nursing education — an English proficiency test for most boards. Only once the board approves you does Pearson VUE issue the Authorization to Test.",
    sections: [
      {
        h2: "Choose the board before you do anything else",
        body: [
          "Every requirement below is set by the state board you apply to, not by NCSBN and not by Pearson VUE, and they differ enough that the choice is the single most consequential decision in the process. Boards vary on which credentials evaluation service they accept, whether they require the full CGFNS Certification Programme or only a credentials evaluation report, whether they will waive English proficiency, and how long they take.",
          "Pick the board first and read its own page rather than a summary, then work backwards. Candidates who pick a state because a friend used it, and discover four months in that it requires a service they did not order, lose the whole timeline — the documents are not transferable between evaluation services.",
        ],
      },
      {
        h2: "The English requirement, which is the part that stings",
        body: [
          "English is Nigeria's official language and the medium of instruction in Nigerian nursing programmes. Most US boards still require IELTS Academic, TOEFL iBT, or OET anyway, because the rule is written around the country the education was received in rather than around the language it was taught in.",
          "A small number of boards do exempt graduates of English-medium programmes, and that exemption is worth actively looking for because it removes a test, a fee, and several weeks. It is also worth confirming directly with the board rather than from a forum post — these exemptions change, and they are exactly the kind of detail that is out of date everywhere except the board's own page.",
        ],
      },
      {
        h2: "NMCN verification and the evaluation report",
        body: [
          "Your licence has to be verified by the Nursing and Midwifery Council of Nigeria directly to the US board or to the evaluation service, and your school has to confirm your transcript. Neither is something you can hurry from outside, and both are where months go — not the exam, and not the studying.",
          "The evaluation report compares your programme against a US registered nurse programme hour by hour, including theory and supervised clinical hours across adult, paediatric, maternal-newborn, and psychiatric-mental health nursing. Nigerian programmes generally map well, but a candidate whose training was split across institutions, or who qualified through a route that has since changed, should expect questions and should assemble every record they can before starting rather than after being asked.",
          "Start these two the day you decide, before you plan any studying at all. They can run in the background for your entire preparation, and the candidates who finish preparing and then wait ten weeks are almost always the ones who filed in the wrong order.",
        ],
      },
      {
        h2: "Where you sit it, and what passing does not do",
        body: [
          "You can test at a Pearson VUE international centre rather than travelling to the United States. The exam, the scoring, and the result are identical; an international scheduling surcharge applies. Where you sat it has no bearing on your licence, which comes from the board you applied to.",
          "Passing is also not the last step, and it is worth knowing that now rather than in six months. Working in the US involves a separate immigration process, usually including a VisaScreen certificate — which has its own credentials review, its own English requirement, and its own queue. Understanding that timeline early changes how you sequence everything else.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do Nigerian nurses need IELTS for the NCLEX?",
        a: "Most state boards require IELTS, TOEFL iBT, or OET from Nigerian-educated candidates even though nursing education in Nigeria is in English. A few boards exempt graduates of English-medium programmes — confirm with the specific board, because it varies and it changes.",
      },
      {
        q: "Do I need CGFNS certification to take the NCLEX?",
        a: "It depends on the state. Some boards require the full CGFNS Certification Programme, some accept a credentials evaluation report alone, and some accept other services. The board you apply to decides, so choose it before ordering anything.",
      },
      {
        q: "Can I take the NCLEX in Nigeria?",
        a: "Pearson VUE operates international test centres, and you do not need to travel to the US to sit the exam. An international scheduling surcharge applies and the licence still comes from the US state board you applied to.",
      },
      {
        q: "How long does the process take for a Nigerian nurse?",
        a: "The exam is the short part. Expect the timeline to be set by NMCN verification, your school's transcript confirmation, and the evaluation report — months rather than weeks, and largely outside your control once submitted.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "credentials-evaluation-for-nclex",
      "english-proficiency-for-nclex",
    ],
  },

  /* ----------------------------------------------------------------- before
     The process nobody writes for candidates
  ------------------------------------------------------------------------ */
  {
    slug: "nclex-testing-accommodations",
    title: "Requesting NCLEX testing accommodations",
    h1: "How to request testing accommodations for the NCLEX",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "You request accommodations from your board of nursing, not from Pearson VUE, and the approval has to appear on your Authorization to Test before you schedule. Book a seat first and the accommodation does not follow you to it. Once approved you must schedule by phone — the online booking route cannot carry an accommodation — and the whole process adds weeks, so it starts when you register rather than after.",
    sections: [
      {
        h2: "The ordering, which is where this goes wrong",
        body: [
          "There is one sequence and deviating from it costs you the accommodation. Register with Pearson VUE and apply to your board. Submit the accommodation request to the board with its documentation. Wait for the board to approve it and for it to be listed on the Authorization to Test. Then, and only then, telephone Pearson VUE to schedule.",
          "Candidates lose accommodations by scheduling as soon as the ATT arrives, which is the normal advice for everyone else and is wrong here. Nothing is provided at the test centre unless it was granted and recorded before the appointment was made. There is no discretion at the door, and the staff at the centre cannot fix it — they are administering a national exam under fixed rules, not making a judgement about a reasonable request.",
        ],
      },
      {
        h2: "What the documentation has to establish",
        body: [
          "Three things, and each is a separate piece of evidence. A diagnosis from a qualified professional who has actually treated you. That the condition substantially limits a major life activity — the ADA test, which is about functional impact rather than the diagnosis alone. And that the specific accommodation you are asking for addresses that impact.",
          "Most boards also want evidence that you received accommodations during your nursing programme, usually a letter from the dean or disability office. This is the item that most often delays a request, because it has to come from the school rather than from you and schools are slow in the summer. Ask for it the week you decide to request, not the week you file.",
          "Requirements genuinely differ by state — some boards use their own form, some require medical records to be released directly, some have a stated processing window and some do not. Read your board's accommodation page rather than a general summary, including this one.",
        ],
      },
      {
        h2: "What can be granted",
        body: [
          "The common ones are additional testing time, additional or extended breaks, a separate testing room, a reader or a scribe, a sign language interpreter, and permission to bring in items otherwise prohibited — food, medication, glucose monitoring equipment. Physical access adjustments are handled as a matter of course.",
          "Extra time is worth thinking about carefully rather than requesting by default. The NCLEX is adaptive and most candidates do not run out of clock, so for many people extended breaks or a separate room addresses the real problem better than time does. Ask for what actually helps you, and say why in the request — a specific request tied to a documented impact is both more likely to be granted and more useful when it is.",
        ],
      },
      {
        h2: "Timing it",
        body: [
          "Treat the accommodation request as the longest item on the list and start it first, at the same time as registering. Between assembling documentation, the school letter, board review, and the ATT being issued with the accommodation recorded, several weeks is normal and longer is common.",
          "If your ATT arrives and the accommodation is not listed on it, do not schedule. Contact the board. An ATT has a validity window and it is uncomfortable to watch it run down, but scheduling without the accommodation recorded means sitting the exam without it — and a failed attempt costs a re-registration, a new fee, and a waiting period.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who approves NCLEX accommodations?",
        a: "Your board of nursing, working with NCSBN. Pearson VUE administers what the board has already granted and cannot approve a request itself, which is why the request goes to the board at registration time.",
      },
      {
        q: "Can I schedule the NCLEX online with accommodations?",
        a: "No. Approved accommodations have to be scheduled by telephone with Pearson VUE — the online booking route cannot carry them, and booking online is how candidates end up at a centre without the accommodation they were granted.",
      },
      {
        q: "How long do NCLEX accommodations take to approve?",
        a: "Several weeks is typical and it varies by board. The documentation, especially a letter from your nursing programme, is usually the slow part rather than the board's own review.",
      },
      {
        q: "What if my accommodation is not on my ATT?",
        a: "Do not schedule. Contact your board. Nothing is provided at the test centre unless it was granted and recorded before the appointment was made, and there is no way to add it on the day.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "how-to-register-for-the-nclex",
      "choosing-a-state-board-for-nclex",
      "test-day-checklist",
    ],
  },
];
