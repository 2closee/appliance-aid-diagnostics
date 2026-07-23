// Item-size routing for logistics dispatch.
// Small/medium high-value gadgets are dispatched via the logistics API (bikes).
// Bulky items are handled by the repair center's own logistics.

export type LogisticsCategory = "gadget" | "bulky";

const GADGET_KEYWORDS = [
  "phone", "smartphone", "iphone", "android",
  "laptop", "macbook", "notebook", "ultrabook",
  "tablet", "ipad",
  "smartwatch", "watch",
  "earbuds", "headphones", "airpods",
  "camera", "dslr", "gopro",
  "console", "playstation", "ps4", "ps5", "xbox", "switch", "nintendo",
  "drone",
  "e-reader", "kindle",
];

const BULKY_KEYWORDS = [
  "ac", "air conditioner", "air-conditioner", "aircon",
  "tv", "television",
  "fridge", "refrigerator", "freezer",
  "washing machine", "washer", "dryer",
  "microwave", "oven", "cooker", "stove",
  "generator", "gen", "inverter",
  "dishwasher",
  "water heater", "water dispenser",
  "fan", "standing fan",
  "sound system", "home theater", "home theatre",
];

export function getLogisticsCategory(applianceType: string | null | undefined): LogisticsCategory {
  if (!applianceType) return "gadget";
  const s = applianceType.toLowerCase().trim();
  if (BULKY_KEYWORDS.some((k) => s.includes(k))) return "bulky";
  if (GADGET_KEYWORDS.some((k) => s.includes(k))) return "gadget";
  // Default: treat unknown as gadget so we still attempt API dispatch;
  // bulky is the explicit exception (safer to over-serve than to route bulky).
  return "gadget";
}

export function isBulky(applianceType: string | null | undefined): boolean {
  return getLogisticsCategory(applianceType) === "bulky";
}

export function isGadget(applianceType: string | null | undefined): boolean {
  return getLogisticsCategory(applianceType) === "gadget";
}
