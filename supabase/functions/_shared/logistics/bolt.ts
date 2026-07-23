// Bolt Business (Bolt Delivery API) adapter — SCAFFOLD.
// Live wiring is deferred until BOLT_BUSINESS_API_KEY is configured.
// See: https://bolt.eu/en/business/api-documentation/

import {
  LogisticsProvider,
  LogisticsQuoteRequest,
  LogisticsQuote,
  LogisticsCreateRequest,
  LogisticsCreateResult,
  ProviderNotConfiguredError,
} from "./types.ts";

const BOLT_API_KEY = Deno.env.get("BOLT_BUSINESS_API_KEY");
const BOLT_API_BASE = Deno.env.get("BOLT_API_BASE") ?? "https://node.bolt.eu/business-portal";

export const boltProvider: LogisticsProvider = {
  name: "bolt",
  isConfigured() {
    return !!BOLT_API_KEY;
  },
  async getQuote(_req: LogisticsQuoteRequest): Promise<LogisticsQuote> {
    if (!BOLT_API_KEY) throw new ProviderNotConfiguredError("bolt");
    // TODO: implement live Bolt Business quote request.
    // Explicit vehicle_type: "bike" keeps costs low for gadget dispatches.
    throw new ProviderNotConfiguredError("bolt");
  },
  async createDelivery(_req: LogisticsCreateRequest): Promise<LogisticsCreateResult> {
    if (!BOLT_API_KEY) throw new ProviderNotConfiguredError("bolt");
    // TODO: implement live Bolt Business dispatch.
    throw new ProviderNotConfiguredError("bolt");
  },
  async cancelDelivery(_providerRef: string): Promise<void> {
    if (!BOLT_API_KEY) throw new ProviderNotConfiguredError("bolt");
    // TODO: implement live Bolt Business cancellation.
  },
};

export { BOLT_API_BASE };
