import { HISTORY_LIMIT, MAX_PAYLOAD_LENGTH } from './constants';
import { defaultFields, defaultStyle } from './defaults';
import { parseHexColor } from './contrast';
import { describePayload, isPreset, pasteIntoPrimary } from './payload';
import { draftFromPayload } from './parse';
import {
  CORNER_STYLES,
  DOT_STYLES,
  ERROR_LEVELS,
  EXPORT_SIZES,
  WIFI_SECURITY,
  type CornerStyle,
  type DotStyle,
  type ErrorCorrection,
  type ExportSize,
  type GeneratorFields,
  type HistoryItem,
  type HistoryKind,
  type PresetId,
  type QrStyle,
  type Settings,
  type WifiSecurity,
} from './types';

const STRING_KEYS = [
  'url',
  'text',
  'wifiSsid',
  'wifiPassword',
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
  'mailTo',
  'mailSubject',
  'mailBody',
  'smsNumber',
  'smsMessage',
  'phoneNumber',
] as const satisfies readonly (keyof GeneratorFields)[];

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function sanitizeFields(value: unknown, base: GeneratorFields = defaultFields()): GeneratorFields {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const next = { ...base };
  for (const key of STRING_KEYS) {
    if (typeof source[key] === 'string') next[key] = source[key];
  }
  next.wifiEncryption = oneOf<WifiSecurity>(source.wifiEncryption, WIFI_SECURITY, base.wifiEncryption);
  if (typeof source.wifiHidden === 'boolean') next.wifiHidden = source.wifiHidden;
  return next;
}

export function sanitizeStyle(value: unknown, base: QrStyle = defaultStyle()): QrStyle {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const size = EXPORT_SIZES.find((candidate) => candidate === source.size);
  const margin = typeof source.margin === 'number' && Number.isFinite(source.margin) ? Math.round(source.margin) : base.margin;
  return {
    foreground: parseHexColor(typeof source.foreground === 'string' ? source.foreground : '') ?? base.foreground,
    background: parseHexColor(typeof source.background === 'string' ? source.background : '') ?? base.background,
    transparentBackground:
      typeof source.transparentBackground === 'boolean' ? source.transparentBackground : base.transparentBackground,
    errorCorrection: oneOf<ErrorCorrection>(source.errorCorrection, ERROR_LEVELS, base.errorCorrection),
    size: (size ?? base.size) as ExportSize,
    margin: Math.min(64, Math.max(0, margin)),
    dots: oneOf<DotStyle>(source.dots, DOT_STYLES, base.dots),
    corners: oneOf<CornerStyle>(source.corners, CORNER_STYLES, base.corners),
  };
}

export function sanitizeSettings(value: unknown): Settings {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const preset = isPreset(source.preset) ? source.preset : 'url';
  return {
    preset,
    fields: sanitizeFields(source.fields),
    style: sanitizeStyle(source.style),
  };
}

function timestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return Date.now();
}

export function sanitizeHistoryItem(value: unknown): HistoryItem | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.payload !== 'string') return null;
  const payload = record.payload.slice(0, MAX_PAYLOAD_LENGTH);
  if (!payload.trim()) return null;
  const draft = draftFromPayload(payload);
  const preset: PresetId = isPreset(record.preset) ? record.preset : draft.preset;
  const storedFields = Boolean(record.fields && typeof record.fields === 'object');
  const base = storedFields
    ? defaultFields()
    : preset === draft.preset
      ? draft.fields
      : pasteIntoPrimary(preset, defaultFields(), payload);
  const fields = sanitizeFields(record.fields, base);
  const kind: HistoryKind = record.kind === 'scanned' || record.kind === 'generated' ? record.kind : 'generated';
  const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : describePayload(preset, fields, payload);
  const id = typeof record.id === 'string' && record.id.trim() ? record.id : crypto.randomUUID();
  return {
    id,
    kind,
    preset,
    label,
    payload,
    createdAt: timestamp(record.createdAt),
    fields,
    style: sanitizeStyle(record.style),
  };
}

export function sanitizeHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  const items: HistoryItem[] = [];
  for (const entry of value) {
    const item = sanitizeHistoryItem(entry);
    if (item) items.push(item);
    if (items.length >= HISTORY_LIMIT) break;
  }
  return items;
}

export function createHistoryItem(input: {
  kind: HistoryKind;
  preset: PresetId;
  fields: GeneratorFields;
  style: QrStyle;
  payload: string;
  id?: string;
  createdAt?: number;
}): HistoryItem {
  return {
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? Date.now(),
    kind: input.kind,
    preset: input.preset,
    fields: input.fields,
    style: input.style,
    payload: input.payload,
    label: describePayload(input.preset, input.fields, input.payload),
  };
}

export function addHistory(items: HistoryItem[], item: HistoryItem): HistoryItem[] {
  const withoutDuplicate = items.filter((existing) => !(existing.kind === item.kind && existing.payload === item.payload));
  return [item, ...withoutDuplicate].slice(0, HISTORY_LIMIT);
}

export function deleteHistory(items: HistoryItem[], id: string): HistoryItem[] {
  return items.filter((item) => item.id !== id);
}

export function searchHistory(items: HistoryItem[], query: string): HistoryItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.label, item.payload, item.preset, item.kind].some((part) => part.toLowerCase().includes(needle)),
  );
}
