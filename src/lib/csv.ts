import { HISTORY_LIMIT } from './constants';
import { defaultFields, defaultStyle } from './defaults';
import { sanitizeHistoryItem } from './history';
import { isPreset, pasteIntoPrimary } from './payload';
import { draftFromPayload } from './parse';
import type { HistoryItem } from './types';

export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += character;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function historyToCsv(items: HistoryItem[]): string {
  const header = ['id', 'kind', 'preset', 'label', 'payload', 'createdAt'];
  const lines = [header.join(',')];
  for (const item of items) {
    lines.push(
      [
        item.id,
        item.kind,
        item.preset,
        item.label,
        item.payload,
        new Date(item.createdAt).toISOString(),
      ]
        .map(escapeCell)
        .join(','),
    );
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

export function csvToHistory(text: string): { items: HistoryItem[]; skipped: number; error?: string } {
  const rows = parseCsv(text.trim());
  if (rows.length === 0) return { items: [], skipped: 0, error: 'That CSV file is empty.' };
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const payloadIndex = header.indexOf('payload');
  if (payloadIndex === -1) {
    return { items: [], skipped: 0, error: 'The CSV needs a header row with a payload column.' };
  }
  const column = (name: string) => header.indexOf(name);
  const items: HistoryItem[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const payload = row[payloadIndex] ?? '';
    if (!payload.trim()) {
      skipped += 1;
      continue;
    }
    const presetCell = column('preset') >= 0 ? row[column('preset')] : '';
    const draft = draftFromPayload(payload);
    const preset = isPreset(presetCell) ? presetCell : draft.preset;
    const fields =
      preset === draft.preset ? draft.fields : pasteIntoPrimary(preset, defaultFields(), payload);
    const kindCell = column('kind') >= 0 ? row[column('kind')] : '';
    const kind = kindCell === 'scanned' ? 'scanned' : 'generated';
    const createdCell = column('createdat') >= 0 ? row[column('createdat')] : '';
    const idCell = column('id') >= 0 ? row[column('id')] : '';
    const labelCell = column('label') >= 0 ? row[column('label')] : '';
    const item = sanitizeHistoryItem({
      id: idCell,
      kind,
      preset,
      label: labelCell,
      payload,
      createdAt: createdCell,
      fields,
      style: defaultStyle(),
    });
    if (!item) {
      skipped += 1;
      continue;
    }
    items.push(item);
  }
  return { items, skipped };
}

export function mergeHistory(existing: HistoryItem[], imported: HistoryItem[]): HistoryItem[] {
  let next = existing;
  for (const item of imported) {
    next = [
      item,
      ...next.filter((current) => current.id !== item.id && !(current.kind === item.kind && current.payload === item.payload)),
    ];
  }
  return next.slice(0, HISTORY_LIMIT);
}
