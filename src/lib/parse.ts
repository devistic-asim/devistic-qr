import { defaultFields } from './defaults';
import type { ContactDetails, GeneratorFields, ParsedPayload, PresetId, WifiDetails, WifiSecurity } from './types';

function emptyContact(): ContactDetails {
  return {
    firstName: '',
    lastName: '',
    organization: '',
    jobTitle: '',
    phone: '',
    email: '',
    url: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    note: '',
  };
}

function unescapeVcard(value: string): string {
  let out = '';
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\' && index + 1 < value.length) {
      const next = value[index + 1];
      out += next === 'n' || next === 'N' ? '\n' : next;
      index += 1;
      continue;
    }
    out += value[index];
  }
  return out;
}

function splitSemicolons(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\' && index + 1 < value.length) {
      current += value[index] + value[index + 1];
      index += 1;
      continue;
    }
    if (value[index] === ';') {
      parts.push(unescapeVcard(current));
      current = '';
      continue;
    }
    current += value[index];
  }
  parts.push(unescapeVcard(current));
  return parts;
}

function parseWifi(raw: string): WifiDetails | null {
  const body = raw.replace(/^WIFI:/i, '').replace(/;;\s*$/, '');
  const pairs: Record<string, string> = {};
  let key = '';
  let value = '';
  let readingKey = true;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === '\\' && index + 1 < body.length) {
      const next = body[index + 1];
      if (readingKey) key += next;
      else value += next;
      index += 1;
      continue;
    }
    if (character === ':' && readingKey) {
      readingKey = false;
      continue;
    }
    if (character === ';') {
      if (key) pairs[key.toUpperCase()] = value;
      key = '';
      value = '';
      readingKey = true;
      continue;
    }
    if (readingKey) key += character;
    else value += character;
  }
  if (key) pairs[key.toUpperCase()] = value;
  if (!pairs.S) return null;
  const security: WifiSecurity = pairs.T === 'WEP' ? 'WEP' : pairs.T && pairs.T.toLowerCase() !== 'nopass' ? 'WPA' : 'nopass';
  return {
    ssid: pairs.S,
    password: security === 'nopass' ? '' : (pairs.P ?? ''),
    encryption: security,
    hidden: (pairs.H ?? '').toLowerCase() === 'true',
  };
}

function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else if (line.trim()) {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseVcard(raw: string): ContactDetails {
  const contact = emptyContact();
  for (const line of unfold(raw)) {
    const splitAt = line.indexOf(':');
    if (splitAt === -1) continue;
    const name = line.slice(0, splitAt).split(';')[0]?.toUpperCase() ?? '';
    const value = line.slice(splitAt + 1);
    if (name === 'FN' && !contact.firstName && !contact.lastName) {
      contact.firstName = unescapeVcard(value);
    } else if (name === 'N') {
      const [last = '', first = ''] = splitSemicolons(value);
      contact.lastName = last;
      contact.firstName = first || contact.firstName;
    } else if (name === 'ORG') {
      contact.organization = unescapeVcard(value);
    } else if (name === 'TITLE') {
      contact.jobTitle = unescapeVcard(value);
    } else if (name === 'TEL' && !contact.phone) {
      contact.phone = unescapeVcard(value);
    } else if (name === 'EMAIL' && !contact.email) {
      contact.email = unescapeVcard(value);
    } else if (name === 'URL' && !contact.url) {
      contact.url = unescapeVcard(value);
    } else if (name === 'NOTE') {
      contact.note = unescapeVcard(value);
    } else if (name === 'ADR') {
      const [, , street = '', city = '', region = '', postal = '', country = ''] = splitSemicolons(value);
      contact.street = street;
      contact.city = city;
      contact.region = region;
      contact.postalCode = postal;
      contact.country = country;
    }
  }
  return contact;
}

function contactTitle(contact: ContactDetails): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  return name || contact.organization || contact.email || contact.phone || 'Contact';
}

function safeHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url;
    return null;
  } catch {
    return null;
  }
}

function urlWarnings(url: URL): string[] {
  const warnings: string[] = [];
  if (url.username || url.password) {
    warnings.push('This address hides a username or password before the host. Check it before you open it.');
  }
  if (url.hostname.startsWith('xn--') || url.hostname.includes('.xn--')) {
    warnings.push('This address uses special characters. Compare it with the site you expect.');
  }
  return warnings;
}

function firstEmbeddedUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  return match[0].replace(/[),.;:!?]+$/, '');
}

function textResult(raw: string, warnings: string[] = [], link: string | null = null): ParsedPayload {
  return {
    kind: 'text',
    title: raw.trim() ? 'Text' : 'Empty code',
    details: [],
    link,
    warnings,
    raw,
  };
}

export function parsePayload(raw: string): ParsedPayload {
  const trimmed = raw.trim();
  if (!trimmed) return textResult(raw);
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return textResult(raw, ['This code contains a script or local link. It is shown as text so it cannot run from this page.']);
  }
  if (/^WIFI:/i.test(trimmed)) {
    const wifi = parseWifi(trimmed);
    if (wifi) {
      return {
        kind: 'wifi',
        title: `Wi-Fi · ${wifi.ssid}`,
        details: [
          { label: 'Network', value: wifi.ssid },
          { label: 'Security', value: wifi.encryption === 'nopass' ? 'None' : wifi.encryption },
          ...(wifi.password ? [{ label: 'Password', value: wifi.password }] : []),
          { label: 'Hidden network', value: wifi.hidden ? 'Yes' : 'No' },
        ],
        link: null,
        warnings: ['The password is visible to anyone who scans this code.'],
        raw,
        wifi,
      };
    }
  }
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    const contact = parseVcard(trimmed);
    const details = [
      ['Name', [contact.firstName, contact.lastName].filter(Boolean).join(' ')],
      ['Organization', contact.organization],
      ['Title', contact.jobTitle],
      ['Phone', contact.phone],
      ['Email', contact.email],
      ['Website', contact.url],
      [
        'Address',
        [contact.street, contact.city, contact.region, contact.postalCode, contact.country].filter(Boolean).join(', '),
      ],
      ['Note', contact.note],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => ({ label, value }));
    return {
      kind: 'vcard',
      title: contactTitle(contact),
      details,
      link: safeHttpUrl(contact.url)?.href ?? null,
      warnings: [],
      raw,
      contact,
    };
  }
  if (/^mailto:/i.test(trimmed)) {
    const withoutScheme = trimmed.slice('mailto:'.length);
    const [addressPart, query = ''] = withoutScheme.split('?');
    const params = new URLSearchParams(query);
    const email = {
      to: decodeURIComponent(addressPart),
      subject: params.get('subject') ?? '',
      body: params.get('body') ?? '',
    };
    return {
      kind: 'email',
      title: email.to ? `Email · ${email.to}` : 'Email',
      details: [
        { label: 'To', value: email.to },
        ...(email.subject ? [{ label: 'Subject', value: email.subject }] : []),
        ...(email.body ? [{ label: 'Message', value: email.body }] : []),
      ],
      link: trimmed,
      warnings: [],
      raw,
      email,
    };
  }
  if (/^sms:/i.test(trimmed)) {
    const withoutScheme = trimmed.slice(4);
    const [numberPart, query = ''] = withoutScheme.split('?');
    const sms = {
      number: decodeURIComponent(numberPart),
      message: new URLSearchParams(query).get('body') ?? '',
    };
    return {
      kind: 'sms',
      title: sms.number ? `SMS · ${sms.number}` : 'SMS',
      details: [
        { label: 'Number', value: sms.number },
        ...(sms.message ? [{ label: 'Message', value: sms.message }] : []),
      ],
      link: null,
      warnings: [],
      raw,
      sms,
    };
  }
  if (/^SMSTO:/i.test(trimmed)) {
    const [, number = '', message = ''] = trimmed.split(':');
    return {
      kind: 'sms',
      title: number ? `SMS · ${number}` : 'SMS',
      details: [
        { label: 'Number', value: number },
        ...(message ? [{ label: 'Message', value: message }] : []),
      ],
      link: null,
      warnings: [],
      raw,
      sms: { number, message },
    };
  }
  if (/^tel:/i.test(trimmed)) {
    const number = trimmed.slice(4);
    return {
      kind: 'phone',
      title: `Call · ${number}`,
      details: [{ label: 'Number', value: number }],
      link: trimmed,
      warnings: [],
      raw,
      phone: { number },
    };
  }
  const url = safeHttpUrl(trimmed);
  if (url) {
    return {
      kind: 'url',
      title: url.host || trimmed,
      details: [
        { label: 'Address', value: trimmed },
        { label: 'Host', value: url.host },
      ],
      link: url.href,
      warnings: urlWarnings(url),
      raw,
    };
  }
  const embedded = firstEmbeddedUrl(trimmed);
  const embeddedUrl = embedded ? safeHttpUrl(embedded) : null;
  return textResult(raw, [], embeddedUrl?.href ?? null);
}

export function actionHref(link: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  if (/^mailto:/i.test(link)) return link;
  if (/^tel:/i.test(link)) return link;
  return null;
}

export function actionLabel(link: string): string {
  if (/^mailto:/i.test(link)) return 'Write email';
  if (/^tel:/i.test(link)) return 'Call';
  return 'Open link';
}

export function draftFromPayload(raw: string): { preset: PresetId; fields: GeneratorFields } {
  const fields = defaultFields();
  const parsed = parsePayload(raw);
  switch (parsed.kind) {
    case 'url':
      fields.url = raw.trim();
      return { preset: 'url', fields };
    case 'wifi':
      if (parsed.wifi) {
        fields.wifiSsid = parsed.wifi.ssid;
        fields.wifiPassword = parsed.wifi.password;
        fields.wifiEncryption = parsed.wifi.encryption;
        fields.wifiHidden = parsed.wifi.hidden;
      }
      return { preset: 'wifi', fields };
    case 'vcard':
      if (parsed.contact) {
        fields.firstName = parsed.contact.firstName;
        fields.lastName = parsed.contact.lastName;
        fields.organization = parsed.contact.organization;
        fields.jobTitle = parsed.contact.jobTitle;
        fields.contactPhone = parsed.contact.phone;
        fields.contactEmail = parsed.contact.email;
        fields.contactUrl = parsed.contact.url;
        fields.street = parsed.contact.street;
        fields.city = parsed.contact.city;
        fields.region = parsed.contact.region;
        fields.postalCode = parsed.contact.postalCode;
        fields.country = parsed.contact.country;
        fields.note = parsed.contact.note;
      }
      return { preset: 'vcard', fields };
    case 'email':
      fields.mailTo = parsed.email?.to ?? '';
      fields.mailSubject = parsed.email?.subject ?? '';
      fields.mailBody = parsed.email?.body ?? '';
      return { preset: 'email', fields };
    case 'sms':
      fields.smsNumber = parsed.sms?.number ?? '';
      fields.smsMessage = parsed.sms?.message ?? '';
      return { preset: 'sms', fields };
    case 'phone':
      fields.phoneNumber = parsed.phone?.number ?? '';
      return { preset: 'phone', fields };
    default:
      fields.text = raw.trim();
      return { preset: 'text', fields };
  }
}
