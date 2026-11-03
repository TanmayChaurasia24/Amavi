"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  ExternalLink,
  Clock,
  ShieldAlert,
  FileText,
  DollarSign,
  User,
  Filter,
  RefreshCw,
} from "lucide-react";
import { AuditDrawer } from "@/components/audit-drawer";
import { RiskAssessment } from "@/lib/risk";

interface ApprovalItem {
  id: string;
  invoiceId: string;
  clientId: string | null;
  proposalSummary: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  actionPayload: Record<string, unknown> | null;
  decidedAt: string | null;
  createdAt: string;
  invoice?: {
    id: string;
    paypalInvoiceId: string;
    totalCents: number;
    amountPaidCents: number;
    dueDate: string | null;
    status: string;
    recipientViewUrl: string | null;
  } | null;
  client?: {
    id: string;
    name: string;
    email: string;
    pastLateCount: number;
    avgDaysLate: number;
  } | null;
  risk?: RiskAssessment | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY" | "ALL">("PENDING");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      if (data.approvals) {
        setApprovals(data.approvals);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleDecision = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionInProgressId(id);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/approvals/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision");
      }

      setFeedbackMessage({
        text: `Proposal ${action === "APPROVE" ? "Approved" : "Rejected"} successfully. Logged to AgentLogs.`,
        type: "success",
      });

      // Refresh list
      await fetchApprovals();
    } catch (err: unknown) {
      setFeedbackMessage({
        text: err instanceof Error ? err.message : "Decision error",
        type: "error",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenAudit = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsDrawerOpen(true);
  };

  const pendingCount = useMemo(() => {
    return approvals.filter((a) => a.status === "PENDING").length;
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    if (activeTab === "PENDING") {
      return approvals.filter((a) => a.status === "PENDING");
    }
    if (activeTab === "HISTORY") {
      return approvals.filter((a) => a.status !== "PENDING");
    }
    return approvals;
  }, [approvals, activeTab]);

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f222e]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Owner Approvals Queue
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Review escalated negotiations that exceed guardrails or require manual executive authorization.
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141620] hover:bg-[#1a1e2d] border border-[#272b3c] text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-200 border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{feedbackMessage.text}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f222e] pb-1">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`relative px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "PENDING"
              ? "bg-[#181b26] text-white border border-[#272a38]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              pendingCount > 0
                ? "bg-amber-500 text-black font-bold"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "HISTORY"
              ? "bg-[#181b26] text-white border border-[#272a38]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Decided History
        </button>

        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "ALL"
              ? "bg-[#181b26] text-white border border-[#272a38]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All Items ({approvals.length})
        </button>
      </div>

      {/* Approvals Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-24 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm">Loading approval queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="py-16 text-center bg-[#11131a] border border-[#1f222e] rounded-xl text-zinc-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-white">Queue is clear!</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {activeTab === "PENDING"
                ? "No pending proposals requiring manual owner approval at this time."
                : "No items found in this view."}
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => {
            const isPending = item.status === "PENDING";
            const isApproved = item.status === "APPROVED";
            const isProcessing = actionInProgressId === item.id;
            const risk = item.risk;

            return (
              <div
                key={item.id}
                className={`bg-[#11131a] border rounded-xl p-6 shadow-sm transition-all ${
                  isPending
                    ? "border-amber-500/30 hover:border-amber-500/50"
                    : "border-[#1f222e] opacity-90"
                }`}
              >
                {/* Top Row: Client & Status Badges */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#1b1e2a]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {item.client?.name ?? "Direct Invoiced Client"}
                      </span>
                      {risk && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${risk.color.badgeClass}`}
                        >
                          {risk.level} Risk ({risk.score})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                      <span>{item.invoice?.paypalInvoiceId ?? item.invoiceId}</span>
                      <span>•</span>
                      <span className="font-sans text-zinc-400">
                        {item.client?.email ?? "N/A"}
                      </span>
                      {item.invoice?.recipientViewUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={item.invoice.recipientViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-sans inline-flex items-center gap-1"
                          >
                            PayPal Invoice <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Invoice Amount */}
                    <div className="text-right">
                      <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
                        Balance Due
                      </div>
                      <div className="text-base font-bold text-white font-mono">
                        {item.invoice
                          ? formatCents(
                              item.invoice.totalCents - item.invoice.amountPaidCents
                            )
                          : "N/A"}
                      </div>
                    </div>

                    {/* Status Chip */}
                    <div>
                      {isPending ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Review
                        </span>
                      ) : isApproved ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proposal & Escalation Reason */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {/* Proposal */}
                  <div className="bg-[#090a0f] p-4 rounded-xl border border-[#1a1d29] space-y-1">
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Client Proposal
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed font-sans">
                      {item.proposalSummary}
                    </p>
                  </div>

                  {/* Violation / Reason */}
                  <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-1">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Guardrail Escalation Reason
                    </div>
                    <p className="text-sm text-amber-200/90 leading-relaxed font-sans">
                      {item.reason}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: Approve & Reject Only */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1b1e2a]">
                  <button
                    onClick={() => handleOpenAudit(item.invoiceId)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>View AI Audit Trail</span>
                  </button>

                  {/* Approve and Reject Buttons */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecision(item.id, "REJECT")}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-rose-500/50 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleDecision(item.id, "APPROVE")}
                        disabled={isProcessing}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Proposal</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 font-mono">
                      Decided on {item.decidedAt ? new Date(item.decidedAt).toLocaleString() : "N/A"}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Audit Drawer */}
      <AuditDrawer
        invoiceId={selectedInvoiceId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
