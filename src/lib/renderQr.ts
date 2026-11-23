import QRCodeStyling from 'qr-code-styling';
import type { QrStyle } from './types';

export function buildQrOptions(payload: string, style: QrStyle, logo: string | null, size: number) {
  return {
    width: size,
    height: size,
    type: 'svg' as const,
    shape: 'square' as const,
    data: payload,
    margin: style.margin,
    image: logo || undefined,
    qrOptions: {
      errorCorrectionLevel: style.errorCorrection,
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.34,
      margin: 4,
      crossOrigin: 'anonymous',
      saveAsBlob: true,
    },
    dotsOptions: {
      type: style.dots,
      color: style.foreground,
    },
    cornersSquareOptions: {
      type: style.corners,
      color: style.foreground,
    },
    cornersDotOptions: {
      type: style.corners === 'dot' ? ('dot' as const) : ('square' as const),
      color: style.foreground,
    },
    backgroundOptions: {
      color: style.transparentBackground ? 'transparent' : style.background,
    },
  };
}

export function mountQr(container: HTMLElement, payload: string, style: QrStyle, logo: string | null, size: number) {
  const qr = new QRCodeStyling(buildQrOptions(payload, style, logo, size));
  container.replaceChildren();
  qr.append(container);
  return qr;
}

export async function renderQrBlob(
  payload: string,
  style: QrStyle,
  logo: string | null,
  size: number,
  extension: 'png' | 'svg',
): Promise<Blob> {
  const qr = new QRCodeStyling(buildQrOptions(payload, style, logo, size));
  const raw = await qr.getRawData(extension);
  if (!(raw instanceof Blob)) throw new Error('Could not render the QR code.');
  return raw;
}
