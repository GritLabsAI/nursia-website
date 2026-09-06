/**
 * The third wave of guides — written against what people are actually
 * searching for in late 2026.
 *
 * Two things drove the topic list rather than a keyword tool:
 *
 * - **The 2026 test plan.** NCSBN published a revised NCLEX-RN test plan that
 *   took effect on 1 April 2026. Almost nothing about the exam changed, which
 *   is itself the story: every prep site is selling the rewrite as an upheaval,
 *   and a candidate who reads that spends money re-learning content that never
 *   moved. One guide says plainly what changed and what did not.
 * - **Internationally educated nurses.** A large share of NCLEX candidates
 *   trained in the Philippines, India, and Nigeria, and their hardest problem
 *   is not pharmacology — it is credentials evaluation, English proficiency,
 *   and picking a board of nursing. Nobody writes that down honestly because
 *   there is no course to sell at the end of it.
 *
 * Same contract as the other two files: `shortAnswer` answers the query
 * outright, `sections` argue in the order somebody asks, `faqs` render as
 * visible copy *and* schema, and `topic` is the question set the guide has to
 * earn its keep by sending readers to.
 *
 * Where a fact is a regulator's rather than ours — fees, waiting periods, which
 * evaluation service a state accepts — the guide says to check the board rather
 * than freezing a number that changes without warning. A confidently wrong
 * filing deadline is worse than no guide at all.
 */

import type { Guide } from "./content";

const UPDATED = "September 2026";
const UPDATED_ISO = "2026-09-06";

export const TREND_GUIDES: Guide[] = [
  /* ------------------------------------------------------------------------
     BEFORE — the 2026 plan, and the internationally educated route
  ------------------------------------------------------------------------ */
  {
    slug: "2026-nclex-test-plan-changes",
    title: "What changed in the 2026 NCLEX test plan",
    h1: "What actually changed in the 2026 NCLEX test plan",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Very little. The 2026 NCLEX-RN test plan took effect on 1 April 2026 and renamed two things — 'Safety and Infection Control' became 'Safety and Infection Prevention and Control', and 'substance abuse' became 'substance misuse' — and added an activity statement about unbiased care and equal access. The eight category percentages, the adaptive engine, the item types, and the passing standard are all unchanged.",
    sections: [
      {
        h2: "The three changes, in full",
        body: [
          "First, a category was renamed. 'Safety and Infection Control' is now 'Safety and Infection Prevention and Control', which moves the emphasis to stopping an infection rather than containing one. Second, 'substance abuse' became 'substance misuse' across the activity statements, matching how the language is used clinically and dropping a word that carries blame. Third, a statement was added covering unbiased nursing care and equal access to care.",
          "That is the list. The percentage ranges for all eight client-need categories did not move. The activity statements underneath them are otherwise intact. The computerized adaptive algorithm is the same algorithm, and the Next Generation item types — case studies, bowtie, matrix, cloze, extended multiple response — are the same item types, scored the same way.",
        ],
      },
      {
        h2: "What it means for what you study",
        body: [
          "Nothing structural. If you were preparing for the NCLEX in March 2026 you are preparing for the NCLEX now, and any material that tells you a syllabus was overhauled is selling you a second copy of something you already own.",
          "The renames do carry a small hint about emphasis. Prevention-first phrasing rewards the answer that stops the exposure rather than the one that manages it once it has happened — hand hygiene and correct precautions before the isolation cart. And 'misuse' language shows up in psychosocial items, where the credited answer is nearly always the non-judgemental one.",
        ],
      },
      {
        h2: "The one thing worth re-reading",
        body: [
          "The new statement on unbiased care and equal access is the only genuinely new content, and it sits in a category people under-study because it feels like common sense. It is not common sense on an exam — it is a set of specific expected behaviours: care that does not vary with a client's background, an interpreter rather than a family member translating, and a plan that accounts for what a client can actually access rather than what is ideal.",
          "Those items are answerable if you have met them once and quietly difficult if you have not, because the wrong answers are all reasonable-sounding shortcuts. Practise a handful rather than reading about them.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the 2026 NCLEX harder than before?",
        a: "No. The passing standard, the adaptive algorithm, and the category percentages are unchanged. The 2026 test plan renamed two things and added one activity statement about unbiased care.",
      },
      {
        q: "When did the 2026 NCLEX test plan take effect?",
        a: "1 April 2026. Anyone testing on or after that date sits under it, and there is no separate registration or preparation step involved.",
      },
      {
        q: "Do I need new study material for the 2026 test plan?",
        a: "No. Material written for the Next Generation NCLEX is still current. The one gap worth filling is the new statement on unbiased care and equal access, which sits in safe and effective care.",
      },
    ],
    topic: "safe-care",
    readNext: ["whats-on-the-test-plan", "next-gen-changes-explained", "nclex-pass-rates"],
  },

  {
    slug: "nclex-for-internationally-educated-nurses",
    title: "The NCLEX for internationally educated nurses",
    h1: "The NCLEX for internationally educated nurses",
    cluster: "before",
    minutes: 8,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "The exam is identical wherever you trained. The difference is everything before it: a board of nursing must approve you, which usually means a credentials evaluation showing your degree matches a US programme, proof of English proficiency, and a licence verification from your home regulator. Only once the board approves does Pearson VUE issue the Authorization to Test that lets you book a seat.",
    sections: [
      {
        h2: "The order things happen in",
        body: [
          "Pick a board of nursing first. You apply for licensure to one US state, and that board — not NCSBN, not Pearson VUE — decides whether you are eligible to test. Then register with Pearson VUE and pay the exam fee. Then submit whatever the board asks for: a credentials evaluation, English proficiency scores, licence verification from your home country, fingerprints or a background check in most states.",
          "When the board is satisfied it makes you eligible, and Pearson VUE emails an Authorization to Test with a validity window. You schedule inside that window. Registering with Pearson VUE before the board approves you is normal and expected — the two run in parallel — but the ATT only arrives after the board acts, and the fee does not reserve you a date.",
        ],
      },
      {
        h2: "Where the months actually go",
        body: [
          "Not the exam. The delay is documents moving between institutions: your nursing school confirming a transcript, your home regulator confirming a licence, an evaluation service assembling a report. Anything requiring a third party to post something is where a timeline of weeks turns into a timeline of months, and it is largely outside your control once submitted.",
          "What is inside your control is starting the slowest item first. Request the credentials evaluation and the licence verification before you worry about study plans; they can be running in the background for the whole of your preparation. Candidates who study first and file later routinely finish preparing and then wait ten weeks, by which point some of it has gone.",
        ],
      },
      {
        h2: "Testing outside the United States",
        body: [
          "You do not need to travel to the US to sit the exam. Pearson VUE runs international NCLEX centres in a number of countries, and the exam, the fee structure, and the result are the same wherever you sit it. An international scheduling surcharge applies at non-US centres.",
          "Sitting it abroad has no effect on your licence — the licence comes from the state board you applied to, not from the building you tested in. Working in the US afterwards is a separate immigration question, usually involving a VisaScreen certificate, and it is worth understanding that timeline before you assume passing is the last step.",
        ],
      },
      {
        h2: "The part that is genuinely different about the questions",
        body: [
          "Nursing practice varies by country, and the NCLEX tests the American version. Delegation to unlicensed assistive personnel, the scope boundary between an RN and an LPN, calling the provider rather than acting, and a heavy emphasis on client autonomy and documented consent are the four areas where an experienced nurse trained elsewhere loses marks — not because the nursing is worse, but because the correct answer at home is a distractor here.",
          "This is why experienced international nurses sometimes score below new graduates on practice sets and find it demoralising. It is not a knowledge gap. It is a jurisdiction gap, and it closes fast once you have met thirty delegation items and read why each answer wins.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I take the NCLEX outside the United States?",
        a: "Yes. Pearson VUE operates international test centres in several countries, with an international scheduling surcharge. The exam and the result are identical, and your licence still comes from the US state board you applied to.",
      },
      {
        q: "Do I need a credentials evaluation for the NCLEX?",
        a: "Almost always, if you trained outside the US. Which report your board accepts varies — some states require the CGFNS Professional Report specifically, others accept alternatives — so confirm with your board before paying for one.",
      },
      {
        q: "How long does the whole process take for an international nurse?",
        a: "Usually several months, and almost all of it is document handling rather than the exam. Start the credentials evaluation and licence verification first, since they are the slowest steps and can run while you study.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "credentials-evaluation-for-nclex",
      "choosing-a-state-board-for-nclex",
      "how-to-register-for-the-nclex",
    ],
  },

  {
    slug: "credentials-evaluation-for-nclex",
    title: "Credentials evaluation for the NCLEX (CGFNS and CES)",
    h1: "Credentials evaluation: what a board actually wants",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A credentials evaluation is a report that tells a US board of nursing whether your nursing education is comparable to a US programme — course by course, clinical hours included. Most boards require one from an internationally educated applicant. Which service they accept varies by state: several require the CGFNS Professional Report specifically, and others accept alternatives such as IERF.",
    sections: [
      {
        h2: "What the report contains",
        body: [
          "An evaluation service takes your transcripts and your licence verification, checks them against the issuing institution directly, and produces a report mapping your programme onto US expectations: theory hours and clinical hours in each of the required areas, whether your degree is comparable, and whether your home licence is current and unencumbered.",
          "The clinical hours are the part that fails people. Some programmes are strong on theory and light on supervised practice in one required area — often obstetrics or psychiatric nursing — and a board can find you deficient on that alone. Finding this out early is worth the fee by itself, because a deficiency can sometimes be remedied, and it cannot be remedied at all if you learn about it after nine months of waiting.",
        ],
      },
      {
        h2: "Choosing the service before you pay",
        body: [
          "Do not buy the evaluation and then choose a state. Boards differ: several require the CGFNS Professional Report and will not take a substitute, while others accept a wider set of services, and IERF's nursing evaluation covers only a handful of countries including Canada, India, Mexico, and the Philippines.",
          "So the order is: shortlist your state, read that board's page on internationally educated applicants, then order exactly the report it names. A report from the wrong service is not partially useful — it is a few hundred dollars and several weeks spent again.",
        ],
      },
      {
        h2: "How to make it fast",
        body: [
          "Every delay in this process is a document arriving from an institution that has no stake in your timeline. Request transcripts and licence verification the day you decide on a state. Give your school the exact form and the exact address, follow up in writing after two weeks, and keep a copy of everything you send.",
          "Names cause more trouble than anything else. If your name on your transcript, your licence, your passport, and your Pearson VUE registration do not match character for character, expect a hold. Sort out marriage-name and transliteration differences at the start, with whatever affidavit your board asks for, rather than discovering the mismatch at the ATT stage.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is CGFNS required for the NCLEX?",
        a: "It depends on the state. Some boards require the CGFNS Professional Report specifically; others accept alternative evaluation services. Check your chosen board's requirements before ordering any report.",
      },
      {
        q: "How long does a credentials evaluation take?",
        a: "Commonly a few months, driven almost entirely by how quickly your school and home regulator return verification. The service cannot start assembling until those arrive, so request them first.",
      },
      {
        q: "What if my programme is short on clinical hours?",
        a: "The board decides. Some deficiencies can be remedied with additional coursework or supervised practice; others cannot. Ordering the evaluation early is what gives you time to do anything about it.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "choosing-a-state-board-for-nclex",
      "english-proficiency-for-nclex",
    ],
  },

  {
    slug: "english-proficiency-for-nclex",
    title: "English proficiency requirements for the NCLEX",
    h1: "English proficiency: who has to prove it, and how",
    cluster: "before",
    minutes: 5,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Many boards of nursing require internationally educated applicants to prove English proficiency with a test such as IELTS, TOEFL, or TOEIC, and some waive it if your nursing programme was taught and examined in English. The waiver is board-specific — and it does not carry over to VisaScreen, which is a separate immigration requirement with its own English rules.",
    sections: [
      {
        h2: "Two separate requirements that get confused",
        body: [
          "Licensure and immigration ask for English separately. Your board of nursing may require it to make you eligible to test; CGFNS asks for it again as part of a VisaScreen certificate if you intend to work in the US on a visa. The scores each accepts, and the exemptions each allows, are not the same.",
          "This catches people trained in the Philippines and India in particular, where instruction is in English. A board may accept that as an exemption. VisaScreen generally does not, so a nurse who was correctly told they were exempt at licensure meets the requirement again later, usually at the worst moment.",
        ],
      },
      {
        h2: "Which test, and what to aim for",
        body: [
          "IELTS Academic, TOEFL iBT, and TOEIC are the common ones, with the specific minimum set by the body asking. Spoken-English components are usually scored separately with their own floor, which is the part people fail — an overall score that clears the bar can still be rejected on the speaking sub-score alone.",
          "Check the required minimums on the actual board or CGFNS page, on the day, rather than in a forum post. They move, and a score that was sufficient two years ago is a common reason for a rejected file.",
        ],
      },
      {
        h2: "Timing it so it does not expire",
        body: [
          "English test results have a validity window, commonly around two years, and the clock starts at the test date rather than at submission. Sitting the English exam very early in a long credentialing process is the classic mistake: it can expire while your transcripts are still moving, and you pay and sit again.",
          "The sensible order is to start the credentials evaluation first, because it is the slowest and least predictable, and book the English test once that is genuinely in motion.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need IELTS for the NCLEX if I studied in English?",
        a: "Sometimes not, for licensure — several boards waive the requirement when your nursing programme was taught and examined in English. That waiver usually does not apply to VisaScreen for immigration purposes.",
      },
      {
        q: "How long are English test scores valid?",
        a: "Commonly about two years from the test date, though the body asking sets the rule. Because credentialing can take months, sitting the English test too early risks it expiring before your file is complete.",
      },
      {
        q: "Is the NCLEX itself harder in a second language?",
        a: "The exam is written in plain clinical English, but the stems are long and the distractors turn on single qualifying words like 'first', 'best', or 'except'. Practising full-length sets matters more than vocabulary drilling.",
      },
    ],
    topic: "fundamentals",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "credentials-evaluation-for-nclex",
      "nclex-for-filipino-nurses",
    ],
  },

  {
    slug: "choosing-a-state-board-for-nclex",
    title: "Choosing a state board of nursing for the NCLEX",
    h1: "Which state board should you apply to?",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "The board you apply to decides your eligibility, what documents you need, and how long you wait — but not the exam, which is identical everywhere. Choose on three things: what that board requires of internationally educated applicants, how quickly it processes them, and whether it is a Nurse Licensure Compact state, which decides whether your licence works in one state or many.",
    sections: [
      {
        h2: "What actually differs between boards",
        body: [
          "Three things. Which credentials evaluation report they accept, whether they require a social security number before issuing a licence, and how long they take. Processing time for internationally educated applicants varies enormously — some boards are known for moving quickly, while the largest states are slower simply because of volume.",
          "The exam does not differ at all. There is no easier state, no state with a lower passing standard, and no advantage to be found in the choice beyond paperwork and time.",
        ],
      },
      {
        h2: "The compact question",
        body: [
          "The Nurse Licensure Compact lets a nurse whose primary state of residence is a compact state hold one multistate licence valid across all of them. If you will live and work in the US, this is worth understanding before you apply, because it is tied to residency rather than to where you were licensed.",
          "If you are outside the US, you generally cannot hold a multistate licence yet, and you will be issued a single-state licence. That is fine — it is normal, and it can be converted or endorsed later once you are resident.",
        ],
      },
      {
        h2: "Applying somewhere you do not intend to work",
        body: [
          "It is legal and common to be licensed in one state and work in another, through licensure by endorsement. But endorsement costs another fee, another wait, and sometimes another set of documents, so choosing a fast board purely to test sooner can cost more time than it saves.",
          "The reasonable rule: apply to the state you actually intend to work in, unless its documented processing time is materially worse and you have a job offer that will not wait. Then read that one board's international applicant page end to end before spending anything.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the NCLEX easier in some states?",
        a: "No. The exam, the adaptive algorithm, and the passing standard are national and identical everywhere. States differ only in eligibility paperwork and processing speed.",
      },
      {
        q: "Do I need a social security number to take the NCLEX?",
        a: "Some boards require one before issuing a licence, and a few before eligibility. Others do not. It is one of the first things to check, because it can rule a state out entirely for an applicant living abroad.",
      },
      {
        q: "Can I work in another state after passing?",
        a: "Yes, through licensure by endorsement, or immediately across compact states if you hold a multistate licence and reside in a compact state. Endorsement means another application, fee, and wait.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "how-to-register-for-the-nclex",
      "credentials-evaluation-for-nclex",
    ],
  },

  {
    slug: "nclex-for-filipino-nurses",
    title: "The NCLEX for Filipino nurses",
    h1: "The NCLEX for Filipino nurses",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A PRC-licensed Filipino nurse takes the same NCLEX as everyone else. The route runs through a US board of nursing: a credentials evaluation of your BSN, verification of your PRC licence, English proficiency where required, and then an Authorization to Test. You can sit the exam at a Pearson VUE centre in the Philippines without travelling to the US.",
    sections: [
      {
        h2: "The route, in order",
        body: [
          "Choose a state board and read its internationally educated applicant page. Order the credentials evaluation it names. Request PRC licence verification and your transcript of records from your school early — these are the slow parts. Register and pay Pearson VUE. When the board approves you, the ATT arrives and you can schedule, including at a Philippine test centre.",
          "Everything here is administratively ordinary and slow. The only genuine trap is ordering an evaluation report your chosen board does not accept, which is a wasted fee and a wasted month.",
        ],
      },
      {
        h2: "Where Philippine-trained nurses lose marks",
        body: [
          "Not on clinical knowledge, which is generally strong, and not on pharmacology. The gap is in American scope and delegation: what an RN may hand to unlicensed assistive personnel, what an LPN may not accept, and when the correct action is to notify the provider rather than to act competently and independently.",
          "The second gap is autonomy. Items where a client refuses a treatment, wants to leave, or asks for information the family would rather withhold have a consistent American answer — the client decides, and the nurse documents and informs. Practise these deliberately; the reasoning is learnable in an evening and it recurs across the whole exam.",
        ],
      },
      {
        h2: "English, and the VisaScreen sting",
        body: [
          "Your nursing programme was taught in English, and several boards will waive their English requirement on that basis. Do not assume that settles it: VisaScreen, which you will need to work in the US on a visa, applies its own English rules and generally does not treat English-medium instruction in the Philippines as an exemption.",
          "Plan for the English test as a probable cost even if your board waives it, and check the current accepted tests and minimum sub-scores on the CGFNS page rather than a group chat.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I take the NCLEX in the Philippines?",
        a: "Yes. Pearson VUE operates international test centres there. The exam and result are identical to sitting it in the US, with an international scheduling surcharge, and your licence still comes from your chosen state board.",
      },
      {
        q: "Do Filipino nurses need IELTS for the NCLEX?",
        a: "Some boards waive it for English-medium programmes; others do not. VisaScreen usually requires it regardless, so treat it as likely rather than optional if you intend to work in the US.",
      },
      {
        q: "Is the NCLEX harder than the Philippine licensure exam?",
        a: "Different, rather than harder. The NLE rewards recall across a broad syllabus; the NCLEX rewards choosing between four defensible actions under American scope rules. Experienced nurses often find the delegation items hardest.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "prioritization-and-delegation-questions",
      "english-proficiency-for-nclex",
    ],
  },

  {
    slug: "nclex-for-indian-nurses",
    title: "The NCLEX for Indian nurses",
    h1: "The NCLEX for Indian nurses",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "An Indian-trained nurse with a GNM or BSc Nursing qualification sits the same NCLEX as everyone else. The work is in the approval: a credentials evaluation of your programme, verification from your State Nursing Council and the Indian Nursing Council, English proficiency where the board requires it, and then an Authorization to Test from Pearson VUE. Test centres operate in India.",
    sections: [
      {
        h2: "GNM, BSc, and what boards do with each",
        body: [
          "A four-year BSc Nursing is generally evaluated as comparable to a US bachelor's-level programme and is the smoothest route. A GNM diploma is assessed on its content rather than its name, and outcomes vary by board — some accept it, some find deficiencies in specific clinical areas, and some will not consider it at all.",
          "If you hold a GNM, that single question decides which state you should apply to, and it should be settled before you spend anything. Read the board's own page and, if it is ambiguous, ask the board in writing and keep the reply.",
        ],
      },
      {
        h2: "Verification from two councils",
        body: [
          "Most evaluations need your State Nursing Council registration verified and, depending on the report, confirmation involving the Indian Nursing Council, plus transcripts direct from your college. All three move at their own pace, and none of them are quick.",
          "Start them the day you choose a state. Send the exact form the service asks for, follow up in writing, and keep copies. Candidates who begin these after finishing their study plan routinely wait months with nothing to do but stay revised.",
        ],
      },
      {
        h2: "What is different about the questions",
        body: [
          "The clinical content will be familiar. What will not be is delegation and scope — which tasks an RN can hand to unlicensed assistive personnel, and where the line sits between an RN and an LPN — because the American staffing model is not the Indian one and the correct answer follows the American model.",
          "Two more habits to unlearn: acting competently within your own judgement where the credited answer is to notify the provider, and involving the family where the credited answer is to ask the client. Neither reflects worse nursing. They are jurisdiction, and thirty practice items with rationales fix them.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I take the NCLEX in India?",
        a: "Yes. Pearson VUE runs international NCLEX centres in India. The exam and result are identical to sitting it in the US, with an international scheduling surcharge, and the licence comes from your chosen state board.",
      },
      {
        q: "Is a GNM diploma enough for the NCLEX?",
        a: "It depends entirely on the board of nursing and on the clinical hours in your programme. Some accept it, some find deficiencies, some do not consider it. Confirm with the specific board before ordering an evaluation.",
      },
      {
        q: "Do Indian nurses need IELTS for the NCLEX?",
        a: "Many boards require an English test; a few waive it for English-medium programmes. VisaScreen generally requires one regardless, so plan for it if you intend to work in the US.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "nclex-for-internationally-educated-nurses",
      "credentials-evaluation-for-nclex",
      "prioritization-and-delegation-questions",
    ],
  },

  {
    slug: "nclex-pn-vs-rn",
    title: "NCLEX-PN vs NCLEX-RN: what is different",
    h1: "NCLEX-PN vs NCLEX-RN",
    cluster: "before",
    minutes: 5,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Both are adaptive, both use Next Generation item types, and both have their own test plan and passing standard. The difference is the role being tested: the RN exam asks you to assess, plan, and decide, while the PN exam asks you to collect data, contribute to a plan another nurse owns, and know precisely where your scope ends.",
    sections: [
      {
        h2: "Assessment versus data collection",
        body: [
          "This one distinction explains most of the difference. An RN assesses — forms a nursing judgement about what the findings mean. An LPN or LVN collects data and reports it. On the PN exam, an option that has you independently interpreting findings and changing the plan is frequently the wrong answer even when the interpretation is correct.",
          "The RN exam runs the other way. Options that stop at reporting when you could have acted are often too passive, and the credited answer is the assessment or intervention the RN owns.",
        ],
      },
      {
        h2: "Structure and length",
        body: [
          "Both exams are computerized adaptive tests with a minimum and maximum number of items, a mix of unscored pretest questions, and Next Generation formats including case studies and bowtie items. The lengths and time limits are set separately for each exam, so check the current figures on NCSBN's site for the one you are sitting.",
          "Both use the same scoring logic: your result reflects the difficulty of what you answered correctly, not a percentage, and the exam stops when it is confident which side of the standard you sit on.",
        ],
      },
      {
        h2: "Studying for one when you have material for the other",
        body: [
          "Content overlaps heavily and pharmacology, labs, and infection control transfer almost completely. What does not transfer is the scope reasoning, which is precisely the thing both exams test hardest.",
          "So RN material is usable for PN preparation if you consciously re-ask every question: is this within an LPN's scope, and who owns this decision? Practising PN items with PN rationales is better, but the overlap is real enough that the shortage of PN-specific material is not the obstacle people fear.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the NCLEX-PN easier than the NCLEX-RN?",
        a: "Not easier, narrower. It tests a smaller scope of practice against its own passing standard, and it is entirely possible to fail it while knowing plenty of RN-level content, because scope reasoning is what it examines.",
      },
      {
        q: "Can I use RN practice questions for the PN exam?",
        a: "Partly. Pharmacology, labs, and infection control transfer well. Prioritization and delegation items need re-reading through an LPN scope, since the credited answer often differs.",
      },
      {
        q: "Does passing the PN help you pass the RN later?",
        a: "It helps with format and stamina, which are real advantages. The RN exam still demands assessment and planning judgement the PN exam deliberately does not test.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "whats-on-the-test-plan",
      "prioritization-and-delegation-questions",
      "how-hard-is-the-nclex",
    ],
  },

  {
    slug: "studying-for-the-nclex-while-working",
    title: "Studying for the NCLEX while working full time",
    h1: "Studying for the NCLEX while working full time",
    cluster: "before",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Aim for 25 to 30 questions a day on working days and one long sitting on a day off, rather than a plan built around evenings you will not get. Six to eight weeks at that pace is enough for most people. The non-negotiable part is reading the rationale on every question, including the ones you got right — that is where the learning is, not in the answering.",
    sections: [
      {
        h2: "Why the standard plans fail shift workers",
        body: [
          "Most NCLEX study plans assume 75 questions and two hours a day, every day. After three twelve-hour shifts that plan is already broken, and the usual response is to abandon it rather than to shrink it — which is how a two-month runway becomes a fortnight of panic.",
          "Build the plan around your worst week instead of your best one. A schedule you can keep on a bad week is worth more than a schedule that only survives a good one, because the compounding comes from turning up, not from any individual session.",
        ],
      },
      {
        h2: "A shape that survives a rota",
        body: [
          "On a shift day: 25 questions, reviewed properly. That is forty minutes, and it fits in a break and a bus. On a day off: one 75-question sitting under time, then an hour of review. One full-length practice exam a week if you can, and at least one in the fortnight before your date.",
          "Do not study the morning of a shift and the evening of the same shift. Pick one, keep it, and protect the day-off sitting above everything else — it is the only part that rehearses the endurance the real exam demands.",
        ],
      },
      {
        h2: "Reviewing when you have no time to review",
        body: [
          "If a session gets cut, cut the questions and keep the review. Twelve questions read properly beats forty answered and forgotten, and the temptation runs the other way because a bigger number feels like more work done.",
          "Keep a running list of items you got wrong and the reason — not the topic, the reason. 'Chose the assessment when the client was already unstable' is a pattern you can fix in one sitting. 'Cardiac' is not.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many hours a day do I need to study for the NCLEX?",
        a: "Less than most plans claim. Forty focused minutes on a working day, with every rationale read, plus one longer sitting on a day off, is enough for most candidates over six to eight weeks.",
      },
      {
        q: "Should I take time off work before the NCLEX?",
        a: "A day or two before the exam helps more than a fortnight of leave. Cramming in a week off does less than steady practice, and arriving rested matters more than arriving freshly crammed.",
      },
      {
        q: "Is it better to do questions or read content?",
        a: "Questions, with rationales. Content review feels productive and predicts very little; the pass-rate gap between first-time and repeat candidates tracks closely with who practised items and read why the wrong answers were wrong.",
      },
    ],
    topic: "fundamentals",
    readNext: [
      "four-week-study-plan",
      "how-many-practice-questions-before-nclex",
      "two-week-nclex-study-plan",
    ],
  },

  /* ------------------------------------------------------------------------
     CONTENT — the item types and the clinical ground people search by name
  ------------------------------------------------------------------------ */
  {
    slug: "clinical-judgment-measurement-model",
    title: "The Clinical Judgment Measurement Model, in plain English",
    h1: "The Clinical Judgment Measurement Model, in plain English",
    cluster: "content",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "NCSBN's Clinical Judgment Measurement Model breaks a nursing decision into six steps: recognise cues, analyse cues, prioritise hypotheses, generate solutions, take actions, and evaluate outcomes. Every Next Generation case study walks through them in order, one question per step — so knowing the six tells you what each question is asking before you read it.",
    sections: [
      {
        h2: "The six steps, and what each one asks for",
        body: [
          "Recognise cues: which findings in this chart matter. Analyse cues: what those findings mean together. Prioritise hypotheses: which explanation is most likely and most dangerous. Generate solutions: what could be done. Take actions: what you do now. Evaluate outcomes: whether it worked, and what you do next if it did not.",
          "A six-question case study is usually one question per step, in that sequence. That is the single most useful thing to know about the format, because it tells you what kind of answer is wanted. A step-one question wants the abnormal finding, not the intervention — and picking a correct intervention there still scores zero.",
        ],
      },
      {
        h2: "Where marks are actually lost",
        body: [
          "Between steps one and two. Noticing that a potassium is 2.9 is recognising a cue; knowing it puts this client at risk of a dysrhythmia and pairing it with their palpitations is analysing one. Most candidates can do both and lose marks anyway, because they answer step two at step one, or skip the reasoning and jump to the action they already know is coming.",
          "The habit to build is answering the question that was asked rather than the question you have already solved in your head. On a case study, read the step before you read the options.",
        ],
      },
      {
        h2: "Using it on ordinary questions too",
        body: [
          "The model is not only for case studies. Any standalone item is somewhere on that arc, and identifying where takes a second and prevents the commonest error on the whole exam: intervening when you were asked to assess.",
          "'What should the nurse do first' after an incomplete picture is nearly always a step-one or step-two answer — gather the missing cue. The same stem after a complete picture is a step-five answer, and choosing to assess again there is the passive answer that loses.",
        ],
      },
      {
        h2: "Practising it deliberately",
        body: [
          "Work case studies as case studies rather than as six loose questions, and after each one name the step you were on. Do it out loud for a fortnight and it becomes automatic, which is the point — on exam day you want the classification to cost you nothing.",
          "Then check yourself against the rationale. If you were on a different step than the item intended, that is the finding worth writing down, not the fact that you got it wrong.",
        ],
      },
    ],
    faqs: [
      {
        q: "What are the six steps of the Clinical Judgment Measurement Model?",
        a: "Recognise cues, analyse cues, prioritise hypotheses, generate solutions, take actions, and evaluate outcomes. Next Generation case studies typically ask one question per step, in that order.",
      },
      {
        q: "Do I have to memorise the model to pass?",
        a: "Not by name. But knowing the six steps tells you what a question is asking for, and the commonest avoidable error on the exam is answering with an intervention when the step called for an assessment.",
      },
      {
        q: "Is the CJMM only used in case studies?",
        a: "No. Standalone items sit somewhere on the same arc. Identifying which step a stem is on is just as useful on a single multiple-choice question.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "nclex-case-study-walkthrough",
      "bowtie-questions-explained",
      "abcs-maslow-and-the-nursing-process",
    ],
  },

  {
    slug: "bowtie-questions-explained",
    title: "Bowtie questions on the NCLEX",
    h1: "How to answer a bowtie question",
    cluster: "content",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A bowtie item gives you one client scenario and five drop zones: the condition the client is most likely experiencing in the centre, two actions to take on the left, and two parameters to monitor on the right. Start in the centre. Once the condition is right, the four surrounding answers follow from it — and if the centre is wrong, all five usually fall.",
    sections: [
      {
        h2: "The shape, and why the middle comes first",
        body: [
          "The centre box is the hypothesis; the wings are what follows from it. Everything on a bowtie hangs off that one judgement, which is why answering left to right is the reliable way to lose the whole item. Read the scenario, decide what is happening, place the centre, and only then look at the options for the wings.",
          "The option bank is shared and deliberately contains actions that are correct for a different condition. If you are drawn to an action before you have committed to the condition, you are being led by a distractor written for the diagnosis you did not choose.",
        ],
      },
      {
        h2: "Actions versus parameters",
        body: [
          "The left wing wants things you do — position the client, hold the drug, start oxygen, call the provider. The right wing wants things you watch — a lab value, a vital sign, a specific reassessment. Candidates lose easy marks by putting a good monitoring parameter in an action box, because it reads as sensible nursing and the item is not asking for sensible nursing.",
          "When you are unsure, ask whether the option changes anything. If it changes something it is an action; if it only tells you something it is a parameter.",
        ],
      },
      {
        h2: "How it is scored",
        body: [
          "Bowtie items are scored with partial credit, so filling every box is always better than leaving one blank. There is no penalty structure that makes a blank safer than a considered guess, and an unanswered box is a guaranteed zero for that drop zone.",
          "That also means a wrong centre does not necessarily cost you everything — but in practice the wings that follow from a wrong hypothesis are usually wrong too, which is why the centre earns the reading time.",
        ],
      },
    ],
    faqs: [
      {
        q: "How is a bowtie question scored on the NCLEX?",
        a: "With partial credit across the five drop zones, so answer every box. A blank scores zero for that zone, and a considered guess cannot score less than that.",
      },
      {
        q: "Should I fill in the bowtie left to right?",
        a: "No. Start with the centre condition. The actions and parameters follow from it, and the shared option bank contains answers that are correct for a condition you did not choose.",
      },
      {
        q: "How many bowtie items will I see?",
        a: "It varies, and they usually appear within case studies rather than alone. Meeting the format before exam day matters more than the count — most candidates who struggle with bowties have simply never done one.",
      },
    ],
    topic: "prioritization-delegation",
    readNext: [
      "nclex-case-study-walkthrough",
      "clinical-judgment-measurement-model",
      "matrix-and-grid-questions",
    ],
  },

  {
    slug: "matrix-and-grid-questions",
    title: "Matrix and grid questions on the NCLEX",
    h1: "How to answer matrix and grid questions",
    cluster: "content",
    minutes: 5,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A matrix item is a table: findings down the side, and columns asking you to classify each one — expected or unexpected, indicated or contraindicated, effective or ineffective. Every row is scored on its own, so it is really several small questions wearing one uniform, and the way to fail is to read the rows as a group.",
    sections: [
      {
        h2: "One row at a time",
        body: [
          "Each row is judged independently, which means there is no pattern to find and no quota of ticks per column. Candidates who notice they have marked four things 'unexpected' in a row and start second-guessing are inventing a constraint the item does not have.",
          "Cover the other rows if it helps. Ask the column question about this finding, for this client, and move on.",
        ],
      },
      {
        h2: "The column heading is the whole question",
        body: [
          "'Indicated', 'contraindicated', 'expected', 'unexpected', 'effective', 'ineffective' — these are not interchangeable and the difference decides the answer. A finding can be entirely expected for the condition and still require action; an intervention can be indicated and still not yet effective.",
          "Re-read the heading before each row until it is automatic. More marks are lost here to misreading the column than to not knowing the clinical content.",
        ],
      },
      {
        h2: "Partial credit, and why blanks are indefensible",
        body: [
          "Matrix items carry partial credit per row, commonly with a plus/minus scheme where a wrong tick can cancel a right one within the same row group. That is a reason to think, not a reason to leave gaps — an unanswered row scores nothing at all.",
          "Work every row, at a steady pace. These items are among the most answerable on the exam once the format stops being a surprise, because the clinical judgement in each individual row is usually straightforward.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is each row of a matrix question scored separately?",
        a: "Yes. Rows are independent, with partial credit across the item. There is no expected distribution of answers between the columns.",
      },
      {
        q: "What is the difference between 'expected' and 'indicated'?",
        a: "Expected asks whether a finding is normal for this condition. Indicated asks whether an action is appropriate for this client now. A finding can be expected and still need acting on.",
      },
      {
        q: "Should I leave a matrix row blank if I am unsure?",
        a: "No. A blank row scores zero. Some schemes let a wrong answer cancel a right one within a group, but a considered answer still beats a guaranteed nothing.",
      },
    ],
    topic: "risk-reduction",
    readNext: [
      "bowtie-questions-explained",
      "ngn-partial-credit-scoring",
      "nclex-case-study-walkthrough",
    ],
  },

  {
    slug: "cloze-and-drop-down-questions",
    title: "Cloze and drop-down questions on the NCLEX",
    h1: "How to answer cloze and drop-down questions",
    cluster: "content",
    minutes: 5,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "A cloze item is a sentence about the client with words missing and a drop-down list at each gap. It reads like a fill-in-the-blank and behaves like a clinical argument: the sentence is usually 'the client is at risk of ___ as evidenced by ___', and the two choices have to agree with each other, not just be individually true.",
    sections: [
      {
        h2: "Read the whole sentence first",
        body: [
          "Both blanks filled, then read it back as one statement. The commonest error is choosing a defensible option at each gap separately and producing a sentence that does not hold together — a real risk paired with evidence that does not support it.",
          "The item is testing whether you can connect a finding to its meaning, which is exactly the analyse-cues step of the clinical judgement model. Two individually plausible words that do not belong in the same sentence is the trap the distractors are built around.",
        ],
      },
      {
        h2: "The lists are not parallel",
        body: [
          "Each drop-down has its own options and they are not in matching order, so there is no positional pattern to lean on. Some lists contain an option that is correct for a different client in the same case study, which is why the scenario must be re-read rather than remembered.",
          "Where a drop-down offers a number — a rate, a dose, a value — check the units before the digits. Distractors here are usually the right number in the wrong unit.",
        ],
      },
      {
        h2: "Practising the format",
        body: [
          "Cloze items reward being able to say what is wrong with a client in one sentence, which is a habit worth building outside the exam anyway. After any practice question, try summarising the client as 'at risk of X as evidenced by Y'. That is the cloze skill, drilled without needing cloze items.",
          "Answer every blank. Like the other Next Generation types they carry partial credit, and an empty drop-down scores nothing.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is a cloze question on the NCLEX?",
        a: "A sentence about the client with one or more words missing, each replaced by a drop-down list. You choose the option at each gap that makes the whole sentence clinically true.",
      },
      {
        q: "Do the drop-down lists contain the same options?",
        a: "No. Each gap has its own list, and some contain options that are correct for a different client in the same case study. Re-read the scenario rather than relying on memory.",
      },
      {
        q: "Is a cloze question scored all or nothing?",
        a: "No, they carry partial credit per blank. Answer every gap — an unanswered drop-down scores nothing at all.",
      },
    ],
    topic: "med-surg",
    readNext: [
      "matrix-and-grid-questions",
      "clinical-judgment-measurement-model",
      "next-gen-changes-explained",
    ],
  },

  {
    slug: "ngn-partial-credit-scoring",
    title: "How Next Generation NCLEX partial credit works",
    h1: "How partial credit works on Next Generation items",
    cluster: "content",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Next Generation items are polytomous — you can score part of the marks. Three schemes are used: plus/minus, where wrong selections cancel right ones; zero/one, where you need the whole grouping correct to score; and rationale scoring, where a linked pair only counts if both halves agree. Knowing which is running changes how aggressively you should select.",
    sections: [
      {
        h2: "Plus/minus, and why over-selecting costs you",
        body: [
          "In a plus/minus item — the usual scheme for select-all-that-apply and many matrix rows — each correct selection earns a point and each incorrect one takes one away, with the item floored at zero. Ticking everything therefore scores zero rather than full marks, which is exactly what it is designed to prevent.",
          "The practical rule: select what you can defend, and leave what you cannot. A fifth tick you are unsure about is not free — it can erase a mark you had already earned.",
        ],
      },
      {
        h2: "Zero/one, where it is all or nothing",
        body: [
          "Some groupings are scored zero/one: get the whole set right and score, get any part wrong and score nothing. Nothing is subtracted, so within that grouping there is no penalty for an extra considered answer, and leaving a blank cannot help you.",
          "You are not told which scheme an item uses. That is why the general advice is to answer everything but never to tick indiscriminately — the first protects you under zero/one, the second protects you under plus/minus.",
        ],
      },
      {
        h2: "Rationale scoring, and the pairs that must agree",
        body: [
          "Rationale scoring appears where an item asks you to link a judgement to its evidence — a cloze pair, or a condition and the finding that supports it. Both halves must be right together. A correct condition with the wrong supporting evidence scores nothing, because the item is testing the connection rather than either fact.",
          "This is the clearest signal that the Next Generation format cares about reasoning rather than recall. You can know both facts and still score zero if you cannot say why one follows from the other.",
        ],
      },
      {
        h2: "What to actually do on the day",
        body: [
          "Answer every box, row, and blank — a blank scores nothing under all three schemes. Do not tick options you cannot defend, because under plus/minus they cost you. And on any item that links a judgement to evidence, check the pair reads as one true sentence before moving on.",
          "That is the whole strategy. It does not require knowing which scheme is running, which is fortunate, because you never will.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does the NCLEX give partial credit?",
        a: "Yes, on Next Generation item types. Three schemes are used — plus/minus, zero/one, and rationale scoring — and which one applies to a given item is not shown to you.",
      },
      {
        q: "Is it bad to select every option on a select-all?",
        a: "Yes. Under plus/minus scoring, incorrect selections cancel correct ones, so ticking everything scores zero rather than full marks.",
      },
      {
        q: "Should I ever leave part of a Next Generation item blank?",
        a: "No. A blank scores nothing under every scheme. Answer what you can defend, and leave out only the options you actively believe are wrong.",
      },
    ],
    topic: "risk-reduction",
    readNext: ["how-to-answer-sata", "matrix-and-grid-questions", "nclex-scoring-explained"],
  },

  {
    slug: "fluid-and-electrolyte-questions",
    title: "Fluid and electrolyte questions on the NCLEX",
    h1: "Fluid and electrolyte questions, made predictable",
    cluster: "content",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Electrolyte items are among the most predictable on the exam, because each imbalance has one thing that kills people and the credited answer is nearly always the one that addresses it. Potassium and magnesium threaten the heart, sodium threatens the brain, and calcium threatens the airway and the heart. Learn the danger, not the list of signs.",
    sections: [
      {
        h2: "Learn each one by its lethal complication",
        body: [
          "Hypokalaemia and hyperkalaemia both cause dysrhythmias, so a potassium outside range with any cardiac symptom is a report-and-act item. Hyponatraemia causes cerebral oedema, so the findings that matter are neurological — confusion, seizure — not the nausea. Hypocalcaemia causes tetany and laryngospasm, which is an airway problem. Hypermagnesaemia depresses respiration and reflexes.",
          "Memorising twelve signs per imbalance is why this topic feels enormous. Memorising one lethal complication per imbalance covers most of what the exam actually asks, because the questions are written around the thing that hurts the client.",
        ],
      },
      {
        h2: "The pairs that move together",
        body: [
          "Potassium and magnesium travel together: a potassium that will not correct is usually waiting on magnesium, and that is a recurring item. Calcium and phosphate move in opposite directions. Sodium follows water, which is why the treatment for hyponatraemia is often restricting fluid rather than giving salt — the sodium is diluted, not missing.",
          "That last one produces a classic distractor. An option offering sodium to a fluid-overloaded hyponatraemic client looks logical and is wrong for exactly the reason the item exists.",
        ],
      },
      {
        h2: "Where the drugs come in",
        body: [
          "Most electrolyte items on the exam arrive attached to a medication. Loop diuretics drop potassium. ACE inhibitors and potassium-sparing diuretics raise it. Digoxin becomes toxic in hypokalaemia, which is why a low potassium in a digoxin client is an urgent finding rather than a mild one.",
          "Never push IV potassium. It is the single most reliably wrong option on the whole exam, and it appears regularly because it is the intuitive answer for a low number.",
        ],
      },
      {
        h2: "How to practise it",
        body: [
          "Work items rather than tables. For each one, name the imbalance, name its lethal complication, and only then look at the options — the correct answer is nearly always the one addressing that complication or the assessment that confirms it.",
          "When you get one wrong, write down whether you misread the value, missed the drug that caused it, or knew the imbalance and chose a safe-sounding intervention. Those three failures need three different fixes.",
        ],
      },
    ],
    faqs: [
      {
        q: "What electrolyte values should I memorise for the NCLEX?",
        a: "Potassium 3.5–5.0, sodium 135–145, calcium 9–10.5, and magnesium 1.3–2.1 mEq/L cover most items. Knowing what each imbalance threatens matters more than the exact boundary.",
      },
      {
        q: "Why is IV potassium push always wrong?",
        a: "Because it causes fatal dysrhythmias. Potassium is always diluted and infused with a pump at a controlled rate, and an option offering a push is there to be rejected.",
      },
      {
        q: "What is the most tested electrolyte on the NCLEX?",
        a: "Potassium, because so many common drugs move it and because both directions are dangerous to the heart. Digoxin plus hypokalaemia is one of the most repeated pairings on the exam.",
      },
    ],
    topic: "dosage-and-labs",
    readNext: [
      "nclex-lab-values-to-memorize",
      "high-alert-medications",
      "dosage-calculations-without-panic",
    ],
  },

  {
    slug: "high-alert-medications",
    title: "High-alert medications on the NCLEX",
    h1: "High-alert medications and how they are tested",
    cluster: "content",
    minutes: 7,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "High-alert medications are the ones where an error causes serious harm: insulin, heparin and other anticoagulants, opioids, concentrated electrolytes, and chemotherapy. The exam tests them through the safeguards rather than the pharmacology — independent double checks, the assessment before the dose, the antidote, and the one value you must see first.",
    sections: [
      {
        h2: "The safeguard is usually the answer",
        body: [
          "For each high-alert drug there is a check that happens before the dose, and items are built around whether you do it. Insulin and heparin infusions want an independent double check by a second nurse. Digoxin wants an apical pulse for a full minute. Opioids want a respiratory rate. Warfarin wants an INR, heparin an aPTT.",
          "When an option offers the check and another offers the administration, the check wins unless the stem says it has already been done. This single pattern answers a large share of high-alert items without any deeper pharmacology.",
        ],
      },
      {
        h2: "Antidotes worth knowing cold",
        body: [
          "Heparin reverses with protamine sulfate. Warfarin reverses with vitamin K. Opioids reverse with naloxone. Benzodiazepines reverse with flumazenil. Acetaminophen has acetylcysteine. Magnesium toxicity is treated with calcium gluconate, which is the one people forget and which appears regularly in maternity items.",
          "These are cheap marks. They are also the questions where a candidate who has met the pairing once answers in four seconds and banks the time for something harder.",
        ],
      },
      {
        h2: "Insulin, in the detail the exam cares about",
        body: [
          "Only regular insulin goes IV. When mixing, draw regular before NPH — clear before cloudy — so the longer-acting insulin never contaminates the vial of the shorter one. Know roughly when each type peaks, because hypoglycaemia items are built on the peak rather than the dose.",
          "And treat hypoglycaemia before anything else in the question. A conscious client gets fast-acting oral carbohydrate; an unconscious one gets IV dextrose or glucagon. An option that has you finishing an assessment first while the client is hypoglycaemic is wrong however thorough it sounds.",
        ],
      },
      {
        h2: "Anticoagulants and the bleeding client",
        body: [
          "The recurring item is a client on an anticoagulant with a new finding: a headache, a fall, dark stools, a drop in haemoglobin. All of these become urgent because of the drug, and the credited answer is to hold and report rather than to monitor.",
          "Watch for the drug interaction pairings too — an anticoagulant alongside an NSAID or aspirin is a deliberate combination, not scenery.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which medications are high-alert on the NCLEX?",
        a: "Insulin, anticoagulants such as heparin and warfarin, opioids, concentrated electrolytes including potassium, sedatives, and chemotherapy. They are tested through their safeguards more than their mechanisms.",
      },
      {
        q: "Which insulin can be given intravenously?",
        a: "Regular insulin. When mixing with NPH, draw the regular insulin first — clear before cloudy — so the longer-acting insulin does not contaminate the vial.",
      },
      {
        q: "What is the antidote for magnesium sulfate toxicity?",
        a: "Calcium gluconate. It appears most often in maternity items, where magnesium sulfate is used for pre-eclampsia and toxicity shows as depressed reflexes and respirations.",
      },
    ],
    topic: "pharmacology",
    readNext: [
      "drug-suffixes-cheat-sheet",
      "fluid-and-electrolyte-questions",
      "dosage-calculations-without-panic",
    ],
  },

  {
    slug: "ekg-basics-for-nclex",
    title: "EKG basics for the NCLEX",
    h1: "EKG rhythms: only what the NCLEX asks",
    cluster: "content",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "You are not asked to interpret complex strips. You are asked to recognise a handful of rhythms and know which are emergencies: ventricular fibrillation and pulseless ventricular tachycardia need defibrillation, asystole needs CPR and adrenaline rather than a shock, and atrial fibrillation matters mainly because it throws clots.",
    sections: [
      {
        h2: "The four that carry the marks",
        body: [
          "Ventricular fibrillation: chaotic, no pulse, defibrillate. Ventricular tachycardia: wide and fast — defibrillate if pulseless, treat differently if there is a pulse, which is the distinction items are built on. Asystole: flat, and the trap is that it is not a shockable rhythm; the answer is CPR and adrenaline. Atrial fibrillation: irregularly irregular, and the exam's interest is stroke risk and anticoagulation.",
          "Bradycardia and heart block round it out. Symptomatic bradycardia gets atropine and, if that fails, pacing. Asymptomatic bradycardia in a fit client often needs nothing, which is the item people over-treat.",
        ],
      },
      {
        h2: "Check the client, not just the strip",
        body: [
          "The single most repeated EKG lesson on the exam is that the rhythm alone does not decide the action — the client does. The same trace with a pulse and without a pulse has two different answers, and an item that shows a worrying rhythm in a client who is talking to you is usually testing whether you will over-react.",
          "So read the vital signs and the level of consciousness before choosing. 'Assess the client' is the right instinct here far more often than on other topics.",
        ],
      },
      {
        h2: "The electrolyte overlap",
        body: [
          "Rhythm items are frequently electrolyte items wearing a different hat. Hyperkalaemia produces peaked T waves and can arrest the heart; hypokalaemia flattens T waves and brings U waves; hypocalcaemia and some drugs prolong the QT interval and invite torsades.",
          "If a rhythm question includes a lab value, the lab value is the point of the question. Treat the cause rather than the trace.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which rhythms are shockable on the NCLEX?",
        a: "Ventricular fibrillation and pulseless ventricular tachycardia. Asystole and pulseless electrical activity are not shockable — they get CPR and adrenaline, and an option offering defibrillation there is wrong.",
      },
      {
        q: "Do I need to read full EKG strips for the NCLEX?",
        a: "No. Recognising a small set of rhythms and knowing the immediate action for each is what is tested, not measuring intervals or calculating axis.",
      },
      {
        q: "What EKG change does hyperkalaemia cause?",
        a: "Peaked T waves, with widening QRS as it worsens, and cardiac arrest at the extreme. If a rhythm item quotes a potassium, the potassium is what the question is about.",
      },
    ],
    topic: "cardiovascular",
    readNext: [
      "fluid-and-electrolyte-questions",
      "nclex-lab-values-to-memorize",
      "abcs-maslow-and-the-nursing-process",
    ],
  },

  {
    slug: "safety-and-infection-prevention",
    title: "Safety and infection prevention on the NCLEX",
    h1: "Safety and infection prevention, after the 2026 rename",
    cluster: "content",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "The 2026 test plan renamed this category from 'Safety and Infection Control' to 'Safety and Infection Prevention and Control'. The content did not change, but the emphasis is worth taking literally: where two options are both defensible, the one that stops an exposure happening usually beats the one that manages it afterwards.",
    sections: [
      {
        h2: "Prevention before containment",
        body: [
          "Hand hygiene remains the most-tested and most-underestimated answer on the exam. It beats gloves, it happens before and after every contact, and it is correct far more often than candidates expect because it feels too simple to be the intended answer.",
          "The rename points the same way. Given a choice between teaching a client something that prevents a problem and an intervention that treats one, the preventive option is the safer bet — provided nothing in the stem is already unstable, because an unstable client always outranks education.",
        ],
      },
      {
        h2: "The precautions, and the ones people mix up",
        body: [
          "Airborne: tuberculosis, measles, varicella — negative-pressure room and an N95. Droplet: influenza, pertussis, meningococcal, mumps — private room and a surgical mask. Contact: C. difficile, MRSA, VRE, scabies — gown and gloves. C. difficile adds soap and water rather than alcohol gel, because the spores survive alcohol, and that is a repeated item.",
          "Immunocompromised clients get protective precautions, which run the other way: you are keeping the world out rather than keeping something in. No fresh flowers, no raw food, no visitors who are unwell.",
        ],
      },
      {
        h2: "Safety beyond infection",
        body: [
          "The category also covers falls, restraints, and error reporting. Restraints need a provider order that is time-limited, the least restrictive option first, and regular documented checks — and never a knot that cannot be released quickly. Falls are answered by prevention: bed low, call bell in reach, non-slip footwear, and rounding.",
          "Error reporting items reward honesty without exception. The credited answer is always to check the client first and then report through the proper channel; anything that conceals or delays is wrong however reasonable it sounds.",
        ],
      },
      {
        h2: "The new statement on equal access",
        body: [
          "The 2026 plan added an activity statement on unbiased care and equal access. Expect items where the right answer uses a professional interpreter rather than a family member, does not assume a client can afford or reach a recommended follow-up, and treats a client's stated preference as the deciding factor.",
          "These read as common sense and are answered wrongly surprisingly often, because the distractors are efficient shortcuts that a busy nurse might genuinely take.",
        ],
      },
    ],
    faqs: [
      {
        q: "What changed in the safety category for 2026?",
        a: "The name — 'Safety and Infection Control' became 'Safety and Infection Prevention and Control' — and an added activity statement on unbiased care and equal access. The percentage range and the underlying content did not change.",
      },
      {
        q: "Which precautions does C. difficile need?",
        a: "Contact precautions with gown and gloves, plus hand washing with soap and water rather than alcohol gel, because alcohol does not kill the spores.",
      },
      {
        q: "Is hand hygiene really the answer that often?",
        a: "Often enough that dismissing it as too obvious is a known way to lose marks. It precedes and follows every client contact and outranks putting on gloves.",
      },
    ],
    topic: "safe-care",
    readNext: [
      "infection-control-precautions",
      "2026-nclex-test-plan-changes",
      "whats-on-the-test-plan",
    ],
  },

  /* ------------------------------------------------------------------------
     DURING and AFTER
  ------------------------------------------------------------------------ */
  {
    slug: "nclex-pacing-and-time-management",
    title: "Pacing the NCLEX: time management on the day",
    h1: "Pacing the NCLEX",
    cluster: "during",
    minutes: 5,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "Five hours for up to 150 items is roughly two minutes each, and most candidates finish well inside it. Running out of time is rare; running out of concentration is not. Budget about 90 seconds for a standard item and let case studies take longer, and never re-read a stem more than twice — the second reading is the last one that adds anything.",
    sections: [
      {
        h2: "The arithmetic, and why it is not the problem",
        body: [
          "Five hours covers the tutorial, the exam, and both optional breaks. At 150 items that is two minutes each, and the average candidate finishes in around three hours. The people who run out are almost always re-reading rather than answering — a third and fourth pass at a stem that has not changed.",
          "Two readings is the honest limit. If the answer is not there after the second, it is a question you do not know, and the correct response is to choose the best available option and move on with the time intact.",
        ],
      },
      {
        h2: "Case studies cost more, and should",
        body: [
          "A six-question case study takes longer per item than a standalone question and it is worth the time, because the six hang off one reading of the chart. Read the chart properly once rather than skimming it six times.",
          "That is where a time budget earns itself. Save the seconds on the standalone items you know, and spend them where the marks are clustered.",
        ],
      },
      {
        h2: "Breaks, and the clock that keeps running",
        body: [
          "The optional breaks come out of your five hours. A ten-minute break costs ten minutes of exam time, which is fine — a break that restores your concentration for the next fifty items is a good trade, and grinding through hour four with nothing left is not thrift.",
          "Take one somewhere around the middle if you feel your attention going. Stand, drink water, look at something further than an arm's length away, and go back.",
        ],
      },
      {
        h2: "Rehearsing it before the day",
        body: [
          "If your longest practice sitting is 25 questions, item 90 will be the first time you have ever had to think clearly while tired. On an adaptive exam that is expensive, because fatigue errors arrive exactly when the engine is narrowing in on your level.",
          "Build to at least one 75-question timed sitting a week, phone away, no pausing. The number you score on it matters much less than the fact that you did it.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long do I get per question on the NCLEX?",
        a: "About two minutes on average, though most candidates need far less. Aim for 90 seconds on standard items so that case studies can take three or four minutes without pressure.",
      },
      {
        q: "Do NCLEX breaks come out of my exam time?",
        a: "Yes. The five hours includes the tutorial and both optional breaks, so a ten-minute break costs ten minutes of testing time. It is usually still worth taking one.",
      },
      {
        q: "What happens if I run out of time?",
        a: "The exam applies the run-out-of-time rule and grades on your final ability estimate from the items you completed, provided you answered the minimum. It is an uncommon way to fail.",
      },
    ],
    topic: "fundamentals",
    readNext: ["test-day-checklist", "nclex-test-anxiety", "how-many-questions-is-the-nclex"],
  },

  {
    slug: "nclex-retake-rules",
    title: "NCLEX retake rules and the waiting period",
    h1: "Retaking the NCLEX: rules, waiting, and what to change",
    cluster: "after",
    minutes: 6,
    updated: UPDATED,
    updatedISO: UPDATED_ISO,
    shortAnswer:
      "You must wait 45 days between attempts under NCSBN policy, and boards allow up to eight attempts in a year. You re-register with Pearson VUE, pay the fee again, and wait for a new Authorization to Test — your board's eligibility does not usually carry over automatically. Repeat candidates pass at roughly half the first-time rate, and the difference is almost entirely method.",
    sections: [
      {
        h2: "The mechanics of booking again",
        body: [
          "The waiting period is 45 days from your test date, and boards may set additional limits. Re-register with Pearson VUE and pay the exam fee; your board then makes you eligible again and a fresh ATT is issued with its own validity window. Some boards ask for a new application or a remediation plan first, so check yours before assuming it is automatic.",
          "Book the date as soon as you are eligible, even if it feels early. An open-ended runway is how a retake drifts from six weeks to six months, and the material fades the whole time.",
        ],
      },
      {
        h2: "Read the Candidate Performance Report properly",
        body: [
          "A failed attempt comes with a Candidate Performance Report showing whether you were below, near, or above the standard in each content area. It is the only individualised feedback the exam ever gives you, and it is routinely skimmed once in a bad hour and never opened again.",
          "Read it a week later, when you can. 'Below the passing standard' in two categories is a study plan; 'near' across the board is a different problem, usually pacing or test-taking rather than knowledge, and it needs a different fix.",
        ],
      },
      {
        h2: "Why repeat candidates fail again",
        body: [
          "First-time US-educated candidates pass at around 88%; repeat candidates at closer to half that. The gap is not intelligence and it is rarely effort. It is that most people repeat the method that already failed — rereading content, re-watching lectures, highlighting a book — because it feels like studying in a way that answering questions does not.",
          "If your first attempt was built on content review, the change is not more content review. It is questions with rationales, every day, including the rationales for the ones you got right.",
        ],
      },
      {
        h2: "What to do in the 45 days",
        body: [
          "Take a genuine week off first. Then work the two weakest categories from your report with questions rather than notes, and add one 75-question timed sitting a week to rebuild stamina. In the final fortnight, mixed sets only — a category you have drilled in isolation is not the same as that category arriving unannounced.",
          "Track why you get things wrong rather than what you get wrong. 'Chose an intervention when the stem asked for an assessment' is a fixable pattern; 'endocrine' is not.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long do I have to wait to retake the NCLEX?",
        a: "45 days between attempts under NCSBN policy, with up to eight attempts in a twelve-month period. Individual boards can impose additional requirements, so confirm with yours.",
      },
      {
        q: "Do I have to pay for the NCLEX again?",
        a: "Yes. Each attempt needs a new registration and the full exam fee, and a new Authorization to Test is issued before you can schedule.",
      },
      {
        q: "What should I change before retaking?",
        a: "The method, if your first attempt was content review. Repeat candidates pass at roughly half the first-time rate, and the reliable difference is practising questions and reading rationales rather than re-reading material.",
      },
    ],
    topic: "fundamentals",
    readNext: ["if-you-failed-what-next", "reading-your-result", "nclex-pass-rates"],
  },
];
