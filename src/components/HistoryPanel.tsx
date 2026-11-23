import { useRef, useState } from 'react';
import { parseBackup, type BackupFile } from '../lib/backup';
import { copyText } from '../lib/browser';
import { csvToHistory, historyToCsv } from '../lib/csv';
import { formatWhen } from '../lib/format';
import { searchHistory } from '../lib/history';
import type { HistoryItem } from '../lib/types';

export function HistoryPanel({
  items,
  onDelete,
  onClearHistory,
  onReuse,
  onImportBackup,
  onImportCsv,
  onExportJson,
  onNotice,
}: {
  items: HistoryItem[];
  onDelete: (id: string) => void;
  onClearHistory: () => void;
  onReuse: (item: HistoryItem) => void;
  onImportBackup: (backup: BackupFile, skipped: number) => void;
  onImportCsv: (items: HistoryItem[], skipped: number) => void;
  onExportJson: () => void;
  onNotice: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const visible = searchHistory(items, query);

  function download(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history-head">
        <div>
          <h2 id="history-title">Saved on this device</h2>
          <p className="help">
            {items.length} saved. Search, reopen, or export a JSON backup of codes and settings, or a CSV of the list.
          </p>
        </div>
      </div>
      <div className="button-row" id="data-tools">
        <button type="button" className="button secondary" onClick={onExportJson}>
          Export JSON
        </button>
        <button type="button" className="button secondary" disabled={items.length === 0} onClick={() => download('devistic-qr-history.csv', historyToCsv(items), 'text/csv')}>
          Export CSV
        </button>
        <button type="button" className="button ghost" onClick={() => jsonRef.current?.click()}>
          Import JSON
        </button>
        <button type="button" className="button ghost" onClick={() => csvRef.current?.click()}>
          Import CSV
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={items.length === 0}
          onClick={() => {
            if (window.confirm('Delete all saved codes on this device? Settings and the theme stay.')) onClearHistory();
          }}
        >
          Clear history
        </button>
      </div>
      <p className="help">JSON replaces codes, settings, and theme. CSV adds rows to the list.</p>
      <div className="search-row">
        <label htmlFor="history-search" className="sr-only">
          Search saved codes
        </label>
        <input
          id="history-search"
          type="search"
          placeholder="Search saved codes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {items.length === 0 ? <p className="empty">Nothing saved yet. Codes you download, copy, or scan are kept in this browser.</p> : null}
      {items.length > 0 && visible.length === 0 ? <p className="empty">No saved codes match that search.</p> : null}
      <ul className="history-list">
        {visible.map((item) => (
          <li key={item.id} className="history-item">
            <div>
              <p className="item-label">
                <span className={item.kind === 'scanned' ? 'badge badge-scan' : 'badge'}>{item.kind === 'scanned' ? 'Scanned' : 'Created'}</span>
                {item.label}
              </p>
              <p className="help">{formatWhen(item.createdAt)}</p>
            </div>
            <div className="button-row">
              <button type="button" className="button ghost tiny" onClick={() => void copyText(item.payload).then(() => onNotice('Copied.'), () => onNotice('Copy was blocked.'))}>
                Copy
              </button>
              <button type="button" className="button ghost tiny" onClick={() => onReuse(item)}>
                Use again
              </button>
              <button type="button" className="button ghost tiny" aria-label={`Delete ${item.label}`} onClick={() => onDelete(item.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <input
        ref={jsonRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        aria-label="Import a JSON backup"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          void file.text().then((text) => {
            const parsed = parseBackup(text);
            if (!parsed.ok) {
              onNotice(parsed.error);
              return;
            }
            if (!window.confirm('Replace saved codes, settings, and theme with this backup?')) return;
            onImportBackup(parsed.backup, parsed.skipped);
          });
        }}
      />
      <input
        ref={csvRef}
        className="file-input"
        type="file"
        accept="text/csv,.csv"
        aria-label="Import a CSV history file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          void file.text().then((text) => {
            const parsed = csvToHistory(text);
            if (parsed.error) {
              onNotice(parsed.error);
              return;
            }
            if (parsed.items.length === 0) {
              onNotice(parsed.skipped ? 'No usable rows were found in that CSV.' : 'That CSV has no rows.');
              return;
            }
            if (!window.confirm(`Add ${parsed.items.length} codes from this CSV to history on this device?`)) return;
            onImportCsv(parsed.items, parsed.skipped);
          });
        }}
      />
    </section>
  );
}
