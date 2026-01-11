/**
 * Bilby Design System
 * Colors, typography, and spacing tokens
 */

import { Platform } from 'react-native';

/** TfNSW Transport Mode Colors */
export const TransportColors = {
  train: '#F6891F',
  metro: '#009B77',
  bus: '#00B5EF',
  ferry: '#5AB031',
  lightRail: '#EE343F',
  coach: '#742283',
  schoolBus: '#FDD835',
  walking: '#666666',
} as const;

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
