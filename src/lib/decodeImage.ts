import jsQR from 'jsqr';

function fit(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeWithJsQR(blob: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(blob);
  try {
    const sizes = [fit(bitmap.width, bitmap.height, 1400), fit(bitmap.width, bitmap.height, 800), fit(bitmap.width, bitmap.height, 420)];
    const seen = new Set<string>();
    for (const size of sizes) {
      const key = `${size.width}x${size.height}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) continue;
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      const image = context.getImageData(0, 0, size.width, size.height);
      const code = jsQR(image.data, size.width, size.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) return code.data;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export async function decodeImage(blob: Blob): Promise<string | null> {
  try {
    const fromJsQr = await decodeWithJsQR(blob);
    if (fromJsQr) return fromJsQr;
  } catch {
    // The fallback scanner still gets a chance.
  }
  try {
    const { default: QrScanner } = await import('qr-scanner');
    const result = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
    return result.data || null;
  } catch {
    return null;
  }
}
