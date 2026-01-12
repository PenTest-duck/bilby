/**
 * Alert Detail Modal
 * Full alert information with recommendations
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/ui/button';
import type { Alert } from '@/lib/api/types';

interface AlertDetailModalProps {
  alert: Alert;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  info: {
    icon: 'info.circle.fill',
    title: 'Service Update',
    bgLight: '#E3F2FD',
    bgDark: '#1E3A5F',
    textLight: '#1565C0',
    textDark: '#64B5F6',
  },
  warning: {
    icon: 'exclamationmark.triangle.fill',
    title: 'Service Disruption',
    bgLight: '#FFF3E0',
    bgDark: '#4A3000',
    textLight: '#E65100',
    textDark: '#FFB74D',
  },
  severe: {
    icon: 'exclamationmark.octagon.fill',
    title: 'Major Disruption',
    bgLight: '#FFEBEE',
    bgDark: '#4A0000',
    textLight: '#C62828',
    textDark: '#EF5350',
  },
};

export function AlertDetailModal({ alert, onClose }: AlertDetailModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const config = SEVERITY_CONFIG[alert.severity];

  const bgColor = colorScheme === 'light' ? config.bgLight : config.bgDark;
  const accentColor = colorScheme === 'light' ? config.textLight : config.textDark;

  const handleMoreInfo = () => {
    if (alert.url) {
      Linking.openURL(alert.url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <View style={styles.headerContent}>
          <IconSymbol name={config.icon as any} size={28} color={accentColor} />
          <Text style={[styles.headerTitle, { color: accentColor }]}>
            {config.title}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <IconSymbol name="xmark.circle.fill" size={28} color={accentColor} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Main Alert */}
        <Text style={[styles.title, { color: colors.text }]}>
          {alert.title}
        </Text>

        {alert.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {alert.description}
          </Text>
        )}

        {/* Cause */}
        {alert.cause && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              What&apos;s happening
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {alert.cause}
            </Text>
          </View>
        )}

        {/* Effect */}
        {alert.effect && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Impact
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {alert.effect}
            </Text>
          </View>
        )}

        {/* Affected Routes */}
        {alert.affectedRoutes && alert.affectedRoutes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Affected services
            </Text>
            <View style={styles.routesList}>
              {alert.affectedRoutes.map((route, index) => (
                <View 
                  key={index} 
                  style={[styles.routeBadge, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <Text style={[styles.routeText, { color: colors.text }]}>
                    {route}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Active Period */}
        {alert.activePeriods && alert.activePeriods.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              When
            </Text>
            {alert.activePeriods.map((period, index) => (
              <Text 
                key={index} 
                style={[styles.sectionText, { color: colors.textSecondary }]}
              >
                {formatPeriod(period)}
              </Text>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {alert.url && (
            <Button
              title="More Information"
              variant="secondary"
              onPress={handleMoreInfo}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatPeriod(period: { start: string; end?: string }): string {
  const start = new Date(period.start);
  const startStr = start.toLocaleDateString('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!period.end) {
    return `From ${startStr}`;
  }

  const end = new Date(period.end);
  const endStr = end.toLocaleDateString('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${startStr} – ${endStr}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  routesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
});
