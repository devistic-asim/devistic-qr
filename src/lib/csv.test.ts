import { describe, expect, it } from 'vitest';
import { defaultFields, defaultStyle } from './defaults';
import { csvToHistory, historyToCsv, parseCsv } from './csv';
import { createHistoryItem } from './history';

describe('csv', () => {
  it('round-trips commas, quotes, and newlines', () => {
    const fields = defaultFields();
    fields.text = 'He said "hello",\nthen left';
    const original = createHistoryItem({
      id: 'row-1',
      createdAt: Date.UTC(2026, 0, 2, 3, 4, 5),
      kind: 'scanned',
      preset: 'text',
      fields,
      style: defaultStyle(),
      payload: fields.text,
    });
    const csv = historyToCsv([original]);
    expect(parseCsv(csv)[1][4]).toBe(fields.text);
    const imported = csvToHistory(csv);
    expect(imported.error).toBeUndefined();
    expect(imported.skipped).toBe(0);
    expect(imported.items[0]).toMatchObject({
      id: 'row-1',
      kind: 'scanned',
      preset: 'text',
      payload: fields.text,
      createdAt: original.createdAt,
    });
  });

  it('skips blank payloads and rejects a file with no payload column', () => {
    expect(csvToHistory('id,kind\n1,generated\n').error).toMatch(/payload/);
    const imported = csvToHistory('payload,preset\n,text\nhttps://example.com,url\n');
    expect(imported.skipped).toBe(1);
    expect(imported.items).toHaveLength(1);
    expect(imported.items[0].preset).toBe('url');
    expect(imported.items[0].fields.url).toBe('https://example.com');
  });
});
