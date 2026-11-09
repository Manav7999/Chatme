// Theme & Customization Configuration and Helpers for ChatMe

export const DEFAULT_THEME_SETTINGS = {
  theme: 'dark', // 'dark' | 'light'
  simulationSpeed: 'fast',
  soundEnabled: true,
  notificationsEnabled: false,
  accentColor: '#FCC105', // Adaptive accent color: drives buttons, icons, and highlights
  chatBackground: {
    type: 'default', // 'default' | 'color' | 'image' | 'gradient'
    color: '#000000',
    gradient: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)',
    imageUrl: '',
    imageOpacity: 0.85,
    imageBlur: 0,
    pattern: false
  },
  bubbleStyle: {
    shape: 'modern', // 'modern' | 'pill' | 'sharp' | 'tail' | 'cyber'
    outgoingBg: '#FCC105',
    outgoingText: '#000000',
    incomingBg: '', // empty string means auto-adapt by theme
    incomingText: '',
  }
};

// Available Bubble Shapes
export const BUBBLE_SHAPES = [
  {
    id: 'modern',
    name: 'Modern Notch',
    description: 'Sleek rounded curves with subtle message notch',
    outgoingClass: 'rounded-2xl rounded-tr-xs',
    incomingClass: 'rounded-2xl rounded-tl-xs'
  },
  {
    id: 'pill',
    name: 'Soft Capsule',
    description: 'Ultra-smooth rounded pill design',
    outgoingClass: 'rounded-3xl',
    incomingClass: 'rounded-3xl'
  },
  {
    id: 'sharp',
    name: 'Minimal Sharp',
    description: 'Clean architectural subtle corners',
    outgoingClass: 'rounded-lg',
    incomingClass: 'rounded-lg'
  },
  {
    id: 'tail',
    name: 'Classic Tail',
    description: 'Speech bubble with distinctive corner tail',
    outgoingClass: 'rounded-2xl rounded-br-none',
    incomingClass: 'rounded-2xl rounded-bl-none'
  },
  {
    id: 'cyber',
    name: 'Cyber Cut',
    description: 'Futuristic angular edges with accent border',
    outgoingClass: 'rounded-sm border-r-4',
    incomingClass: 'rounded-sm border-l-4'
  }
];

// Presets for Outgoing (Sent) bubble colors
export const OUTGOING_COLOR_PRESETS = [
  { name: 'ChatMe Yellow', color: '#FCC105' },
  { name: 'Royal Blue', color: '#2563EB' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Neon Violet', color: '#8B5CF6' },
  { name: 'Sunset Coral', color: '#F43F5E' },
  { name: 'Vibrant Orange', color: '#EA580C' },
  { name: 'Cyan Wave', color: '#06B6D4' },
  { name: 'Dark Slate', color: '#1E293B' },
  { name: 'Pure White', color: '#FFFFFF' }
];

// Presets for Incoming (Received) bubble colors
export const INCOMING_COLOR_PRESETS = [
  { name: 'Auto (By Theme)', color: '' },
  { name: 'Dark Surface', color: '#1A1A1A' },
  { name: 'Deep Slate', color: '#1E293B' },
  { name: 'Midnight Charcoal', color: '#27272A' },
  { name: 'Clean White', color: '#FFFFFF' },
  { name: 'Light Slate', color: '#F1F5F9' },
  { name: 'Soft Mint', color: '#ECFDF5' },
  { name: 'Soft Violet', color: '#F5F3FF' },
  { name: 'Soft Amber', color: '#FEF3C7' }
];

// Background solid color presets
export const BACKGROUND_COLOR_PRESETS = [
  { name: 'Default App', color: '' },
  { name: 'Pitch Black', color: '#000000' },
  { name: 'Abyss Navy', color: '#0B132B' },
  { name: 'Deep Slate', color: '#0F172A' },
  { name: 'Emerald Night', color: '#064E3B' },
  { name: 'Midnight Plum', color: '#2E1065' },
  { name: 'Wine Velvet', color: '#3B0712' },
  { name: 'Pure White', color: '#FFFFFF' },
  { name: 'Soft Off-White', color: '#F8FAFC' },
  { name: 'Warm Cream', color: '#FEFCE8' },
  { name: 'Fresh Mint', color: '#F0FDF4' },
  { name: 'Sky Tint', color: '#F0F9FF' },
  { name: 'Rose Tint', color: '#FFF1F2' }
];

// Background gradient presets with matched harmonious accents
export const BACKGROUND_GRADIENT_PRESETS = [
  {
    name: 'Dark Aurora',
    gradient: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)',
    preview: '#1e1b4b',
    accent: '#818CF8'
  },
  {
    name: 'Sunset Embers',
    gradient: 'linear-gradient(135deg, #18181b 0%, #431407 100%)',
    preview: '#431407',
    accent: '#FB923C'
  },
  {
    name: 'Cyber Matrix',
    gradient: 'linear-gradient(135deg, #022c22 0%, #0f172a 100%)',
    preview: '#022c22',
    accent: '#34D399'
  },
  {
    name: 'Violet Dream',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #09090b 100%)',
    preview: '#2e1065',
    accent: '#C084FC'
  },
  {
    name: 'Clean Light Silk',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    preview: '#e2e8f0',
    accent: '#2563EB'
  },
  {
    name: 'Warm Sunset Light',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    preview: '#ffedd5',
    accent: '#EA580C'
  },
  {
    name: 'Sky Glass',
    gradient: 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
    preview: '#dbeafe',
    accent: '#0284C7'
  },
  {
    name: 'Pastel Lilac',
    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    preview: '#f3e8ff',
    accent: '#7C3AED'
  }
];

// Color Math & Conversion Helpers
export const hexToRgb = (hex) => {
  if (!hex || hex === 'transparent') return [0, 0, 0];
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16) || 0,
    parseInt(clean.substring(2, 4), 16) || 0,
    parseInt(clean.substring(4, 6), 16) || 0
  ];
};

export const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
};

export const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
};

export const hslToRgb = (h, s, l) => {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

/**
 * Calculates optimal text color (#000000 or #FFFFFF) for contrast against any background color
 */
export function getReadableTextColor(hex) {
  if (!hex || hex === 'transparent') return '#FFFFFF';
  const [r, g, b] = hexToRgb(hex);
  // YIQ luminance formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 140 ? '#000000' : '#FFFFFF';
}

/**
 * Derives a vibrant, harmonious accent color from any background color
 */
export function deriveHarmoniousAccentFromColor(hex) {
  if (!hex || hex === 'transparent') return '#FCC105';
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // If low saturation (pure black, gray, white)
  if (s < 0.15) {
    if (l < 0.3) return '#FCC105'; // Classic ChatMe yellow for dark backgrounds
    if (l > 0.7) return '#2563EB'; // Royal blue for clean white
    return '#FCC105';
  }

  // Dark background: boost saturation and set optimal glowing lightness
  if (l < 0.35) {
    const rgb = hslToRgb(h, Math.max(s, 0.85), 0.58);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }

  // Light background: boost saturation, keep lightness deep for readable contrast
  if (l > 0.65) {
    const rgb = hslToRgb(h, Math.max(s, 0.85), 0.40);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }

  // Midtone: high-contrast complementary hue
  const targetL = l > 0.5 ? 0.28 : 0.72;
  const rgb = hslToRgb((h + 180) % 360, Math.max(s, 0.85), targetL);
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

/**
 * Derives harmonious accent from gradient
 */
export function derivePaletteFromGradient(gradientOrName) {
  if (!gradientOrName) return '#FCC105';
  const found = BACKGROUND_GRADIENT_PRESETS.find(
    g => g.name === gradientOrName || g.gradient === gradientOrName
  );
  if (found && found.accent) return found.accent;
  return '#FCC105';
}

/**
 * Scans image pixel data to extract the most vibrant, visually dominant accent color
 */
export function extractVibrantColorFromPixels(rgbaData) {
  const buckets = Array.from({ length: 12 }, () => ({
    count: 0,
    score: 0,
    rSum: 0,
    gSum: 0,
    bSum: 0,
    maxSat: 0,
    bestRgb: null
  }));

  let totalL = 0;
  let totalPixels = 0;

  for (let i = 0; i < rgbaData.length; i += 4) {
    const r = rgbaData[i];
    const g = rgbaData[i + 1];
    const b = rgbaData[i + 2];
    const a = rgbaData[i + 3];
    if (a < 128) continue;

    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    const l = (max + min) / 2;
    totalL += l;
    totalPixels++;

    if (max === min) continue; // Grayscale
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    // Skip washed out or extreme black/white
    if (s < 0.20 || l < 0.12 || l > 0.90) continue;

    let h = 0;
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h = (h / 6) * 360;

    const bucketIdx = Math.floor(((h + 15) % 360) / 30);
    // Weight saturation and target lightness around 0.55 for vivid punch
    const weight = (s * 2.5) + (1 - Math.abs(l - 0.55)) * 1.5;

    const bucket = buckets[bucketIdx];
    bucket.count++;
    bucket.score += weight;
    bucket.rSum += r;
    bucket.gSum += g;
    bucket.bSum += b;
    if (s > bucket.maxSat) {
      bucket.maxSat = s;
      bucket.bestRgb = [r, g, b];
    }
  }

  let bestBucket = null;
  let maxScore = 0;
  for (const b of buckets) {
    if (b.score > maxScore) {
      maxScore = b.score;
      bestBucket = b;
    }
  }

  const avgL = totalPixels > 0 ? totalL / totalPixels : 0.5;

  if (!bestBucket || bestBucket.count < 4) {
    return avgL > 0.5 ? '#2563EB' : '#FCC105';
  }

  const [r, g, b] = bestBucket.bestRgb || [
    Math.round(bestBucket.rSum / bestBucket.count),
    Math.round(bestBucket.gSum / bestBucket.count),
    Math.round(bestBucket.bSum / bestBucket.count)
  ];

  return rgbToHex(r, g, b);
}

/**
 * Loads image into offscreen canvas and extracts its signature vibrant accent
 */
export function extractPaletteFromImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl || typeof window === 'undefined') return resolve('#FCC105');
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64).data;
        const accent = extractVibrantColorFromPixels(imgData);
        resolve(accent);
      } catch (err) {
        console.warn('extractPaletteFromImage fallback:', err);
        resolve('#FCC105');
      }
    };
    img.onerror = () => resolve('#FCC105');
    img.src = imageUrl;
  });
}

/**
 * Compresses and scales local storage wallpaper image to fit safely within browser storage quota
 */
export function compressWallpaperImage(file, maxWidth = 1600, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result); // fallback to raw data
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Apply theme attribute to document element and body
 */
export function applyThemeToDocument(theme = 'dark') {
  if (typeof document === 'undefined') return;
  const isLight = theme === 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  if (isLight) {
    document.documentElement.classList.add('light');
    document.body.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.body.classList.remove('light');
  }
}
