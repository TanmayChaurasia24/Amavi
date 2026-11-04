"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  provideGlobalGridOptions,
  ColDef,
  ICellRendererParams,
  GridReadyEvent,
  GridApi,
} from "ag-grid-community";
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  Zap,
  Check,
} from "lucide-react";
import { AuditDrawer } from "@/components/audit-drawer";
import { RiskAssessment } from "@/lib/risk";

// Register AG Grid Community modules and opt into legacy CSS theming
ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: "legacy" });

interface InvoiceRow {
  id: string;
  paypalInvoiceId: string;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
  dueDate: string | null;
  status: string;
  riskScore: number | null;
  paypalStatus: string | null;
  recipientViewUrl: string | null;
  client?: {
    id: string;
    name: string;
    email: string;
    pastLateCount: number;
    avgDaysLate: number;
  } | null;
  risk?: RiskAssessment;
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTriggerReminder = async (invoiceId: string) => {
    setRemindingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.note) {
        setToastMessage(`PayPal reminder dispatched: "${data.note}"`);
        setTimeout(() => setToastMessage(null), 6000);
      }
      fetchInvoices();
    } catch (err) {
      console.error("Failed to trigger reminder:", err);
    } finally {
      setRemindingId(null);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true") {
        setShowWelcome(true);
      }
    }
  }, [fetchInvoices]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  };

  const handleOpenAudit = (id: string) => {
    setSelectedInvoiceId(id);
    setIsDrawerOpen(true);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    let totalOutstandingCents = 0;
    let criticalRiskCents = 0;
    let overdueCount = 0;
    let inNegotiationCount = 0;

    for (const inv of invoices) {
      const unpaid = Math.max(0, inv.totalCents - inv.amountPaidCents);
      if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
        totalOutstandingCents += unpaid;
      }
      if (inv.risk?.level === "CRITICAL" || inv.risk?.level === "HIGH") {
        criticalRiskCents += unpaid;
      }
      if (inv.status === "OVERDUE") {
        overdueCount++;
      }
      if (inv.status === "IN_NEGOTIATION") {
        inNegotiationCount++;
      }
    }

    return {
      totalOutstanding: (totalOutstandingCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
      criticalRisk: (criticalRiskCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
      overdueCount,
      inNegotiationCount,
    };
  }, [invoices]);

  // Filter rows based on status tab and search text
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "ALL") {
      list = list.filter((inv) => inv.status === statusFilter);
    }
    return list;
  }, [invoices, statusFilter]);

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<InvoiceRow>[]>(() => {
    return [
      {
        headerName: "Client & Invoice",
        field: "paypalInvoiceId",
        minWidth: 260,
        flex: 1.4,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const inv = params.data;
          if (!inv) return null;
          const isEmailSameAsName = inv.client?.name === inv.client?.email;
          const displayName = isEmailSameAsName
            ? (inv.client?.email?.split("@")[0] ?? "Client")
            : (inv.client?.name ?? "Direct Invoiced Client");

          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-semibold text-white text-xs tracking-tight truncate max-w-[220px]">
                {displayName}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5">
                <span className="text-blue-400 font-medium">{inv.paypalInvoiceId}</span>
                {inv.client?.email && (
                  <>
                    <span>•</span>
                    <span className="font-sans text-zinc-400 truncate max-w-[140px]">
                      {inv.client.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Total Amount",
        field: "totalCents",
        width: 130,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const cents = params.value as number;
          return (
            <span className="font-semibold text-zinc-100 font-mono text-xs">
              {(cents / 100).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </span>
          );
        },
      },
      {
        headerName: "Payment Progress",
        field: "amountPaidCents",
        minWidth: 180,
        flex: 1,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const inv = params.data;
          if (!inv) return null;
          const total = inv.totalCents;
          const paid = inv.amountPaidCents;
          const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          const due = Math.max(0, total - paid);

          return (
            <div className="w-full flex flex-col justify-center py-1 gap-1">
              <div className="w-full bg-[#1b1e2a] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct === 100
                      ? "bg-emerald-500"
                      : pct > 0
                      ? "bg-cyan-500"
                      : "bg-zinc-700"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span className={paid > 0 ? "text-emerald-400 font-medium" : ""}>
                  ${(paid / 100).toFixed(0)} paid
                </span>
                <span className={due > 0 ? "text-zinc-300" : "text-zinc-500"}>
                  ${(due / 100).toFixed(0)} due
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Due Date",
        field: "dueDate",
        minWidth: 150,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const inv = params.data;
          if (!inv) return null;
          const daysOverdue = inv.risk?.daysOverdue ?? 0;

          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="text-zinc-200 text-xs font-mono">
                {inv.dueDate ?? "No due date"}
              </span>
              {inv.status === "PAID" ? (
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">Settled</span>
              ) : daysOverdue > 0 ? (
                <span className="text-[10px] text-rose-400 font-semibold mt-0.5">
                  {daysOverdue}d overdue
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 mt-0.5">On schedule</span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 145,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const status = params.value as string;
          let badgeStyle = "bg-zinc-800 text-zinc-300 border-zinc-700";
          let dotColor = "bg-zinc-400";

          switch (status) {
            case "OPEN":
              badgeStyle = "bg-blue-950/60 text-blue-300 border-blue-500/30";
              dotColor = "bg-blue-400";
              break;
            case "OVERDUE":
              badgeStyle = "bg-amber-950/60 text-amber-300 border-amber-500/30";
              dotColor = "bg-amber-400 animate-pulse";
              break;
            case "IN_NEGOTIATION":
              badgeStyle = "bg-purple-950/60 text-purple-300 border-purple-500/30";
              dotColor = "bg-purple-400";
              break;
            case "PARTIALLY_PAID":
              badgeStyle = "bg-cyan-950/60 text-cyan-300 border-cyan-500/30";
              dotColor = "bg-cyan-400";
              break;
            case "PAID":
              badgeStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-500/30";
              dotColor = "bg-emerald-400";
              break;
            case "DISPUTED":
              badgeStyle = "bg-rose-950/60 text-rose-300 border-rose-500/30";
              dotColor = "bg-rose-400 animate-pulse";
              break;
            case "CANCELLED":
              badgeStyle = "bg-zinc-800/80 text-zinc-400 border-zinc-700";
              dotColor = "bg-zinc-500";
              break;
          }

          return (
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {status.replace(/_/g, " ")}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Risk Assessment",
        field: "riskScore",
        minWidth: 170,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const risk = params.data?.risk;
          if (!risk) return null;

          const { score, level, color, factors } = risk;

          // Tooltip description summary
          const factorTooltip = factors
            .map((f) => `${f.name} (+${f.points}): ${f.description}`)
            .join("\n");

          return (
            <div className="flex items-center gap-2 group relative" title={factorTooltip}>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-help ${color.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                <span>{level}</span>
                <span className="font-mono text-[11px] opacity-80">({score})</span>
              </span>

              {level === "CRITICAL" && (
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
              )}
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        width: 220,
        sortable: false,
        cellRenderer: (params: ICellRendererParams<InvoiceRow>) => {
          const inv = params.data;
          if (!inv) return null;

          return (
            <div className="flex items-center gap-1.5 h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAudit(inv.id);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                title="Open autonomous agent audit trail"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Audit</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTriggerReminder(inv.id);
                }}
                disabled={remindingId === inv.id}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                title="Run agent now: write and dispatch PayPal reminder"
              >
                <Zap className={`w-3.5 h-3.5 ${remindingId === inv.id ? "animate-spin text-amber-400" : "text-amber-400"}`} />
                <span>{remindingId === inv.id ? "..." : "Remind"}</span>
              </button>

              {inv.recipientViewUrl && (
                <a
                  href={inv.recipientViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Open buyer PayPal view link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        },
      },
    ];
  }, [remindingId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Banner after Onboarding Completion */}
      {showWelcome && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-blue-950/70 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-4 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="font-semibold text-white text-sm">Welcome to Settle! Your onboarding is complete.</p>
              <p className="text-xs text-emerald-300/80">
                Your guardrails are active. When clients reply to overdue invoices, Settle will negotiate payment plans within your rules.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title & Mission Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Invoice Portfolio & Risk Grid
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              AG Grid v36
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time status tracking, automated risk scoring, and autonomous settlement audit trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141620] hover:bg-[#1a1e2d] border border-[#272b3c] text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Grid</span>
          </button>
        </div>
      </div>

      {/* Floating Agent Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">Autonomous Agent Action:</span>
            <span className="text-amber-200/90">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-amber-400 hover:text-white text-xs underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {metrics.totalOutstanding}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <span>Across all active invoices</span>
          </div>
        </div>

        {/* High & Critical Risk Exposure */}
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              High / Critical Exposure
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {metrics.criticalRisk}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <span>Targeted for AI agent resolution</span>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Overdue Count
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {metrics.overdueCount}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <span>Past due payment deadlines</span>
          </div>
        </div>

        {/* In Negotiation */}
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              In Negotiation
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2 font-mono">
            {metrics.inNegotiationCount}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <span>Active installment settlement</span>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Invoices" },
            { id: "OVERDUE", label: "Overdue" },
            { id: "IN_NEGOTIATION", label: "In Negotiation" },
            { id: "PARTIALLY_PAID", label: "Partially Paid" },
            { id: "OPEN", label: "Open" },
            { id: "DISPUTED", label: "Disputed" },
            { id: "PAID", label: "Paid" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#181b26]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search client, invoice #..."
            value={quickFilterText}
            onChange={(e) => {
              setQuickFilterText(e.target.value);
              gridApi?.setGridOption("quickFilterText", e.target.value);
            }}
            className="w-full pl-9 pr-4 py-1.5 bg-[#090a0f] border border-[#222533] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* AG Grid Table */}
      <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-1 shadow-xl">
        <div className="h-[640px] w-full">
          <div className="ag-theme-quartz-dark w-full h-full">
            <AgGridReact
              theme="legacy"
              rowHeight={64}
              headerHeight={46}
              rowData={filteredInvoices}
              columnDefs={columnDefs}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              animateRows={true}
              rowSelection="single"
              onRowClicked={(event) => {
                if (event.data?.id) {
                  handleOpenAudit(event.data.id);
                }
              }}
              suppressCellFocus={true}
              defaultColDef={{
                resizable: true,
                sortable: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Legend & Explanations */}
      <div className="p-4 rounded-xl bg-[#0c0d12] border border-[#1a1c26] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            <strong className="text-zinc-200 font-medium">Risk Score Formula:</strong>{" "}
            Computed dynamically from days overdue, outstanding balance, client historical delay count, and active dispute flags.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Low (0-25)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Medium (26-50)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> High (51-75)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Critical (76-100)
          </span>
        </div>
      </div>

      {/* Slide-over Audit Trail Drawer */}
      <AuditDrawer
        invoiceId={selectedInvoiceId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={fetchInvoices}
      />
    </div>
  );
}
