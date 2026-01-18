/**
 * Alerts Tab - Service Disruptions & Alerts
 * Categorized by GTFS effect, filterable by cause, mode, and time
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Modal,
  RefreshControl,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AlertDetailModal } from '@/components/alerts';
import { LiveIndicator, LastUpdated } from '@/components/realtime';
import { useDisruptions } from '@/lib/api/alerts';
import { Skeleton } from '@/components/ui/skeleton';
import type { DisruptionAlert } from '@/lib/api/types';

/** TfNSW alert priority levels */
type AlertPriority = 'veryHigh' | 'high' | 'normal' | 'low' | 'veryLow';

/** Priority to numeric value for sorting (lower = more important) */
const PRIORITY_ORDER: Record<AlertPriority, number> = {
  veryHigh: 1,
  high: 2,
  normal: 3,
  low: 4,
  veryLow: 5,
};

type FilterCategory = 'all' | 'current' | 'upcoming';
type EffectFilter = 'all' | 'no_service' | 'significant_delays' | 'modified_service' | 'detour' | 'other';
type CauseFilter = 'all' | 'maintenance' | 'construction' | 'accident' | 'weather' | 'other';

// GTFS Effect categories - grouped by user impact
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
  stop_moved: {
    label: 'Stop Moved',
    shortLabel: 'Relocated',
    icon: 'location.slash.fill',
    bgLight: '#E3F2FD',
    bgDark: '#1E3A5F',
    textLight: '#1565C0',
    textDark: '#64B5F6',
    priority: 6,
  },
  additional_service: {
    label: 'Additional Service',
    shortLabel: 'Extra',
    icon: 'plus.circle.fill',
    bgLight: '#E8F5E9',
    bgDark: '#1B4D1E',
    textLight: '#2E7D32',
    textDark: '#81C784',
    priority: 7,
  },
  accessibility_issue: {
    label: 'Accessibility Issue',
    shortLabel: 'Access',
    icon: 'figure.roll',
    bgLight: '#F3E5F5',
    bgDark: '#3D1F47',
    textLight: '#7B1FA2',
    textDark: '#BA68C8',
    priority: 8,
  },
  no_effect: {
    label: 'Information',
    shortLabel: 'Info',
    icon: 'info.circle.fill',
    bgLight: '#F5F5F5',
    bgDark: '#424242',
    textLight: '#757575',
    textDark: '#BDBDBD',
    priority: 9,
  },
  unknown: {
    label: 'Other',
    shortLabel: 'Other',
    icon: 'questionmark.circle.fill',
    bgLight: '#F5F5F5',
    bgDark: '#424242',
    textLight: '#757575',
    textDark: '#BDBDBD',
    priority: 10,
  },
  other_effect: {
    label: 'Other Effect',
    shortLabel: 'Other',
    icon: 'questionmark.circle.fill',
    bgLight: '#F5F5F5',
    bgDark: '#424242',
    textLight: '#757575',
    textDark: '#BDBDBD',
    priority: 10,
  },
};

// GTFS Cause - human-readable labels
const CAUSE_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  other_cause: 'Other',
  technical_problem: 'Technical Issue',
  strike: 'Industrial Action',
  demonstration: 'Demonstration',
  accident: 'Accident',
  holiday: 'Holiday Schedule',
  weather: 'Weather',
  maintenance: 'Maintenance',
  construction: 'Construction',
  police_activity: 'Police Activity',
  medical_emergency: 'Medical Emergency',
};

interface AlertSection {
  title: string;
  effect: string;
  data: DisruptionAlert[];
}

export default function AlertsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  
  const [selectedAlert, setSelectedAlert] = useState<DisruptionAlert | null>(null);
  const [timeFilter, setTimeFilter] = useState<FilterCategory>('current');
  const [effectFilter, setEffectFilter] = useState<EffectFilter>('all');
  const [causeFilter, setCauseFilter] = useState<CauseFilter>('all');
  
  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useDisruptions();

  // Filter and categorize alerts by GTFS effect
  const filteredSections = useMemo(() => {
    const alerts = data?.alerts ?? [];
    const now = Date.now() / 1000; // Unix timestamp in seconds
    
    let filtered = alerts.filter(alert => {
      // Time filter
      if (timeFilter === 'current') {
        const isActive = alert.activePeriods?.some(period => {
          const start = period.start ?? 0;
          const end = period.end ?? Infinity;
          return now >= start && now <= end;
        });
        if (!isActive) return false;
      } else if (timeFilter === 'upcoming') {
        const isUpcoming = alert.activePeriods?.some(period => {
          const start = period.start ?? 0;
          return start > now;
        });
        if (!isUpcoming) return false;
      }
      
      // Effect filter (GTFS effect)
      if (effectFilter !== 'all') {
        if (effectFilter === 'other') {
          const majorEffects = ['no_service', 'significant_delays', 'modified_service', 'detour'];
          if (majorEffects.includes(alert.effect)) return false;
        } else if (alert.effect !== effectFilter) {
          return false;
        }
      }
      
      // Cause filter (GTFS cause)
      if (causeFilter !== 'all') {
        if (causeFilter === 'other') {
          const majorCauses = ['maintenance', 'construction', 'accident', 'weather'];
          if (majorCauses.includes(alert.cause)) return false;
        } else if (alert.cause !== causeFilter) {
          return false;
        }
      }
      
      return true;
    });

    // Sort all filtered alerts by TfNSW priority first (if available), then by effect priority
    // Note: priority field comes from backend /add_info endpoint
    const sortedFiltered = [...filtered].sort((a, b) => {
      // First sort by TfNSW priority (veryHigh > high > normal > low > veryLow)
      const aPriority = (a as DisruptionAlert & { priority?: AlertPriority }).priority;
      const bPriority = (b as DisruptionAlert & { priority?: AlertPriority }).priority;
      const priorityA = aPriority ? (PRIORITY_ORDER[aPriority] ?? 99) : 99;
      const priorityB = bPriority ? (PRIORITY_ORDER[bPriority] ?? 99) : 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Then by effect priority
      const effectPriorityA = EFFECT_CONFIG[a.effect]?.priority ?? 99;
      const effectPriorityB = EFFECT_CONFIG[b.effect]?.priority ?? 99;
      if (effectPriorityA !== effectPriorityB) return effectPriorityA - effectPriorityB;
      
      // Finally by updatedAt (most recent first)
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });

    // Group by effect (GTFS effect type)
    const effectGroups: Record<string, DisruptionAlert[]> = {};
    for (const alert of sortedFiltered) {
      const effect = alert.effect || 'unknown';
      if (!effectGroups[effect]) effectGroups[effect] = [];
      effectGroups[effect].push(alert);
    }

    // Convert to sections sorted by effect priority
    const sections: AlertSection[] = Object.entries(effectGroups)
      .sort(([a], [b]) => {
        const priorityA = EFFECT_CONFIG[a]?.priority ?? 99;
        const priorityB = EFFECT_CONFIG[b]?.priority ?? 99;
        return priorityA - priorityB;
      })
      .map(([effect, alerts]) => ({
        title: EFFECT_CONFIG[effect]?.label ?? 'Other Alerts',
        effect,
        data: alerts,
      }));

    return sections;
  }, [data?.alerts, timeFilter, effectFilter, causeFilter]);

  const totalFiltered = filteredSections.reduce((sum, s) => sum + s.data.length, 0);

  const renderSectionHeader = useCallback(({ section }: { section: AlertSection }) => {
    const config = EFFECT_CONFIG[section.effect] ?? EFFECT_CONFIG.unknown;
    const bgColor = colorScheme === 'light' ? config.bgLight : config.bgDark;
    const textColor = colorScheme === 'light' ? config.textLight : config.textDark;
    
    return (
      <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
        <IconSymbol name={config.icon as any} size={18} color={textColor} />
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {section.title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: textColor }]}>
          <Text style={styles.countText}>{section.data.length}</Text>
        </View>
      </View>
    );
  }, [colorScheme]);

  const renderItem = useCallback(({ item }: { item: DisruptionAlert }) => {
    return (
      <AlertCard 
        alert={item} 
        onPress={() => setSelectedAlert(item)} 
      />
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* Time Filter */}
          <FilterChip 
            label="Active Now" 
            isSelected={timeFilter === 'current'} 
            onPress={() => setTimeFilter('current')} 
          />
          <FilterChip 
            label="Upcoming" 
            isSelected={timeFilter === 'upcoming'} 
            onPress={() => setTimeFilter('upcoming')} 
          />
          <FilterChip 
            label="All Times" 
            isSelected={timeFilter === 'all'} 
            onPress={() => setTimeFilter('all')} 
          />
          <View style={styles.filterDivider} />
          {/* Effect Filter (GTFS effect) */}
          <FilterChip 
            label="Cancelled" 
            isSelected={effectFilter === 'no_service'} 
            onPress={() => setEffectFilter(effectFilter === 'no_service' ? 'all' : 'no_service')}
            effect="no_service"
          />
          <FilterChip 
            label="Delays" 
            isSelected={effectFilter === 'significant_delays'} 
            onPress={() => setEffectFilter(effectFilter === 'significant_delays' ? 'all' : 'significant_delays')}
            effect="significant_delays"
          />
          <FilterChip 
            label="Changed" 
            isSelected={effectFilter === 'modified_service'} 
            onPress={() => setEffectFilter(effectFilter === 'modified_service' ? 'all' : 'modified_service')}
            effect="modified_service"
          />
          <FilterChip 
            label="Detour" 
            isSelected={effectFilter === 'detour'} 
            onPress={() => setEffectFilter(effectFilter === 'detour' ? 'all' : 'detour')}
            effect="detour"
          />
          <View style={styles.filterDivider} />
          {/* Cause Filter (GTFS cause) */}
          <FilterChip 
            label="Trackwork" 
            isSelected={causeFilter === 'maintenance'} 
            onPress={() => setCauseFilter(causeFilter === 'maintenance' ? 'all' : 'maintenance')}
          />
          <FilterChip 
            label="Construction" 
            isSelected={causeFilter === 'construction'} 
            onPress={() => setCauseFilter(causeFilter === 'construction' ? 'all' : 'construction')}
          />
          <FilterChip 
            label="Weather" 
            isSelected={causeFilter === 'weather'} 
            onPress={() => setCauseFilter(causeFilter === 'weather' ? 'all' : 'weather')}
          />
        </ScrollView>
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.statusLeft}>
          <LiveIndicator isLive={!isLoading} size="sm" />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {totalFiltered} alert{totalFiltered !== 1 ? 's' : ''}
          </Text>
        </View>
        <LastUpdated dataUpdatedAt={dataUpdatedAt} />
      </View>

      {/* Alerts List */}
      {isLoading ? (
        <View style={styles.loading}>
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </View>
      ) : filteredSections.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.circle.fill" size={56} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            All Clear
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            {timeFilter === 'current' 
              ? 'No active disruptions right now'
              : timeFilter === 'upcoming'
                ? 'No upcoming disruptions scheduled'
                : 'No alerts matching your filters'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.tint}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}

      {/* Alert Detail Modal */}
      <Modal
        visible={selectedAlert !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedAlert && (
          <AlertDetailModal
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function FilterChip({ 
  label, 
  isSelected, 
  onPress,
  effect,
}: { 
  label: string; 
  isSelected: boolean; 
  onPress: () => void;
  effect?: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  let bgColor = isSelected ? colors.tint : colors.backgroundSecondary;
  let textColor = isSelected ? '#FFFFFF' : colors.text;
  
  // Use effect-specific color when selected
  if (effect && isSelected) {
    const config = EFFECT_CONFIG[effect];
    if (config) {
      bgColor = colorScheme === 'light' ? config.textLight : config.textDark;
    }
  }

  return (
    <Pressable
      style={[styles.filterChip, { backgroundColor: bgColor }]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AlertCard({ 
  alert, 
  onPress 
}: { 
  alert: DisruptionAlert; 
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const effectConfig = EFFECT_CONFIG[alert.effect] ?? EFFECT_CONFIG.unknown;
  
  const accentColor = colorScheme === 'light' ? effectConfig.textLight : effectConfig.textDark;
  const bgColor = colorScheme === 'light' ? effectConfig.bgLight : effectConfig.bgDark;

  // Format affected routes concisely
  const routesSummary = alert.affectedRoutes?.slice(0, 4).join(', ') || 'Various services';
  const moreRoutes = (alert.affectedRoutes?.length ?? 0) > 4 
    ? ` +${(alert.affectedRoutes?.length ?? 0) - 4} more` 
    : '';
  
  // Human-readable cause
  const causeLabel = CAUSE_LABELS[alert.cause] ?? '';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.alertCard,
        { 
          backgroundColor: colors.card,
          borderLeftColor: accentColor,
        },
        pressed && styles.alertCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.alertHeader}>
        <View style={[styles.effectBadge, { backgroundColor: bgColor }]}>
          <IconSymbol name={effectConfig.icon as any} size={12} color={accentColor} />
          <Text style={[styles.effectBadgeText, { color: accentColor }]}>
            {effectConfig.shortLabel}
          </Text>
        </View>
        {causeLabel && (
          <Text style={[styles.causeBadge, { color: colors.textMuted }]}>
            {causeLabel}
          </Text>
        )}
      </View>
      
      <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={2}>
        {alert.title}
      </Text>
      
      <View style={styles.alertMeta}>
        <Text style={[styles.alertRoutes, { color: colors.textSecondary }]} numberOfLines={1}>
          {routesSummary}{moreRoutes}
        </Text>
        <IconSymbol name="chevron.right" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function AlertSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={80} height={14} />
      </View>
      <Skeleton width="90%" height={18} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  itemSeparator: {
    height: 1,
  },
  sectionSeparator: {
    height: 8,
  },
  alertCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  alertCardPressed: {
    opacity: 0.9,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  effectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  causeBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  alertRoutes: {
    flex: 1,
    fontSize: 13,
  },
  loading: {
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
