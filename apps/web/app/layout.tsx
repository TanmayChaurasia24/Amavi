import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Amavi — AI Collections Agent for Freelancers",
  description:
    "Amavi resolves overdue invoices using AI and PayPal. Set your guardrails once, let Amavi negotiate and create payment plans automatically.",
  metadataBase: new URL("https://amavi.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
