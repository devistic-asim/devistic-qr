import { useState } from 'react';
import { copyText } from '../lib/browser';
import { buildPayload, describePayload, pasteIntoPrimary } from '../lib/payload';
import type { GeneratorFields, PresetId, QrStyle, Settings } from '../lib/types';
import { PresetFields } from './PresetFields';
import { QrPreview } from './QrPreview';
import { StyleControls } from './StyleControls';

export function Generator({
  active,
  settings,
  onChange,
  onSaved,
  onNotice,
}: {
  active: boolean;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onSaved: (payload: string) => void;
  onNotice: (message: string) => void;
}) {
  const [logo, setLogo] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoNote, setLogoNote] = useState<string | null>(null);
  const payload = buildPayload(settings.preset, settings.fields);
  const label = describePayload(settings.preset, settings.fields, payload);

  function updateStyle(style: QrStyle) {
    onChange({ ...settings, style });
    if (style.errorCorrection === 'H') setLogoNote(null);
  }

  function onLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      onNotice('Use a PNG, JPEG, WebP, or GIF logo.');
      return;
    }
    if (file.size > 1_500_000) {
      onNotice('That logo is over 1.5 MB. Export a smaller image and try again.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setLogo(reader.result);
      setLogoName(file.name);
      if (settings.style.errorCorrection === 'L' || settings.style.errorCorrection === 'M') {
        onChange({ ...settings, style: { ...settings.style, errorCorrection: 'H' } });
        setLogoNote('Error correction was raised to High so the logo does not cover the data.');
      } else {
        setLogoNote(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        onNotice('The clipboard has no text.');
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        const key = active.dataset.field;
        if (key && key in settings.fields && key !== 'wifiEncryption' && key !== 'wifiHidden') {
          onChange({
            ...settings,
            fields: { ...settings.fields, [key]: text } as GeneratorFields,
          });
          onNotice('Pasted into the focused field.');
          return;
        }
      }
      onChange({
        ...settings,
        fields: pasteIntoPrimary(settings.preset, settings.fields, text),
      });
      onNotice('Pasted from the clipboard.');
    } catch {
      onNotice('Clipboard permission was blocked. Focus a field and press Ctrl+V or Cmd+V.');
    }
  }

  return (
    <div className="create-layout">
      <div className="editor">
        <PresetFields
          preset={settings.preset}
          fields={settings.fields}
          onPreset={(preset: PresetId) => onChange({ ...settings, preset })}
          onFields={(fields) => onChange({ ...settings, fields })}
          onPaste={() => void paste()}
        />
        <StyleControls
          style={settings.style}
          onChange={updateStyle}
          logoName={logoName}
          logoNote={logoNote}
          onLogo={onLogo}
          onClearLogo={() => {
            setLogo(null);
            setLogoName(null);
            setLogoNote(null);
          }}
        />
        <p className="help">
          Tip: paste text anywhere outside a field and it fills the editor. Paste an image and it opens in Scan.
          {payload ? (
            <>
              {' '}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  void copyText(payload).then(
                    () => onNotice('Code contents copied.'),
                    () => onNotice('Copy was blocked.'),
                  )
                }
              >
                Copy the exact contents
              </button>
            </>
          ) : null}
        </p>
      </div>
      <QrPreview
        active={active}
        payload={payload}
        label={label}
        style={settings.style}
        logo={logo}
        onSaved={() => {
          if (payload) onSaved(payload);
        }}
        onNotice={onNotice}
      />
    </div>
  );
}
