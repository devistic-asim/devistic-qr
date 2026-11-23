import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHexColor } from './contrast';
import { defaultStyle } from './defaults';
import { contrastNote, lengthNote, styleNotes } from './quality';

describe('contrast and quality notes', () => {
  it('measures black on white and rejects invalid colors', () => {
    expect(parseHexColor('#fff')).toBe('#ffffff');
    expect(parseHexColor('nope')).toBeNull();
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThan(20);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('warns on weak contrast, a tight margin, and a logo with low recovery', () => {
    const pale = contrastNote({ ...defaultStyle(), foreground: '#cccccc', background: '#ffffff' });
    expect(pale.tone).toBe('fail');
    const notes = styleNotes({ ...defaultStyle(), margin: 0, errorCorrection: 'L' }, true);
    expect(notes.some((note) => note.text.includes('quiet zone'))).toBe(true);
    expect(notes.some((note) => note.text.includes('logo'))).toBe(true);
    expect(lengthNote(4000, 'H')?.tone).toBe('fail');
    expect(lengthNote(20, 'M')).toBeNull();
  });
});
