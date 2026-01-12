/**
 * Alert Banner Component
 * Full-width disruption alert banner
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Alert } from '@/lib/api/types';

interface AlertBannerProps {
  alert: Alert;
  onPress?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  info: {
    icon: 'info.circle.fill',
    bgLight: '#E3F2FD',
    bgDark: '#1E3A5F',
    textLight: '#1565C0',
    textDark: '#64B5F6',
  },
  warning: {
    icon: 'exclamationmark.triangle.fill',
    bgLight: '#FFF3E0',
    bgDark: '#4A3000',
    textLight: '#E65100',
    textDark: '#FFB74D',
  },
  severe: {
    icon: 'exclamationmark.octagon.fill',
    bgLight: '#FFEBEE',
    bgDark: '#4A0000',
    textLight: '#C62828',
    textDark: '#EF5350',
  },
  unknown: {
    icon: 'questionmark.circle.fill',
    bgLight: '#F5F5F5',
    bgDark: '#424242',
    textLight: '#757575',
    textDark: '#BDBDBD',
  },
};

export function AlertBanner({ 
  alert, 
  onPress, 
  onDismiss,
  compact = false,
}: AlertBannerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const severity = alert.severity as keyof typeof SEVERITY_CONFIG;
  const config = SEVERITY_CONFIG[severity];

  const bgColor = colorScheme === 'light' ? config.bgLight : config.bgDark;
  const textColor = colorScheme === 'light' ? config.textLight : config.textDark;

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: bgColor },
        compact && styles.compact,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <IconSymbol 
          name={config.icon as any} 
          size={compact ? 18 : 22} 
          color={textColor} 
        />
      </View>
      
      <View style={styles.content}>
        <Text 
          style={[styles.title, { color: textColor }]}
          numberOfLines={compact ? 1 : 2}
        >
          {alert.title}
        </Text>
        {!compact && alert.description && (
          <Text 
            style={[styles.description, { color: textColor }]}
            numberOfLines={2}
          >
            {alert.description}
          </Text>
        )}
      </View>

      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.dismissButton}>
          <IconSymbol name="xmark" size={16} color={textColor} />
        </Pressable>
      ) : onPress ? (
        <IconSymbol name="chevron.right" size={16} color={textColor} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  compact: {
    padding: 10,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  dismissButton: {
    padding: 4,
  },
});
