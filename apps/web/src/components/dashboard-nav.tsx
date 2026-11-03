"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Sliders,
  Terminal,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  RotateCw,
  LogOut,
  User,
} from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ displayName: string; isDemo: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/owner")
      .then((res) => res.json())
      .then((data) => {
        if (data.owner) {
          setOwner({ displayName: data.owner.displayName, isDemo: data.owner.isDemo });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const fetchPendingCount = () => {
    fetch("/api/approvals")
      .then((res) => res.json())
      .then((data) => {
        if (data.approvals) {
          const pending = data.approvals.filter(
            (a: { status: string }) => a.status === "PENDING"
          );
          setPendingApprovalsCount(pending.length);
        }
      })
      .catch((err) => console.error("Failed to load approval count:", err));
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/paypal/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.count ?? "all"} invoices`);
        setTimeout(() => {
          setSyncMessage(null);
          window.location.reload();
        }, 1200);
      } else {
        setSyncMessage("Sync failed");
      }
    } catch {
      setSyncMessage("Network error");
    } finally {
      setSyncing(false);
    }
  };

  const navLinks = [
    {
      href: "/dashboard",
      label: "Invoices",
      icon: FileText,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/approvals",
      label: "Approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      active: pathname.startsWith("/dashboard/approvals"),
    },
    {
      href: "/dashboard/settings",
      label: "Guardrails",
      icon: Sliders,
      active: pathname.startsWith("/dashboard/settings"),
    },
    {
      href: "/dev",
      label: "Dev & Sandbox",
      icon: Terminal,
      active: pathname === "/dev",
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1f222e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <div className="w-full h-full bg-[#0c0d12] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white font-sans">
                    Settle
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    AI Agent
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 -mt-0.5 font-medium">
                  Autonomous Collections for PayPal
                </p>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      link.active
                        ? "text-white bg-[#161822] border border-[#272a38] shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#12141c]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        link.active ? "text-blue-400" : "text-zinc-400"
                      }`}
                    />
                    <span>{link.label}</span>
                    {link.badge !== undefined && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* Live Environment Badge */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PayPal Sandbox</span>
            </div>

            {/* Owner Identity Badge */}
            {owner && (
              <Link
                href="/dashboard/settings"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151722] border border-[#272a38] text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                title="Account settings"
              >
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium max-w-[120px] truncate">
                  {owner.displayName}
                </span>
                {owner.isDemo && (
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Demo
                  </span>
                )}
              </Link>
            )}

            {/* Sync from PayPal button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151722] hover:bg-[#1c2030] border border-[#282d40] text-xs font-medium text-zinc-300 hover:text-white transition-all disabled:opacity-50"
              title="Synchronize live invoices from PayPal sandbox"
            >
              <RotateCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing..." : syncMessage ? syncMessage : "Sync PayPal"}</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
