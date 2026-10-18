/**
 * Screen scale (CSS px per physical mm) without user calibration.
 *
 * Browsers report CSS pixels, not physical size, but phones cluster tightly:
 * the CSS-pixel density of current phones is roughly 140–165 px per inch, so
 * a device-class estimate is typically within ±5–8% (well under half a
 * LogMAR line). Tablets and computers vary more, so their estimates are
 * flagged as low confidence. A card calibration always takes precedence.
 */

export type DeviceClass = "iphone" | "android-phone" | "tablet" | "computer";

export interface ScaleEstimate {
  pxPerMm: number;
  deviceClass: DeviceClass;
  /** Typical relative error of the estimate (e.g. 0.06 = ±6%). */
  typicalError: number;
}

export interface DeviceInfo {
  userAgent: string;
  devicePixelRatio: number;
  /** Shorter side of the screen in CSS px. */
  screenShortSide: number;
  coarsePointer: boolean;
}

/** CSS px per inch by device class, from published panel specs (ppi ÷ device pixel ratio). */
const CSS_PPI = {
  // iPhones: 460 ppi @3x ≈ 153; 326 ppi @2x ≈ 163.
  iphone3x: 153,
  iphone2x: 163,
  // Android phones: ~140 (e.g. 360 CSS px over 65 mm) to ~155 (412 CSS px over 68 mm).
  androidPhone: 148,
  // iPads: 264 ppi @2x = 132 (mini models are denser).
  tablet: 132,
  // Laptops and monitors: 96 (1x desktop) to ~130 (laptops with scaling).
  computer: 110,
};

export function classifyDevice(info: DeviceInfo): DeviceClass {
  const ua = info.userAgent;
  if (/iPhone|iPod/.test(ua)) return "iphone";
  if (/Android/.test(ua) && /Mobile/.test(ua)) return "android-phone";
  if (info.coarsePointer && info.screenShortSide < 600) return "android-phone";
  if (/iPad|Android|Tablet/.test(ua) || info.coarsePointer) return "tablet";
  return "computer";
}

export function estimateScale(info: DeviceInfo): ScaleEstimate {
  const deviceClass = classifyDevice(info);
  let ppi: number;
  let typicalError: number;
  switch (deviceClass) {
    case "iphone":
      ppi = info.devicePixelRatio >= 3 ? CSS_PPI.iphone3x : CSS_PPI.iphone2x;
      typicalError = 0.04;
      break;
    case "android-phone":
      ppi = CSS_PPI.androidPhone;
      typicalError = 0.06;
      break;
    case "tablet":
      ppi = CSS_PPI.tablet;
      typicalError = 0.12;
      break;
    default:
      ppi = CSS_PPI.computer;
      typicalError = 0.2;
  }
  return { pxPerMm: ppi / 25.4, deviceClass, typicalError };
}

export function currentDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenShortSide: Math.min(window.screen.width, window.screen.height),
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
  };
}
