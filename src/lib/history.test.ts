import { describe, expect, it } from 'vitest';
import { defaultFields, defaultStyle } from './defaults';
import { addHistory, createHistoryItem, deleteHistory, sanitizeSettings, searchHistory } from './history';
import type { HistoryItem } from './types';

function item(payload: string, id: string, kind: 'generated' | 'scanned' = 'generated') {
  const fields = defaultFields();
  fields.text = payload;
  return createHistoryItem({
    id,
    createdAt: 1,
    kind,
    preset: 'text',
    fields,
    style: defaultStyle(),
    payload,
  });
}

describe('history', () => {
  it('dedupes the same code, caps the list, searches, and deletes', () => {
    let items = [item('old', 'a')];
    items = addHistory(items, item('old', 'b'));
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('b');
    items = addHistory(items, item('next', 'c', 'scanned'));
    expect(items.map((entry) => entry.id)).toEqual(['c', 'b']);
    expect(searchHistory(items, 'NEXT')).toHaveLength(1);
    expect(deleteHistory(items, 'b')).toHaveLength(1);

    let many: HistoryItem[] = [];
    for (let index = 0; index < 120; index += 1) {
      many = addHistory(many, item(`code-${index}`, `id-${index}`));
    }
    expect(many).toHaveLength(100);
    expect(many[0].id).toBe('id-119');
  });

  it('repairs a partial settings object', () => {
    const settings = sanitizeSettings({
      preset: 'wifi',
      fields: { wifiSsid: 'Cafe', wifiHidden: true, wifiEncryption: 'WEP' },
      style: { foreground: '#fff', size: 9999, margin: 80 },
    });
    expect(settings.preset).toBe('wifi');
    expect(settings.fields.wifiSsid).toBe('Cafe');
    expect(settings.fields.wifiEncryption).toBe('WEP');
    expect(settings.fields.wifiHidden).toBe(true);
    expect(settings.style.foreground).toBe('#ffffff');
    expect(settings.style.size).toBe(512);
    expect(settings.style.margin).toBe(64);
  });
});
