/**
 * Email Parser Utilities
 *
 * 1. Signature & Quoted History Stripping:
 *    Removes client email reply quotes (lines starting with '>', 'On ... wrote:',
 *    '-----Original Message-----', etc.) and common mobile/client signatures.
 * 2. HTML to Text Fallback:
 *    Safely strips HTML tags while preserving line breaks.
 * 3. Auto-Reply / Vacation Detection:
 *    Checks RFC headers and common bounce/out-of-office subject markers.
 * 4. Reply Token Extraction:
 *    Extracts reply+{token}@ from To headers.
 */

export interface ParsedEmailHeaders {
  autoSubmitted?: string;
  precedence?: string;
  xAutoReply?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  [key: string]: string | undefined;
}

/**
 * Normalizes header keys to lowercase.
 */
export function normalizeHeaders(
  rawHeaders?: Record<string, string | string[] | undefined>
): ParsedEmailHeaders {
  const normalized: ParsedEmailHeaders = {};
  if (!rawHeaders) return normalized;

  for (const [key, val] of Object.entries(rawHeaders)) {
    const lowerKey = key.toLowerCase();
    const strVal = Array.isArray(val) ? val.join(", ") : val || "";
    normalized[lowerKey] = strVal;
    if (lowerKey === "auto-submitted") normalized.autoSubmitted = strVal;
    if (lowerKey === "precedence") normalized.precedence = strVal;
    if (lowerKey === "x-autoreply") normalized.xAutoReply = strVal;
    if (lowerKey === "message-id") normalized.messageId = strVal;
    if (lowerKey === "in-reply-to") normalized.inReplyTo = strVal;
    if (lowerKey === "references") normalized.references = strVal;
  }

  return normalized;
}

/**
 * Checks if an email is an automated response, out-of-office, or bounce message.
 */
export function isAutoReplyEmail(params: {
  headers?: ParsedEmailHeaders;
  subject?: string;
  from?: string;
}): { isAutoReply: boolean; reason?: string } {
  const { headers, subject = "", from = "" } = params;

  // 1. Auto-Submitted header (RFC 3834)
  if (headers?.autoSubmitted) {
    const val = headers.autoSubmitted.toLowerCase().trim();
    if (val !== "no" && val !== "") {
      return { isAutoReply: true, reason: `Auto-Submitted header: ${val}` };
    }
  }

  // 2. Precedence header
  if (headers?.precedence) {
    const val = headers.precedence.toLowerCase().trim();
    if (["bulk", "junk", "auto_reply", "list"].includes(val)) {
      return { isAutoReply: true, reason: `Precedence header: ${val}` };
    }
  }

  // 3. X-Autoreply header
  if (headers?.xAutoReply) {
    const val = headers.xAutoReply.toLowerCase().trim();
    if (val === "yes" || val === "true") {
      return { isAutoReply: true, reason: `X-Autoreply header: ${val}` };
    }
  }

  // 4. Sender address check (mailer-daemon, postmaster, noreply)
  const lowerFrom = from.toLowerCase();
  if (
    lowerFrom.includes("mailer-daemon@") ||
    lowerFrom.includes("postmaster@") ||
    lowerFrom.startsWith("no-reply@") ||
    lowerFrom.startsWith("noreply@")
  ) {
    return { isAutoReply: true, reason: `Automated daemon or no-reply sender: ${from}` };
  }

  // 5. Subject check
  const lowerSubject = subject.toLowerCase().trim();
  const autoSubjectPatterns = [
    /^auto:\s*/i,
    /^automatic reply:\s*/i,
    /^out of office/i,
    /^undeliverable:/i,
    /^delivery status notification/i,
    /^failure notice/i,
  ];

  for (const pattern of autoSubjectPatterns) {
    if (pattern.test(lowerSubject)) {
      return { isAutoReply: true, reason: `Automated subject match: "${subject}"` };
    }
  }

  return { isAutoReply: false };
}

/**
 * Parses and extracts reply token from a list of 'to' email addresses.
 * Format: reply+{token}@{domain}
 */
export function extractReplyToken(toAddresses: string | string[]): string | null {
  const list = Array.isArray(toAddresses) ? toAddresses : [toAddresses];
  const regex = /reply\+([a-zA-Z0-9_-]+)@/i;

  for (const addr of list) {
    if (!addr) continue;
    const match = addr.match(regex);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Extracts a clean email address from a string like "John Doe <john@acme.com>"
 */
export function extractBareEmail(address: string): string {
  const match = address.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return address.trim().toLowerCase();
}

/**
 * Converts basic HTML to plain text when no plain text part is present.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";

  let text = html;
  // Remove script and style tags and content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  text = text.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "");

  // Convert line breaks and paragraph ends
  text = text.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");

  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'");

  // Normalize excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Strips quoted reply history and common signatures, returning the new message content.
 * Truncates to ~4,000 characters maximum for safety.
 */
export function cleanInboundEmailText(rawText: string, maxChars: number = 4000): string {
  if (!rawText) return "";

  const lines = rawText.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Check for quoted lines
    if (trimmed.startsWith(">")) {
      break;
    }

    // Check for common attribution headers that mark the start of reply history
    if (
      /^On\s+.+wrote:$/i.test(trimmed) ||
      /^On\s+.+<.+>\s+wrote:$/i.test(trimmed) ||
      /^-----Original Message-----/i.test(trimmed) ||
      /^________________________________/i.test(trimmed) ||
      /^From:\s+.+Sent:\s+.+Subject:/i.test(trimmed) ||
      /^From:\s+.+To:\s+.+Subject:/i.test(trimmed)
    ) {
      break;
    }

    // Check for standard signature markers
    if (trimmed === "--" || trimmed === "-- ") {
      break;
    }

    // Check for mobile signatures if they appear toward the end
    if (
      /^Sent from my (iPhone|iPad|Galaxy|device)/i.test(trimmed) ||
      /^Get Outlook for (iOS|Android)/i.test(trimmed)
    ) {
      break;
    }

    cleanLines.push(line);
  }

  const result = cleanLines.join("\n").trim();
  if (result.length > maxChars) {
    return result.slice(0, maxChars);
  }

  return result;
}
