import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, serializeBackup } from './backup';
import { defaultSettings } from './defaults';
import { createHistoryItem } from './history';
import { defaultFields, defaultStyle } from './defaults';

describe('backup', () => {
  it('round-trips history, settings, and theme', () => {
    const fields = defaultFields();
    fields.url = 'https://example.com';
    const history = [
      createHistoryItem({
        id: 'one',
        createdAt: 10,
        kind: 'generated',
        preset: 'url',
        fields,
        style: defaultStyle(),
        payload: 'https://example.com',
      }),
    ];
    const settings = defaultSettings();
    settings.preset = 'phone';
    settings.fields.phoneNumber = '+1555';
    const backup = createBackup({
      history,
      settings,
      theme: 'dark',
      privacyDismissed: true,
      exportedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.theme).toBe('dark');
    expect(parsed.backup.privacyDismissed).toBe(true);
    expect(parsed.backup.settings.preset).toBe('phone');
    expect(parsed.backup.history[0].payload).toBe('https://example.com');
    expect(parsed.skipped).toBe(0);
  });

  it('rejects a file from somewhere else and skips a broken row', () => {
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
    expect(parseBackup('not json').ok).toBe(false);
    const parsed = parseBackup(
      JSON.stringify({
        app: 'devistic-qr',
        version: 1,
        history: [{ payload: 'ok' }, { nope: true }],
        theme: 'light',
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.history).toHaveLength(1);
    expect(parsed.skipped).toBe(1);
    expect(parsed.backup.theme).toBe('light');
  });
});
