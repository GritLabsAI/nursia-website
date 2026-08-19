import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: { absolute: "Privacy policy | Nursia" },
  description:
    "What Nursia collects — an email, a password, and your answers — what we do with it, and what we never do with it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="We collect an email address, a password, and the answers you give. That is the whole list, and this page explains what each one is for."
      sections={[
        {
          h2: "What we collect",
          body: [
            "Your email address, so you can log in and so we can reach you about your account. A hashed password — we never see the original. Your answers and the time you spend on them, because that is what produces your weak-topic ranking and your readiness estimate.",
            "We do not ask for your name, your school, or your test date at sign-up. If you tell us your test date later inside the product, it is used to build your study plan and nothing else.",
          ],
        },
        {
          h2: "What we do with it",
          body: [
            "Run the product, and improve the questions. Item-level answer data tells us which questions are too easy, too hard, or ambiguous, and those get rewritten or pulled. This analysis is aggregate — we are looking at the item, not at you.",
          ],
        },
        {
          h2: "What we never do",
          body: [
            "We do not sell your data, we do not share it with advertisers, and we do not add you to a mailing list because you contacted support. Emails from us are about your account or things you explicitly asked for, and every one has a working unsubscribe link.",
          ],
        },
        {
          h2: "Deleting your account",
          body: [
            "One button in account settings deletes your account and everything attached to it within 30 days, including from backups. You can also email us and we will do it for you. There is no retention flow and we will not ask you to reconsider.",
          ],
        },
      ]}
    />
  );
}
