import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Guardrails from "@/components/landing/Guardrails";
import ProductPreview from "@/components/landing/ProductPreview";
import Audience from "@/components/landing/Audience";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settle — AI Collections Agent for Freelancers | PayPal-native payment plans",
  description:
    "Settle reads client replies to overdue invoices, offers an instalment plan inside your rules, and sets it up in PayPal automatically. Stop chasing. Start settling.",
  openGraph: {
    title: "Settle — AI Collections Agent for Freelancers",
    description:
      "Stop chasing late invoices. Settle resolves overdue payments automatically using AI and PayPal — inside owner-set guardrails.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Guardrails />
        <ProductPreview />
        <Audience />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
