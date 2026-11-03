// Dev status page — server component, non-production only

// This page is only rendered in non-production environments.
// Data is fetched server-side so no client JS is needed for the table.

export const dynamic = "force-dynamic";

async function getDevData() {
  // Lazy import to avoid DB connection in build-time
  const { db } = await import("../../src/db");
  const { invoices, webhookEvents } = await import("../../src/db/schema");
  const { desc } = await import("drizzle-orm");

  const allInvoices = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.updatedAt))
    .limit(50);

  const recentEvents = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(20);

  return { allInvoices, recentEvents };
}

export default async function DevPage() {
  if (process.env["NODE_ENV"] === "production") {
    return (
      <div style={{ fontFamily: "monospace", padding: "2rem" }}>
        <h1>403 – Dev page disabled in production</h1>
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof getDevData>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getDevData();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const formatCents = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  return (
    <div style={{ fontFamily: "monospace", padding: "1rem", fontSize: "13px" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
        🛠 Settle – Dev Status Page
      </h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <a href="/dev" style={{ fontWeight: "bold", textDecoration: "underline" }}>General Dev</a>
        <a href="/dev/email" style={{ color: "#2563eb", textDecoration: "underline" }}>📬 Email Channel Debugger</a>
      </div>

      <form action="/api/paypal/sync" method="post" style={{ marginBottom: "1.5rem" }}>
        <button
          type="submit"
          style={{
            padding: "0.4rem 1rem",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          ↻ Sync from PayPal
        </button>
      </form>

      {dbError && (
        <div
          style={{
            background: "#fee2e2",
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
          }}
        >
          <strong>DB Error:</strong> {dbError}
        </div>
      )}

      <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Invoices</h2>
      {data ? (
        <table
          border={1}
          cellPadding={6}
          style={{ borderCollapse: "collapse", width: "100%", marginBottom: "2rem" }}
        >
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              <th>PayPal ID</th>
              <th>Status</th>
              <th>Paid / Total</th>
              <th>Due Date</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.allInvoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  No invoices yet
                </td>
              </tr>
            )}
            {data.allInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <code>{inv.paypalInvoiceId}</code>
                </td>
                <td>{inv.status}</td>
                <td>
                  {formatCents(inv.amountPaidCents)} /{" "}
                  {formatCents(inv.totalCents)}
                </td>
                <td>{inv.dueDate ?? "—"}</td>
                <td>{inv.updatedAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
        Recent Webhook Events (last 20)
      </h2>
      {data ? (
        <table
          border={1}
          cellPadding={6}
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              <th>PayPal Event ID</th>
              <th>Type</th>
              <th>Resource ID</th>
              <th>Received</th>
              <th>Processed</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {data.recentEvents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  No events yet
                </td>
              </tr>
            )}
            {data.recentEvents.map((ev) => (
              <tr key={ev.id}>
                <td>
                  <code style={{ fontSize: "11px" }}>{ev.paypalEventId}</code>
                </td>
                <td>{ev.eventType}</td>
                <td>
                  <code style={{ fontSize: "11px" }}>{ev.resourceId ?? "—"}</code>
                </td>
                <td>{ev.receivedAt.toISOString()}</td>
                <td>{ev.processedAt?.toISOString() ?? "—"}</td>
                <td style={{ color: ev.error ? "#dc2626" : "#16a34a" }}>
                  {ev.error ?? "✓"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
