import { useEffect, useRef, useState } from 'react';
import type QrScannerType from 'qr-scanner';
import { copyText, imageFileFromClipboard } from '../lib/browser';
import { decodeImage } from '../lib/decodeImage';
import { actionHref, actionLabel, parsePayload } from '../lib/parse';

function cameraMessage(error: unknown): string {
  if (!window.isSecureContext) return 'The camera needs a secure page, such as https or localhost.';
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Camera permission was blocked. You can still drop, browse, or paste an image.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'No camera was found on this device.';
  if (error instanceof DOMException && error.name === 'NotReadableError') return 'The camera is already in use by another app.';
  return 'The camera could not start. You can still drop or paste an image.';
}

export function Decoder({
  active,
  pendingFile,
  onPendingHandled,
  onScanned,
  onNotice,
}: {
  active: boolean;
  pendingFile: File | null;
  onPendingHandled: () => void;
  onScanned: (payload: string) => void;
  onNotice: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onScannedRef = useRef(onScanned);
  const shouldFocus = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const request = useRef(0);
  const lastCamera = useRef('');
  const onPendingHandledRef = useRef(onPendingHandled);
  const onNoticeRef = useRef(onNotice);
  const runRef = useRef<(file: File) => Promise<void>>(async () => undefined);

  useEffect(() => {
    onScannedRef.current = onScanned;
    onPendingHandledRef.current = onPendingHandled;
    onNoticeRef.current = onNotice;
  }, [onScanned, onPendingHandled, onNotice]);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    void import('qr-scanner')
      .then(({ default: QrScanner }) => QrScanner.hasCamera())
      .then((found) => {
        if (!cancelled) setHasCamera(found);
      })
      .catch(() => {
        if (!cancelled) setHasCamera(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!cameraOn || !active || !videoRef.current) return undefined;
    const video = videoRef.current;
    let scanner: QrScannerType | null = null;
    let stopped = false;
    void (async () => {
      const { default: QrScanner } = await import('qr-scanner');
      if (stopped) return;
      scanner = new QrScanner(
        video,
        (scan) => {
          if (lastCamera.current === scan.data) return;
          lastCamera.current = scan.data;
          setError(null);
          setResult(scan.data);
          onScannedRef.current(scan.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        },
      );
      try {
        await scanner.start();
        if (stopped) scanner.destroy();
      } catch (caught) {
        if (!stopped) {
          setCameraOn(false);
          setError(cameraMessage(caught));
        }
      }
    })();
    return () => {
      stopped = true;
      scanner?.destroy();
    };
  }, [cameraOn, active]);

  useEffect(() => {
    if (result && shouldFocus.current) {
      resultRef.current?.focus();
      shouldFocus.current = false;
    }
  }, [result]);

  async function run(file: File) {
    const id = request.current + 1;
    request.current = id;
    setReading(true);
    setError(null);
    const text = await decodeImage(file);
    if (request.current !== id) return;
    setReading(false);
    if (!text) {
      setError('No QR code was found. Try a closer crop, or a picture where the code is flat and evenly lit.');
      return;
    }
    shouldFocus.current = true;
    setResult(text);
    onScannedRef.current(text);
    onNoticeRef.current('Code read and saved in history on this device.');
  }

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!pendingFile) return;
    void runRef.current(pendingFile);
    onPendingHandledRef.current();
  }, [pendingFile]);

  async function pasteImage() {
    try {
      if (!navigator.clipboard?.read) {
        onNotice('Press Ctrl+V or Cmd+V to paste an image.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((entry) => entry.startsWith('image/'));
        if (!type) continue;
        const blob = await item.getType(type);
        await run(new File([blob], 'clipboard-image', { type }));
        return;
      }
      onNotice('The clipboard has no image. Copy a picture first.');
    } catch {
      onNotice('Clipboard permission was blocked. Click the page and press Ctrl+V or Cmd+V.');
    }
  }

  const parsed = result ? parsePayload(result) : null;
  const href = parsed ? actionHref(parsed.link) : null;

  return (
    <div className="scan-layout">
      <div
        className={dragOver ? 'dropzone is-over' : 'dropzone'}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          const file = imageFileFromClipboard(event.dataTransfer);
          if (!file) {
            onNotice('Drop an image file.');
            return;
          }
          void run(file);
        }}
      >
        <h2>Read a QR code</h2>
        <p>Drop an image, browse for one, paste from the clipboard, or use the camera.</p>
        <div className="button-row">
          <button type="button" className="button primary" onClick={() => fileRef.current?.click()}>
            Browse
          </button>
          <button type="button" className="button secondary" onClick={() => void pasteImage()}>
            Paste image
          </button>
          <button
            type="button"
            className="button secondary"
            aria-pressed={cameraOn}
            disabled={hasCamera === false}
            onClick={() => setCameraOn((on) => !on)}
          >
            {cameraOn ? 'Stop camera' : 'Use camera'}
          </button>
        </div>
        <p className="help">Ctrl+V or Cmd+V also pastes an image. Pictures stay in this tab and are not uploaded.</p>
        {hasCamera === false ? <p className="help">No camera was found. Image upload and paste still work.</p> : null}
        <input
          ref={fileRef}
          className="file-input"
          type="file"
          accept="image/*"
          aria-label="Choose a QR code image"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run(file);
          }}
        />
      </div>

      <div className={cameraOn ? 'camera-wrap' : 'camera-wrap is-hidden'}>
        <video ref={videoRef} playsInline muted />
      </div>

      {reading ? <p role="status">Looking for a QR code…</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {parsed ? (
        <section className="result-card">
          <h2 tabIndex={-1} ref={resultRef}>
            {parsed.title}
          </h2>
          <div className="button-row">
            <button
              type="button"
              className="button primary"
              onClick={() =>
                void copyText(parsed.raw).then(
                  () => onNotice('Decoded text copied.'),
                  () => onNotice('Copy was blocked.'),
                )
              }
            >
              Copy text
            </button>
            {href ? (
              <a className="button secondary" href={href} target={/^https?:/i.test(href) ? '_blank' : undefined} rel={/^https?:/i.test(href) ? 'noopener noreferrer' : undefined}>
                {actionLabel(href)}
              </a>
            ) : null}
          </div>
          {parsed.warnings.map((warning) => (
            <p key={warning} className="note note-warn">
              {warning}
            </p>
          ))}
          {parsed.details.length > 0 ? (
            <dl className="details">
              {parsed.details.map((detail) => (
                <div key={`${detail.label}-${detail.value}`}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="payload-box">
            <h3>Exact contents</h3>
            <pre>{parsed.raw}</pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
