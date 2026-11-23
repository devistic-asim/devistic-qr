import { BACKUP_APP, BACKUP_VERSION } from './constants';
import { sanitizeHistory, sanitizeSettings } from './history';
import type { HistoryItem, Settings, ThemeChoice } from './types';

export type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  history: HistoryItem[];
  settings: Settings;
  theme: ThemeChoice;
  privacyDismissed: boolean;
};

export function createBackup(input: {
  history: HistoryItem[];
  settings: Settings;
  theme: ThemeChoice;
  privacyDismissed: boolean;
  exportedAt?: Date;
}): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    history: input.history,
    settings: input.settings,
    theme: input.theme,
    privacyDismissed: input.privacyDismissed,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

function themeChoice(value: unknown): ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function parseBackup(text: string): { ok: true; backup: BackupFile; skipped: number } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'That file is not a Devistic QR backup.' };
  }
  const record = parsed as Record<string, unknown>;
  if (record.app !== BACKUP_APP) {
    return { ok: false, error: 'That file is not a Devistic QR backup.' };
  }
  if (typeof record.version === 'number' && record.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Devistic QR.' };
  }
  const rawHistory = Array.isArray(record.history) ? record.history : [];
  const history = sanitizeHistory(rawHistory);
  const skipped = rawHistory.length - history.length;
  return {
    ok: true,
    skipped,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : new Date().toISOString(),
      history,
      settings: sanitizeSettings(record.settings),
      theme: themeChoice(record.theme),
      privacyDismissed: record.privacyDismissed === true,
    },
  };
}
