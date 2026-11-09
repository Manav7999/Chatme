// Theme & Customization Configuration and Helpers for ChatMe

export const DEFAULT_THEME_SETTINGS = {
  theme: 'dark', // 'dark' | 'light'
  simulationSpeed: 'fast',
  soundEnabled: true,
  notificationsEnabled: false,
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

// Background gradient presets
export const BACKGROUND_GRADIENT_PRESETS = [
  {
    name: 'Dark Aurora',
    gradient: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)',
    preview: '#1e1b4b'
  },
  {
    name: 'Sunset Embers',
    gradient: 'linear-gradient(135deg, #18181b 0%, #431407 100%)',
    preview: '#431407'
  },
  {
    name: 'Cyber Matrix',
    gradient: 'linear-gradient(135deg, #022c22 0%, #0f172a 100%)',
    preview: '#022c22'
  },
  {
    name: 'Violet Dream',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #09090b 100%)',
    preview: '#2e1065'
  },
  {
    name: 'Clean Light Silk',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    preview: '#e2e8f0'
  },
  {
    name: 'Warm Sunset Light',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    preview: '#ffedd5'
  },
  {
    name: 'Sky Glass',
    gradient: 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
    preview: '#dbeafe'
  },
  {
    name: 'Pastel Lilac',
    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    preview: '#f3e8ff'
  }
];

/**
 * Calculates optimal text color (#000000 or #FFFFFF) for contrast against any background color
 */
export function getReadableTextColor(hex) {
  if (!hex || hex === 'transparent') return '#FFFFFF';
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length < 3) return '#FFFFFF';

  let r;
  let g;
  let b;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  }

  // YIQ luminance formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 140 ? '#000000' : '#FFFFFF';
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

