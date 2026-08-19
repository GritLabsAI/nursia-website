import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: { absolute: "Terms of service | Nursia" },
  description: "The terms covering your Nursia account, subscription, and use of our question bank.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="These terms cover your account, your subscription, and what you may and may not do with our questions. They are written to be read rather than to be survived."
      sections={[
        {
          h2: "Your account",
          body: [
            "You need an account to practise, and you are responsible for keeping your password to yourself. Accounts are for one person. Sharing a login is the one thing here that will get an account closed, because a shared account makes the progress tracking meaningless anyway.",
          ],
        },
        {
          h2: "Subscription and billing",
          body: [
            "Full access is billed monthly in advance and renews until you cancel. Prices are in US dollars. If we ever change the price, existing subscribers keep the price they signed up at for as long as their subscription runs unbroken, and we email before any change takes effect.",
            "Cancellation and refunds are covered on the refunds page, and those terms are part of this agreement.",
          ],
        },
        {
          h2: "Our questions",
          body: [
            "Every question, rationale, and guide on this site belongs to us. Practise with them as much as you like. Do not copy them into another question bank, resell them, scrape them in bulk, or use them to train a model. Quoting a question in a review or a study group is fine and always will be.",
          ],
        },
        {
          h2: "What we do not promise",
          body: [
            "We do not guarantee you will pass. Nobody honestly can — the NCLEX measures you, not your question bank. We do promise that every item is written and reviewed by registered nurses against the current NCSBN test plan, and if you find one that is wrong we will fix or remove it and tell you which.",
            "NCLEX® and NCLEX-RN® are registered trademarks of the National Council of State Boards of Nursing, Inc. We are not affiliated with or endorsed by NCSBN.",
          ],
        },
      ]}
    />
  );
}
