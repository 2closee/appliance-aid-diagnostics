export interface SmsMessage {
  to: string; // E.164, e.g. +2348012345678
  body: string;
}

export interface SmsResult {
  provider: string;
  messageId?: string;
  ok: boolean;
  error?: string;
}

export interface SmsProvider {
  name: string;
  isConfigured(): boolean;
  send(message: SmsMessage): Promise<SmsResult>;
}

/**
 * Normalise Nigerian phone input to E.164.
 * Accepts 08012345678, 8012345678, 2348012345678, +2348012345678.
 * Returns null when the number cannot be a valid NG mobile number.
 */
export function normalizeNigerianPhone(raw: string): string | null {
  const digits = (raw || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;

  let local: string;
  if (digits.startsWith("234")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;

  if (!/^[789]\d{9}$/.test(local)) return null;
  return `+234${local}`;
}
