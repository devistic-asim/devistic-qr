import { describe, expect, it } from 'vitest';
import { downloadBasename, exceedsCapacity, utf8ByteLength } from './format';

describe('format', () => {
  it('counts utf-8 bytes and builds a safe file name', () => {
    expect(utf8ByteLength('é')).toBe(2);
    expect(downloadBasename('Wi-Fi · Café!', 'png')).toBe('devistic-qr-wi-fi-cafe.png');
    expect(downloadBasename('!!!', 'svg')).toBe('devistic-qr.svg');
    expect(exceedsCapacity(10, 'H')).toBe(false);
    expect(exceedsCapacity(2000, 'H')).toBe(true);
  });
});
