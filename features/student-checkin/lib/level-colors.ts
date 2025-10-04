const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(
    clamp(Math.round(b), 0, 255),
  )}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const gray = clamp(Math.round(l * 255), 0, 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return {
    r: clamp(Math.round(r * 255), 0, 255),
    g: clamp(Math.round(g * 255), 0, 255),
    b: clamp(Math.round(b * 255), 0, 255),
  };
}

function adjustLightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const nextL = clamp(l + amount, 0, 1);
  const { r, g, b } = hslToRgb(h, s, nextL);
  return rgbToHex(r, g, b);
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  const safeAlpha = clamp(alpha, 0, 1);
  if (!rgb) {
    return `rgba(249, 115, 22, ${safeAlpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}

export type LevelAccent = {
  primary: string;
  background: string;
  chipBackground: string;
  base: string;
  border: string;
};

export type LessonColorScale = {
  background: string;
  border: string;
  text: string;
};

function createAccent(base: string, primary?: string): LevelAccent {
  const accentPrimary = primary ?? adjustLightness(base, -0.35);
  return {
    base,
    primary: accentPrimary,
    background: withAlpha(base, 0.6),
    chipBackground: withAlpha(base, 0.82),
    border: adjustLightness(base, -0.16),
  };
}

const accentMap: Record<string, LevelAccent> = {
  A1: createAccent("#c9f5dc", "#0f5132"),
  A2: createAccent("#d4e8ff", "#1e3a8a"),
  B1: createAccent("#ffe2c3", "#8a3b07"),
  "B1+": createAccent("#fbd5e5", "#9d174d"),
  C1: createAccent("#fbd5e5", "#9d174d"),
  B2: createAccent("#fff0b8", "#8a5200"),
};

const fallbackAccent = createAccent("#e2e8f0", "#0f172a");

export function getLevelAccent(level: string | null | undefined): LevelAccent {
  if (!level) {
    return fallbackAccent;
  }

  const normalized = level.trim().toUpperCase();
  return accentMap[normalized] ?? fallbackAccent;
}

export function getLessonColorScale(
  level: string | null | undefined,
  stepIndex: number,
  totalSteps: number,
): LessonColorScale {
  const accent = getLevelAccent(level);
  const base = accent.base;
  const safeTotal = Math.max(totalSteps, 1);
  const normalizedIndex = clamp(stepIndex, 0, safeTotal - 1);
  const ratio = safeTotal === 1 ? 0.5 : normalizedIndex / Math.max(safeTotal - 1, 1);

  const start = adjustLightness(base, clamp(0.22 + (1 - ratio) * 0.08, -0.45, 0.45));
  const end = adjustLightness(base, clamp(-0.12 - ratio * 0.14, -0.45, 0.1));
  const border = adjustLightness(base, clamp(-0.18 - ratio * 0.05, -0.45, 0.15));
  const text = ratio > 0.65 ? "#1e1b32" : adjustLightness(base, -0.6);

  return {
    background: `linear-gradient(135deg, ${start}, ${end})`,
    border,
    text,
  };
}
