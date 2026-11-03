import { describe, it, expect } from "vitest";
import { isValidRelativeRedirect } from "../../middleware";

describe("Open Redirect Protection (isValidRelativeRedirect)", () => {
  it("allows valid relative paths", () => {
    expect(isValidRelativeRedirect("/dashboard")).toBe(true);
    expect(isValidRelativeRedirect("/dashboard/settings")).toBe(true);
    expect(isValidRelativeRedirect("/onboarding?step=2")).toBe(true);
    expect(isValidRelativeRedirect("/invoices/inv-123")).toBe(true);
  });

  it("rejects absolute URLs", () => {
    expect(isValidRelativeRedirect("https://attacker.com")).toBe(false);
    expect(isValidRelativeRedirect("http://evil.com/dashboard")).toBe(false);
    expect(isValidRelativeRedirect("javascript:alert(1)")).toBe(false);
  });

  it("rejects protocol-relative URLs (open redirect bypass vectors)", () => {
    expect(isValidRelativeRedirect("//attacker.com")).toBe(false);
    expect(isValidRelativeRedirect("//evil.com/dashboard")).toBe(false);
    expect(isValidRelativeRedirect("///evil.com")).toBe(false);
  });

  it("rejects backslash vectors", () => {
    expect(isValidRelativeRedirect("/\\attacker.com")).toBe(false);
    expect(isValidRelativeRedirect("/\\evil.com/path")).toBe(false);
  });

  it("rejects empty, null, and undefined values", () => {
    expect(isValidRelativeRedirect("")).toBe(false);
    expect(isValidRelativeRedirect(null)).toBe(false);
    expect(isValidRelativeRedirect(undefined)).toBe(false);
  });
});

describe("Auth Gating Logic Simulation", () => {
  type Session = { ownerId: string; onboardingCompleted?: boolean } | null;

  function simulateRouteGating(pathname: string, session: Session) {
    const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/account");
    const isOnboarding = pathname === "/onboarding";
    const isLogin = pathname === "/login";

    if (isLogin) {
      if (session) {
        return session.onboardingCompleted ? "/dashboard" : "/onboarding";
      }
      return "stay-login";
    }

    if (isOnboarding) {
      if (!session) return "/login";
      if (session.onboardingCompleted) return "/dashboard";
      return "stay-onboarding";
    }

    if (isDashboard) {
      if (!session) return "/login";
      if (!session.onboardingCompleted) return "/onboarding";
      return "stay-dashboard";
    }

    return "public";
  }

  it("unauthenticated user trying to access /dashboard is redirected to /login", () => {
    expect(simulateRouteGating("/dashboard", null)).toBe("/login");
    expect(simulateRouteGating("/dashboard/settings", null)).toBe("/login");
  });

  it("unauthenticated user trying to access /onboarding is redirected to /login", () => {
    expect(simulateRouteGating("/onboarding", null)).toBe("/login");
  });

  it("first-time user (onboarding incomplete) accessing /dashboard is redirected to /onboarding", () => {
    const freshSession = { ownerId: "user-1", onboardingCompleted: false };
    expect(simulateRouteGating("/dashboard", freshSession)).toBe("/onboarding");
    expect(simulateRouteGating("/dashboard/settings", freshSession)).toBe("/onboarding");
  });

  it("first-time user accessing /onboarding stays on /onboarding", () => {
    const freshSession = { ownerId: "user-1", onboardingCompleted: false };
    expect(simulateRouteGating("/onboarding", freshSession)).toBe("stay-onboarding");
  });

  it("completed user accessing /onboarding is redirected to /dashboard", () => {
    const completedSession = { ownerId: "user-1", onboardingCompleted: true };
    expect(simulateRouteGating("/onboarding", completedSession)).toBe("/dashboard");
  });

  it("completed user accessing /dashboard is allowed to view dashboard", () => {
    const completedSession = { ownerId: "user-1", onboardingCompleted: true };
    expect(simulateRouteGating("/dashboard", completedSession)).toBe("stay-dashboard");
  });

  it("authenticated user visiting /login is redirected according to onboarding status", () => {
    expect(
      simulateRouteGating("/login", { ownerId: "user-1", onboardingCompleted: false })
    ).toBe("/onboarding");

    expect(
      simulateRouteGating("/login", { ownerId: "user-1", onboardingCompleted: true })
    ).toBe("/dashboard");
  });
});

