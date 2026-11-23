import type { GeneratorFields, QrStyle, Settings } from './types';

export function defaultFields(): GeneratorFields {
  return {
    url: '',
    text: '',
    wifiSsid: '',
    wifiPassword: '',
    wifiEncryption: 'WPA',
    wifiHidden: false,
    firstName: '',
    lastName: '',
    organization: '',
    jobTitle: '',
    contactPhone: '',
    contactEmail: '',
    contactUrl: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    note: '',
    mailTo: '',
    mailSubject: '',
    mailBody: '',
    smsNumber: '',
    smsMessage: '',
    phoneNumber: '',
  };
}

export function defaultStyle(): QrStyle {
  return {
    foreground: '#1e293b',
    background: '#ffffff',
    transparentBackground: false,
    errorCorrection: 'M',
    size: 512,
    margin: 20,
    dots: 'square',
    corners: 'square',
  };
}

export function defaultSettings(): Settings {
  return {
    preset: 'url',
    fields: defaultFields(),
    style: defaultStyle(),
  };
}
