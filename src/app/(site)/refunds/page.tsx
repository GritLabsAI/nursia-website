import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: { absolute: "Refunds and cancelling | Nursia" },
  description:
    "14-day refund, no questions asked, processed the same day. Cancel in one click from account settings with no retention flow.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refunds and cancelling"
      intro="Risk removal is cheaper than a testimonial and more honest, so this page is deliberately short and deliberately generous. Nothing here has a catch buried in it."
      sections={[
        {
          h2: "The 14-day refund",
          body: [
            "Email us within 14 days of any charge and we refund it in full. We do not ask why, we do not offer you a discount first, and we do not require that you used the product less than some amount. Refunds are processed the same business day and land back on your card in the usual three to five days.",
          ],
        },
        {
          h2: "Cancelling",
          body: [
            "One button in account settings. No email required, no phone call, no retention flow trying to talk you out of it. Your access continues until the end of the period you have already paid for, and we do not charge again after that.",
            "Cancelling does not delete your account. Your progress, review list, and free-tier questions stay where they are, so coming back later picks up where you stopped.",
          ],
        },
        {
          h2: "Pausing instead",
          body: [
            "If you are stepping away rather than leaving, you can pause for up to three months from account settings. Billing stops on the day you pause and everything is exactly where you left it when you come back.",
          ],
        },
        {
          h2: "If you do not pass",
          body: [
            "Email us within 30 days of your result and we extend your access, free, until your retake date. We do not advertise this as a pass guarantee, because we have not been running long enough for a guarantee like that to mean anything — but the offer is real and we honour it.",
          ],
        },
      ]}
    />
  );
}
