import { useState } from 'react';
import { parseHexColor } from '../lib/contrast';
import { EXPORT_SIZES, type QrStyle } from '../lib/types';
import { Hint } from './Hint';

function HexField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const fieldId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-hex`;
  const shown = draft ?? value;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="hex-row">
        <input
          type="color"
          value={value}
          aria-label={`${label} picker`}
          onChange={(event) => {
            setDraft(null);
            onChange(parseHexColor(event.target.value) ?? value);
          }}
        />
        <input
          id={fieldId}
          value={shown}
          spellCheck={false}
          autoCapitalize="off"
          aria-label={`${label} hex`}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const parsed = parseHexColor(next);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  );
}

export function StyleControls({
  style,
  onChange,
  logoName,
  logoNote,
  onLogo,
  onClearLogo,
}: {
  style: QrStyle;
  onChange: (style: QrStyle) => void;
  logoName: string | null;
  logoNote: string | null;
  onLogo: (file: File) => void;
  onClearLogo: () => void;
}) {
  const set = <K extends keyof QrStyle>(key: K, value: QrStyle[K]) => onChange({ ...style, [key]: value });

  return (
    <details className="style-panel" open>
      <summary>Style and scan quality</summary>
      <p className="help">Square dots, dark ink, a light background, and a quiet margin are what phones read most reliably.</p>
      <div className="form-grid style-grid">
        <HexField label="Module color" value={style.foreground} onChange={(foreground) => set('foreground', foreground)} />
        <HexField label="Background" value={style.background} onChange={(background) => set('background', background)} />
        <div className="field">
          <label htmlFor="field-ecc">
            Error correction
            <Hint text="Higher recovery lets a damaged or logo-covered code still scan, and it makes the pattern denser." />
          </label>
          <select
            id="field-ecc"
            value={style.errorCorrection}
            onChange={(event) => set('errorCorrection', event.target.value as QrStyle['errorCorrection'])}
          >
            <option value="L">Low · about 7% recovery</option>
            <option value="M">Medium · about 15% recovery</option>
            <option value="Q">Quartile · about 25% recovery</option>
            <option value="H">High · about 30% recovery</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="field-size">
            Export size
            <Hint text="The preview is scaled to fit. Use 1024 or more when the code will be printed." />
          </label>
          <select
            id="field-size"
            value={style.size}
            onChange={(event) => set('size', Number(event.target.value) as QrStyle['size'])}
          >
            {EXPORT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} px
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="field-dots">Modules</label>
          <select id="field-dots" value={style.dots} onChange={(event) => set('dots', event.target.value as QrStyle['dots'])}>
            <option value="square">Square</option>
            <option value="rounded">Rounded</option>
            <option value="extra-rounded">Extra rounded</option>
            <option value="dots">Dots</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="field-corners">Eyes</label>
          <select
            id="field-corners"
            value={style.corners}
            onChange={(event) => set('corners', event.target.value as QrStyle['corners'])}
          >
            <option value="square">Square</option>
            <option value="extra-rounded">Rounded</option>
            <option value="dot">Dot</option>
          </select>
        </div>
        <div className="field field-wide">
          <label htmlFor="field-margin">
            Quiet zone · {style.margin}px
            <Hint text="Empty padding inside the file. Scanners need it to find the edges. Keep some, unless you will add your own margin later." />
          </label>
          <input
            id="field-margin"
            type="range"
            min={0}
            max={64}
            step={2}
            value={style.margin}
            onChange={(event) => set('margin', Number(event.target.value))}
          />
        </div>
        <label className="check field-wide">
          <input
            type="checkbox"
            checked={style.transparentBackground}
            onChange={(event) => set('transparentBackground', event.target.checked)}
          />
          Transparent background
        </label>
        <div className="field field-wide">
          <label htmlFor="field-logo">
            Center logo
            <Hint text="The logo is kept for this visit only, so saved history stays small. Adding one raises error correction to High." />
          </label>
          <div className="inline-field">
            <input
              id="field-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onLogo(file);
              }}
            />
            {logoName ? (
              <button type="button" className="button ghost tiny" onClick={onClearLogo}>
                Remove
              </button>
            ) : null}
          </div>
          {logoName ? <p className="help">{logoName}</p> : null}
          {logoNote ? <p className="help">{logoNote}</p> : null}
        </div>
      </div>
    </details>
  );
}
