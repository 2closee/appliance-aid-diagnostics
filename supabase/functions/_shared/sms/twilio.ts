import type { SmsMessage, SmsProvider, SmsResult } from "./types.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

/**
 * Twilio SMS adapter — optional failover behind Termii.
 * Only active once the Twilio connector is linked (TWILIO_API_KEY) and
 * TWILIO_FROM_NUMBER is set.
 */
export const twilioProvider: SmsProvider = {
  name: "twilio",

  isConfigured() {
    return (
      !!Deno.env.get("LOVABLE_API_KEY") &&
      !!Deno.env.get("TWILIO_API_KEY") &&
      !!Deno.env.get("TWILIO_FROM_NUMBER")
    );
  },

  async send({ to, body }: SmsMessage): Promise<SmsResult> {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const from = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!lovableKey || !twilioKey || !from) {
      return { provider: "twilio", ok: false, error: "Twilio is not configured" };
    }

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Twilio send failed [${res.status}]: ${text}`);
      return { provider: "twilio", ok: false, error: `Twilio error ${res.status}: ${text}` };
    }

    let parsed: { sid?: string } = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      console.warn(`Twilio returned non-JSON body: ${text.slice(0, 200)}`);
    }
    return { provider: "twilio", ok: true, messageId: parsed.sid };
  },
};
