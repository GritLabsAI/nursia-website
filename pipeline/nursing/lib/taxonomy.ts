/**
 * The clinical index — what the nursing library is actually about.
 *
 * A keyword list alone cannot produce a thousand pages worth having. Keyword
 * Planner reports on what people type, and what people type into Google about
 * this exam is a few hundred distinct things wearing three thousand costumes:
 * "nclex questions", "nclex q" and "nclex questionnaire" are one page with one
 * answer, and no amount of scoring turns them into three.
 *
 * What does produce a thousand pages worth having is the subject matter. A
 * nurse studying for the NCLEX is not studying "the NCLEX"; they are studying
 * heart failure, and digoxin toxicity, and which of four patients to see
 * first. Every one of those is a real page with a real answer that a generic
 * exam-tips page cannot give, and there are genuinely hundreds of them —
 * because that is how big the subject is, not because we needed a number.
 *
 * So the plan comes from two sources joined at the topic: this index says what
 * the field contains, and the keyword table says which parts of it people are
 * asking about and how loudly. An entity with no search volume still earns a
 * page if it is something a nurse must know; a query with volume still gets
 * dropped if it is about the CPA exam.
 *
 * `kind` is not decoration. It selects the outline the writer is given — a
 * drug page and a condition page answer different questions in different
 * orders, and giving both the same skeleton is exactly the templating this
 * library has to avoid. `hook` is the one clinical fact that makes the page
 * specific, carried into the prompt so the writer opens on something true and
 * particular rather than on a definition.
 *
 * Topic slugs must match `TOPICS` in src/lib/content.ts. That is the contract
 * that lets every page here link to a real question set; a typo produces a
 * page that ranks, gets read, and dead-ends.
 */

import { EXTRA_INDEX } from "./taxonomy-extra";
import { EXTRA_INDEX_2 } from "./taxonomy-extra-2";

export type EntityKind =
  /** A disease or clinical state. Assessment → intervention → complications. */
  | "condition"
  /** A drug or drug class. Action → nursing implications → what to hold for. */
  | "drug"
  /** Something the nurse does. Steps → safety → what to document. */
  | "procedure"
  /** A value to interpret. Range → what moves it → what to do about it. */
  | "lab"
  /** An idea to reason with, not a thing to memorise. */
  | "concept"
  /** Test-taking or clinical-judgement skill. */
  | "skill";

export type Entity = {
  name: string;
  kind: EntityKind;
  /** Other names a nurse or a search engine would use. Feeds secondary queries. */
  aka?: string[];
  /**
   * The specific clinical hook. One true, particular fact — the thing that
   * makes this page about *this* and not about nursing in general. The writer
   * is told to build the answer around it.
   */
  hook: string;
};

const CORE_INDEX: Record<string, Entity[]> = {
  /* --------------------------------------------------------- cardiovascular */
  cardiovascular: [
    { name: "Heart Failure", kind: "condition", aka: ["CHF", "congestive heart failure"], hook: "Left-sided failure backs up into the lungs and right-sided into the body — crackles versus peripheral oedema and JVD is the discriminator the exam tests." },
    { name: "Myocardial Infarction", kind: "condition", aka: ["MI", "heart attack"], hook: "Troponin rises in 3–4 hours and stays up for two weeks; CK-MB returns to normal in 2–3 days, which is what makes it the marker for reinfarction." },
    { name: "Atrial Fibrillation", kind: "condition", aka: ["AFib", "A-fib"], hook: "The irreversible risk is not the rate, it is the clot forming in a quivering atrium — which is why anticoagulation outranks rate control in the priority question." },
    { name: "Hypertension", kind: "condition", aka: ["high blood pressure"], hook: "It is asymptomatic until it is not, so the teaching question is nearly always about adherence rather than about the number." },
    { name: "Deep Vein Thrombosis", kind: "condition", aka: ["DVT"], hook: "Never massage the calf — the classic wrong answer, because it embolises the clot the patient came in with." },
    { name: "Pulmonary Embolism", kind: "condition", aka: ["PE"], hook: "Sudden dyspnoea with pleuritic chest pain and unexplained tachycardia in a post-op or immobile patient is the pattern, not the textbook haemoptysis." },
    { name: "Cardiogenic Shock", kind: "condition", hook: "The pump has failed with a full tank, which is why fluids make it worse and inotropes make it better — the reverse of hypovolaemic shock." },
    { name: "Infective Endocarditis", kind: "condition", hook: "Fever plus a new murmur plus a recent dental or IV procedure is the triad, and the prophylaxis teaching is the testable part." },
    { name: "Pericarditis", kind: "condition", hook: "Pain relieved by sitting forward distinguishes it from MI at the bedside before any test comes back." },
    { name: "Cardiac Tamponade", kind: "condition", hook: "Beck's triad — hypotension, muffled heart sounds, distended neck veins — is an emergency that pericardiocentesis fixes in minutes." },
    { name: "Abdominal Aortic Aneurysm", kind: "condition", aka: ["AAA"], hook: "A pulsating abdominal mass must not be palpated deeply; the exam wants you to report it, not examine it further." },
    { name: "Peripheral Arterial Disease", kind: "condition", aka: ["PAD"], hook: "Arterial ulcers are painful, punched-out and on the toes; venous ulcers are wet, irregular and near the ankle — legs go down for arterial, up for venous." },
    { name: "Rheumatic Fever", kind: "condition", hook: "It follows untreated strep, which makes the nursing answer about completing the full antibiotic course weeks earlier." },
    { name: "Angina", kind: "condition", aka: ["stable angina", "unstable angina"], hook: "Pain that comes at rest or wakes the patient has stopped being stable angina and become an emergency." },
    { name: "Digoxin Toxicity", kind: "drug", hook: "Anorexia, nausea and yellow-green halos, and hypokalaemia makes it worse at a normal digoxin level — which is why the potassium is the answer as often as the digoxin is." },
    { name: "Beta Blockers", kind: "drug", aka: ["metoprolol", "atenolol"], hook: "Hold for a heart rate under 60, never stop abruptly, and they mask the tachycardia a diabetic patient uses to detect hypoglycaemia." },
    { name: "ACE Inhibitors", kind: "drug", aka: ["lisinopril", "enalapril"], hook: "The dry cough is harmless and the reason for the switch to an ARB; angioedema is the one that ends the drug permanently." },
    { name: "Calcium Channel Blockers", kind: "drug", aka: ["amlodipine", "diltiazem"], hook: "Grapefruit juice raises the level, and the ankle oedema is peripheral vasodilation rather than heart failure." },
    { name: "Warfarin", kind: "drug", aka: ["Coumadin"], hook: "INR 2–3 for most indications, vitamin K reverses it, and the teaching is consistent green vegetable intake — not none." },
    { name: "Heparin", kind: "drug", hook: "aPTT 1.5–2.5 times control, protamine sulfate reverses it, and a falling platelet count is HIT until proven otherwise." },
    { name: "Nitroglycerin", kind: "drug", hook: "Three doses five minutes apart, and never with a phosphodiesterase inhibitor — the combination drops pressure to a level nothing recovers." },
    { name: "Statins", kind: "drug", aka: ["atorvastatin", "simvastatin"], hook: "Unexplained muscle pain is rhabdomyolysis until the CK says otherwise, and that is the call the patient must be taught to make." },
    { name: "Antiarrhythmics", kind: "drug", aka: ["amiodarone"], hook: "Amiodarone is effective and toxic to the thyroid, liver, eyes and lungs, which makes the monitoring the whole nursing job." },
    { name: "Diuretics", kind: "drug", aka: ["furosemide", "spironolactone"], hook: "Loop diuretics waste potassium and spironolactone spares it — the same patient on both is not a mistake, it is the design." },
    { name: "ECG Interpretation", kind: "skill", aka: ["EKG"], hook: "Rate, rhythm, P for every QRS, PR under 0.20 — the order matters more than recognising the strip on sight." },
    { name: "Cardiac Catheterization", kind: "procedure", hook: "Post-procedure the priority is the site and the distal pulse, and the teaching is the fluid that clears the contrast." },
    { name: "Coronary Artery Bypass Graft", kind: "procedure", aka: ["CABG"], hook: "The sternal precautions run six to eight weeks, and the leg with the harvested vein often hurts more than the chest." },
    { name: "Pacemaker Care", kind: "procedure", hook: "Arm immobilised at first, no MRI in most cases, and a rate below the set rate is a malfunction to report rather than observe." },
    { name: "Central Venous Pressure", kind: "lab", aka: ["CVP"], hook: "2–6 mmHg; high means volume overload or right heart failure, low means the tank is empty — one number, two entirely different interventions." },
    { name: "BNP", kind: "lab", aka: ["B-type natriuretic peptide"], hook: "Over 100 pg/mL says the dyspnoea is cardiac rather than pulmonary, which is the question at the bedside." },
    { name: "Troponin", kind: "lab", hook: "The most specific cardiac marker there is, which is why a normal one does not rule out an MI drawn too early." },
    { name: "Cholesterol Panel", kind: "lab", aka: ["lipid panel"], hook: "LDL is the one to lower and HDL the one to raise, and the fasting requirement is the part patients get wrong." },
    { name: "Hemodynamic Monitoring", kind: "concept", hook: "Preload, afterload and contractility are three separate dials, and most wrong answers come from turning the one the question did not ask about." },
    { name: "Shock Stages", kind: "concept", hook: "Compensated shock has a normal blood pressure and a rising heart rate — by the time the pressure falls, the compensation has already failed." },
    { name: "Chest Pain Assessment", kind: "skill", hook: "PQRST before anything else, because the description sorts cardiac from pulmonary from musculoskeletal faster than any test." },
    { name: "Cardiac Rehabilitation", kind: "concept", hook: "Sexual activity questions are on the exam and the answer is when the patient can climb two flights of stairs without symptoms." },
  ],

  /* ------------------------------------------------------------- respiratory */
  respiratory: [
    { name: "Asthma", kind: "condition", hook: "A silent chest in an asthmatic is not improvement, it is the airway that has stopped moving air at all." },
    { name: "COPD", kind: "condition", aka: ["chronic obstructive pulmonary disease", "emphysema"], hook: "Oxygen runs at 1–3 L/min because the hypoxic drive is what is left — and the exam still expects you to treat hypoxia when it is life-threatening." },
    { name: "Pneumonia", kind: "condition", hook: "The oldest patients present with confusion rather than fever, which is why the classic picture misses the diagnosis on a geriatric floor." },
    { name: "Tuberculosis", kind: "condition", aka: ["TB"], hook: "Airborne precautions and a negative-pressure room, and the medication teaching runs six to nine months for a patient who feels well after three weeks." },
    { name: "Pulmonary Edema", kind: "condition", hook: "Pink frothy sputum with sudden severe dyspnoea — sit the patient upright first, before the drug that was ordered." },
    { name: "ARDS", kind: "condition", aka: ["acute respiratory distress syndrome"], hook: "Refractory hypoxaemia — the oxygen saturation does not improve when the oxygen goes up, which is the defining feature and the exam's discriminator." },
    { name: "Pneumothorax", kind: "condition", aka: ["collapsed lung"], hook: "A tracheal shift away from the affected side is tension pneumothorax and a needle decompression, not a chest X-ray." },
    { name: "Pleural Effusion", kind: "condition", hook: "Decreased breath sounds with dullness to percussion — the opposite percussion note to a pneumothorax in the same silent field." },
    { name: "Pulmonary Fibrosis", kind: "condition", hook: "A restrictive pattern: the lungs will not expand rather than will not empty, which reverses everything taught about COPD." },
    { name: "Cystic Fibrosis", kind: "condition", hook: "Pancreatic enzymes with every meal and snack, and chest physiotherapy before meals rather than after." },
    { name: "Respiratory Acidosis", kind: "condition", hook: "The lungs are not blowing off CO2 — so the answer is nearly always about ventilation rather than about bicarbonate." },
    { name: "Influenza", kind: "condition", aka: ["flu"], hook: "Antivirals only work inside 48 hours, which makes the timing question the testable one." },
    { name: "Lung Cancer", kind: "condition", hook: "A chronic cough that changes character in a smoker is the referral, and the paraneoplastic syndromes are why the presentation can be endocrine." },
    { name: "Sleep Apnea", kind: "condition", aka: ["OSA"], hook: "CPAP adherence is the entire nursing intervention, and the barrier is nearly always the mask rather than the diagnosis." },
    { name: "Bronchitis", kind: "condition", hook: "Viral far more often than bacterial, which makes the answer patient education about why there is no antibiotic." },
    { name: "Epiglottitis", kind: "condition", hook: "Never put anything in that mouth — no tongue depressor, no throat culture — because the airway closes on inspection." },
    { name: "Pulmonary Hypertension", kind: "condition", hook: "Right heart failure is the consequence, so the assessment findings are peripheral rather than pulmonary." },
    { name: "Bronchodilators", kind: "drug", aka: ["albuterol", "salbutamol"], hook: "Short-acting first, then the steroid inhaler, and the tremor and tachycardia are expected rather than allergic." },
    { name: "Inhaled Corticosteroids", kind: "drug", aka: ["fluticasone", "budesonide"], hook: "Rinse the mouth after every dose — the candidiasis is the complication the exam asks about, not the steroid effect." },
    { name: "Theophylline", kind: "drug", hook: "A therapeutic range of 10–20 mcg/mL and a toxicity that begins with the tachycardia and nausea everybody dismisses." },
    { name: "Montelukast", kind: "drug", aka: ["Singulair"], hook: "Taken in the evening for prevention, and it will do nothing at all for an attack already happening." },
    { name: "Antitubercular Drugs", kind: "drug", aka: ["isoniazid", "rifampin"], hook: "Rifampin turns urine and tears orange — harmless, alarming, and the single most-asked teaching point in the set." },
    { name: "Oxygen Therapy", kind: "procedure", hook: "Every delivery device has a flow rate range, and the wrong rate on a nasal cannula dries the mucosa without raising the saturation." },
    { name: "Chest Tube Management", kind: "procedure", hook: "Continuous bubbling in the water seal is an air leak; tidaling is normal — and clamping the tube is almost always the wrong answer." },
    { name: "Tracheostomy Care", kind: "procedure", hook: "An obturator and a spare tube at the bedside, always, because the emergency is the tube coming out rather than the tube blocking." },
    { name: "Suctioning", kind: "procedure", hook: "No more than 10–15 seconds, oxygenate before and after, and suction on the way out only." },
    { name: "Incentive Spirometry", kind: "procedure", hook: "Ten times an hour while awake, and the goal is a slow deep inhale held three seconds — patients almost always blow out instead." },
    { name: "Mechanical Ventilation", kind: "procedure", hook: "A high-pressure alarm is an obstruction and a low-pressure alarm is a disconnection — two alarms, two opposite emergencies." },
    { name: "Arterial Blood Gases", kind: "lab", aka: ["ABG"], hook: "pH first, then CO2, then bicarbonate — the order is what makes ROME work rather than a memorised table." },
    { name: "Pulse Oximetry", kind: "skill", hook: "It reads saturation, not ventilation, which is why a patient retaining CO2 can be 98% and in trouble." },
    { name: "Peak Flow Monitoring", kind: "skill", hook: "The green-yellow-red zones are personal-best based, so a number that is fine for one asthmatic is an emergency for another." },
    { name: "Breath Sounds", kind: "skill", hook: "Crackles do not clear with a cough and rhonchi do — one sentence that sorts fluid from secretions at the bedside." },
    { name: "Postural Drainage", kind: "procedure", hook: "Before meals or two hours after, never straight after — the exam is testing whether you know it induces vomiting." },
  ],

  /* ---------------------------------------------------------------- endocrine */
  endocrine: [
    { name: "Type 1 Diabetes", kind: "condition", hook: "No insulin at all, which is why the sick-day rule is to keep taking it even when the patient is not eating." },
    { name: "Type 2 Diabetes", kind: "condition", hook: "Insulin resistance rather than absence, so the teaching that changes outcomes is weight and activity before it is medication." },
    { name: "Diabetic Ketoacidosis", kind: "condition", aka: ["DKA"], hook: "Fluids before insulin, and the potassium falls as the insulin drives it into cells — which is why it is replaced while the level still looks normal." },
    { name: "Hyperosmolar Hyperglycemic State", kind: "condition", aka: ["HHS", "HHNS"], hook: "Glucose far higher than DKA and no ketones, because there is just enough insulin to prevent ketosis and not enough to work." },
    { name: "Hypoglycemia", kind: "condition", hook: "15 grams, 15 minutes, recheck — and if the patient cannot swallow, it is glucagon rather than orange juice." },
    { name: "Hyperthyroidism", kind: "condition", aka: ["Graves disease"], hook: "Everything is fast and the room is too hot — weight loss with a good appetite is the finding that separates it from anxiety." },
    { name: "Hypothyroidism", kind: "condition", aka: ["Hashimoto thyroiditis"], hook: "Everything is slow and the room is too cold, and levothyroxine is taken on an empty stomach for life." },
    { name: "Thyroid Storm", kind: "condition", aka: ["thyrotoxic crisis"], hook: "Fever, tachycardia and altered mental status in a hyperthyroid patient — cool them, and never with aspirin, which frees more hormone." },
    { name: "Myxedema Coma", kind: "condition", hook: "Hypothermia, hypotension and hypoventilation — the opposite emergency to thyroid storm and just as fatal." },
    { name: "Cushing Syndrome", kind: "condition", hook: "Too much cortisol: moon face, buffalo hump, thin skin, high glucose, low potassium — and infection risk that hides the fever." },
    { name: "Addison Disease", kind: "condition", aka: ["adrenal insufficiency"], hook: "Too little cortisol: hyperpigmentation, hyponatraemia, hyperkalaemia — and the crisis is precipitated by the stress of any illness." },
    { name: "SIADH", kind: "condition", aka: ["syndrome of inappropriate ADH"], hook: "Water retained, sodium diluted — fluid restriction is the intervention, and correcting sodium too fast causes the brain injury." },
    { name: "Diabetes Insipidus", kind: "condition", aka: ["DI"], hook: "Enormous volumes of dilute urine — the mirror image of SIADH, and desmopressin is the fix." },
    { name: "Pheochromocytoma", kind: "condition", hook: "Episodic severe hypertension with headache, sweating and palpitations — and palpating the abdomen can trigger the crisis." },
    { name: "Hyperparathyroidism", kind: "condition", hook: "High calcium pulled out of bone: stones, bones, groans and psychiatric overtones, in that order of frequency." },
    { name: "Hypoparathyroidism", kind: "condition", hook: "Low calcium: Chvostek and Trousseau signs, and the airway risk is laryngospasm rather than sedation." },
    { name: "Acromegaly", kind: "condition", hook: "Growth hormone after the plates have closed — hands, feet and jaw enlarge, and the rings stop fitting." },
    { name: "Metabolic Syndrome", kind: "condition", hook: "Three of five criteria, and the nursing value is that every one of them is modifiable." },
    { name: "Insulin Types", kind: "drug", aka: ["lispro", "glargine", "NPH"], hook: "Onset, peak and duration decide when hypoglycaemia happens — which is the whole reason the exam makes you memorise them." },
    { name: "Metformin", kind: "drug", hook: "Held 48 hours around contrast studies because of lactic acidosis, and it does not itself cause hypoglycaemia." },
    { name: "Sulfonylureas", kind: "drug", aka: ["glipizide", "glyburide"], hook: "These do cause hypoglycaemia — the distinction from metformin that a question is built on." },
    { name: "Levothyroxine", kind: "drug", aka: ["Synthroid"], hook: "Morning, empty stomach, 30–60 minutes before food, and never with calcium or iron." },
    { name: "Propylthiouracil", kind: "drug", aka: ["PTU"], hook: "Watch for agranulocytosis — a sore throat and fever on this drug is a blood count, not a cold." },
    { name: "Corticosteroids", kind: "drug", aka: ["prednisone"], hook: "Never stopped abruptly, taken with food, and they raise glucose and hide infection at the same time." },
    { name: "Glucagon", kind: "drug", hook: "For the hypoglycaemic patient who cannot swallow, and they will vomit — so position them on their side first." },
    { name: "GLP-1 Agonists", kind: "drug", aka: ["semaglutide", "liraglutide"], hook: "Delayed gastric emptying is the mechanism and the side effect, and the thyroid C-cell warning is the contraindication to know." },
    { name: "Hemoglobin A1C", kind: "lab", aka: ["HbA1c"], hook: "Three months of control in one number, which is why it cannot be fixed by a week of good behaviour before the appointment." },
    { name: "Blood Glucose Monitoring", kind: "skill", hook: "The side of the fingertip, not the pad — less painful, and the reason patients stop testing is nearly always pain." },
    { name: "Insulin Administration", kind: "procedure", hook: "Clear before cloudy, rotate within one site rather than across sites, and never massage after." },
    { name: "Thyroid Function Tests", kind: "lab", aka: ["TSH", "T3", "T4"], hook: "TSH moves opposite to the thyroid — high TSH means an underactive gland, which is the reversal everyone gets wrong once." },
    { name: "Diabetic Foot Care", kind: "concept", hook: "Inspect daily with a mirror, never barefoot, never a heating pad — neuropathy means the injury is painless until it is an amputation." },
    { name: "Diabetic Neuropathy", kind: "condition", hook: "Stocking-glove numbness that progresses proximally, and the pain is worse at night." },
    { name: "Diabetic Retinopathy", kind: "condition", hook: "Asymptomatic until vision is already lost, which makes the annual dilated exam the intervention." },
  ],

  /* ------------------------------------------------------------- neurological */
  neurological: [
    { name: "Stroke", kind: "condition", aka: ["CVA", "cerebrovascular accident"], hook: "Time of last known well decides thrombolysis eligibility, which makes it the first question rather than a detail of the history." },
    { name: "Transient Ischemic Attack", kind: "condition", aka: ["TIA"], hook: "Symptoms resolve completely, and it is a warning rather than a reassurance — the stroke risk is highest in the next 48 hours." },
    { name: "Increased Intracranial Pressure", kind: "condition", aka: ["ICP"], hook: "Cushing's triad — rising pressure, widening pulse pressure, falling irregular heart rate — is a late sign, not an early one." },
    { name: "Seizures", kind: "condition", aka: ["epilepsy"], hook: "Nothing in the mouth, nothing restraining the limbs — position on the side and time it, because the duration decides the drug." },
    { name: "Status Epilepticus", kind: "condition", hook: "A seizure past five minutes or seizures without recovery between — airway first, then lorazepam." },
    { name: "Meningitis", kind: "condition", hook: "Nuchal rigidity with photophobia and fever, and bacterial meningitis is droplet precautions until 24 hours of antibiotics." },
    { name: "Multiple Sclerosis", kind: "condition", aka: ["MS"], hook: "Relapsing and remitting, worse with heat — so the teaching about hot baths matters more than it sounds." },
    { name: "Parkinson Disease", kind: "condition", hook: "Tremor at rest, rigidity, bradykinesia — and the nursing priority is the fall risk the shuffling gait creates." },
    { name: "Myasthenia Gravis", kind: "condition", hook: "Weakness that worsens with use and improves with rest — the opposite pattern to a cholinergic crisis on the same drug." },
    { name: "Guillain-Barré Syndrome", kind: "condition", hook: "Ascending paralysis, which makes the respiratory assessment the one that matters as it climbs." },
    { name: "Amyotrophic Lateral Sclerosis", kind: "condition", aka: ["ALS"], hook: "The mind stays intact while the body fails, which shapes every communication and end-of-life question on this topic." },
    { name: "Spinal Cord Injury", kind: "condition", hook: "The level decides the deficit, and anything above T6 brings autonomic dysreflexia into every future admission." },
    { name: "Autonomic Dysreflexia", kind: "condition", hook: "Sudden severe hypertension with a pounding headache — sit the patient up and find the trigger, which is usually a blocked catheter." },
    { name: "Traumatic Brain Injury", kind: "condition", aka: ["TBI", "head injury"], hook: "Clear drainage from the nose or ear is CSF until proven otherwise, and it is never packed." },
    { name: "Subarachnoid Hemorrhage", kind: "condition", hook: "The worst headache of the patient's life, sudden and at maximum instantly — the history alone is the red flag." },
    { name: "Alzheimer Disease", kind: "condition", aka: ["dementia"], hook: "Short-term memory first, and the nursing intervention is routine and environment far more than it is medication." },
    { name: "Delirium", kind: "condition", hook: "Acute onset and fluctuating, which is what separates it from dementia — and it is reversible if the cause is found." },
    { name: "Bell Palsy", kind: "condition", hook: "One-sided facial weakness that includes the forehead — a stroke spares the forehead, and that one finding is the whole differential." },
    { name: "Trigeminal Neuralgia", kind: "condition", hook: "Lightning facial pain triggered by touch, chewing or wind, so the nursing care is about avoiding triggers as much as analgesia." },
    { name: "Migraine", kind: "condition", hook: "A dark quiet room is a real intervention, and triptans work at onset rather than at the peak." },
    { name: "Glasgow Coma Scale", kind: "skill", aka: ["GCS"], hook: "Eye, verbal, motor — 15 is normal and 8 or under means intubate, which is the number the exam builds questions around." },
    { name: "Cranial Nerve Assessment", kind: "skill", hook: "Twelve nerves, and the ones that show up on the exam are the ones that fail in a stroke — swallowing, gaze and facial symmetry." },
    { name: "Levodopa-Carbidopa", kind: "drug", aka: ["Sinemet"], hook: "Protein competes with absorption, and the on-off effect is the reason the timing is rigid." },
    { name: "Phenytoin", kind: "drug", aka: ["Dilantin"], hook: "Therapeutic 10–20 mcg/mL, gingival hyperplasia is the visible toxicity, and it is never mixed with dextrose." },
    { name: "Mannitol", kind: "drug", hook: "An osmotic diuretic for raised ICP — check for crystals before hanging, and monitor the output because it works fast." },
    { name: "Tissue Plasminogen Activator", kind: "drug", aka: ["tPA", "alteplase"], hook: "The window and the exclusion list are the nursing responsibility, and a haemorrhagic stroke is the absolute contraindication." },
    { name: "Anticonvulsants", kind: "drug", aka: ["carbamazepine", "valproate"], hook: "Never stopped abruptly, and most of them are teratogenic — which turns every one into a contraception conversation." },
    { name: "Lumbar Puncture", kind: "procedure", hook: "Flat afterwards and fluids, because the headache is the complication — and raised ICP is the reason it is not done at all." },
    { name: "Neuro Checks", kind: "skill", hook: "Level of consciousness changes first, before the pupils and long before the vital signs — which is why it is the finding to report." },
    { name: "Craniotomy Care", kind: "procedure", hook: "Positioning depends on whether the bone flap was replaced, and the exam expects you to ask rather than assume." },
    { name: "Dysphagia Management", kind: "skill", hook: "Chin tuck, upright 90 degrees, and a swallow screen before the first sip — aspiration pneumonia is what kills stroke patients later." },
  ],

  /* ---------------------------------------------------------- gastrointestinal */
  gastrointestinal: [
    { name: "GERD", kind: "condition", aka: ["acid reflux"], hook: "Nothing by mouth for three hours before lying down, and the head of the bed raised on blocks rather than on pillows." },
    { name: "Peptic Ulcer Disease", kind: "condition", aka: ["PUD"], hook: "Gastric ulcers hurt with food and duodenal ulcers are relieved by it — the one distinction a question is always built on." },
    { name: "GI Bleed", kind: "condition", aka: ["upper GI bleed"], hook: "Coffee-ground emesis is upper and melena is upper made old; bright red per rectum is lower, and the volume decides the urgency." },
    { name: "Crohn Disease", kind: "condition", hook: "Skip lesions anywhere from mouth to anus, full thickness — which is why fistulas belong to Crohn's rather than to colitis." },
    { name: "Ulcerative Colitis", kind: "condition", hook: "Continuous, colon only, mucosal — and the bloody diarrhoea is far more characteristic than in Crohn's." },
    { name: "Diverticulitis", kind: "condition", hook: "Low-fibre during the flare and high-fibre afterwards — the reversal patients and test-takers both get wrong." },
    { name: "Appendicitis", kind: "condition", hook: "Rebound tenderness at McBurney's point, and sudden relief of pain means rupture rather than recovery." },
    { name: "Cholecystitis", kind: "condition", aka: ["gallstones"], hook: "Right upper quadrant pain after a fatty meal, and Murphy's sign is the bedside finding." },
    { name: "Pancreatitis", kind: "condition", hook: "Epigastric pain boring through to the back, relieved by leaning forward — and the patient is kept NPO to rest the gland." },
    { name: "Cirrhosis", kind: "condition", hook: "Ammonia rises as the liver fails, which is why the confusion is treated with lactulose rather than with sedation." },
    { name: "Hepatic Encephalopathy", kind: "condition", hook: "Asterixis is the early sign, and the lactulose goal is two to three soft stools a day — more is the dose working, not a side effect." },
    { name: "Esophageal Varices", kind: "condition", hook: "No straining, no coughing, nothing that raises portal pressure — and a bleed is an airway emergency before it is a volume one." },
    { name: "Hepatitis", kind: "condition", aka: ["hepatitis A", "hepatitis B", "hepatitis C"], hook: "A is faecal-oral, B and C are blood-borne — which decides both the precautions and the vaccine conversation." },
    { name: "Bowel Obstruction", kind: "condition", hook: "High-pitched sounds above the obstruction and silence below, and the absence of flatus is the history that seals it." },
    { name: "Celiac Disease", kind: "condition", hook: "Gluten-free for life, and the hidden sources — sauces, medications, oats — are the teaching the exam tests." },
    { name: "Irritable Bowel Syndrome", kind: "condition", aka: ["IBS"], hook: "A diagnosis of exclusion, so the nursing role is symptom mapping and diet rather than investigation." },
    { name: "Colorectal Cancer", kind: "condition", hook: "A change in bowel habit with blood is the referral, and screening starts at 45 for average risk." },
    { name: "Hemorrhoids", kind: "condition", hook: "Sitz baths, fibre and no straining — and bleeding that is not clearly haemorrhoidal still needs a scope." },
    { name: "Peritonitis", kind: "condition", hook: "A board-like rigid abdomen with rebound tenderness — the patient lies still because movement hurts, which is itself the sign." },
    { name: "Proton Pump Inhibitors", kind: "drug", aka: ["omeprazole", "pantoprazole"], hook: "Before breakfast on an empty stomach, and long-term use costs bone density and B12." },
    { name: "H2 Blockers", kind: "drug", aka: ["famotidine"], hook: "Slower and weaker than a PPI, which is why they are the maintenance drug rather than the rescue one." },
    { name: "Antacids", kind: "drug", hook: "They interfere with the absorption of nearly everything, so the spacing rule is the nursing answer." },
    { name: "Lactulose", kind: "drug", hook: "It works by trapping ammonia in the gut, so holding it because the patient has diarrhoea is the classic wrong answer." },
    { name: "Antiemetics", kind: "drug", aka: ["ondansetron", "promethazine"], hook: "Ondansetron prolongs the QT interval, which is the monitoring nobody expects on an anti-sickness drug." },
    { name: "Nasogastric Tube", kind: "procedure", aka: ["NG tube"], hook: "Placement is confirmed by X-ray first and pH after, and never by auscultation — that method is out of date and still on wrong answers." },
    { name: "Total Parenteral Nutrition", kind: "procedure", aka: ["TPN"], hook: "Never stopped abruptly because of rebound hypoglycaemia, and glucose is checked even in a non-diabetic." },
    { name: "Colostomy Care", kind: "procedure", hook: "A beefy red stoma is healthy and a dusky one is an emergency — the colour is the assessment." },
    { name: "Paracentesis", kind: "procedure", hook: "Empty the bladder first, measure the girth before and after, and watch for hypotension as the fluid comes off." },
    { name: "Liver Function Tests", kind: "lab", aka: ["LFTs", "AST", "ALT"], hook: "ALT is the liver-specific one; AST is also muscle, which is why they are read as a pair rather than alone." },
    { name: "Stool Studies", kind: "lab", aka: ["occult blood"], hook: "Red meat, NSAIDs and vitamin C all change the result, which makes the preparation instructions the testable part." },
    { name: "Abdominal Assessment", kind: "skill", hook: "Inspect, auscultate, percuss, palpate — auscultation before touching, because palpation changes the bowel sounds you were about to hear." },
    { name: "Bariatric Surgery", kind: "procedure", hook: "Small frequent meals, no fluids with food, and dumping syndrome is the teaching that prevents the readmission." },
  ],

  /* ------------------------------------------------------- renal-genitourinary */
  "renal-genitourinary": [
    { name: "Acute Kidney Injury", kind: "condition", aka: ["AKI", "acute renal failure"], hook: "Prerenal, intrarenal, postrenal — the cause decides the fix, and fluids help the first and harm the second." },
    { name: "Chronic Kidney Disease", kind: "condition", aka: ["CKD"], hook: "Potassium, phosphate and fluid are the three things that kill, and the diet teaching is built around them in that order." },
    { name: "Dialysis", kind: "procedure", aka: ["hemodialysis"], hook: "No blood pressure, no blood draws, no IVs in the fistula arm — and a thrill and bruit checked every shift." },
    { name: "Peritoneal Dialysis", kind: "procedure", hook: "Cloudy return means peritonitis, and warm the dialysate — never in a microwave." },
    { name: "Kidney Transplant", kind: "procedure", hook: "Immunosuppression for life, so a fever is an emergency and rejection presents as pain over the graft with falling output." },
    { name: "Nephrotic Syndrome", kind: "condition", hook: "Massive proteinuria with oedema and low albumin — the protein is leaving rather than being retained." },
    { name: "Glomerulonephritis", kind: "condition", hook: "Tea-coloured urine after a strep infection, which ties it back to the sore throat two weeks earlier." },
    { name: "Urinary Tract Infection", kind: "condition", aka: ["UTI"], hook: "In an older adult the first sign is confusion, not dysuria — the single most-tested geriatric presentation there is." },
    { name: "Pyelonephritis", kind: "condition", hook: "Flank pain and fever turns a bladder infection into a kidney one, and that changes the route of the antibiotic." },
    { name: "Kidney Stones", kind: "condition", aka: ["renal calculi", "nephrolithiasis"], hook: "Strain all urine — the stone that is caught decides the diet that prevents the next one." },
    { name: "Benign Prostatic Hyperplasia", kind: "condition", aka: ["BPH"], hook: "Hesitancy and a weak stream, and the alpha blocker drops blood pressure on the first dose at night." },
    { name: "Prostate Cancer", kind: "condition", hook: "PSA screening is a shared decision rather than a rule, and the nursing role is the conversation." },
    { name: "Bladder Cancer", kind: "condition", hook: "Painless haematuria is the presenting sign, and painless is what makes patients wait." },
    { name: "Urinary Retention", kind: "condition", hook: "A distended bladder with small frequent voids is overflow, not frequency — and a bladder scan settles it in a minute." },
    { name: "Urinary Incontinence", kind: "condition", hook: "Stress, urge, overflow and functional have four different interventions, so naming the type is the assessment." },
    { name: "Hyperkalemia", kind: "condition", hook: "Peaked T waves before anything the patient feels, and calcium gluconate protects the heart without lowering the potassium." },
    { name: "Hyponatremia", kind: "condition", hook: "Corrected slowly — too fast causes osmotic demyelination, which is permanent and iatrogenic." },
    { name: "Metabolic Acidosis", kind: "condition", hook: "Kussmaul respirations are the compensation, so the fast deep breathing is the body helping rather than a lung problem." },
    { name: "Fluid Volume Deficit", kind: "condition", aka: ["dehydration"], hook: "Daily weight is the most sensitive measure there is — a kilogram is a litre, and intake charts lie." },
    { name: "Fluid Volume Excess", kind: "condition", hook: "Crackles and jugular distension arrive before the oedema is visible, which is why the chest is assessed first." },
    { name: "Diuretic Therapy", kind: "drug", hook: "Loop, thiazide and potassium-sparing move potassium three different ways — the class decides the monitoring." },
    { name: "Phosphate Binders", kind: "drug", aka: ["sevelamer", "calcium acetate"], hook: "Taken with meals, because they bind the phosphate in the food rather than in the blood." },
    { name: "Erythropoietin", kind: "drug", aka: ["epoetin alfa"], hook: "It raises haemoglobin and blood pressure together, and iron must be adequate or it does nothing." },
    { name: "Urinalysis", kind: "lab", hook: "Nitrites and leukocyte esterase point at infection; casts point at the kidney rather than the bladder." },
    { name: "BUN and Creatinine", kind: "lab", hook: "A BUN rising faster than creatinine is dehydration; both rising together is the kidney itself." },
    { name: "GFR", kind: "lab", aka: ["glomerular filtration rate"], hook: "It stages the disease and it is what drug doses are adjusted against — the one number that changes prescribing." },
    { name: "Urinary Catheterization", kind: "procedure", hook: "Sterile technique, and the real exam point is that the catheter comes out as early as possible because CAUTI risk is daily." },
    { name: "Bladder Irrigation", kind: "procedure", aka: ["CBI"], hook: "Output minus irrigant is the true urine output, and the rate is titrated to keep the drainage pink rather than red." },
    { name: "Intake and Output", kind: "skill", hook: "Ice chips count as half their volume, and the omissions are what make the chart wrong." },
    { name: "Sexually Transmitted Infections", kind: "condition", aka: ["STI"], hook: "Partner treatment is part of the nursing plan, and reporting requirements vary by organism." },
  ],

  /* ------------------------------------------------------- maternity-newborn */
  "maternity-newborn": [
    { name: "Preeclampsia", kind: "condition", hook: "Hypertension with proteinuria after 20 weeks, and the headache with visual changes is the sign that it is about to become eclampsia." },
    { name: "Eclampsia", kind: "condition", hook: "Seizure in a preeclamptic patient — magnesium sulfate, side-lying, and protect the airway." },
    { name: "HELLP Syndrome", kind: "condition", hook: "Haemolysis, elevated liver enzymes, low platelets — right upper quadrant pain in a pregnant patient is not indigestion." },
    { name: "Gestational Diabetes", kind: "condition", hook: "Screened at 24–28 weeks, and the macrosomia is what turns it into a delivery problem." },
    { name: "Placenta Previa", kind: "condition", hook: "Painless bright red bleeding — and absolutely no vaginal examination, which is the answer to most questions on it." },
    { name: "Placental Abruption", kind: "condition", hook: "Painful dark bleeding with a rigid board-like uterus — the pain is what separates it from previa." },
    { name: "Ectopic Pregnancy", kind: "condition", hook: "Unilateral pain with amenorrhoea, and shoulder pain means it has ruptured into the abdomen." },
    { name: "Hyperemesis Gravidarum", kind: "condition", hook: "Weight loss and ketonuria rather than ordinary morning sickness — it is a fluid and electrolyte problem." },
    { name: "Preterm Labor", kind: "condition", hook: "Tocolytics buy time for the steroids, and it is the steroids that save the lungs." },
    { name: "Postpartum Hemorrhage", kind: "condition", aka: ["PPH"], hook: "Massage the fundus first — a boggy uterus is the cause far more often than a laceration." },
    { name: "Postpartum Depression", kind: "condition", hook: "Past two weeks and interfering with care of the infant is the line between blues and depression." },
    { name: "Fetal Heart Monitoring", kind: "skill", hook: "VEAL CHOP: variable is cord, early is head, accelerations are OK, late is placental — and late is the one to act on." },
    { name: "Labor Stages", kind: "concept", hook: "The second stage is pushing and the third is the placenta — and the fourth, the first two hours, is where the haemorrhage happens." },
    { name: "Cesarean Section", kind: "procedure", aka: ["C-section"], hook: "It is abdominal surgery and a birth at once, so the assessment covers the incision, the fundus and the lochia together." },
    { name: "Epidural Anesthesia", kind: "procedure", hook: "Hypotension is the expected complication — preload with fluid, and position left lateral if it happens." },
    { name: "Magnesium Sulfate", kind: "drug", hook: "Loss of the deep tendon reflexes is the first sign of toxicity, and calcium gluconate is the antidote at the bedside." },
    { name: "Oxytocin", kind: "drug", aka: ["Pitocin"], hook: "Stop it for tachysystole or a non-reassuring fetal heart rate — the drug is titrated to the fetus, not to the contraction pattern alone." },
    { name: "Rho(D) Immune Globulin", kind: "drug", aka: ["RhoGAM"], hook: "At 28 weeks and within 72 hours of delivery for an Rh-negative mother with an Rh-positive baby." },
    { name: "Terbutaline", kind: "drug", hook: "A tocolytic that causes maternal tachycardia — expected, and still the reason it is stopped." },
    { name: "Betamethasone", kind: "drug", hook: "Given to the mother to mature the fetal lungs, and it needs 24–48 hours to work." },
    { name: "APGAR Score", kind: "skill", hook: "At one and five minutes, and it describes the transition rather than predicts the outcome." },
    { name: "Newborn Assessment", kind: "skill", hook: "Respiratory rate 30–60, heart rate 110–160 — numbers that would be an emergency in an adult are normal here." },
    { name: "Neonatal Jaundice", kind: "condition", hook: "Within the first 24 hours it is pathological; after that it is usually physiological — the timing is the whole assessment." },
    { name: "Breastfeeding Support", kind: "skill", hook: "The latch is the intervention for nearly every problem, including the nipple pain that ends feeding early." },
    { name: "Neonatal Abstinence Syndrome", kind: "condition", aka: ["NAS"], hook: "A high-pitched cry with tremors and poor feeding — the environment is dimmed and quiet, and swaddling is treatment." },
    { name: "Respiratory Distress Syndrome", kind: "condition", aka: ["RDS", "newborn RDS"], hook: "Surfactant deficiency in the preterm infant — grunting and nasal flaring are the early signs." },
    { name: "Postpartum Assessment", kind: "skill", aka: ["BUBBLE-HE"], hook: "Breasts, uterus, bladder, bowel, lochia, episiotomy — a full bladder displaces the fundus and causes the bleeding." },
    { name: "Lochia", kind: "concept", hook: "Rubra, serosa, alba in that order — going backwards is a sign of retained products or too much activity." },
    { name: "Contraception Counseling", kind: "concept", hook: "The method has to fit the life, which is why the nursing answer is rarely the most effective option on the list." },
    { name: "Prenatal Nutrition", kind: "concept", hook: "Folic acid before conception rather than after, because the neural tube closes by week four." },
  ],

  /* ---------------------------------------------------------------- pediatrics */
  pediatrics: [
    { name: "Growth and Development Milestones", kind: "concept", hook: "A missed milestone is a referral rather than a reassurance, and the exam tests the red flags rather than the averages." },
    { name: "Childhood Immunizations", kind: "concept", hook: "A mild illness is not a contraindication, and the live vaccines are the ones immunocompromised children cannot have." },
    { name: "Croup", kind: "condition", hook: "A barking seal-like cough that improves in cool air — which is why the drive to hospital sometimes fixes it." },
    { name: "Bronchiolitis", kind: "condition", aka: ["RSV"], hook: "Under two, wheezing with a runny nose, and the treatment is supportive — suction and fluids, not antibiotics." },
    { name: "Otitis Media", kind: "condition", hook: "Infants pull at the ear and get irritable; the short flat eustachian tube is why it is a childhood disease." },
    { name: "Febrile Seizures", kind: "condition", hook: "It is the rate of rise rather than the height of the fever, which is why prophylactic paracetamol does not prevent them." },
    { name: "Kawasaki Disease", kind: "condition", hook: "Five days of fever with a strawberry tongue and peeling hands — the coronary aneurysm is what makes it urgent." },
    { name: "Sickle Cell Crisis", kind: "condition", hook: "Hydration and oxygen and analgesia — and the pain is real and under-treated more often than it is exaggerated." },
    { name: "Cystic Fibrosis in Children", kind: "condition", hook: "A salty-tasting infant is the classic history, and the enzymes go with every meal for life." },
    { name: "Asthma in Children", kind: "condition", hook: "A spacer is not optional for a child — without one most of the dose lands in the mouth." },
    { name: "Type 1 Diabetes in Children", kind: "condition", hook: "Growth, school and sport all change the insulin need, so the plan is renegotiated rather than set." },
    { name: "Congenital Heart Defects", kind: "condition", hook: "Poor feeding with sweating and slow weight gain is heart failure in an infant — they tire before they finish the bottle." },
    { name: "Tetralogy of Fallot", kind: "condition", hook: "Tet spells are relieved by the knee-chest position, which an older child adopts by squatting without being taught." },
    { name: "Pyloric Stenosis", kind: "condition", hook: "Projectile vomiting in a hungry three-week-old with an olive-shaped mass — hunger after vomiting is the discriminator." },
    { name: "Intussusception", kind: "condition", hook: "Currant-jelly stool with episodic drawing up of the legs, and the pain comes in waves." },
    { name: "Epiglottitis in Children", kind: "condition", hook: "Drooling, tripod position, no cough — and nothing goes near that throat until the airway is secured." },
    { name: "Cleft Lip and Palate", kind: "condition", hook: "Feeding comes before surgery, and the elbow restraints afterwards protect the repair." },
    { name: "Spina Bifida", kind: "condition", hook: "The sac is covered with sterile saline gauze and the infant is prone — and latex allergy follows this diagnosis for life." },
    { name: "Hydrocephalus", kind: "condition", hook: "A bulging fontanelle with a rising head circumference and the setting-sun eyes — measure rather than estimate." },
    { name: "Cerebral Palsy", kind: "condition", hook: "It is non-progressive, which reframes the whole care plan around function rather than around decline." },
    { name: "Leukemia in Children", kind: "condition", aka: ["ALL"], hook: "Bruising, pallor and bone pain, and the nursing priority through treatment is infection rather than the cancer." },
    { name: "Pediatric Dosage Calculation", kind: "skill", hook: "Weight-based in milligrams per kilogram, and a safe-dose-range check before every administration is the standard, not a precaution." },
    { name: "Pediatric Pain Assessment", kind: "skill", aka: ["FLACC", "Wong-Baker"], hook: "The tool follows the age — a preverbal child is scored on behaviour, and asking a two-year-old to rate pain gets you nothing." },
    { name: "Car Seat Safety", kind: "concept", hook: "Rear-facing until at least two, back seat until thirteen — and this is on the exam because it is the leading cause of death." },
    { name: "Poisoning and Ingestion", kind: "condition", hook: "Poison control before anything, and never induce vomiting — the rule changed and the old answer is still tempting." },
    { name: "Child Abuse Recognition", kind: "skill", hook: "An injury that does not match the history or the developmental stage is the finding, and reporting is mandatory rather than discretionary." },
    { name: "Failure to Thrive", kind: "condition", hook: "Plotting on the growth chart over time is the diagnosis; a single weight tells you nothing." },
    { name: "Dehydration in Infants", kind: "condition", hook: "A sunken fontanelle and fewer wet nappies, and weight loss is the measure — infants decompensate fast." },
    { name: "Autism Spectrum Disorder", kind: "condition", hook: "Routine and predictability are the interventions, and a change of nurse can undo a morning's progress." },
    { name: "Pediatric Communication", kind: "skill", hook: "Preparation is timed to the age — an hour before for a preschooler, days for an adolescent." },
  ],

  /* -------------------------------------------------------------- mental-health */
  "mental-health": [
    { name: "Major Depressive Disorder", kind: "condition", aka: ["depression"], hook: "The highest suicide risk is as the energy returns and the mood has not — which is why improvement is monitored more closely, not less." },
    { name: "Bipolar Disorder", kind: "condition", hook: "During mania the priority is physical — they will not eat or sleep, and finger foods are a real intervention." },
    { name: "Schizophrenia", kind: "condition", hook: "Never argue with a delusion and never agree with it; acknowledge the feeling and present reality without debate." },
    { name: "Generalized Anxiety Disorder", kind: "condition", hook: "Severe anxiety narrows perception, so teaching does not land until the anxiety comes down first." },
    { name: "Panic Disorder", kind: "condition", hook: "Stay with the patient and keep the sentences short — a panicking person cannot process a long instruction." },
    { name: "PTSD", kind: "condition", aka: ["post-traumatic stress disorder"], hook: "Triggers are specific and personal, so the care plan is built from the patient's own list rather than a standard one." },
    { name: "Obsessive-Compulsive Disorder", kind: "condition", aka: ["OCD"], hook: "The ritual is not interrupted abruptly — it is the anxiety management, and time is built into the schedule for it." },
    { name: "Anorexia Nervosa", kind: "condition", hook: "Refeeding syndrome is the thing that kills during treatment, and the phosphate is what to watch." },
    { name: "Bulimia Nervosa", kind: "condition", hook: "Hypokalaemia from purging is the cardiac risk, and the dental erosion is often the first visible sign." },
    { name: "Substance Use Disorder", kind: "condition", hook: "Alcohol withdrawal can kill and opioid withdrawal is miserable but rarely fatal — which is the opposite of what patients expect." },
    { name: "Alcohol Withdrawal", kind: "condition", aka: ["delirium tremens"], hook: "Peaks at 24–48 hours, DTs at 48–72, and benzodiazepines are the treatment rather than the sedation." },
    { name: "Suicide Risk Assessment", kind: "skill", hook: "Ask directly — asking does not plant the idea, and a specific plan with means available is the highest-risk answer." },
    { name: "Therapeutic Communication", kind: "skill", hook: "Open-ended, reflective, silent when silence is working — and 'why' questions put a patient on the defensive." },
    { name: "Defense Mechanisms", kind: "concept", hook: "Naming it is only useful if it changes the response, which is why the exam pairs identification with an intervention." },
    { name: "Milieu Therapy", kind: "concept", hook: "The environment is the treatment — structure, safety and predictability do work that no conversation does." },
    { name: "Restraints and Seclusion", kind: "concept", hook: "The last resort with a time-limited order, and the monitoring schedule is where most violations happen." },
    { name: "SSRIs", kind: "drug", aka: ["fluoxetine", "sertraline"], hook: "Two to four weeks for the mood, and serotonin syndrome is the emergency the patient needs to be able to recognise." },
    { name: "Lithium", kind: "drug", hook: "0.6–1.2 mEq/L, and anything that changes sodium or fluid changes the level — which makes a hot day a clinical event." },
    { name: "Antipsychotics", kind: "drug", aka: ["haloperidol", "risperidone"], hook: "Extrapyramidal symptoms early, tardive dyskinesia late, and neuroleptic malignant syndrome at any time." },
    { name: "Benzodiazepines", kind: "drug", aka: ["lorazepam", "diazepam"], hook: "Short term only, flumazenil reverses it, and combining with alcohol is the respiratory arrest." },
    { name: "MAOIs", kind: "drug", hook: "Tyramine-free diet — aged cheese, cured meat, red wine — because the hypertensive crisis is fast and fatal." },
    { name: "Tricyclic Antidepressants", kind: "drug", aka: ["amitriptyline"], hook: "Lethal in overdose, which shapes how much is dispensed to a patient at risk." },
    { name: "Electroconvulsive Therapy", kind: "procedure", aka: ["ECT"], hook: "Short-term memory loss is expected and temporary, and the consent conversation is the nursing role." },
    { name: "Crisis Intervention", kind: "skill", hook: "Safety, then the immediate problem, and nothing about long-term insight until the crisis has passed." },
    { name: "De-escalation", kind: "skill", hook: "Space, calm voice, one speaker — and an exit route for both of you, which is the part that gets forgotten." },
    { name: "Grief and Loss", kind: "concept", hook: "The stages are not a sequence, and a patient who is angry has not skipped a step." },
    { name: "Serotonin Syndrome", kind: "condition", hook: "Agitation, hyperreflexia, hyperthermia — and it is the drug combination rather than the dose that causes it." },
    { name: "Neuroleptic Malignant Syndrome", kind: "condition", aka: ["NMS"], hook: "Lead-pipe rigidity with a very high fever — stop the drug, cool the patient, and it is a medical emergency." },
  ],

  /* -------------------------------------------------------------- pharmacology */
  pharmacology: [
    { name: "Medication Rights", kind: "concept", aka: ["six rights", "five rights"], hook: "The rights are a process, not a checklist — most errors survive all six because the check was performed rather than done." },
    { name: "Antibiotics", kind: "drug", aka: ["penicillin", "cephalosporin"], hook: "The full course, culture before the first dose, and the cross-sensitivity between penicillins and cephalosporins." },
    { name: "Vancomycin", kind: "drug", hook: "Infusion-related flushing is a rate problem rather than an allergy, and the trough is drawn before the dose." },
    { name: "Aminoglycosides", kind: "drug", aka: ["gentamicin"], hook: "Ototoxic and nephrotoxic — the hearing loss is permanent and the kidney injury usually is not." },
    { name: "Opioid Analgesics", kind: "drug", aka: ["morphine", "hydromorphone"], hook: "Respiratory rate before the dose, naloxone available, and constipation is treated prophylactically rather than reactively." },
    { name: "NSAIDs", kind: "drug", aka: ["ibuprofen", "naproxen"], hook: "GI bleeding and kidney injury are the two, and they compound with steroids and with age." },
    { name: "Acetaminophen", kind: "drug", aka: ["paracetamol", "Tylenol"], hook: "The ceiling is the liver, and the overdose is usually accidental because it is in everything." },
    { name: "Anticoagulant Reversal", kind: "concept", hook: "Vitamin K for warfarin, protamine for heparin, and knowing which is which is a patient-safety question rather than trivia." },
    { name: "Insulin Safety", kind: "concept", hook: "A high-alert drug: independent double-check, never abbreviate units, and never borrow between patients." },
    { name: "Drug Interactions", kind: "concept", hook: "Grapefruit, warfarin and St John's wort account for a disproportionate share of the interactions the exam tests." },
    { name: "Pharmacokinetics", kind: "concept", hook: "Absorption, distribution, metabolism, excretion — and it is the failing liver or kidney that turns a normal dose into an overdose." },
    { name: "Therapeutic Drug Levels", kind: "lab", hook: "Peak and trough are timed to the dose, and a level drawn at the wrong time is worse than no level at all." },
    { name: "Antidotes", kind: "concept", hook: "A short list that appears constantly — naloxone, flumazenil, protamine, vitamin K, acetylcysteine, calcium gluconate." },
    { name: "IV Push Medications", kind: "procedure", hook: "The rate is part of the order, and pushing fast is how a safe drug becomes a cardiac event." },
    { name: "Medication Administration Routes", kind: "concept", hook: "Route changes onset and dose — an oral dose given IV is not the same drug at the same strength." },
    { name: "Pediatric and Geriatric Dosing", kind: "concept", hook: "Start low and go slow at one end, weight-based at the other, and renal function underlies both." },
    { name: "High-Alert Medications", kind: "concept", hook: "Insulin, heparin, opioids, concentrated electrolytes — the list exists because these are what harm patients when they go wrong." },
    { name: "Look-Alike Sound-Alike Drugs", kind: "concept", hook: "Tall-man lettering exists because hydralazine and hydroxyzine have been swapped enough times to need it." },
    { name: "Immunosuppressants", kind: "drug", aka: ["cyclosporine", "tacrolimus"], hook: "Infection risk is the whole nursing plan, and a fever is investigated rather than observed." },
    { name: "Chemotherapy Agents", kind: "drug", hook: "The nadir is when the counts bottom out at 7–10 days, and that is when neutropenic precautions matter most." },
    { name: "Antivirals", kind: "drug", aka: ["acyclovir", "oseltamivir"], hook: "They shorten rather than cure, and the timing window is why the history matters." },
    { name: "Anticholinergics", kind: "drug", hook: "Dry as a bone, red as a beet, blind as a bat — and in an older adult it presents as confusion." },
    { name: "Antihistamines", kind: "drug", aka: ["diphenhydramine"], hook: "Sedating in the young, deliriant in the old — the same drug with two different risk profiles." },
    { name: "Vasopressors", kind: "drug", aka: ["norepinephrine", "dopamine"], hook: "Extravasation causes tissue necrosis, which is why the site is checked more often than the pressure." },
    { name: "Blood Products", kind: "procedure", hook: "Two-nurse verification, stay for the first fifteen minutes, and stop at the first sign of a reaction." },
    { name: "Herbal Supplements", kind: "concept", hook: "Patients do not consider them medication and will not mention them unless asked specifically." },
  ],

  /* ------------------------------------------------------------------ med-surg */
  "med-surg": [
    { name: "Preoperative Care", kind: "concept", hook: "The consent is verified rather than obtained by the nurse, and the allergy and NPO status are the two that stop a case." },
    { name: "Postoperative Care", kind: "concept", hook: "Airway, then bleeding, then pain — and the first assessment is a full set of vitals against the pre-op baseline." },
    { name: "Wound Healing", kind: "concept", hook: "Primary, secondary and tertiary intention heal at different speeds, and protein and vitamin C are the nutrition that decides it." },
    { name: "Pressure Injuries", kind: "condition", aka: ["pressure ulcers", "bedsores"], hook: "Staged by what is visible, and an unstageable wound is unstageable until the slough comes off." },
    { name: "Sepsis", kind: "condition", hook: "Cultures before antibiotics, and the hour-one bundle — the delay is what turns sepsis into septic shock." },
    { name: "Burns", kind: "condition", hook: "Airway first if there is any facial involvement, then the Parkland formula — half in the first eight hours from the time of injury." },
    { name: "Fractures", kind: "condition", hook: "The five Ps distal to the injury, and pain out of proportion is compartment syndrome until it is excluded." },
    { name: "Compartment Syndrome", kind: "condition", hook: "Pain unrelieved by opioids with a tight compartment — do not elevate above the heart and do not ice it." },
    { name: "Total Hip Replacement", kind: "procedure", hook: "No adduction past midline, no flexion past 90, no internal rotation — three rules that prevent the dislocation." },
    { name: "Total Knee Replacement", kind: "procedure", hook: "Continuous passive motion and early mobilisation, and the pain is managed to allow the physiotherapy rather than after it." },
    { name: "Traction Care", kind: "procedure", hook: "Weights hang free and never come off without an order — the most commonly broken rule on the ward." },
    { name: "Casts and Splints", kind: "procedure", hook: "Neurovascular checks distal to the cast, and nothing goes down it — the itch is what leads to the skin injury." },
    { name: "Osteoarthritis", kind: "condition", hook: "Pain with use that improves with rest, and morning stiffness under thirty minutes — the opposite of rheumatoid." },
    { name: "Rheumatoid Arthritis", kind: "condition", hook: "Symmetrical small joints with morning stiffness over an hour, and it is systemic rather than mechanical." },
    { name: "Osteoporosis", kind: "condition", hook: "Bisphosphonates are taken upright with a full glass of water and nothing else for 30 minutes." },
    { name: "Anemia", kind: "condition", hook: "Iron with vitamin C and not with calcium, and the stools going black is expected rather than a bleed." },
    { name: "Leukemia", kind: "condition", hook: "The white count is high and useless — the patient is neutropenic in the middle of a high white cell count." },
    { name: "Lymphoma", kind: "condition", hook: "Painless lymphadenopathy with night sweats and weight loss — the B symptoms are what stage it." },
    { name: "HIV and AIDS", kind: "condition", hook: "The CD4 count predicts which opportunistic infection, which is why it drives the prophylaxis." },
    { name: "Lupus", kind: "condition", aka: ["SLE"], hook: "Sun exposure triggers flares, and the kidney is what determines the prognosis." },
    { name: "Gout", kind: "condition", hook: "Acute is colchicine and NSAIDs; allopurinol is prevention and will make an acute attack worse." },
    { name: "Cancer Pain Management", kind: "concept", hook: "Around the clock rather than as needed, and there is no ceiling on an opioid dose in terminal pain." },
    { name: "Neutropenic Precautions", kind: "concept", hook: "No fresh flowers, no raw food, and a fever is the only sign of infection they may be able to mount." },
    { name: "Radiation Therapy", kind: "procedure", hook: "Do not wash off the markings, no lotions on the field, and fatigue is universal rather than a complication." },
    { name: "Palliative and End-of-Life Care", kind: "concept", hook: "Comfort is the goal and the family is the patient too — and the exam tests whether you stop the interventions that no longer serve." },
    { name: "Deep Vein Thrombosis Prevention", kind: "concept", hook: "Early mobilisation beats every device, and sequential compression is worthless while it is off in the cupboard." },
    { name: "Surgical Site Infection", kind: "condition", hook: "It presents at day three to five, which is often after discharge — so the teaching is what catches it." },
    { name: "Blood Transfusion Reactions", kind: "condition", hook: "Stop the transfusion, keep the line with saline through new tubing — the order of those two is the question." },
    { name: "Immobility Complications", kind: "concept", hook: "Every system fails: atelectasis, DVT, pressure injury, constipation, contracture — which makes mobilising the highest-value intervention on the ward." },
    { name: "Fluid and Electrolyte Balance", kind: "concept", hook: "Sodium follows water and potassium follows pH — two rules that explain most of the abnormal panels on the exam." },
  ],

  /* ---------------------------------------------------------------- safe-care */
  "safe-care": [
    { name: "Infection Control Precautions", kind: "concept", hook: "Standard for everyone, then contact, droplet or airborne — and the room and the mask follow from the organism." },
    { name: "Hand Hygiene", kind: "skill", hook: "Soap and water for C. difficile and for visible soiling; alcohol gel does not kill the spore." },
    { name: "Personal Protective Equipment", kind: "skill", aka: ["PPE"], hook: "Doffing is where contamination happens, which is why the order out matters more than the order in." },
    { name: "Patient Identification", kind: "skill", hook: "Two identifiers, never the room number — and the armband is checked rather than the patient asked to confirm a name." },
    { name: "Fall Prevention", kind: "concept", hook: "Bed low, call bell in reach, non-slip footwear — and toileting rounds prevent more falls than any alarm." },
    { name: "Restraint Alternatives", kind: "concept", hook: "Every alternative is tried and documented first, because the order requires it and because they usually work." },
    { name: "Medication Error Prevention", kind: "concept", hook: "Barcode scanning, independent double-checks on high-alert drugs, and never a verbal order except in an emergency." },
    { name: "Handoff Communication", kind: "skill", aka: ["SBAR"], hook: "Situation, background, assessment, recommendation — and the recommendation is the part nurses leave out." },
    { name: "Informed Consent", kind: "concept", hook: "The provider obtains it and the nurse witnesses the signature — a nurse explaining the procedure has stepped outside the role." },
    { name: "Advance Directives", kind: "concept", hook: "A living will and a healthcare proxy are different documents, and the proxy speaks when the patient cannot." },
    { name: "Incident Reporting", kind: "concept", hook: "The report is not part of the chart and the chart does not mention it — a distinction that appears on the exam." },
    { name: "Delegation Principles", kind: "concept", hook: "The five rights of delegation, and assessment, teaching and evaluation never go to unlicensed personnel." },
    { name: "Scope of Practice", kind: "concept", hook: "What an LPN can do differs by state, and the exam tests the federal floor rather than any one state's ceiling." },
    { name: "HIPAA and Confidentiality", kind: "concept", hook: "Need to know is the standard, and the lift conversation is the most common real-world breach." },
    { name: "Mandatory Reporting", kind: "concept", hook: "Suspicion is the threshold rather than proof — waiting for certainty is itself the violation." },
    { name: "Emergency Preparedness", kind: "concept", hook: "Triage tags sort by survivability with the resources available, which is why the sickest patient is not always first." },
    { name: "Fire Safety", kind: "skill", aka: ["RACE", "PASS"], hook: "Rescue, alarm, contain, extinguish — and the order is what makes it a protocol rather than a slogan." },
    { name: "Safe Patient Handling", kind: "skill", hook: "Use the equipment — back injuries end nursing careers and the lift is always available in the exam's world." },
    { name: "Surgical Time Out", kind: "skill", hook: "Everyone stops, and any member of the team can halt the procedure — including the nurse." },
    { name: "Isolation Precautions by Disease", kind: "concept", hook: "TB and measles and varicella are airborne; influenza and pertussis are droplet — the list is short and worth knowing cold." },
    { name: "Latex Allergy", kind: "concept", hook: "Spina bifida and repeated catheterisation are the histories that predict it, and banana and avocado cross-react." },
    { name: "Equipment Safety", kind: "concept", hook: "A malfunctioning device is removed from service and reported — not repaired at the bedside." },
  ],

  /* -------------------------------------------------------------- psychosocial */
  psychosocial: [
    { name: "Cultural Competence", kind: "concept", hook: "Ask rather than assume — the exam's correct answer is nearly always the one that checks with this patient." },
    { name: "Spiritual Care", kind: "concept", hook: "Facilitating is the nursing role: offering the chaplain, protecting the space, not sharing your own belief." },
    { name: "Coping Mechanisms", kind: "concept", hook: "Adaptive and maladaptive are judged by outcome, not by whether they look healthy." },
    { name: "Family Dynamics", kind: "concept", hook: "The identified patient is not always the one in the bed, which changes who the teaching is directed at." },
    { name: "Sensory Alterations", kind: "concept", hook: "Approach a hearing-impaired patient face-on and a visually impaired one by announcing yourself — startling is avoidable." },
    { name: "Body Image Disturbance", kind: "concept", hook: "After an ostomy or a mastectomy, the first look is a nursing event that is planned rather than stumbled into." },
    { name: "Sexuality and Illness", kind: "concept", hook: "Patients will not raise it, so the nurse does — permission to ask is the intervention." },
    { name: "Therapeutic Relationship", kind: "concept", hook: "Orientation, working, termination — and termination is planned from the start rather than announced at the end." },
    { name: "Anger and Aggression", kind: "skill", hook: "Anger is usually fear or loss of control, and responding to the emotion rather than the words de-escalates faster." },
    { name: "Death and Dying", kind: "concept", hook: "Presence beats reassurance, and 'it will be alright' is the answer that closes the conversation." },
    { name: "Support Systems", kind: "concept", hook: "Assessing who is actually there changes the discharge plan more than any teaching does." },
    { name: "Stress and Adaptation", kind: "concept", hook: "The general adaptation syndrome explains why a long admission harms patients who were coping on day one." },
    { name: "Health Beliefs and Behaviour", kind: "concept", hook: "Perceived susceptibility beats accurate information — which is why facts alone change nothing." },
    { name: "End-of-Life Communication", kind: "skill", hook: "Silence after bad news is a tool, and filling it is the most common mistake." },
    { name: "Patient Advocacy", kind: "concept", hook: "Advocating means acting on the patient's wishes, including when they differ from the family's or your own." },
  ],

  /* ------------------------------------------------------------- basic-care */
  "basic-care": [
    { name: "Vital Signs", kind: "skill", hook: "A trend beats a value — one abnormal reading in a stable patient is rechecked before it is reported." },
    { name: "Pain Assessment", kind: "skill", hook: "Pain is what the patient says it is, and the exam holds that line even when the vital signs are normal." },
    { name: "Nutrition and Diet Therapy", kind: "concept", hook: "Therapeutic diets are prescriptions — a renal diet and a cardiac diet contradict each other and the priority has to be chosen." },
    { name: "Enteral Feeding", kind: "procedure", hook: "Head of the bed at 30–45 degrees and residual checked per protocol — aspiration is the complication that kills." },
    { name: "Elimination", kind: "concept", hook: "The first postoperative void and the first flatus are both milestones that gate discharge." },
    { name: "Constipation Management", kind: "concept", hook: "Fibre, fluid and movement before any laxative — and opioids make it a certainty rather than a risk." },
    { name: "Sleep and Rest", kind: "concept", hook: "Clustering care so a patient gets a 90-minute block is a real intervention with measurable outcomes." },
    { name: "Mobility and Positioning", kind: "skill", hook: "Turn every two hours, and semi-Fowler's for breathing versus side-lying for aspiration risk are different answers to different questions." },
    { name: "Range of Motion Exercises", kind: "procedure", hook: "Passive maintains the joint and active maintains the muscle — knowing which was ordered is the point." },
    { name: "Personal Hygiene", kind: "skill", hook: "Bathing is the assessment opportunity, which is why it is not the first thing delegated on a changing patient." },
    { name: "Oral Care", kind: "skill", hook: "In a ventilated patient it is infection prevention rather than comfort, and it is scheduled." },
    { name: "Skin Assessment", kind: "skill", hook: "Braden score on admission and a daily head-to-toe — the heels and the sacrum are where it starts." },
    { name: "Wound Dressing", kind: "procedure", hook: "Wet-to-dry is mechanical debridement, and it is painful — which is why moist wound healing replaced it." },
    { name: "Ostomy Care", kind: "procedure", hook: "The appliance is cut to the stoma, and skin breakdown around it is the complication patients present with." },
    { name: "Comfort Measures", kind: "concept", hook: "Repositioning, temperature, light and noise change reported pain scores without any drug." },
    { name: "Assistive Devices", kind: "skill", hook: "Cane on the strong side, crutches with weight on the hands not the axillae, walker one step ahead." },
    { name: "Hot and Cold Therapy", kind: "procedure", hook: "Cold first for 24–48 hours then heat, and never on an area with impaired sensation." },
    { name: "Bladder Training", kind: "concept", hook: "Scheduled voiding with gradually extended intervals — behavioural before pharmacological." },
    { name: "Specimen Collection", kind: "skill", hook: "Clean-catch technique, first morning urine, and the culture before the antibiotic." },
    { name: "Patient Positioning", kind: "skill", hook: "Trendelenburg for hypotension has largely gone, and the exam has caught up — flat with legs raised is the answer now." },
  ],

  /* ----------------------------------------------------------- risk-reduction */
  "risk-reduction": [
    { name: "Diagnostic Test Preparation", kind: "concept", hook: "NPO status, allergies and consent are the three that stop a test at the door." },
    { name: "Contrast Media Reactions", kind: "concept", hook: "Shellfish allergy is a myth that persists; iodine sensitivity and kidney function are the real questions." },
    { name: "Laboratory Value Interpretation", kind: "skill", hook: "The critical values are a short list, and recognising one is the difference between a call and a code." },
    { name: "Potassium Imbalances", kind: "condition", hook: "Both high and low cause arrhythmias, which is why the ECG rather than the symptom is the monitor." },
    { name: "Sodium Imbalances", kind: "condition", hook: "Neurological symptoms in both directions, and the correction rate is what causes the harm." },
    { name: "Calcium Imbalances", kind: "condition", hook: "Low calcium is twitchy and high calcium is sluggish — one sentence that sorts the presentations." },
    { name: "Magnesium Imbalances", kind: "condition", hook: "Magnesium follows potassium, so a potassium that will not correct is usually a magnesium problem." },
    { name: "Acid-Base Balance", kind: "concept", hook: "Compensation tells you how long it has been going on, which is often what the question is really asking." },
    { name: "Post-Procedure Complications", kind: "concept", hook: "Bleeding, infection and the specific complication of that procedure — the third is what the exam tests." },
    { name: "Venous Access Device Care", kind: "procedure", aka: ["PICC", "central line"], hook: "Air embolism on insertion and removal, which is why the patient is positioned and told to bear down." },
    { name: "Infiltration and Extravasation", kind: "condition", hook: "Cool and swollen is infiltration; a vesicant makes it extravasation and an emergency." },
    { name: "Allergic Reactions and Anaphylaxis", kind: "condition", hook: "Epinephrine first, intramuscular, lateral thigh — before the antihistamine and before the steroid." },
    { name: "Aspiration Prevention", kind: "concept", hook: "Upright, small bites, chin tuck, no straws — and a swallow assessment before the first oral intake." },
    { name: "Hospital-Acquired Infections", kind: "concept", hook: "CAUTI, CLABSI, VAP and SSI — every one of them has a bundle, and the bundle is the exam answer." },
    { name: "Perioperative Complications", kind: "concept", hook: "Malignant hyperthermia is rare, fast and fatal, and dantrolene is the drug to name." },
    { name: "Skin Cancer Screening", kind: "concept", aka: ["ABCDE"], hook: "Asymmetry, border, colour, diameter, evolving — and evolving is the one patients notice." },
    { name: "Cancer Screening Guidelines", kind: "concept", hook: "Ages and intervals change, and the nursing answer is the shared decision rather than the number." },
    { name: "Vital Sign Abnormalities", kind: "skill", hook: "A rising respiratory rate is the earliest warning of deterioration and the most often not recorded." },
  ],

  /* -------------------------------------------------------- health-promotion */
  "health-promotion": [
    { name: "Primary Secondary Tertiary Prevention", kind: "concept", hook: "Primary prevents, secondary detects, tertiary limits — and a screening test is always secondary, which is the trap." },
    { name: "Adult Immunization Schedule", kind: "concept", hook: "Shingles, pneumococcal and annual influenza are the ones the exam asks about by age." },
    { name: "Smoking Cessation", kind: "concept", hook: "Ask, advise, assess, assist, arrange — and relapse is part of the process rather than a failure." },
    { name: "Exercise Prescription", kind: "concept", hook: "150 minutes of moderate activity a week, and the nursing skill is making it fit the patient's life." },
    { name: "Weight Management", kind: "concept", hook: "BMI misses muscle and misses distribution — waist circumference adds what it leaves out." },
    { name: "Alcohol Screening", kind: "skill", aka: ["CAGE"], hook: "Four questions, and two positives is a referral rather than a conversation to have later." },
    { name: "Developmental Stages", kind: "concept", aka: ["Erikson"], hook: "The stage decides the teaching approach — an adolescent's autonomy is the lever, an older adult's legacy is." },
    { name: "Health Literacy", kind: "concept", hook: "Teach-back rather than 'do you understand', because everybody says yes." },
    { name: "Patient Teaching Principles", kind: "skill", hook: "Readiness to learn comes before content, and pain or anxiety makes teaching impossible." },
    { name: "Community Health Resources", kind: "concept", hook: "The discharge plan fails on transport and cost far more often than on understanding." },
    { name: "Prenatal Care Schedule", kind: "concept", hook: "Monthly to 28 weeks, fortnightly to 36, then weekly — and the schedule is itself the screening." },
    { name: "Well-Child Visits", kind: "concept", hook: "Growth, development and immunisation at each visit, and the anticipatory guidance is age-specific." },
    { name: "Menopause", kind: "condition", hook: "Bone density and cardiovascular risk change at the same time, which reframes the whole assessment." },
    { name: "Aging Changes", kind: "concept", hook: "Reduced renal clearance and reduced thirst sensation explain most of geriatric pharmacology and most of the dehydration." },
    { name: "Screening in Older Adults", kind: "concept", hook: "Screening stops making sense when life expectancy is shorter than the time to benefit." },
    { name: "Occupational Health", kind: "concept", hook: "Exposure history is a question nobody asks and it explains a surprising number of presentations." },
  ],

  /* ------------------------------------------------------------- fundamentals */
  fundamentals: [
    { name: "Nursing Process", kind: "concept", aka: ["ADPIE"], hook: "Assessment first, always — and the exam's favourite wrong answer is an intervention before the data that justifies it." },
    { name: "Maslow's Hierarchy", kind: "concept", hook: "Physiological before safety before psychosocial — but an airway beats everything including another physiological need." },
    { name: "ABCs of Prioritization", kind: "concept", hook: "Airway, breathing, circulation — and it overrides Maslow when the two disagree." },
    { name: "Nursing Diagnosis", kind: "concept", hook: "It names a response to a condition, not the condition — which is why 'pneumonia' is never the answer." },
    { name: "SMART Goals", kind: "concept", hook: "Measurable and time-bound, or the evaluation step has nothing to evaluate against." },
    { name: "Documentation Standards", kind: "skill", hook: "If it is not documented it is not done, and a late entry is labelled rather than inserted." },
    { name: "Critical Thinking in Nursing", kind: "skill", hook: "The question is what the data means rather than what the data is — which is the whole shift from recall to judgement." },
    { name: "Evidence-Based Practice", kind: "concept", hook: "Evidence, clinical expertise and patient preference — all three, and the exam tests the third being left out." },
    { name: "Therapeutic Environment", kind: "concept", hook: "Noise, light and interruption are clinical variables with measurable effects on recovery." },
    { name: "Change-of-Shift Report", kind: "skill", hook: "At the bedside with the patient involved, which catches errors a nurses' station handover does not." },
    { name: "Nursing Ethics", kind: "concept", aka: ["autonomy", "beneficence"], hook: "Autonomy usually wins, including when the choice is one nobody on the team agrees with." },
    { name: "Legal Responsibilities", kind: "concept", hook: "Negligence needs duty, breach, causation and harm — all four, which is why not every bad outcome is one." },
    { name: "Time Management", kind: "skill", hook: "Assess the whole assignment before starting anything, because the sickest patient is not always the one who called." },
    { name: "Clinical Judgment Model", kind: "concept", aka: ["NCSBN clinical judgment measurement model"], hook: "Recognise cues, analyse, prioritise, generate solutions, take action, evaluate — the six steps the new exam is built on." },
    { name: "Sterile Technique", kind: "skill", hook: "Below the waist is contaminated, and so is anything out of your line of sight — including your own back." },
    { name: "Vital Sign Measurement Technique", kind: "skill", hook: "The wrong cuff size is the most common cause of a wrong blood pressure in practice and on the exam." },
  ],

  /* ------------------------------------------------- prioritization-delegation */
  "prioritization-delegation": [
    { name: "Who to See First", kind: "skill", hook: "Unstable before stable, unexpected before expected — and a new finding beats a known one every time." },
    { name: "Five Rights of Delegation", kind: "concept", hook: "Right task, circumstance, person, direction, supervision — and supervision is the one that gets dropped." },
    { name: "Delegating to UAP", kind: "skill", aka: ["nursing assistant"], hook: "Stable, predictable, routine tasks only — and the nurse still owns the outcome." },
    { name: "Delegating to LPN", kind: "skill", aka: ["LVN"], hook: "Stable patients, established plans — and no initial assessment, no IV push in most states, no teaching." },
    { name: "Triage Principles", kind: "skill", hook: "Emergency triage sorts by acuity; disaster triage sorts by survivability, and the two give opposite answers." },
    { name: "Disaster Triage", kind: "skill", aka: ["START triage"], hook: "Red, yellow, green, black — and the expectant tag exists because resources are finite." },
    { name: "Assignment vs Delegation", kind: "concept", hook: "An assignment transfers work within a scope; delegation transfers a task outside it — different accountability." },
    { name: "Managing Multiple Patients", kind: "skill", hook: "Group the work by room and by time, and do the thing that expires — the antibiotic due, the pre-op check." },
    { name: "Interrupting the Plan", kind: "skill", hook: "A change in level of consciousness stops everything else, and it is the cue the exam hides in the third sentence." },
    { name: "Reporting to the Provider", kind: "skill", hook: "SBAR with a recommendation, and the recommendation is what makes the call actionable rather than informational." },
    { name: "Conflict Resolution", kind: "skill", hook: "Address it directly and privately first — going over someone's head is nearly always the wrong option." },
    { name: "Supervision and Accountability", kind: "concept", hook: "Delegating the task never delegates the accountability, which is the sentence that answers most of these questions." },
  ],

  /* ------------------------------------------------------------ dosage-and-labs */
  "dosage-and-labs": [
    { name: "Dosage Calculation Formulas", kind: "skill", aka: ["desired over have"], hook: "Desired over have times quantity — one formula covers most of the exam, and the units are where the errors live." },
    { name: "IV Flow Rate Calculation", kind: "skill", hook: "Drop factor divided by 60 times the hourly volume, and gravity sets versus pumps are different calculations." },
    { name: "Weight-Based Dosing", kind: "skill", hook: "Convert pounds to kilograms first — dividing by 2.2 before anything else prevents most of the wrong answers." },
    { name: "Unit Conversions", kind: "skill", hook: "Micrograms to milligrams to grams, and the decimal point is what the exam is actually testing." },
    { name: "Safe Dose Range", kind: "skill", hook: "Calculate the range, compare the order, and be willing to say the order is unsafe — that is the testable behaviour." },
    { name: "Titration Calculations", kind: "skill", hook: "Micrograms per kilogram per minute to millilitres per hour, and a drip that is off by a factor of ten is a code." },
    { name: "Reconstitution", kind: "skill", hook: "The diluent adds volume, so the final concentration is not what the vial says before mixing." },
    { name: "Complete Blood Count", kind: "lab", aka: ["CBC"], hook: "Haemoglobin, white count with differential, platelets — and a left shift means the marrow is responding to infection." },
    { name: "Basic Metabolic Panel", kind: "lab", aka: ["BMP", "electrolytes"], hook: "Sodium, potassium, glucose, BUN, creatinine — the five that change management most often." },
    { name: "Coagulation Studies", kind: "lab", aka: ["PT", "INR", "aPTT"], hook: "PT/INR tracks warfarin and aPTT tracks heparin — mixing them up is the most common lab error on the exam." },
    { name: "Critical Lab Values", kind: "lab", hook: "A short memorised list that triggers an immediate call, and knowing it is what makes the call fast." },
    { name: "Arterial Blood Gas Interpretation", kind: "skill", hook: "pH, then CO2, then bicarbonate, then compensation — four steps in order beats any mnemonic applied out of order." },
    { name: "Therapeutic Ranges", kind: "lab", hook: "Digoxin, lithium, phenytoin, theophylline, vancomycin — five drugs that account for most of the level questions." },
    { name: "Intake and Output Calculation", kind: "skill", hook: "All fluids at room temperature count, which is why ice chips and gelatin are on the chart." },
    { name: "Pediatric Safe Dose", kind: "skill", hook: "Milligrams per kilogram per day divided by the number of doses — and the daily total is checked as well as the single dose." },
  ],

  /* ------------------------------------------------------------------- sata */
  sata: [
    { name: "Select All That Apply Strategy", kind: "skill", hook: "Treat each option as its own true-or-false question — reading them as a set is what produces the partial credit loss." },
    { name: "Absolute Words in Options", kind: "skill", hook: "Always and never are usually wrong in clinical options and usually right in safety ones, which is why the rule alone fails." },
    { name: "Priority Questions", kind: "skill", hook: "Every option may be correct — the question is which is first, which is a different question from which is right." },
    { name: "Assessment vs Intervention", kind: "skill", hook: "Assess before acting, except when the situation is an emergency and the action is the assessment." },
    { name: "Therapeutic Response Questions", kind: "skill", hook: "The answer reflects the feeling and keeps the conversation open; the distractors reassure, advise or change the subject." },
    { name: "Teaching Evaluation Questions", kind: "skill", hook: "Look for the statement that shows the misunderstanding — 'further teaching is needed' inverts what you are hunting for." },
    { name: "Next Generation NCLEX Item Types", kind: "skill", aka: ["NGN"], hook: "Case studies with six items scored partially — one wrong answer no longer costs the whole question." },
    { name: "Bowtie Questions", kind: "skill", hook: "Action, condition, parameter — the middle is chosen first, and the two sides follow from it." },
    { name: "Trend Questions", kind: "skill", hook: "A table of vitals over time, and the answer is in the direction rather than in any single row." },
    { name: "Matrix Questions", kind: "skill", hook: "A grid of findings against categories, scored per row — which rewards working across rather than down." },
    { name: "Eliminating Distractors", kind: "skill", hook: "Two options that say the same thing are both wrong, which removes half the list before any knowledge is applied." },
    { name: "Managing Test Anxiety", kind: "skill", hook: "The adaptive engine is meant to feel hard — feeling like you are failing is the design rather than a signal." },
  ],
};

/**
 * The index as everything else sees it: the core set plus the extension,
 * merged per topic.
 *
 * A topic key in the extension that does not exist in the core is a typo
 * rather than a new topic — topics come from the question bank, not from this
 * file — so it throws instead of quietly creating a topic no page can link to.
 * A page whose `nursingTopic` matches nothing is a page that ranks, gets read,
 * and dead-ends at a 404.
 */
export const CLINICAL_INDEX: Record<string, Entity[]> = (() => {
  const merged: Record<string, Entity[]> = Object.fromEntries(
    Object.entries(CORE_INDEX).map(([k, v]) => [k, [...v]]),
  );
  for (const [topic, extra] of [...Object.entries(EXTRA_INDEX), ...Object.entries(EXTRA_INDEX_2)]) {
    if (!merged[topic]) {
      throw new Error(
        `taxonomy-extra(-2).ts declares topic "${topic}", which is not in the core ` +
          `index. Topic slugs come from TOPICS in src/lib/content.ts — check ` +
          `the spelling rather than adding it here.`,
      );
    }
    const seen = new Set(merged[topic].map((e) => e.name.toLowerCase()));
    for (const e of extra) {
      if (seen.has(e.name.toLowerCase())) {
        throw new Error(`Duplicate entity "${e.name}" in topic "${topic}".`);
      }
      seen.add(e.name.toLowerCase());
      merged[topic].push(e);
    }
  }
  return merged;
})();

/** Every topic slug the index covers, for validation against src/lib/content.ts. */
export const INDEXED_TOPICS = Object.keys(CLINICAL_INDEX);

/** Flat list, with the topic carried on each entity. */
export function allEntities(): (Entity & { topic: string })[] {
  return Object.entries(CLINICAL_INDEX).flatMap(([topic, list]) =>
    list.map((e) => ({ ...e, topic })),
  );
}
