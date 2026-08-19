import type { Metadata } from "next";
import { TryClient } from "@/components/TryClient";

export const metadata: Metadata = {
  title: "Practice — your first session",
  description: "Pick where to start: a diagnostic, or a topic you already know is weak.",
  robots: { index: false, follow: false },
};

/**
 * /try is behind the gate now. Everything that used to make this page the
 * public proof — the sample questions — moved out to the homepage, the hub, and
 * the eight topic pages, which are the pages that rank anyway.
 */
export default function TryPage() {
  return <TryClient />;
}
