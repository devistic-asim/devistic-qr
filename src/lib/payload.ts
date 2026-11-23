import type { GeneratorFields, PresetId, Settings } from './types';
import { PRESET_IDS } from './types';

const BLOCKED_SCHEME = /^(javascript|data|vbscript|file):/i;

export const PRESETS: { id: PresetId; label: string; description: string }[] = [
  {
    id: 'url',
    label: 'URL',
    description: 'A normal link, stored as itself. It does not expire and it is not a tracking redirect.',
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Any note, code, or message. Paste with the button, or press Ctrl+V or Cmd+V in the field.',
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    description: 'A phone can join this network from the code. Anyone who scans it can read the password.',
  },
  {
    id: 'vcard',
    label: 'Contact',
    description: 'A vCard. Phones usually offer to save it as a contact.',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Opens a new message to this address, with an optional subject and body.',
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Opens a text message with the number and draft filled in.',
  },
  {
    id: 'phone',
    label: 'Phone',
    description: 'A phone number. Scanning it offers to call.',
  },
];

export function isPreset(value: unknown): value is PresetId {
  return typeof value === 'string' && (PRESET_IDS as readonly string[]).includes(value);
}

export function urlProblem(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (BLOCKED_SCHEME.test(value)) {
    return 'That link type is blocked so a scan cannot run a script or open a local file.';
  }
  return null;
}

export function buildUrl(input: string): string {
  const value = input.trim();
  if (!value || BLOCKED_SCHEME.test(value)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (!isLikelyUrl(value)) return '';
  return `https://${value}`;
}

function escapeWifi(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([;,:"])/g, '\\$1');
}

export function buildWifi(fields: GeneratorFields): string {
  const ssid = fields.wifiSsid.trim();
  if (!ssid) return '';
  const security = fields.wifiEncryption;
  const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`];
  if (security !== 'nopass' && fields.wifiPassword) {
    parts.push(`P:${escapeWifi(fields.wifiPassword)}`);
  }
  parts.push(`H:${fields.wifiHidden ? 'true' : 'false'}`);
  return `WIFI:${parts.join(';')};;`;
}

function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');
}

export function buildVcard(fields: GeneratorFields): string {
  const first = fields.firstName.trim();
  const last = fields.lastName.trim();
  const organization = fields.organization.trim();
  const title = fields.jobTitle.trim();
  const phone = fields.contactPhone.trim();
  const email = fields.contactEmail.trim();
  const url = fields.contactUrl.trim();
  const street = fields.street.trim();
  const city = fields.city.trim();
  const region = fields.region.trim();
  const postal = fields.postalCode.trim();
  const country = fields.country.trim();
  const note = fields.note.trim();
  const hasAddress = [street, city, region, postal, country].some(Boolean);
  const fullName = [first, last].filter(Boolean).join(' ');
  if (!fullName && !organization && !title && !phone && !email && !url && !hasAddress && !note) {
    return '';
  }
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (first || last) lines.push(`N:${escapeVcard(last)};${escapeVcard(first)};;;`);
  if (fullName) lines.push(`FN:${escapeVcard(fullName)}`);
  if (organization) lines.push(`ORG:${escapeVcard(organization)}`);
  if (title) lines.push(`TITLE:${escapeVcard(title)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVcard(email)}`);
  if (url) lines.push(`URL:${escapeVcard(buildUrl(url) || url)}`);
  if (hasAddress) {
    lines.push(
      `ADR:;;${escapeVcard(street)};${escapeVcard(city)};${escapeVcard(region)};${escapeVcard(postal)};${escapeVcard(country)}`,
    );
  }
  if (note) lines.push(`NOTE:${escapeVcard(note)}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

export function buildMailto(to: string, subject: string, body: string): string {
  const address = to.trim();
  if (!address) return '';
  const params = new URLSearchParams();
  if (subject.trim()) params.set('subject', subject.trim());
  if (body.trim()) params.set('body', body.trim());
  const query = params.toString();
  return query ? `mailto:${address}?${query}` : `mailto:${address}`;
}

export function buildSms(number: string, message: string): string {
  const target = number.trim();
  if (!target) return '';
  const body = message.trim();
  return body ? `sms:${target}?body=${encodeURIComponent(body)}` : `sms:${target}`;
}

export function buildTel(number: string): string {
  const compact = number.trim().replace(/[^\d+*#]/g, '');
  if (!compact) return '';
  return `tel:${compact}`;
}

export function buildPayload(preset: PresetId, fields: GeneratorFields): string {
  switch (preset) {
    case 'url':
      return buildUrl(fields.url);
    case 'text':
      return fields.text.trim();
    case 'wifi':
      return buildWifi(fields);
    case 'vcard':
      return buildVcard(fields);
    case 'email':
      return buildMailto(fields.mailTo, fields.mailSubject, fields.mailBody);
    case 'sms':
      return buildSms(fields.smsNumber, fields.smsMessage);
    case 'phone':
      return buildTel(fields.phoneNumber);
  }
}

function clip(value: string, max = 80): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function describePayload(preset: PresetId, fields: GeneratorFields, payload: string): string {
  switch (preset) {
    case 'url':
      return clip(payload || fields.url, 96);
    case 'text':
      return clip(fields.text || payload) || 'Text';
    case 'wifi':
      return fields.wifiSsid.trim() ? `Wi-Fi · ${fields.wifiSsid.trim()}` : 'Wi-Fi';
    case 'vcard': {
      const name = [fields.firstName, fields.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');
      return name || fields.organization.trim() || fields.contactEmail.trim() || fields.contactPhone.trim() || 'Contact';
    }
    case 'email':
      return fields.mailTo.trim() ? `Email · ${fields.mailTo.trim()}` : 'Email';
    case 'sms':
      return fields.smsNumber.trim() ? `SMS · ${fields.smsNumber.trim()}` : 'SMS';
    case 'phone':
      return fields.phoneNumber.trim() ? `Call · ${fields.phoneNumber.trim()}` : 'Phone';
  }
}

export function pasteIntoPrimary(preset: PresetId, fields: GeneratorFields, text: string): GeneratorFields {
  const value = text.trim();
  switch (preset) {
    case 'url':
      return { ...fields, url: value };
    case 'text':
      return { ...fields, text: value };
    case 'wifi':
      return { ...fields, wifiSsid: value };
    case 'vcard':
      return { ...fields, firstName: value };
    case 'email':
      return { ...fields, mailTo: value };
    case 'sms':
      return { ...fields, smsNumber: value };
    case 'phone':
      return { ...fields, phoneNumber: value };
  }
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\./i.test(trimmed)) return true;
  if (/^localhost(:\d+)?(\/|\?|#|$)/i.test(trimmed)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}([/:?#]\S*)?$/i.test(trimmed);
}

export function applyPastedText(settings: Settings, text: string): Settings {
  const value = text.trim();
  if (!value) return settings;
  if (isLikelyEmail(value)) {
    return { ...settings, preset: 'email', fields: { ...settings.fields, mailTo: value } };
  }
  if (isLikelyUrl(value)) {
    return { ...settings, preset: 'url', fields: { ...settings.fields, url: value } };
  }
  return { ...settings, preset: 'text', fields: { ...settings.fields, text: value } };
}

export function draftIsStarted(preset: PresetId, fields: GeneratorFields): boolean {
  switch (preset) {
    case 'url':
      return fields.url.trim().length > 0;
    case 'text':
      return fields.text.trim().length > 0;
    case 'wifi':
      return fields.wifiSsid.trim().length > 0 || fields.wifiPassword.trim().length > 0;
    case 'vcard':
      return Object.entries(fields).some(([key, value]) => {
        if (typeof value !== 'string') return false;
        return [
          'firstName',
          'lastName',
          'organization',
          'jobTitle',
          'contactPhone',
          'contactEmail',
          'contactUrl',
          'street',
          'city',
          'region',
          'postalCode',
          'country',
          'note',
        ].includes(key) && value.trim().length > 0;
      });
    case 'email':
      return fields.mailTo.trim().length > 0 || fields.mailSubject.trim().length > 0 || fields.mailBody.trim().length > 0;
    case 'sms':
      return fields.smsNumber.trim().length > 0 || fields.smsMessage.trim().length > 0;
    case 'phone':
      return fields.phoneNumber.trim().length > 0;
  }
}
