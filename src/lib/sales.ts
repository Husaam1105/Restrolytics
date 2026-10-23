export type SalesChannel = {
  slug: string;
  label: string;
  /** value stored in sales.platform */
  platformKey: string;
  kind: "POS" | "Delivery";
};

export const SALES_CHANNELS: SalesChannel[] = [
  { slug: "toast", label: "Toast POS", platformKey: "pos", kind: "POS" },
  { slug: "ubereats", label: "Uber Eats", platformKey: "ubereats", kind: "Delivery" },
  { slug: "doordash", label: "DoorDash", platformKey: "doordash", kind: "Delivery" },
  { slug: "grubhub", label: "Grubhub", platformKey: "grubhub", kind: "Delivery" },
];

export function channelBySlug(slug: string): SalesChannel | undefined {
  return SALES_CHANNELS.find((c) => c.slug === slug);
}

/** Display name for a value stored in sales.platform. */
export function platformLabel(platformKey: string) {
  if (platformKey === "manual") return "Manual";
  return SALES_CHANNELS.find((c) => c.platformKey === platformKey)?.label ?? platformKey;
}

export const CATERING_STATUSES = [
  { id: "quoted", label: "Quoted" },
  { id: "confirmed", label: "Confirmed" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type CateringStatus = (typeof CATERING_STATUSES)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "check", label: "Check" },
  { id: "transfer", label: "Bank transfer" },
  { id: "other", label: "Other" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

export function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function statusLabel(status: string) {
  return CATERING_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function methodLabel(method: string) {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method;
}
