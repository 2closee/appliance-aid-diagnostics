import type { SmsMessage, SmsProvider, SmsResult } from "./types.ts";

const API_BASE = "https://api.ng.termii.com";

/**
 * Termii SMS adapter — primary provider for Nigerian numbers.
 * Requires TERMII_API_KEY and TERMII_SENDER_ID secrets.
 */
export const termiiProvider: SmsProvider = {
  name: "termii",

  isConfigured() {
    return !!Deno.env.get("TERMII_API_KEY") && !!Deno.env.get("TERMII_SENDER_ID");
  },

  async send({ to, body }: SmsMessage): Promise<SmsResult> {
    const apiKey = Deno.env.get("TERMII_API_KEY");
    const senderId = Deno.env.get("TERMII_SENDER_ID");
    if (!apiKey || !senderId) {
      return { provider: "termii", ok: false, error: "Termii is not configured" };
    }

    const res = await fetch(`${API_BASE}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.replace(/^\+/, ""),
        from: senderId,
        sms: body,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Termii send failed [${res.status}]: ${text}`);
      return { provider: "termii", ok: false, error: `Termii error ${res.status}: ${text}` };
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
      console.error(`Termii rejected message: ${text}`);
      return { provider: "termii", ok: false, error: parsed.message ?? parsed.code };
    }

    return { provider: "termii", ok: true, messageId: parsed.message_id };
  },
};
