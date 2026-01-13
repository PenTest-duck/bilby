/**
 * Trip Alerts Component
 * Shows alerts relevant to a specific journey, categorized by GTFS effect
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { DisruptionAlert, RankedJourney } from '@/lib/api/types';

interface TripAlertsProps {
  journey: RankedJourney;
  onAlertPress?: (alert: DisruptionAlert) => void;
  compact?: boolean;
}

// GTFS Effect config - matches alerts.tsx
const EFFECT_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  icon: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  priority: number;
}> = {
  no_service: {
    label: 'No Service',
    shortLabel: 'Cancelled',
    icon: 'xmark.octagon.fill',
    bgLight: '#FFEBEE',
    bgDark: '#4A1515',
    textLight: '#C62828',
    textDark: '#EF5350',
    priority: 1,
  },
  reduced_service: {
    label: 'Reduced Service',
    shortLabel: 'Reduced',
    icon: 'minus.circle.fill',
    bgLight: '#FFEBEE',
    bgDark: '#4A1515',
    textLight: '#C62828',
    textDark: '#EF5350',
    priority: 2,
  },
  significant_delays: {
    label: 'Significant Delays',
    shortLabel: 'Delays',
    icon: 'clock.badge.exclamationmark.fill',
    bgLight: '#FFF3E0',
    bgDark: '#4A3000',
    textLight: '#E65100',
    textDark: '#FFB74D',
    priority: 3,
  },
  detour: {
    label: 'Detour',
    shortLabel: 'Detour',
    icon: 'arrow.triangle.swap',
    bgLight: '#FFF3E0',
    bgDark: '#4A3000',
    textLight: '#E65100',
    textDark: '#FFB74D',
    priority: 4,
  },
  modified_service: {
    label: 'Modified Service',
    shortLabel: 'Changed',
    icon: 'arrow.triangle.2.circlepath',
    bgLight: '#E3F2FD',
    bgDark: '#1E3A5F',
    textLight: '#1565C0',
    textDark: '#64B5F6',
    priority: 5,
  },
  unknown: {
    label: 'Service Alert',
    shortLabel: 'Alert',
    icon: 'exclamationmark.triangle.fill',
    bgLight: '#F5F5F5',
    bgDark: '#424242',
    textLight: '#757575',
    textDark: '#BDBDBD',
    priority: 10,
  },
};

// GTFS Cause - human-readable labels
const CAUSE_LABELS: Record<string, string> = {
  unknown: '',
  other_cause: '',
  technical_problem: 'Technical Issue',
  strike: 'Industrial Action',
  demonstration: 'Demonstration',
  accident: 'Accident',
  holiday: 'Holiday Schedule',
  weather: 'Weather',
  maintenance: 'Trackwork',
  construction: 'Construction',
  police_activity: 'Police Activity',
  medical_emergency: 'Medical Emergency',
};

export function TripAlerts({ journey, onAlertPress, compact = false }: TripAlertsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const alerts = journey.alerts ?? [];
  
  if (alerts.length === 0) {
    return null;
  }

  // Sort alerts by effect priority (most severe first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityA = EFFECT_CONFIG[a.effect]?.priority ?? 99;
    const priorityB = EFFECT_CONFIG[b.effect]?.priority ?? 99;
    return priorityA - priorityB;
  });

  // Get highest priority effect for compact banner
  const highestEffect = sortedAlerts[0]?.effect ?? 'unknown';
  const config = EFFECT_CONFIG[highestEffect] ?? EFFECT_CONFIG.unknown;

  // In compact mode, just show a summary banner
  if (compact) {
    const bgColor = colorScheme === 'light' ? config.bgLight : config.bgDark;
    const textColor = colorScheme === 'light' ? config.textLight : config.textDark;

    return (
      <View style={[styles.compactBanner, { backgroundColor: bgColor }]}>
        <IconSymbol name={config.icon as any} size={16} color={textColor} />
        <Text style={[styles.compactText, { color: textColor }]} numberOfLines={1}>
          {alerts.length} alert{alerts.length > 1 ? 's' : ''} affecting this trip
        </Text>
        <IconSymbol name="chevron.right" size={14} color={textColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.delayed} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Alerts for this trip
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.delayed }]}>
          <Text style={styles.countText}>{alerts.length}</Text>
        </View>
      </View>

      {sortedAlerts.map(alert => (
        <AlertItem 
          key={alert.id} 
          alert={alert} 
          onPress={onAlertPress} 
        />
      ))}
    </View>
  );
}

function AlertItem({ 
  alert, 
  onPress 
}: { 
  alert: DisruptionAlert; 
  onPress?: (alert: DisruptionAlert) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const config = EFFECT_CONFIG[alert.effect] ?? EFFECT_CONFIG.unknown;
  const causeLabel = CAUSE_LABELS[alert.cause] ?? '';
  
  const bgColor = colorScheme === 'light' ? config.bgLight : config.bgDark;
  const textColor = colorScheme === 'light' ? config.textLight : config.textDark;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.alertItem,
        { backgroundColor: bgColor },
        pressed && styles.alertItemPressed,
      ]}
      onPress={() => onPress?.(alert)}
    >
      <View style={styles.alertIconContainer}>
        <IconSymbol name={config.icon as any} size={20} color={textColor} />
      </View>
      <View style={styles.alertContent}>
        <Text style={[styles.alertLabel, { color: textColor }]}>
          {config.shortLabel}
        </Text>
        <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={2}>
          {alert.title}
        </Text>
        {causeLabel && (
          <Text style={[styles.alertCause, { color: colors.textSecondary }]} numberOfLines={1}>
            {causeLabel}
          </Text>
        )}
      </View>
      {onPress && (
        <IconSymbol name="chevron.right" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  alertItemPressed: {
    opacity: 0.9,
  },
  alertIconContainer: {
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  alertCause: {
    fontSize: 12,
    marginTop: 2,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
