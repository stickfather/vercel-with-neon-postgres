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
    background: withAlpha(base, 0.18),
    chipBackground: withAlpha(base, 0.26),
  };
}

const accentMap: Record<string, LevelAccent> = {
  A1: createAccent("#16a34a", "#14532d"),
  A2: createAccent("#2563eb", "#1e3a8a"),
  B1: createAccent("#f97316", "#7c2d12"),
  "B1+": createAccent("#ec4899", "#831843"),
  B2: createAccent("#f59e0b", "#78350f"),
};

const fallbackAccent = createAccent("#64748b", "#0f172a");

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
  const ratio = safeTotal === 1 ? 0.5 : normalizedIndex / (safeTotal - 1 || 1);

  const lightBoost = 0.45 - ratio * 0.25;
  const darkBoost = 0.18 + ratio * 0.22;
  const start = adjustLightness(base, clamp(lightBoost, -0.45, 0.45));
  const end = adjustLightness(base, clamp(-darkBoost, -0.45, 0.1));
  const border = adjustLightness(base, -0.25 + ratio * -0.05);
  const text = ratio > 0.6 ? "#ffffff" : adjustLightness(base, -0.55);

  return {
    background: `linear-gradient(135deg, ${start}, ${end})`,
    border,
    text,
  };
}
