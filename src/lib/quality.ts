import { QR_BYTE_CAPACITY } from './constants';
import { contrastRatio, modulesAreLightOnDark, parseHexColor } from './contrast';
import type { ErrorCorrection, QualityNote, QrStyle } from './types';

export function contrastNote(style: QrStyle): QualityNote {
  if (style.transparentBackground) {
    return {
      tone: 'info',
      text: 'A transparent background takes on whatever sits behind the code. Keep that surface light and plain.',
    };
  }
  if (!parseHexColor(style.foreground) || !parseHexColor(style.background)) {
    return { tone: 'fail', text: 'Enter a 3 or 6 digit hex color for the modules and the background.' };
  }
  const ratio = contrastRatio(style.foreground, style.background);
  if (ratio === null) {
    return { tone: 'fail', text: 'Those colors could not be compared.' };
  }
  const rounded = ratio.toFixed(1);
  if (modulesAreLightOnDark(style.foreground, style.background)) {
    return {
      tone: 'warn',
      text: `Contrast is ${rounded}:1, but the modules are lighter than the background. Many phone cameras expect dark marks on a light field.`,
    };
  }
  if (ratio < 3) {
    return {
      tone: 'fail',
      text: `Contrast is ${rounded}:1. Scanners often miss a code below 3:1. Darken the modules or lighten the background.`,
    };
  }
  if (ratio < 4.5) {
    return {
      tone: 'warn',
      text: `Contrast is ${rounded}:1. It may scan up close, and a worn print may not. 4.5:1 or more is the safer target.`,
    };
  }
  return { tone: 'pass', text: `Contrast is ${rounded}:1, which is a comfortable dark-on-light code.` };
}

export function styleNotes(style: QrStyle, hasLogo: boolean): QualityNote[] {
  const notes: QualityNote[] = [contrastNote(style)];
  if (style.margin < 8) {
    notes.push({
      tone: 'warn',
      text: 'The quiet zone is very tight. Scanners use the empty margin to find the edges. Raise it unless you will add padding later.',
    });
  }
  if (hasLogo && (style.errorCorrection === 'L' || style.errorCorrection === 'M')) {
    notes.push({
      tone: 'warn',
      text: 'A logo covers part of the pattern. High error correction is the safer choice.',
    });
  }
  if (style.dots !== 'square') {
    notes.push({
      tone: 'info',
      text: 'Rounded and dotted modules look softer. Square modules scan the most reliably, especially when the code is small.',
    });
  }
  return notes;
}

export function lengthNote(byteLength: number, level: ErrorCorrection): QualityNote | null {
  const capacity = QR_BYTE_CAPACITY[level];
  if (byteLength > capacity) {
    return {
      tone: 'fail',
      text: `This is ${byteLength} bytes. At this error correction a QR code holds about ${capacity} bytes. Shorten the text, or choose a lower level.`,
    };
  }
  if (byteLength > capacity * 0.85) {
    return {
      tone: 'warn',
      text: `This is ${byteLength} bytes, close to the ${capacity} byte limit at this level. The pattern will be dense.`,
    };
  }
  return null;
}
