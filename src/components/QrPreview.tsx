import { useEffect, useRef, useState } from 'react';
import { copyImageBlob, copyText, downloadBlob } from '../lib/browser';
import { decodeImage } from '../lib/decodeImage';
import { downloadBasename, exceedsCapacity, utf8ByteLength } from '../lib/format';
import { lengthNote, styleNotes } from '../lib/quality';
import { mountQr, renderQrBlob } from '../lib/renderQr';
import type { QrStyle } from '../lib/types';

type Check = 'idle' | 'checking' | 'pass' | 'fail';

export function QrPreview({
  active,
  payload,
  label,
  style,
  logo,
  onSaved,
  onNotice,
}: {
  active: boolean;
  payload: string;
  label: string;
  style: QrStyle;
  logo: string | null;
  onSaved: () => void;
  onNotice: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [checkState, setCheckState] = useState<{ key: string; status: Check }>({ key: '', status: 'idle' });
  const [busy, setBusy] = useState(false);
  const bytes = utf8ByteLength(payload);
  const tooLong = exceedsCapacity(bytes, style.errorCorrection);
  const notes = payload ? [...styleNotes(style, Boolean(logo))] : [];
  const length = payload ? lengthNote(bytes, style.errorCorrection) : null;
  if (length) notes.unshift(length);
  const checkKey = JSON.stringify({ active, payload, tooLong, style, logo });
  const check: Check = !active || !payload || tooLong ? 'idle' : checkState.key === checkKey ? checkState.status : 'checking';

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !payload || tooLong) return undefined;
    mountQr(host, payload, style, logo, 320);
    return () => {
      host.replaceChildren();
    };
  }, [payload, style, logo, tooLong]);

  useEffect(() => {
    if (!active || !payload || tooLong) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const blob = await renderQrBlob(payload, style, logo, Math.min(style.size, 640), 'png');
          const decoded = await decodeImage(blob);
          if (cancelled) return;
          setCheckState({ key: checkKey, status: decoded === payload ? 'pass' : 'fail' });
        } catch {
          if (!cancelled) setCheckState({ key: checkKey, status: 'fail' });
        }
      })();
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, payload, style, logo, tooLong, checkKey]);

  async function download(extension: 'png' | 'svg') {
    if (!payload || tooLong || busy) return;
    setBusy(true);
    try {
      const blob = await renderQrBlob(payload, style, logo, style.size, extension);
      downloadBlob(blob, downloadBasename(label, extension));
      onSaved();
      onNotice(`${extension.toUpperCase()} downloaded and saved in history on this device.`);
    } catch {
      onNotice('Could not build that file. Try square modules or a shorter text.');
    } finally {
      setBusy(false);
    }
  }

  async function copyImage() {
    if (!payload || tooLong || busy) return;
    setBusy(true);
    try {
      const blob = await renderQrBlob(payload, style, logo, style.size, 'png');
      await copyImageBlob(blob);
      onSaved();
      onNotice('Image copied and saved in history on this device.');
    } catch {
      onNotice('This browser blocked image copy. Download the PNG instead.');
    } finally {
      setBusy(false);
    }
  }

  async function copyPayload() {
    try {
      await copyText(payload);
      onNotice('Code contents copied.');
    } catch {
      onNotice('Copy was blocked. Select the text and copy it manually.');
    }
  }

  const disabled = !payload || tooLong || busy;

  return (
    <section className="preview-card" aria-label="QR preview">
      <div className={style.transparentBackground ? 'qr-frame is-clear' : 'qr-frame'}>
        {payload && !tooLong ? (
          <div ref={hostRef} className="qr-mount" />
        ) : (
          <p className="qr-empty">
            {tooLong
              ? 'This text is too long for a QR code at the selected error correction.'
              : 'Your code will show up here.'}
          </p>
        )}
      </div>
      <div className="button-row">
        <button type="button" className="button primary" disabled={disabled} onClick={() => void download('png')}>
          Download PNG
        </button>
        <button type="button" className="button secondary" disabled={disabled} onClick={() => void download('svg')}>
          Download SVG
        </button>
        <button type="button" className="button secondary" disabled={disabled} onClick={() => void copyImage()}>
          Copy image
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={!payload || tooLong}
          onClick={() => {
            onSaved();
            onNotice('Saved in history on this device.');
          }}
        >
          Save
        </button>
      </div>
      {payload ? (
        <div className="payload-box">
          <div className="label-row">
            <h2>Exact contents</h2>
            <button type="button" className="button ghost tiny" onClick={() => void copyPayload()}>
              Copy
            </button>
          </div>
          <pre>{payload}</pre>
          <p className="help">
            {bytes} bytes · export {style.size}px
          </p>
        </div>
      ) : null}
      {notes.length > 0 ? (
        <ul className="notes" aria-live="polite">
          {notes.map((note) => (
            <li key={note.text} className={`note note-${note.tone}`}>
              {note.text}
            </li>
          ))}
          {check === 'idle' ? null : (
            <li className={`note note-${check === 'pass' ? 'pass' : check === 'fail' ? 'warn' : 'info'}`}>
              {check === 'checking' && 'Checking whether this picture decodes back to the same text.'}
              {check === 'pass' && 'Checked: the picture decodes back to the same text.'}
              {check === 'fail' &&
                'This picture did not decode in the browser. Square modules, stronger contrast, a wider quiet zone, or a smaller logo usually fix that. A phone may still scan a code this check misses.'}
            </li>
          )}
        </ul>
      ) : null}
    </section>
  );
}
