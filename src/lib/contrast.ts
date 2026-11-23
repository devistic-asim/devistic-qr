export function parseHexColor(value: string): string | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((channel) => channel + channel)
      .join('');
  }
  return `#${hex.toLowerCase()}`;
}

function channel(hex: string, start: number): number {
  return Number.parseInt(hex.slice(start, start + 2), 16);
}

function linearize(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number | null {
  const hex = parseHexColor(color);
  if (!hex) return null;
  const red = linearize(channel(hex, 1));
  const green = linearize(channel(hex, 3));
  const blue = linearize(channel(hex, 5));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number | null {
  const lighterSource = relativeLuminance(foreground);
  const darkerSource = relativeLuminance(background);
  if (lighterSource === null || darkerSource === null) return null;
  const lighter = Math.max(lighterSource, darkerSource);
  const darker = Math.min(lighterSource, darkerSource);
  return (lighter + 0.05) / (darker + 0.05);
}

export function modulesAreLightOnDark(foreground: string, background: string): boolean {
  const ink = relativeLuminance(foreground);
  const paper = relativeLuminance(background);
  if (ink === null || paper === null) return false;
  return ink > paper;
}
