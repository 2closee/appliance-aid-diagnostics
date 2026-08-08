import type { SmsMessage, SmsResult } from "./types.ts";
import { termiiProvider } from "./termii.ts";
import { twilioProvider } from "./twilio.ts";

// Termii first (cheaper, local NG routing), Twilio as failover.
const providers = [termiiProvider, twilioProvider];

export async function sendSms(message: SmsMessage): Promise<SmsResult> {
  const configured = providers.filter((p) => p.isConfigured());
  if (configured.length === 0) {
    return { provider: "none", ok: false, error: "No SMS provider is configured" };
  }

  let last: SmsResult = { provider: "none", ok: false, error: "No SMS provider attempted" };
  for (const provider of configured) {
    try {
      last = await provider.send(message);
      if (last.ok) return last;
      console.error(`SMS provider ${provider.name} failed: ${last.error}`);
    } catch (e) {
      last = { provider: provider.name, ok: false, error: (e as Error).message };
      console.error(`SMS provider ${provider.name} threw: ${last.error}`);
    }
  }
  return last;
}
