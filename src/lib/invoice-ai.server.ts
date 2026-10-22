import { z } from "zod";

export type InvoiceLine = { name: string; quantity: number; unitPrice: number };
export type InvoiceRead = {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: number;
  items: InvoiceLine[];
};

const SYSTEM = `You read restaurant supplier invoices and delivery receipts.
Rules:
- One entry per line item on the invoice. Keep the product name as printed, including pack size.
- quantity is the number of units/cases delivered (not the pack size).
- unitPrice is the price for ONE unit. If only a line total is printed, divide it by the quantity.
- Ignore subtotals, tax, delivery fees, discounts and credits as line items.
- total is the invoice grand total. Use 0 when it is unreadable.
- Never invent items. Numbers must be plain numbers with no currency symbols.`;

const invoiceSchema = z.object({
  vendorName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable().describe("YYYY-MM-DD"),
  total: z.number(),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), unitPrice: z.number() })),
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Accepts only a base64 `data:` URL of an allowed type and returns raw bytes,
 * so nothing that looks like a URL ever reaches the AI SDK (which would fetch it).
 */
function decodeInvoiceDataUrl(dataUrl: string, mimeType: string) {
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  const mediaType = match?.[1]?.toLowerCase();
  if (!match || !mediaType || !ALLOWED_TYPES.has(mediaType) || mediaType !== mimeType.toLowerCase()) {
    throw new Error("Upload a photo (JPG, PNG, WebP, HEIC) or a PDF of the invoice.");
  }
  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) throw new Error("That file is empty or larger than 15 MB.");
  return { bytes: new Uint8Array(bytes), mediaType };
}

/** Sends an invoice photo or PDF to the AI reader and returns its line items. */
export async function readInvoiceFile(options: { dataUrl: string; mimeType: string }): Promise<InvoiceRead> {
  const { aiErrorMessage, getVisionModel, isAiConfigured } = await import("./ai.server");
  if (!isAiConfigured()) throw new Error("The invoice reader isn't set up for this workspace yet.");
  const { generateText, Output } = await import("ai");

  const file = decodeInvoiceDataUrl(options.dataUrl, options.mimeType);
  let parsed: z.infer<typeof invoiceSchema> | undefined;
  try {
    const result = await generateText({
      model: getVisionModel(),
      system: SYSTEM,
      output: Output.object({ schema: invoiceSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Read this invoice." },
            { type: "file", data: file.bytes, mediaType: file.mediaType, filename: "invoice" },
          ],
        },
      ],
    });
    parsed = result.output;
  } catch (e) {
    throw new Error(aiErrorMessage(e, "The invoice could not be read. Try a clearer photo."));
  }
  if (!parsed) throw new Error("Nothing readable was found on that invoice.");

  const items: InvoiceLine[] = parsed.items
    .map((item) => ({
      name: item.name.trim(),
      quantity: Math.abs(item.quantity) || 1,
      unitPrice: Math.abs(item.unitPrice),
    }))
    .filter((item) => item.name.length > 0);

  const date = parsed.invoiceDate;
  return {
    vendorName: parsed.vendorName,
    invoiceNumber: parsed.invoiceNumber,
    invoiceDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    total: Number.isFinite(parsed.total) ? parsed.total : 0,
    items,
  };
}
