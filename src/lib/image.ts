/** Reads a file as a base64 data: URL. */
export function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file couldn't be read."));
    reader.readAsDataURL(file);
  });
}

/**
 * Shrinks a phone photo before upload: longest side at most `maxSide`,
 * re-encoded as JPEG. Phone cameras produce 4-8 MB files; this keeps uploads
 * fast on restaurant Wi-Fi. Non-images (PDFs) and formats the browser can't
 * decode are returned unchanged.
 */
export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.82 } = {},
): Promise<{ dataUrl: string; type: string }> {
  if (!file.type.startsWith("image/")) {
    return { dataUrl: await fileToDataUrl(file), type: file.type };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size)
      return { dataUrl: await fileToDataUrl(file), type: file.type };
    return { dataUrl: await fileToDataUrl(blob), type: "image/jpeg" };
  } catch {
    return { dataUrl: await fileToDataUrl(file), type: file.type };
  }
}
