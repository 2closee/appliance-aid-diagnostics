// Provider-agnostic dispatcher.
// Picks providers in priority order and fails over automatically.

import {
  LogisticsProvider,
  LogisticsQuoteRequest,
  LogisticsQuote,
  LogisticsCreateRequest,
  LogisticsCreateResult,
} from "./types.ts";
import { fezProvider } from "./fez.ts";
import { kwikProvider } from "./kwik.ts";
import { boltProvider } from "./bolt.ts";

// Fez is priority #1 (primary gadget provider for Port Harcourt).
// Kwik/Bolt remain as failover once their credentials are configured.
// Terminal Africa is still handled inline as the final fallback.
const REGISTRY: Record<string, LogisticsProvider> = {
  fez: fezProvider,
  kwik: kwikProvider,
  bolt: boltProvider,
};

export interface DispatchAttempt {
  provider: string;
  success: boolean;
  error?: string;
}

export interface DispatchOutcome<T> {
  result?: T;
  provider?: string;
  failover_from?: string;
  attempts: DispatchAttempt[];
}

const DEFAULT_PRIORITY = ["fez", "kwik", "bolt"];

function resolveOrder(priority?: string[]): LogisticsProvider[] {
  const order = (priority && priority.length ? priority : DEFAULT_PRIORITY)
    .map((n) => REGISTRY[n])
    .filter(Boolean);
  return order.filter((p) => p.isConfigured());
}

export async function dispatchQuote(
  req: LogisticsQuoteRequest,
  priority?: string[],
): Promise<DispatchOutcome<LogisticsQuote>> {
  const attempts: DispatchAttempt[] = [];
  const providers = resolveOrder(priority);
  let firstProvider: string | undefined;
  for (const p of providers) {
    if (!firstProvider) firstProvider = p.name;
    try {
      const q = await p.getQuote(req);
      return {
        result: q,
        provider: p.name,
        failover_from: firstProvider !== p.name ? firstProvider : undefined,
        attempts: [...attempts, { provider: p.name, success: true }],
      };
    } catch (e) {
      attempts.push({ provider: p.name, success: false, error: (e as Error).message });
      console.warn(`[logistics] quote failed on ${p.name}: ${(e as Error).message}`);
    }
  }
  return { attempts };
}

export async function dispatchCreate(
  req: LogisticsCreateRequest,
  priority?: string[],
): Promise<DispatchOutcome<LogisticsCreateResult>> {
  const attempts: DispatchAttempt[] = [];
  const providers = resolveOrder(priority);
  let firstProvider: string | undefined;
  for (const p of providers) {
    if (!firstProvider) firstProvider = p.name;
    try {
      const r = await p.createDelivery(req);
      return {
        result: r,
        provider: p.name,
        failover_from: firstProvider !== p.name ? firstProvider : undefined,
        attempts: [...attempts, { provider: p.name, success: true }],
      };
    } catch (e) {
      attempts.push({ provider: p.name, success: false, error: (e as Error).message });
      console.warn(`[logistics] dispatch failed on ${p.name}: ${(e as Error).message}`);
    }
  }
  return { attempts };
}

export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Basic radius-based zone check. `zones` is loaded from
// public.logistics_service_zones. Returns matching zone or null.
export interface ServiceZone {
  id: string;
  zone_name: string;
  city: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  active: boolean;
  provider_priority: string[] | null;
}

export function findServiceZone(
  lat: number | undefined,
  lng: number | undefined,
  zones: ServiceZone[],
): ServiceZone | null {
  if (lat == null || lng == null) return null;
  for (const z of zones) {
    if (!z.active || z.center_lat == null || z.center_lng == null) continue;
    const d = haversineKm(lat, lng, z.center_lat, z.center_lng);
    if (d <= (z.radius_km ?? 5)) return z;
  }
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
