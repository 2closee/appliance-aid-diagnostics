import type { SmsMessage, SmsProvider, SmsResult } from "./types.ts";

const API_BASE = "https://api.ng.termii.com";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Termii expects the APPROVED SENDER NAME (e.g. "FixBudi"), not the UUID shown
 * beside the sender ID in the Termii dashboard.
 */
export function isValidSenderId(value: string | undefined | null): boolean {
  const v = (value ?? "").trim();
  if (!v || UUID_RE.test(v)) return false;
  return /^[A-Za-z0-9 _-]{3,11}$/.test(v);
}

/**
 * Termii SMS adapter — primary provider for Nigerian numbers.
 * Requires TERMII_API_KEY and TERMII_SENDER_ID secrets.
 */
export const termiiProvider: SmsProvider = {
  name: "termii",

  isConfigured() {
    const senderId = Deno.env.get("TERMII_SENDER_ID");
    if (!Deno.env.get("TERMII_API_KEY")) return false;
    if (!isValidSenderId(senderId)) {
      console.error(
        "TERMII_SENDER_ID is invalid. Use the approved sender name (3-11 chars, e.g. \"FixBudi\"), " +
          "not the dashboard UUID.",
      );
      return false;
    }
    return true;
  },

  async send({ to, body }: SmsMessage): Promise<SmsResult> {
    const apiKey = Deno.env.get("TERMII_API_KEY");
    const senderId = Deno.env.get("TERMII_SENDER_ID")?.trim();
    if (!apiKey || !senderId) {
      return { provider: "termii", ok: false, error: "Termii is not configured" };
    }
    if (!isValidSenderId(senderId)) {
      return {
        provider: "termii",
        ok: false,
        error:
          "TERMII_SENDER_ID must be the approved sender name (3-11 characters), not the dashboard UUID.",
      };
    }

    // Nigerian workspaces are often only provisioned for one route. Try the
    // configured/likely channels in order so a missing GENERIC route does not
    // block delivery.
    const channels = ["dnd", "generic", "whatsapp"];
    let lastError = "Termii send was not attempted";

    for (const channel of channels) {
      const res = await fetch(`${API_BASE}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.replace(/^\+/, ""),
          from: senderId,
          sms: body,
          type: "plain",
          channel,
          api_key: apiKey,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(`Termii send failed on channel ${channel} [${res.status}]: ${text}`);
        lastError = `Termii error ${res.status}: ${text}`;
        // Only a missing/unconfigured route is worth retrying on another channel.
        if (/Route not configured|route=/i.test(text)) continue;
        return { provider: "termii", ok: false, error: lastError };
      }

      let parsed: { message_id?: string; message?: string; code?: string } = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        // Termii returned a non-JSON 200; treat as sent but log it.
        console.warn(`Termii returned non-JSON body: ${text.slice(0, 200)}`);
      }

      // Termii signals failures inside 200 responses via `code`.
      if (parsed.code && parsed.code !== "ok") {
        console.error(`Termii rejected message on channel ${channel}: ${text}`);
        lastError = parsed.message ?? parsed.code;
        continue;
      }

      return { provider: "termii", ok: true, messageId: parsed.message_id };
    }

    return { provider: "termii", ok: false, error: lastError };

  },
};
