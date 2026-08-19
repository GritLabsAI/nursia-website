// Verbatim stage payloads from the landing-page mock. Each body is raw HTML
// injected into the carousel screen, so the classes match nclex-home.css.
export type CycleStage = { label: string; progress: string; body: string };

export const CYCLE_STAGES: CycleStage[] = [
    {
      label: "Answer",
      progress: "8%",
      body: `
        <div class="cy-counter">Question 6 of 75</div>
        <div class="cy-q">A client 2 days postop following a total hip arthroplasty reports sudden dyspnea, pleuritic chest pain, and tachycardia. What should the nurse suspect?</div>
        <div class="cy-opts">
          <div class="cy-opt"><span class="letter">A.</span><span class="c"></span>Myocardial infarction</div>
          <div class="cy-opt selected"><span class="letter">B.</span><span class="c"></span>Pulmonary embolism</div>
          <div class="cy-opt"><span class="letter">C.</span><span class="c"></span>Postoperative pneumonia</div>
        </div>
        <div class="cy-footer">
          <span class="cy-btn cy-btn-outline">Previous</span>
          <span class="cy-btn cy-btn-solid">Check Answer</span>
        </div>
      `
    },
    {
      label: "Understand",
      progress: "8%",
      body: `
        <div class="cy-counter">Question 6 of 75</div>
        <div class="cy-opts">
          <div class="cy-opt right"><span class="letter">B.</span><span class="c"></span>Pulmonary embolism</div>
          <div class="cy-opt wrong"><span class="letter">A.</span><span class="c"></span>Myocardial infarction</div>
        </div>
        <div class="cy-status correct"><span class="ico">&#10003;</span>Correct!</div>
        <div class="cy-explain"><b>Why it matters:</b> Postoperative immobility raises clot risk. Sudden dyspnea + pleuritic pain + tachycardia is the classic PE triad.</div>
        <div class="cy-footer">
          <span class="cy-btn cy-btn-solid">Next Question</span>
        </div>
      `
    },
    {
      label: "Diagnose",
      progress: "100%",
      body: `
        <div class="cy-readiness-head"><span class="cy-readiness-score">78%</span><span class="cy-readiness-delta">&#8593; 12% this week</span></div>
        <div class="cy-area-row">
          <div class="cy-area-top"><span>Pharmacological &amp; Parenteral Therapies</span><span>84%</span></div>
          <div class="cy-area-track"><div class="cy-area-fill" style="width:84%"></div></div>
        </div>
        <div class="cy-area-row">
          <div class="cy-area-top"><span>Management of Care</span><span>76%</span></div>
          <div class="cy-area-track"><div class="cy-area-fill" style="width:76%"></div></div>
        </div>
        <div class="cy-area-row">
          <div class="cy-area-top"><span>Safety &amp; Infection Control</span><span>72%</span></div>
          <div class="cy-area-track"><div class="cy-area-fill" style="width:72%"></div></div>
        </div>
        <div class="cy-area-row">
          <div class="cy-area-top"><span>Physiological Adaptation</span><span>61%</span></div>
          <div class="cy-area-track"><div class="cy-area-fill" style="width:61%"></div></div>
        </div>
      `
    },
    {
      label: "Retest",
      progress: "40%",
      body: `
        <div class="cy-retest-head">
          <div class="cy-retest-ring">61%</div>
          <div>
            <div class="cy-retest-title">Retesting: Physiological Adaptation</div>
            <div class="cy-retest-sub">Question 2 of 8</div>
          </div>
        </div>
        <div class="cy-q">A client with a burn injury exhibits decreased urine output and elevated hematocrit. Which is the priority nursing action?</div>
        <div class="cy-opts">
          <div class="cy-opt selected"><span class="letter">A.</span><span class="c"></span>Increase IV fluid rate</div>
          <div class="cy-opt"><span class="letter">B.</span><span class="c"></span>Notify provider of labs</div>
        </div>
      `
    },
    {
      label: "Improve",
      progress: "100%",
      body: `
        <div class="cy-growth-head">
          <div>
            <div class="cy-q" style="margin-bottom:2px;">Physiological Adaptation</div>
            <div class="cy-growth-sub">Your growth over the last 4 retests</div>
          </div>
          <div class="cy-growth-delta">&#8593; 13%</div>
        </div>
        <div class="cy-growth-chart">
          <svg viewBox="0 0 300 96" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cyGrowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0b6b62" stop-opacity="0.28"/>
                <stop offset="100%" stop-color="#0b6b62" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <polyline points="0,80 75,66 150,52 225,30 300,12" fill="none" stroke="url(#cyGrowLine)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <linearGradient id="cyGrowLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#0b6b62"/>
              <stop offset="100%" stop-color="#0b6b62"/>
            </linearGradient>
            <polygon points="0,80 75,66 150,52 225,30 300,12 300,96 0,96" fill="url(#cyGrowFill)"/>
            <circle cx="0" cy="80" r="4.5" fill="#0b6b62"/>
            <circle cx="75" cy="66" r="4.5" fill="#084f49"/>
            <circle cx="150" cy="52" r="4.5" fill="#2c6a4e"/>
            <circle cx="225" cy="30" r="4.5" fill="#0b6b62"/>
            <circle cx="300" cy="12" r="5.5" fill="#0b6b62" stroke="#fff" stroke-width="2"/>
          </svg>
        </div>
        <div class="cy-growth-stats">
          <div class="cy-growth-stat"><span class="lbl">Before</span><span class="val">61%</span></div>
          <div class="cy-growth-arrow">&#8594;</div>
          <div class="cy-growth-stat"><span class="lbl">Now</span><span class="val strong">74%</span></div>
        </div>
      `
    }
  ];
