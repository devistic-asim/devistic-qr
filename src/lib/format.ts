import { QR_BYTE_CAPACITY } from './constants';
import type { ErrorCorrection } from './types';

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function downloadBasename(label: string, extension: 'png' | 'svg'): string {
  const slug = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `devistic-qr${slug ? `-${slug}` : ''}.${extension}`;
}

export function exceedsCapacity(byteLength: number, level: ErrorCorrection): boolean {
  return byteLength > QR_BYTE_CAPACITY[level];
}

export function formatWhen(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}
