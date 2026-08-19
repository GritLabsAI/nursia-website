import type { Metadata } from "next";
import { NclexHome } from "@/components/home/NclexHome";
import "./nclex-home.css";

export const metadata: Metadata = {
  title: { absolute: "Nursia — NCLEX practice questions written by nurses" },
  description:
    "Answer a real NCLEX-RN question right now, no account. 1,200 questions across the whole NCSBN test plan, every rationale written and reviewed by practising nurses.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <NclexHome />;
}
