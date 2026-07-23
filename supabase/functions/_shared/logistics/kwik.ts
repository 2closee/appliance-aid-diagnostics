// Kwik Delivery adapter — SCAFFOLD.
// Live wiring is deferred until KWIK_API_KEY / KWIK_API_SECRET are configured.
// See: https://kwik.delivery (developer portal).

import {
  LogisticsProvider,
  LogisticsQuoteRequest,
  LogisticsQuote,
  LogisticsCreateRequest,
  LogisticsCreateResult,
  ProviderNotConfiguredError,
} from "./types.ts";

const KWIK_API_KEY = Deno.env.get("KWIK_API_KEY");
const KWIK_API_BASE = Deno.env.get("KWIK_API_BASE") ?? "https://api.kwik.delivery/v1";

export const kwikProvider: LogisticsProvider = {
  name: "kwik",
  isConfigured() {
    return !!KWIK_API_KEY;
  },
  async getQuote(_req: LogisticsQuoteRequest): Promise<LogisticsQuote> {
    if (!KWIK_API_KEY) throw new ProviderNotConfiguredError("kwik");
    // TODO: implement live Kwik quote request.
    // Expected payload includes: pickup/delivery lat-lng, vehicle_type: "bike",
    // category: "small_parcel", handle_with_care flags for laptops/phones.
    throw new ProviderNotConfiguredError("kwik");
  },
  async createDelivery(_req: LogisticsCreateRequest): Promise<LogisticsCreateResult> {
    if (!KWIK_API_KEY) throw new ProviderNotConfiguredError("kwik");
    // TODO: implement live Kwik dispatch. Must pass explicit
    // vehicle_type "bike" and delivery_instructions "Handle with care".
    throw new ProviderNotConfiguredError("kwik");
  },
  async cancelDelivery(_providerRef: string): Promise<void> {
    if (!KWIK_API_KEY) throw new ProviderNotConfiguredError("kwik");
    // TODO: implement live Kwik cancellation.
  },
};

export { KWIK_API_BASE };
