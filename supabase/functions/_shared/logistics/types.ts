// Shared types for provider-agnostic logistics dispatch.

export interface LogisticsQuoteRequest {
  pickup_address: string;
  delivery_address: string;
  pickup_name?: string;
  pickup_phone?: string;
  delivery_name?: string;
  delivery_phone?: string;
  package_size?: "small" | "medium" | "large";
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
}

export interface LogisticsQuote {
  provider: string;
  carrier: string;
  estimated_cost: number;
  currency: string;
  estimated_time_minutes: number;
  distance_km?: number;
  app_commission: number;
  total_customer_pays: number;
  commission_rate: number;
  quote_expires_at: string;
  provider_ref?: Record<string, unknown>;
}

export interface LogisticsCreateRequest extends LogisticsQuoteRequest {
  repair_job_id: string;
  delivery_type: "pickup" | "return";
  notes?: string;
}

export interface LogisticsCreateResult {
  provider: string;
  tracking_id: string;
  tracking_url?: string;
  rider_name?: string;
  rider_phone?: string;
  rider_vehicle?: string;
  raw?: unknown;
}

export interface LogisticsProvider {
  name: string;
  isConfigured(): boolean;
  getQuote(req: LogisticsQuoteRequest): Promise<LogisticsQuote>;
  createDelivery(req: LogisticsCreateRequest): Promise<LogisticsCreateResult>;
  cancelDelivery(providerRef: string): Promise<void>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Provider not configured: ${provider}`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class NoRidersAvailableError extends Error {
  constructor(provider: string) {
    super(`No riders available at ${provider}`);
    this.name = "NoRidersAvailableError";
  }
}
