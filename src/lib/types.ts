export const PRESET_IDS = ['url', 'text', 'wifi', 'vcard', 'email', 'sms', 'phone'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const ERROR_LEVELS = ['L', 'M', 'Q', 'H'] as const;
export type ErrorCorrection = (typeof ERROR_LEVELS)[number];

export const DOT_STYLES = ['square', 'rounded', 'dots', 'extra-rounded'] as const;
export type DotStyle = (typeof DOT_STYLES)[number];

export const CORNER_STYLES = ['square', 'extra-rounded', 'dot'] as const;
export type CornerStyle = (typeof CORNER_STYLES)[number];

export const EXPORT_SIZES = [256, 384, 512, 768, 1024, 2048] as const;
export type ExportSize = (typeof EXPORT_SIZES)[number];

export const WIFI_SECURITY = ['WPA', 'WEP', 'nopass'] as const;
export type WifiSecurity = (typeof WIFI_SECURITY)[number];

export type ThemeChoice = 'light' | 'dark' | 'system';
export type TabId = 'create' | 'scan' | 'history';
export type HistoryKind = 'generated' | 'scanned';

export type GeneratorFields = {
  url: string;
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: WifiSecurity;
  wifiHidden: boolean;
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactUrl: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  note: string;
  mailTo: string;
  mailSubject: string;
  mailBody: string;
  smsNumber: string;
  smsMessage: string;
  phoneNumber: string;
};

export type QrStyle = {
  foreground: string;
  background: string;
  transparentBackground: boolean;
  errorCorrection: ErrorCorrection;
  size: ExportSize;
  margin: number;
  dots: DotStyle;
  corners: CornerStyle;
};

export type Settings = {
  preset: PresetId;
  fields: GeneratorFields;
  style: QrStyle;
};

export type HistoryItem = {
  id: string;
  kind: HistoryKind;
  preset: PresetId;
  label: string;
  payload: string;
  createdAt: number;
  fields: GeneratorFields;
  style: QrStyle;
};

export type QualityTone = 'pass' | 'warn' | 'fail' | 'info';

export type QualityNote = {
  tone: QualityTone;
  text: string;
};

export type ParsedDetail = {
  label: string;
  value: string;
};

export type WifiDetails = {
  ssid: string;
  password: string;
  encryption: WifiSecurity;
  hidden: boolean;
};

export type ContactDetails = {
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
  url: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  note: string;
};

export type ParsedPayload = {
  kind: 'url' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'text';
  title: string;
  details: ParsedDetail[];
  link: string | null;
  warnings: string[];
  raw: string;
  wifi?: WifiDetails;
  contact?: ContactDetails;
  email?: { to: string; subject: string; body: string };
  sms?: { number: string; message: string };
  phone?: { number: string };
};
