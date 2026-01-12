/**
 * Alert Badge Component
 * Compact severity indicator for inline use
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Alert } from '@/lib/api/types';

interface AlertBadgeProps {
  severity: Alert['severity'];
  count?: number;
  onPress?: () => void;
}

const SEVERITY_COLORS = {
  info: { light: '#1565C0', dark: '#64B5F6' },
  warning: { light: '#E65100', dark: '#FFB74D' },
  severe: { light: '#C62828', dark: '#EF5350' },
  unknown: { light: '#757575', dark: '#BDBDBD' },
};

const SEVERITY_ICONS = {
  info: 'info.circle.fill',
  warning: 'exclamationmark.triangle.fill',
  severe: 'exclamationmark.octagon.fill',
  unknown: 'questionmark.circle.fill',
};

export function AlertBadge({ severity, count, onPress }: AlertBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const sev = severity as keyof typeof SEVERITY_COLORS;
  const color = SEVERITY_COLORS[sev][colorScheme];

  const content = (
    <View style={styles.container}>
      <IconSymbol name={SEVERITY_ICONS[severity] as any} size={14} color={color} />
      {count !== undefined && count > 0 && (
        <Text style={[styles.count, { color }]}>{count}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return content;
}

interface AlertCountBadgeProps {
  alerts: Alert[];
  onPress?: () => void;
}

export function AlertCountBadge({ alerts, onPress }: AlertCountBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';

  if (alerts.length === 0) return null;

  // Get highest severity
  const hasSevere = alerts.some(a => a.severity === 'severe');
  const hasWarning = alerts.some(a => a.severity === 'warning');
  const severity = hasSevere ? 'severe' : hasWarning ? 'warning' : 'info';
  const color = SEVERITY_COLORS[severity][colorScheme];

  const content = (
    <View style={[styles.countBadge, { backgroundColor: color }]}>
      <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FFFFFF" />
      <Text style={styles.countBadgeText}>{alerts.length}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
