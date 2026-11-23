import { describe, expect, it } from 'vitest';
import { defaultFields } from './defaults';
import { buildPayload } from './payload';
import { actionHref, draftFromPayload, parsePayload } from './parse';

describe('parsePayload', () => {
  it('round-trips every preset', () => {
    const fields = defaultFields();
    fields.url = 'https://example.com/a?b=1';
    fields.text = 'Keep this exact note';
    fields.wifiSsid = 'a;b';
    fields.wifiPassword = 'x:y';
    fields.wifiHidden = true;
    fields.firstName = 'Ada';
    fields.lastName = 'Lovelace';
    fields.organization = 'Acme, Inc.';
    fields.contactEmail = 'ada@example.com';
    fields.note = 'Line one\nLine two';
    fields.mailTo = 'ada@example.com';
    fields.mailSubject = 'Hello there';
    fields.mailBody = 'A&B';
    fields.smsNumber = '+15550100';
    fields.smsMessage = 'Meet at 5';
    fields.phoneNumber = '+1 555 0100';

    const url = parsePayload(buildPayload('url', fields));
    expect(url.kind).toBe('url');
    expect(url.link).toBe('https://example.com/a?b=1');

    expect(parsePayload(buildPayload('text', fields)).kind).toBe('text');

    const wifi = parsePayload(buildPayload('wifi', fields));
    expect(wifi.wifi).toMatchObject({ ssid: 'a;b', password: 'x:y', hidden: true, encryption: 'WPA' });

    const card = parsePayload(buildPayload('vcard', fields));
    expect(card.contact).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      organization: 'Acme, Inc.',
      email: 'ada@example.com',
      note: 'Line one\nLine two',
    });

    const email = parsePayload(buildPayload('email', fields));
    expect(email.email).toEqual({ to: 'ada@example.com', subject: 'Hello there', body: 'A&B' });

    const sms = parsePayload(buildPayload('sms', fields));
    expect(sms.sms).toEqual({ number: '+15550100', message: 'Meet at 5' });

    const phone = parsePayload(buildPayload('phone', fields));
    expect(phone.phone?.number).toBe('+15550100');
  });

  it('flags risky links and finds a link inside text', () => {
    const sneaky = parsePayload('https://user:secret@example.com/path');
    expect(sneaky.warnings.join(' ')).toMatch(/username or password/i);
    const script = parsePayload('javascript:alert(1)');
    expect(script.link).toBeNull();
    expect(actionHref(script.link)).toBeNull();
    expect(actionHref('https://example.com')).toBe('https://example.com');
    const embedded = parsePayload('See https://example.com/docs.');
    expect(embedded.kind).toBe('text');
    expect(embedded.link).toBe('https://example.com/docs');
  });

  it('restores a Wi-Fi code into the form', () => {
    const fields = defaultFields();
    fields.wifiSsid = 'Cafe';
    fields.wifiEncryption = 'nopass';
    const draft = draftFromPayload(buildPayload('wifi', fields));
    expect(draft.preset).toBe('wifi');
    expect(draft.fields.wifiSsid).toBe('Cafe');
    expect(draft.fields.wifiEncryption).toBe('nopass');
    expect(draft.fields.wifiPassword).toBe('');
  });
});
