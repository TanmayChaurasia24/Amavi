import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard-nav";

export const metadata: Metadata = {
  title: "Amavi | AI Collections Agent for PayPal",
  description:
    "Autonomous settlement and installment negotiation engine for overdue PayPal invoices",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <DashboardNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
