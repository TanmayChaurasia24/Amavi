import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding Setup — Amavi",
  description: "Configure your freelance collections agent and guardrails.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

