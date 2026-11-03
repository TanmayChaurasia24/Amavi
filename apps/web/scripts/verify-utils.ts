/**
 * Shared utilities for verification scripts.
 */
import fs from "fs";
import path from "path";

const SAMPLES_DIR = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../docs/paypal-samples"
);
const FINDINGS_FILE = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../docs/phase1-findings.md"
);

export function ensureDirs() {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

export function saveSample(name: string, data: unknown) {
  ensureDirs();
  const filePath = path.join(SAMPLES_DIR, `${name}.json`);
  // Redact sensitive fields
  const str = JSON.stringify(data, null, 2)
    .replace(/"access_token":\s*"[^"]+"/g, '"access_token": "[REDACTED]"')
    .replace(/"client_secret":\s*"[^"]+"/g, '"client_secret": "[REDACTED]"');
  fs.writeFileSync(filePath, str, "utf8");
  console.log(`  💾 Saved sample → ${filePath}`);
}

export function appendFinding(section: string, content: string) {
  const line = `\n### ${section}\n\n${content}\n`;
  fs.appendFileSync(FINDINGS_FILE, line, "utf8");
}

export function pass(msg: string) {
  console.log(`\n✅ PASS: ${msg}`);
}

export function fail(msg: string, err?: unknown) {
  console.error(`\n❌ FAIL: ${msg}`);
  if (err) console.error(err);
}

export function printStep(n: number, msg: string) {
  console.log(`\n─── Step ${n}: ${msg} ${"─".repeat(Math.max(0, 50 - msg.length))}`);
}
