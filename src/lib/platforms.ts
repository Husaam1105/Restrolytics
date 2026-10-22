export type PlatformId = "toast" | "ubereats" | "doordash" | "grubhub";

export type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
};

export type PlatformMeta = {
  id: PlatformId;
  name: string;
  kind: "POS" | "Delivery";
  description: string;
  docsUrl: string;
  fields: CredentialField[];
};

export const PLATFORMS: PlatformMeta[] = [
  {
    id: "toast",
    name: "Toast POS",
    kind: "POS",
    description: "Sync in-store orders, tips and payments from your Toast restaurant.",
    docsUrl: "https://doc.toasttab.com/doc/devguide/apiOverview.html",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Toast API client ID", secret: false },
      { key: "client_secret", label: "Client secret", placeholder: "Toast API client secret", secret: true },
      { key: "restaurant_guid", label: "Restaurant GUID", placeholder: "e.g. 3f2a…", secret: false },
    ],
  },
  {
    id: "ubereats",
    name: "Uber Eats",
    kind: "Delivery",
    description: "Pull delivery orders, payouts and fees from Uber Eats.",
    docsUrl: "https://developer.uber.com/docs/eats/introduction",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Uber app client ID", secret: false },
      { key: "client_secret", label: "Client secret", placeholder: "Uber app client secret", secret: true },
      { key: "store_id", label: "Store ID", placeholder: "Uber Eats store ID", secret: false },
    ],
  },
  {
    id: "doordash",
    name: "DoorDash",
    kind: "Delivery",
    description: "Import DoorDash orders, commissions and payout summaries.",
    docsUrl: "https://developer.doordash.com/en-US/docs/drive/how_to/get_started/",
    fields: [
      { key: "developer_id", label: "Developer ID", placeholder: "DoorDash developer ID", secret: false },
      { key: "key_id", label: "Key ID", placeholder: "DoorDash key ID", secret: false },
      { key: "signing_secret", label: "Signing secret", placeholder: "DoorDash signing secret", secret: true },
      { key: "store_id", label: "Store ID", placeholder: "DoorDash store ID", secret: false },
    ],
  },
  {
    id: "grubhub",
    name: "Grubhub",
    kind: "Delivery",
    description: "Bring Grubhub orders and adjustments into your sales history.",
    docsUrl: "https://developer.grubhub.com/",
    fields: [
      { key: "api_key", label: "API key", placeholder: "Grubhub API key", secret: true },
      { key: "restaurant_id", label: "Restaurant ID", placeholder: "Grubhub restaurant ID", secret: false },
    ],
  },
];

export function platformMeta(id: string): PlatformMeta | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
