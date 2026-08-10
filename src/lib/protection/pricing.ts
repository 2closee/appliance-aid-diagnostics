// FixBudi Repair Protection — client-side pricing mirror.
// The authoritative fee is always calculated server-side from
// public.protection_pricing_tiers by the `calculate-protection-quote` function.
// This mirror exists so the checkout UI can render instantly.

export const PROTECTION_TERMS_VERSION = "v1.0";
export const PROTECTION_PERIOD_DAYS = 90;
export const PROTECTION_MAX_CLAIMS = 2;

export type ProtectionDeviceCategory = "phone" | "laptop";

const PHONE_KEYWORDS = ["phone", "smartphone", "iphone", "android", "mobile"];
const LAPTOP_KEYWORDS = ["laptop", "macbook", "notebook", "ultrabook"];

/**
 * Repair Protection covers phones and laptops only.
 */
export function getProtectionCategory(
  applianceType: string | null | undefined
): ProtectionDeviceCategory | null {
  if (!applianceType) return null;
  const s = applianceType.toLowerCase().trim();
  if (LAPTOP_KEYWORDS.some((k) => s.includes(k))) return "laptop";
  if (PHONE_KEYWORDS.some((k) => s.includes(k))) return "phone";
  return null;
}

export function isProtectionEligible(applianceType: string | null | undefined): boolean {
  return getProtectionCategory(applianceType) !== null;
}

interface Tier {
  min: number;
  max: number | null;
  flat?: number;
  rate?: number;
  cap?: number;
}

// Keep in sync with the seeded rows in protection_pricing_tiers.
export const DEFAULT_TIERS: Tier[] = [
  { min: 0, max: 20000, flat: 3000 },
  { min: 20000, max: 35000, flat: 3500 },
  { min: 35000, max: 50000, flat: 4500 },
  { min: 50000, max: 100000, flat: 6500 },
  { min: 100000, max: null, rate: 0.08, cap: 15000 },
];

export function calculateProtectionFee(repairCost: number): number {
  const tier =
    DEFAULT_TIERS.find((t) => repairCost <= (t.max ?? Infinity) && repairCost > t.min) ??
    DEFAULT_TIERS[0];
  if (tier.flat != null) return tier.flat;
  const fee = Math.round((repairCost * (tier.rate ?? 0)) / 100) * 100;
  return tier.cap ? Math.min(fee, tier.cap) : fee;
}

export const PROTECTION_COVERED = [
  "The same fault returning within 90 days",
  "Free re-repair by the same repair centre",
  "Free pickup and return delivery (both legs)",
  "Free diagnostic re-check of the original fault",
];

export const PROTECTION_NOT_COVERED = [
  "New or unrelated faults",
  "Liquid or impact damage after collection",
  "Tampering or repair by a third party",
  "Batteries and other consumables beyond stated wear",
  "Loss or theft of the device",
];
