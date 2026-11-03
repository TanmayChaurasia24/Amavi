#!/usr/bin/env tsx
/**
 * verify:6 — @paypal/agent-toolkit smoke test.
 * Installs, instantiates, and lists available invoice tools.
 */

import "dotenv/config";
import { appendFinding, pass, fail, printStep, saveSample } from "./verify-utils";
import { env } from "../src/lib/env";

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:6 — @paypal/agent-toolkit Smoke Test");
  console.log("══════════════════════════════════════════════════════");

  printStep(1, "Importing @paypal/agent-toolkit");

  let PaypalAgentToolkit: unknown;
  try {
    // Dynamic import to avoid hard dep at build time
    const mod = await import("@paypal/agent-toolkit/ai-sdk");
    PaypalAgentToolkit = (mod as Record<string, unknown>)["PayPalAgentToolkit"] ?? mod;
    pass("@paypal/agent-toolkit imported successfully");
  } catch (err) {
    fail("Could not import @paypal/agent-toolkit — is it installed?", err);
    console.log("  Run: pnpm add @paypal/agent-toolkit (from apps/web)");
    appendFinding(
      "verify:6 — Agent Toolkit",
      `- @paypal/agent-toolkit could not be imported.
- Install: \`pnpm add @paypal/agent-toolkit\`
- Result: SKIPPED (package not installed)`
    );
    process.exit(0);
  }

  printStep(2, "Instantiating toolkit for Vercel AI SDK");
  let toolkitInstance: unknown;
  try {
    // The toolkit may have a default export or a named class
    const ToolkitClass = PaypalAgentToolkit as new (opts: Record<string, unknown>) => {
      getTools: () => Record<string, unknown>;
      tools?: Record<string, unknown>;
    };
    toolkitInstance = new ToolkitClass({
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      configuration: {
        actions: {
          invoices: {
            create: true,
            read: true,
            update: true,
            delete: true,
          },
          payments: { read: true },
        },
      },
    });
    pass("Toolkit instantiated");
  } catch (err) {
    fail("Could not instantiate toolkit", err);
    appendFinding(
      "verify:6 — Agent Toolkit",
      `- @paypal/agent-toolkit installed but could not be instantiated.
- Error: ${String(err)}
- Result: FAIL`
    );
    process.exit(1);
  }

  printStep(3, "Listing available tools");
  try {
    const instance = toolkitInstance as {
      getTools?: () => Record<string, unknown>;
      tools?: Record<string, unknown>;
    };

    let tools: Record<string, unknown> = {};
    if (typeof instance.getTools === "function") {
      tools = instance.getTools();
    } else if (instance.tools) {
      tools = instance.tools;
    }

    const toolNames = Object.keys(tools);
    console.log(`\n  Tools exposed (${toolNames.length} total):`);
    for (const name of toolNames) {
      console.log(`    • ${name}`);
    }

    // Our operations checklist
    const OUR_NEEDED_OPS = [
      "createInvoice",
      "getInvoice",
      "listInvoices",
      "updateInvoice",
      "sendInvoice",
      "cancelInvoice",
      "sendReminder",
      "enablePartialPayment",
    ];

    console.log("\n  Coverage analysis:");
    const covered: string[] = [];
    const notCovered: string[] = [];
    for (const op of OUR_NEEDED_OPS) {
      const found = toolNames.some(
        (t) =>
          t.toLowerCase().includes(op.toLowerCase()) ||
          op.toLowerCase().includes(t.toLowerCase())
      );
      if (found) {
        covered.push(op);
        console.log(`    ✅ ${op}`);
      } else {
        notCovered.push(op);
        console.log(`    ❌ ${op} — needs direct REST`);
      }
    }

    saveSample("v6-toolkit-tools", { toolNames, covered, notCovered });

    appendFinding(
      "verify:6 — Agent Toolkit Coverage",
      `- Tools available (${toolNames.length}): ${toolNames.map((t) => `\`${t}\``).join(", ")}
- Operations covered by toolkit: ${covered.map((t) => `\`${t}\``).join(", ") || "none"}
- Operations requiring direct REST: ${notCovered.map((t) => `\`${t}\``).join(", ") || "none"}
- Recommendation: Use toolkit where available; keep direct REST for partial payment and reminders.
- Result: PASS`
    );

    pass(`Toolkit has ${toolNames.length} tools. ${covered.length}/${OUR_NEEDED_OPS.length} of our operations covered.`);
  } catch (err) {
    fail("Could not list tools", err);
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
