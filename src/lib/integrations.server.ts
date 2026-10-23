import { platformMeta } from "./platforms";

export function validateCredentials(platform: string, credentials: Record<string, string>) {
  const meta = platformMeta(platform);
  if (!meta) throw new Error("Unknown platform");
  const missing = meta.fields
    .filter((f) => (credentials[f.key] ?? "").trim().length === 0)
    .map((f) => f.label);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
  const cleaned: Record<string, string> = {};
  for (const field of meta.fields) {
    cleaned[field.key] = credentials[field.key]!.trim();
  }
  return { meta, cleaned };
}

export function accountLabelFor(platform: string, credentials: Record<string, string>) {
  const idKey = ["store_id", "restaurant_guid", "restaurant_id", "client_id", "developer_id"].find(
    (k) => credentials[k],
  );
  const value = idKey ? credentials[idKey]! : "";
  const masked = value.length > 6 ? `${value.slice(0, 4)}…${value.slice(-2)}` : value;
  return masked || platform;
}
