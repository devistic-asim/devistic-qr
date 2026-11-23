import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Decoder } from './components/Decoder';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Generator } from './components/Generator';
import { Header } from './components/Header';
import { HistoryPanel } from './components/HistoryPanel';
import { PrivacyNotice } from './components/PrivacyNotice';
import { useStoredState } from './hooks/useStoredState';
import { useTheme } from './hooks/useTheme';
import { createBackup, serializeBackup, type BackupFile } from './lib/backup';
import { downloadBlob, imageFileFromClipboard } from './lib/browser';
import { HISTORY_KEY, PRIVACY_KEY, SETTINGS_KEY } from './lib/constants';
import { defaultSettings, defaultStyle } from './lib/defaults';
import { mergeHistory } from './lib/csv';
import { addHistory, createHistoryItem, deleteHistory, sanitizeHistory, sanitizeSettings } from './lib/history';
import { applyPastedText } from './lib/payload';
import { draftFromPayload } from './lib/parse';
import type { HistoryItem, TabId } from './lib/types';

const tabs: { id: TabId; label: string }[] = [
  { id: 'create', label: 'Create' },
  { id: 'scan', label: 'Scan' },
  { id: 'history', label: 'History' },
];

export function App() {
  const [theme, setTheme] = useTheme();
  const [settings, setSettings] = useStoredState(SETTINGS_KEY, defaultSettings(), sanitizeSettings);
  const [history, setHistory] = useStoredState(HISTORY_KEY, [] as HistoryItem[], sanitizeHistory);
  const [privacyDismissed, setPrivacyDismissed] = useStoredState(PRIVACY_KEY, false, (value) => value === true);
  const [tab, setTab] = useState<TabId>('create');
  const [toast, setToast] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ create: null, scan: null, history: null });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const image = imageFileFromClipboard(event.clipboardData);
      if (image) {
        event.preventDefault();
        setTab('scan');
        setPendingFile(image);
        return;
      }
      const text = event.clipboardData?.getData('text') ?? '';
      if (!text.trim()) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setTab('create');
      setSettings((current) => applyPastedText(current, text));
      setToast('Pasted into the editor.');
    }
    function onDragOver(event: DragEvent) {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
    }
    function onDrop(event: DragEvent) {
      const file = Array.from(event.dataTransfer?.files ?? []).find((entry) => entry.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      setTab('scan');
      setPendingFile(file);
    }
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [setSettings]);

  function rememberGenerated(payload: string) {
    const item = createHistoryItem({
      kind: 'generated',
      preset: settings.preset,
      fields: settings.fields,
      style: settings.style,
      payload,
    });
    setHistory((current) => addHistory(current, item));
  }

  function rememberScanned(payload: string) {
    const draft = draftFromPayload(payload);
    const item = createHistoryItem({
      kind: 'scanned',
      preset: draft.preset,
      fields: draft.fields,
      style: defaultStyle(),
      payload,
    });
    setHistory((current) => addHistory(current, item));
  }

  function clearLocalData() {
    if (!window.confirm('This removes saved codes, drafts, the theme choice, and the privacy notice choice from this browser.')) return;
    setHistory([]);
    setSettings(defaultSettings());
    setTheme('system');
    setPrivacyDismissed(false);
    setTab('create');
    setToast('Local data cleared from this browser.');
  }

  function exportJson() {
    const backup = createBackup({ history, settings, theme, privacyDismissed });
    downloadBlob(new Blob([serializeBackup(backup)], { type: 'application/json' }), 'devistic-qr-backup.json');
    setToast('JSON backup downloaded. It stays on this device unless you share the file.');
  }

  function importBackup(backup: BackupFile, skipped: number) {
    setHistory(backup.history);
    setSettings(backup.settings);
    setTheme(backup.theme);
    setPrivacyDismissed(backup.privacyDismissed);
    setToast(skipped ? `Backup restored. ${skipped} unreadable rows were skipped.` : 'Backup restored on this device.');
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((item) => item.id === tab);
    const next =
      event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    const id = tabs[next].id;
    setTab(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header theme={theme} onTheme={setTheme} />
      <main id="main" className="page">
        {!privacyDismissed ? <PrivacyNotice onDismiss={() => setPrivacyDismissed(true)} onClear={clearLocalData} /> : null}
        <div className="tabs" role="tablist" aria-label="Tools" onKeyDown={onTabKey}>
          {tabs.map((item) => (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              className={tab === item.id ? 'is-selected' : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="panel-create" aria-labelledby="tab-create" hidden={tab !== 'create'}>
          <Generator active={tab === 'create'} settings={settings} onChange={setSettings} onSaved={rememberGenerated} onNotice={setToast} />
        </div>
        <div role="tabpanel" id="panel-scan" aria-labelledby="tab-scan" hidden={tab !== 'scan'}>
          <Decoder
            active={tab === 'scan'}
            pendingFile={pendingFile}
            onPendingHandled={() => setPendingFile(null)}
            onScanned={rememberScanned}
            onNotice={setToast}
          />
        </div>
        <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" hidden={tab !== 'history'}>
          <HistoryPanel
            items={history}
            onDelete={(id) => setHistory((current) => deleteHistory(current, id))}
            onClearHistory={() => {
              setHistory([]);
              setToast('Saved codes cleared from this browser.');
            }}
            onReuse={(item) => {
              setSettings({ preset: item.preset, fields: item.fields, style: item.style });
              setTab('create');
              setToast('Loaded into the editor.');
            }}
            onImportBackup={importBackup}
            onImportCsv={(rows, skipped) => {
              setHistory((current) => mergeHistory(current, rows));
              setToast(skipped ? `Added ${rows.length} codes. ${skipped} rows were skipped.` : `Added ${rows.length} codes.`);
            }}
            onExportJson={exportJson}
            onNotice={setToast}
          />
        </div>
      </main>
      <Footer
        onClear={clearLocalData}
        onShowHistory={() => {
          setTab('history');
          document.getElementById('data-tools')?.scrollIntoView({ block: 'start' });
        }}
      />
      <div className="sr-only" role="status">
        {toast}
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

export function AppRoot() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
