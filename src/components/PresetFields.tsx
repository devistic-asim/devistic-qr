import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { PRESETS, buildUrl, urlProblem } from '../lib/payload';
import type { GeneratorFields, PresetId } from '../lib/types';
import { Hint } from './Hint';
import { Icon } from './Icons';

function Field({
  id,
  label,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <div className="label-row">
        <label htmlFor={id}>{label}</label>
        <span className="label-tools">
          {hint ? <Hint text={hint} /> : null}
          {action}
        </span>
      </div>
      {children}
    </div>
  );
}

const pasteButton = (onPaste: () => void) => (
  <button type="button" className="button ghost tiny" onClick={onPaste}>
    Paste
  </button>
);

export function PresetFields({
  preset,
  fields,
  onPreset,
  onFields,
  onPaste,
}: {
  preset: PresetId;
  fields: GeneratorFields;
  onPreset: (preset: PresetId) => void;
  onFields: (fields: GeneratorFields) => void;
  onPaste: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const selected = PRESETS.find((item) => item.id === preset) ?? PRESETS[0];
  const set = <K extends keyof GeneratorFields>(key: K, value: GeneratorFields[K]) => {
    onFields({ ...fields, [key]: value });
  };

  function onPresetKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = PRESETS.findIndex((item) => item.id === preset);
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % PRESETS.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index - 1 + PRESETS.length) % PRESETS.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? PRESETS.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    const choice = PRESETS[next];
    onPreset(choice.id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div className="stack">
      <div className="label-row">
        <h2 className="section-label" id="preset-label">
          What goes in the code
        </h2>
      </div>
      <div
        className="presets"
        role="radiogroup"
        aria-labelledby="preset-label"
        aria-describedby="preset-help"
        onKeyDown={onPresetKey}
      >
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === preset}
            tabIndex={item.id === preset ? 0 : -1}
            className={item.id === preset ? 'preset is-selected' : 'preset'}
            onClick={() => onPreset(item.id)}
          >
            <Icon name={item.id === 'vcard' ? 'contact' : item.id === 'url' ? 'link' : item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <p id="preset-help" className="help">
        {selected.description}
      </p>

      {preset === 'url' ? (
        <Field id="field-url" label="Website or link" action={pasteButton(onPaste)} hint="https:// is added when you leave the scheme off.">
          <input
            id="field-url"
            data-field="url"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://github.com/devistic-asim"
            value={fields.url}
            onChange={(event) => set('url', event.target.value)}
          />
          {urlProblem(fields.url) ? <p className="field-error">{urlProblem(fields.url)}</p> : null}
          {fields.url.trim() && !urlProblem(fields.url) && !buildUrl(fields.url) ? (
            <p className="help">Enter a full address, such as example.com.</p>
          ) : null}
        </Field>
      ) : null}

      {preset === 'text' ? (
        <Field id="field-text" label="Text" action={pasteButton(onPaste)} hint="The code stores this text exactly.">
          <textarea
            id="field-text"
            data-field="text"
            rows={5}
            maxLength={3000}
            value={fields.text}
            onChange={(event) => set('text', event.target.value)}
          />
        </Field>
      ) : null}

      {preset === 'wifi' ? (
        <div className="form-grid">
          <Field id="field-ssid" label="Network name" action={pasteButton(onPaste)}>
            <input
              id="field-ssid"
              data-field="wifiSsid"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={fields.wifiSsid}
              onChange={(event) => set('wifiSsid', event.target.value)}
            />
          </Field>
          <Field id="field-security" label="Security">
            <select
              id="field-security"
              value={fields.wifiEncryption}
              onChange={(event) => set('wifiEncryption', event.target.value as GeneratorFields['wifiEncryption'])}
            >
              <option value="WPA">WPA / WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </Field>
          {fields.wifiEncryption === 'nopass' ? null : (
            <Field id="field-password" label="Password" hint="This is written into the code in plain text.">
              <div className="inline-field">
                <input
                  id="field-password"
                  data-field="wifiPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={fields.wifiPassword}
                  onChange={(event) => set('wifiPassword', event.target.value)}
                />
                <button
                  type="button"
                  className="button ghost tiny"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={fields.wifiHidden}
              onChange={(event) => set('wifiHidden', event.target.checked)}
            />
            Hidden network
          </label>
        </div>
      ) : null}

      {preset === 'vcard' ? (
        <div className="form-grid">
          <Field id="field-first" label="First name" action={pasteButton(onPaste)}>
            <input id="field-first" data-field="firstName" autoComplete="given-name" value={fields.firstName} onChange={(event) => set('firstName', event.target.value)} />
          </Field>
          <Field id="field-last" label="Last name">
            <input id="field-last" data-field="lastName" autoComplete="family-name" value={fields.lastName} onChange={(event) => set('lastName', event.target.value)} />
          </Field>
          <Field id="field-org" label="Organization">
            <input id="field-org" data-field="organization" autoComplete="organization" value={fields.organization} onChange={(event) => set('organization', event.target.value)} />
          </Field>
          <Field id="field-title" label="Title">
            <input id="field-title" data-field="jobTitle" autoComplete="organization-title" value={fields.jobTitle} onChange={(event) => set('jobTitle', event.target.value)} />
          </Field>
          <Field id="field-contact-phone" label="Phone">
            <input id="field-contact-phone" data-field="contactPhone" type="tel" autoComplete="tel" value={fields.contactPhone} onChange={(event) => set('contactPhone', event.target.value)} />
          </Field>
          <Field id="field-contact-email" label="Email">
            <input id="field-contact-email" data-field="contactEmail" type="email" autoComplete="email" value={fields.contactEmail} onChange={(event) => set('contactEmail', event.target.value)} />
          </Field>
          <Field id="field-contact-url" label="Website">
            <input id="field-contact-url" data-field="contactUrl" type="url" inputMode="url" spellCheck={false} value={fields.contactUrl} onChange={(event) => set('contactUrl', event.target.value)} />
          </Field>
          <Field id="field-street" label="Street">
            <input id="field-street" data-field="street" autoComplete="street-address" value={fields.street} onChange={(event) => set('street', event.target.value)} />
          </Field>
          <Field id="field-city" label="City">
            <input id="field-city" data-field="city" autoComplete="address-level2" value={fields.city} onChange={(event) => set('city', event.target.value)} />
          </Field>
          <Field id="field-region" label="Region">
            <input id="field-region" data-field="region" autoComplete="address-level1" value={fields.region} onChange={(event) => set('region', event.target.value)} />
          </Field>
          <Field id="field-postal" label="Postal code">
            <input id="field-postal" data-field="postalCode" autoComplete="postal-code" value={fields.postalCode} onChange={(event) => set('postalCode', event.target.value)} />
          </Field>
          <Field id="field-country" label="Country">
            <input id="field-country" data-field="country" autoComplete="country-name" value={fields.country} onChange={(event) => set('country', event.target.value)} />
          </Field>
          <Field id="field-note" label="Note">
            <textarea id="field-note" data-field="note" rows={2} maxLength={500} value={fields.note} onChange={(event) => set('note', event.target.value)} />
          </Field>
        </div>
      ) : null}

      {preset === 'email' ? (
        <div className="stack">
          <Field id="field-mailto" label="To" action={pasteButton(onPaste)}>
            <input id="field-mailto" data-field="mailTo" type="email" autoComplete="email" value={fields.mailTo} onChange={(event) => set('mailTo', event.target.value)} />
          </Field>
          <Field id="field-subject" label="Subject">
            <input id="field-subject" data-field="mailSubject" value={fields.mailSubject} onChange={(event) => set('mailSubject', event.target.value)} />
          </Field>
          <Field id="field-body" label="Message">
            <textarea id="field-body" data-field="mailBody" rows={4} maxLength={1500} value={fields.mailBody} onChange={(event) => set('mailBody', event.target.value)} />
          </Field>
        </div>
      ) : null}

      {preset === 'sms' ? (
        <div className="stack">
          <Field id="field-sms" label="Number" action={pasteButton(onPaste)}>
            <input id="field-sms" data-field="smsNumber" type="tel" autoComplete="tel" value={fields.smsNumber} onChange={(event) => set('smsNumber', event.target.value)} />
          </Field>
          <Field id="field-sms-body" label="Message">
            <textarea id="field-sms-body" data-field="smsMessage" rows={3} maxLength={500} value={fields.smsMessage} onChange={(event) => set('smsMessage', event.target.value)} />
          </Field>
        </div>
      ) : null}

      {preset === 'phone' ? (
        <Field id="field-phone" label="Phone number" action={pasteButton(onPaste)} hint="Spaces and brackets are removed. A leading + is kept.">
          <input id="field-phone" data-field="phoneNumber" type="tel" autoComplete="tel" value={fields.phoneNumber} onChange={(event) => set('phoneNumber', event.target.value)} />
        </Field>
      ) : null}
    </div>
  );
}
