export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('Copy failed');
}

export async function copyImageBlob(blob: Blob): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser cannot copy images to the clipboard.');
  }
  const type = blob.type || 'image/png';
  try {
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
  } catch {
    await navigator.clipboard.write([new ClipboardItem({ [type]: Promise.resolve(blob) })]);
  }
}

export function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  const file = Array.from(data.files).find((entry) => entry.type.startsWith('image/'));
  if (file) return file;
  for (const item of Array.from(data.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const asFile = item.getAsFile();
      if (asFile) return asFile;
    }
  }
  return null;
}
