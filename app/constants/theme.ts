/**
 * Bilby Design System
 * Colors, typography, and spacing tokens
 */

import { Platform } from 'react-native';

/** TfNSW Transport Mode Colors (from official colour chart) */
export const TransportColors = {
  train: '#F6891F',      // Regional trains - PMS 151C
  metro: '#168388',      // M1 Metro - PMS 321
  bus: '#00B5EF',        // Sydney Buses
  ferry: '#5AB031',      // F10 default - PMS 361C
  lightRail: '#EE343F',  // Newcastle Light Rail - PMS 185C
  coach: '#732A82',      // Regional Coaches - PMS 7657C
  schoolBus: '#FDD835',
  walking: '#666666',
} as const;

/** Per-line colors for Sydney Trains */
export const TrainLineColors: Record<string, string> = {
  'T1': '#F99D1C',  // PMS 137C
  'T2': '#0098CD',  // PMS 801C
  'T3': '#F37021',  // PMS 158C
  'T4': '#005AA3',  // PMS 2935C
  'T5': '#C4258F',  // PMS 2395C
  'T6': '#7C3E21',  // PMS 1685C
  'T7': '#6F818E',  // PMS 7544C
  'T8': '#00954C',  // PMS 355C
  'T9': '#D11F2F',  // PMS 186C
};

/** Per-line colors for Intercity Trains */
export const IntercityLineColors: Record<string, string> = {
  'BMT': '#F99D1C',  // Blue Mountains - PMS 137C
  'CCN': '#D11F2F',  // Central Coast & Newcastle - PMS 186C
  'HUN': '#833134',  // Hunter - PMS 491C
  'SCO': '#005AA3',  // South Coast - PMS 2935C
  'SHL': '#00954C',  // Southern Highlands - PMS 355C
};

/** Per-line colors for Sydney Ferries */
export const FerryLineColors: Record<string, string> = {
  'F1': '#00774B',   // Manly - PMS 3415C
  'F2': '#144734',   // Taronga Zoo - PMS 3435C
  'F3': '#648C3C',   // Parramatta River - PMS 375C
  'F4': '#BFD730',   // Pyrmont Bay
  'F5': '#286142',   // Neutral Bay - PMS 7734C
  'F6': '#00AB51',   // Mosman Bay - PMS 7481C
  'F7': '#00B189',   // Double Bay - PMS 339C
  'F8': '#55622B',   // Cockatoo Island - PMS 371C
  'F9': '#65B32E',   // Watsons Bay
  'F10': '#5AB031',  // Blackwattle Bay - PMS 361C
};

/** Per-line colors for Light Rail */
export const LightRailLineColors: Record<string, string> = {
  'L1': '#BE1622',   // Dulwich Hill - PMS 200C
  'L2': '#DD1E25',   // Randwick - PMS 185C
  'L3': '#781140',   // Kingsford - PMS 216C
  'L4': '#BB2043',   // Westmead & Carlingford - PMS 7636C
  'NLR': '#EE343F',  // Newcastle - PMS 185C
};

/** Primary brand color - TfNSW blue */
const primaryLight = '#0078C8';
const primaryDark = '#4DA3E0';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    textMuted: '#9BA1A6',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F6F7',
    backgroundTertiary: '#EBEDEF',
    tint: primaryLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primaryLight,
    border: '#E1E4E8',
    card: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    realtime: '#22C55E',
    delayed: '#F59E0B',
    cancelled: '#EF4444',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textMuted: '#687076',
    background: '#0D0D0D',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#262626',
    tint: primaryDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryDark,
    border: '#333333',
    card: '#1A1A1A',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    realtime: '#22C55E',
    delayed: '#F59E0B',
    cancelled: '#EF4444',
  },
};

export type ColorScheme = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
