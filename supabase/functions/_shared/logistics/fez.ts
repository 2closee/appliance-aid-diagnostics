// Fez Delivery adapter — SCAFFOLD.
// Live wiring is deferred until FEZ credentials are configured:
//   - FEZ_USER_ID
//   - FEZ_PASSWORD
//   - FEZ_API_BASE (sandbox: https://apisandbox.fezdelivery.co/v1
//                   production: https://api.fezdelivery.co/v1)
// Fez uses token-based auth: POST /user/authenticate returns a bearer token
// which we cache in module scope and refresh on 401.

import {
  LogisticsProvider,
  LogisticsQuoteRequest,
  LogisticsQuote,
  LogisticsCreateRequest,
  LogisticsCreateResult,
  ProviderNotConfiguredError,
} from "./types.ts";

const FEZ_USER_ID = Deno.env.get("FEZ_USER_ID");
const FEZ_PASSWORD = Deno.env.get("FEZ_PASSWORD");
const FEZ_API_BASE = Deno.env.get("FEZ_API_BASE") ?? "https://apisandbox.fezdelivery.co/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(`${FEZ_API_BASE}/user/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: FEZ_USER_ID, password: FEZ_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Fez auth failed: ${res.status}`);
  const data = await res.json();
  const token = data?.token || data?.data?.token || data?.access_token;
  if (!token) throw new Error("Fez auth: no token in response");
  cachedToken = { value: token, expiresAt: Date.now() + 30 * 60_000 };
  return token;
}

async function fezFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  let res = await fetch(`${FEZ_API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    cachedToken = null;
    const retryToken = await getToken();
    headers.set("Authorization", `Bearer ${retryToken}`);
    res = await fetch(`${FEZ_API_BASE}${path}`, { ...init, headers });
  }
  return res;
}

export const fezProvider: LogisticsProvider = {
  name: "fez",
  isConfigured() {
    return !!(FEZ_USER_ID && FEZ_PASSWORD);
  },
  async getQuote(_req: LogisticsQuoteRequest): Promise<LogisticsQuote> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError("fez");
    // TODO: call Fez rate endpoint (POST /order/cost) with pickup/delivery
    // state+lga (or lat/lng), weight, category "gadget".
    throw new ProviderNotConfiguredError("fez");
  },
  async createDelivery(_req: LogisticsCreateRequest): Promise<LogisticsCreateResult> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError("fez");
    // TODO: call POST /order to create the delivery task. Pass pickup/return
    // OTPs in additional_note; attach condition photo URLs when supported.
    throw new ProviderNotConfiguredError("fez");
  },
  async cancelDelivery(_providerRef: string): Promise<void> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError("fez");
    // TODO: call Fez cancel endpoint.
  },
};

export { FEZ_API_BASE, fezFetch };
