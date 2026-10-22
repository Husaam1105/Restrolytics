import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, Loader2, Plus, ScanText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseInvoice, saveInvoice, type ParsedInvoiceLine } from "@/lib/invoices.functions";

type Props = { vendorId: string; vendorName: string; onSaved: () => void };

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function InvoiceCapture({ vendorId, vendorName, onSaved }: Props) {
  const parseFn = useServerFn(parseInvoice);
  const saveFn = useServerFn(saveInvoice);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [total, setTotal] = useState(0);
  const [addToStock, setAddToStock] = useState(true);
  const [lines, setLines] = useState<ParsedInvoiceLine[]>([]);

  const reset = () => {
    setPreview(null);
    setFileName("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setTotal(0);
    setLines([]);
    setAddToStock(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const read = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      if (file.type.startsWith("image/")) setPreview(dataUrl);
      return parseFn({ data: { dataUrl, mimeType: file.type || "image/jpeg" } });
    },
    onSuccess: (result) => {
      setLines(result.items);
      setInvoiceNumber(result.invoiceNumber ?? "");
      setInvoiceDate(result.invoiceDate ?? "");
      setTotal(result.total);
      if (result.items.length === 0) toast.error("No items were found. You can type them in below.");
      else toast.success(`Found ${result.items.length} item${result.items.length === 1 ? "" : "s"}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          vendorId,
          invoiceNumber,
          invoiceDate,
          total,
          items: lines,
          addToStock,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `Invoice saved · ${result.newItems} new item${result.newItems === 1 ? "" : "s"}, ${result.updatedItems} updated`,
      );
      setOpen(false);
      reset();
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const computed = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Camera className="mr-2 h-4 w-4" /> Capture invoice
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Capture an invoice from {vendorName}</DialogTitle>
            <DialogDescription>
              Take a photo of the invoice or pick a PDF. The items, quantities and prices are read for you — check them,
              then save.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-file">Invoice photo or PDF</Label>
              <Input
                id="invoice-file"
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  read.mutate(file);
                }}
              />
              {read.isPending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading {fileName || "the invoice"}…
                </p>
              )}
              {preview && (
                <img src={preview} alt="Invoice preview" className="max-h-48 rounded-md border object-contain" />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="invoice-number">Invoice number</Label>
                <Input
                  id="invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-date">Invoice date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-total">Invoice total ($)</Label>
                <Input
                  id="invoice-total"
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-28">Unit price</TableHead>
                    <TableHead className="w-24 text-right">Line</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No items yet. Read an invoice above or add rows by hand.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={line.name}
                            onChange={(e) =>
                              setLines(lines.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) =>
                              setLines(
                                lines.map((l, i) => (i === index ? { ...l, quantity: Number(e.target.value) } : l)),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              setLines(
                                lines.map((l, i) => (i === index ? { ...l, unitPrice: Number(e.target.value) } : l)),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ${((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLines(lines.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLines([...lines, { name: "", quantity: 1, unitPrice: 0 }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add row
              </Button>
              <p className="text-sm text-muted-foreground">Items add up to ${computed.toFixed(2)}</p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={addToStock}
                onChange={(e) => setAddToStock(e.target.checked)}
              />
              Add these quantities to what I have on hand (this delivery arrived)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={save.isPending || lines.length === 0} onClick={() => save.mutate()}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanText className="mr-2 h-4 w-4" />
              )}
              Save invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
