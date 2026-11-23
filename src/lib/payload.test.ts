import { describe, expect, it } from 'vitest';
import { defaultFields, defaultSettings } from './defaults';
import {
  applyPastedText,
  buildPayload,
  buildTel,
  buildUrl,
  buildWifi,
  describePayload,
  urlProblem,
} from './payload';

describe('payload builders', () => {
  it('adds https to a bare domain and blocks script links', () => {
    expect(buildUrl('example.com/docs')).toBe('https://example.com/docs');
    expect(buildUrl('mailto:ada@example.com')).toBe('mailto:ada@example.com');
    expect(buildUrl('javascript:alert(1)')).toBe('');
    expect(buildUrl('h')).toBe('');
    expect(urlProblem('data:text/html,hi')).toMatch(/blocked/i);
    expect(buildUrl('')).toBe('');
  });

  it('escapes Wi-Fi special characters and omits the password when open', () => {
    const fields = defaultFields();
    fields.wifiSsid = 'a;b';
    fields.wifiPassword = 'x:y';
    fields.wifiHidden = true;
    expect(buildWifi(fields)).toBe('WIFI:T:WPA;S:a\\;b;P:x\\:y;H:true;;');
    fields.wifiEncryption = 'nopass';
    fields.wifiPassword = 'ignored';
    fields.wifiHidden = false;
    expect(buildWifi(fields)).toBe('WIFI:T:nopass;S:a\\;b;H:false;;');
  });

  it('builds a vCard, mailto, SMS, and tel payload', () => {
    const fields = defaultFields();
    fields.firstName = 'Ada';
    fields.lastName = 'Lovelace';
    fields.organization = 'Acme, Inc.';
    fields.note = 'Line one\nLine two';
    const card = buildPayload('vcard', fields);
    expect(card).toContain('BEGIN:VCARD');
    expect(card).toContain('N:Lovelace;Ada;;;');
    expect(card).toContain('ORG:Acme\\, Inc.');
    expect(card).toContain('NOTE:Line one\\nLine two');

    fields.mailTo = 'ada@example.com';
    fields.mailSubject = 'Hello there';
    fields.mailBody = 'A&B';
    expect(buildPayload('email', fields)).toBe('mailto:ada@example.com?subject=Hello+there&body=A%26B');

    fields.smsNumber = '+15550100';
    fields.smsMessage = 'Meet at 5';
    expect(buildPayload('sms', fields)).toBe('sms:+15550100?body=Meet%20at%205');
    expect(buildTel(' (555) 010-1234 ')).toBe('tel:5550101234');
    expect(buildPayload('text', { ...fields, text: '  hello  ' })).toBe('hello');
  });

  it('labels presets and routes a pasted clipboard', () => {
    const fields = defaultFields();
    fields.wifiSsid = 'Cafe';
    expect(describePayload('wifi', fields, 'WIFI:')).toBe('Wi-Fi · Cafe');
    const settings = defaultSettings();
    expect(applyPastedText(settings, 'ada@example.com').preset).toBe('email');
    expect(applyPastedText(settings, 'https://example.com').fields.url).toBe('https://example.com');
    expect(applyPastedText(settings, 'A plain note').fields.text).toBe('A plain note');
  });
});
