import { db } from "../src/db";
import {
  invoices,
  clients,
  messages,
  paymentPlans,
  planInstalments,
  approvalQueue,
  agentLogs,
  webhookEvents,
  owners,
} from "../src/db/schema";
import { sql } from "drizzle-orm";

async function clearData() {
  console.log("🧹 Clearing all invoice, client, message, and transaction data...\n");

  // 1. Check existing owners
  const existingOwners = await db
    .select({ id: owners.id, email: owners.email, name: owners.name })
    .from(owners);

  console.log(`👤 Found ${existingOwners.length} registered owner(s):`);
  for (const owner of existingOwners) {
    console.log(`   - ${owner.name} (${owner.email}) [ID: ${owner.id}]`);
  }
  console.log("   (Owner accounts, passwords, and sessions will be PRESERVED)\n");

  // 2. Delete transaction and invoice tables in foreign-key dependency order
  console.log("🗑️  Deleting child records...");
  await db.delete(planInstalments);
  console.log("   ✓ Cleared plan_instalments");

  await db.delete(paymentPlans);
  console.log("   ✓ Cleared payment_plans");

  await db.delete(messages);
  console.log("   ✓ Cleared messages");

  await db.delete(approvalQueue);
  console.log("   ✓ Cleared approval_queue");

  await db.delete(agentLogs);
  console.log("   ✓ Cleared agent_logs");

  await db.delete(webhookEvents);
  console.log("   ✓ Cleared webhook_events");

  // 3. Delete invoices
  console.log("🗑️  Deleting invoices...");
  await db.delete(invoices);
  console.log("   ✓ Cleared invoices");

  // 4. Delete clients
  console.log("🗑️  Deleting clients...");
  await db.delete(clients);
  console.log("   ✓ Cleared clients");

  // 5. Verification check
  const [invCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  const [cliCount] = await db.select({ count: sql<number>`count(*)` }).from(clients);
  const [msgCount] = await db.select({ count: sql<number>`count(*)` }).from(messages);
  const [planCount] = await db.select({ count: sql<number>`count(*)` }).from(paymentPlans);
  const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(approvalQueue);

  console.log("\n✅ Database cleaned successfully!");
  console.log("📊 Summary of remaining data:");
  console.log(`   - Invoices:       ${invCount?.count ?? 0}`);
  console.log(`   - Clients:        ${cliCount?.count ?? 0}`);
  console.log(`   - Messages:       ${msgCount?.count ?? 0}`);
  console.log(`   - Payment Plans:  ${planCount?.count ?? 0}`);
  console.log(`   - Approvals:      ${appCount?.count ?? 0}`);
  console.log(`   - Owners:         ${existingOwners.length} (Active & Preserved)`);
}

clearData()
  .then(() => {
    console.log("\n🎉 Ready for testing fresh onboarding and invoice flows.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error clearing data:", err);
    process.exit(1);
  });

