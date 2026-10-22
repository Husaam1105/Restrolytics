export type InvoiceLine = { name: string; quantity: number; unitPrice: number };
export type InvoiceRead = {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: number;
  items: InvoiceLine[];
};

const SYSTEM = `You read restaurant supplier invoices and delivery receipts.
Return ONLY compact JSON with this exact shape:
{"vendorName":string|null,"invoiceNumber":string|null,"invoiceDate":"YYYY-MM-DD"|null,"total":number,"items":[{"name":string,"quantity":number,"unitPrice":number}]}
Rules:
- One entry per line item on the invoice. Keep the product name as printed, including pack size.
- quantity is the number of units/cases delivered (not the pack size).
- unitPrice is the price for ONE unit. If only a line total is printed, divide it by the quantity.
- Ignore subtotals, tax, delivery fees, discounts and credits as line items.
- total is the invoice grand total. Use 0 when it is unreadable.
- Never invent items. Numbers must be plain numbers with no currency symbols.`;

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Sends an invoice photo or PDF to the AI reader and returns its line items. */
export async function readInvoiceFile(options: { dataUrl: string; mimeType: string }): Promise<InvoiceRead> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("The invoice reader is not configured yet.");

  const isPdf = options.mimeType === "application/pdf";
  const content = isPdf
    ? [
        { type: "text", text: "Read this invoice." },
        { type: "file", file: { filename: "invoice.pdf", file_data: options.dataUrl } },
      ]
    : [
        { type: "text", text: "Read this invoice." },
        { type: "image_url", image_url: { url: options.dataUrl } },
      ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
    }),
  });

  if (response.status === 429) throw new Error("The invoice reader is busy right now. Try again in a moment.");
  if (response.status === 402) throw new Error("The invoice reader ran out of credits.");
  if (!response.ok) {
    throw new Error(`The invoice could not be read (${response.status}).`);
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!jsonText) throw new Error("Nothing readable was found on that invoice.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error("Nothing readable was found on that invoice.");
  }

  const rawItems = Array.isArray(parsed["items"]) ? (parsed["items"] as Record<string, unknown>[]) : [];
  const items: InvoiceLine[] = rawItems
    .map((item) => ({
      name: String(item["name"] ?? "").trim(),
      quantity: Math.abs(toNumber(item["quantity"])) || 1,
      unitPrice: Math.abs(toNumber(item["unitPrice"])),
    }))
    .filter((item) => item.name.length > 0);

  const date = typeof parsed["invoiceDate"] === "string" ? parsed["invoiceDate"] : null;
  return {
    vendorName: typeof parsed["vendorName"] === "string" ? parsed["vendorName"] : null,
    invoiceNumber: typeof parsed["invoiceNumber"] === "string" ? parsed["invoiceNumber"] : null,
    invoiceDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    total: toNumber(parsed["total"]),
    items,
  };
}
