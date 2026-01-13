/**
 * Route Detail Modal
 * Shows full route details when clicking a departure
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LineBadge } from '@/components/transport/line-badge';
import { formatTime, formatRelativeTime } from '@/lib/date';
import type { Departure } from '@/lib/api/types';

interface RouteDetailModalProps {
  departure: Departure;
  onClose: () => void;
}

interface OnwardLocation {
  id?: string;
  name?: string;
  disassembledName?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  platform?: string;
  properties?: Record<string, unknown>;
}

export function RouteDetailModal({ departure, onClose }: RouteDetailModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const modeId = departure.transportation?.product?.class || 5;
  const lineNumber = departure.transportation?.number || 
                     departure.transportation?.disassembledName || '';
  const lineName = departure.transportation?.name || '';
  const destination = departure.transportation?.destination?.name || 'Unknown';
  const platform = departure.platform;
  
  // Get onward locations from properties (TfNSW API structure)
  const onwardLocations = (departure.properties?.onwardLocations || 
                          departure.properties?.stopSequence || 
                          []) as OnwardLocation[];
  
  // Current stop info
  const currentStop = departure.location;
  const currentDepartureTime = departure.departureTimeEstimated || departure.departureTimePlanned;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <LineBadge line={lineNumber} modeId={modeId} size="lg" />
          <View style={styles.headerInfo}>
            <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={1}>
              {lineName || `${lineNumber} to ${destination}`}
            </Text>
            <Text style={[styles.destination, { color: colors.textSecondary }]}>
              to {destination}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark.circle.fill" size={28} color={colors.textMuted} />
          </Pressable>
        </View>
        
        {platform && (
          <View style={[styles.platformBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.platformText, { color: colors.text }]}>
              Platform {platform}
            </Text>
          </View>
        )}
      </View>

      {/* Route Stops */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Route Stops
        </Text>
        
        {/* Current Stop (Origin) */}
        <StopItem
          name={currentStop?.disassembledName || currentStop?.name || 'Current Stop'}
          time={currentDepartureTime}
          isCurrent
          isFirst
        />
        
        {/* Onward Stops */}
        {onwardLocations.map((stop, index) => (
          <StopItem
            key={stop.id || index}
            name={stop.disassembledName || stop.name || 'Unknown Stop'}
            time={stop.arrivalTimeEstimated || stop.arrivalTimePlanned}
            platform={stop.platform}
            isLast={index === onwardLocations.length - 1}
          />
        ))}
        
        {onwardLocations.length === 0 && (
          <View style={styles.noStopsMessage}>
            <IconSymbol name="info.circle" size={24} color={colors.textMuted} />
            <Text style={[styles.noStopsText, { color: colors.textSecondary }]}>
              Detailed stop information is not available for this service.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StopItem({ 
  name, 
  time, 
  platform,
  isCurrent = false,
  isFirst = false,
  isLast = false,
}: { 
  name: string;
  time?: string;
  platform?: string;
  isCurrent?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const formattedTime = time ? formatTime(time) : '--:--';
  const relativeTime = time ? formatRelativeTime(time) : '';
  const isPast = time ? new Date(time) < new Date() : false;

  return (
    <View style={styles.stopItem}>
      {/* Timeline */}
      <View style={styles.timeline}>
        {!isFirst && (
          <View style={[
            styles.timelineLine, 
            styles.timelineLineTop,
            { backgroundColor: isPast && !isCurrent ? colors.textMuted : colors.tint }
          ]} />
        )}
        <View style={[
          styles.timelineDot,
          isCurrent && styles.timelineDotCurrent,
          { 
            backgroundColor: isCurrent ? colors.tint : isPast ? colors.textMuted : colors.border,
            borderColor: isCurrent ? colors.tint : colors.border,
          }
        ]} />
        {!isLast && (
          <View style={[
            styles.timelineLine, 
            styles.timelineLineBottom,
            { backgroundColor: colors.border }
          ]} />
        )}
      </View>

      {/* Stop Info */}
      <View style={[styles.stopInfo, isPast && !isCurrent && styles.stopInfoPast]}>
        <View style={styles.stopNameRow}>
          <Text 
            style={[
              styles.stopName, 
              isCurrent && styles.stopNameCurrent,
              isPast && !isCurrent && styles.stopNamePast,
              { color: isPast && !isCurrent ? colors.textMuted : colors.text }
            ]} 
            numberOfLines={1}
          >
            {name}
          </Text>
          {platform && (
            <Text style={[styles.stopPlatform, { color: colors.textMuted }]}>
              Plat. {platform}
            </Text>
          )}
        </View>
        <View style={styles.stopTimeRow}>
          <Text style={[
            styles.stopTime, 
            { color: isPast && !isCurrent ? colors.textMuted : colors.textSecondary }
          ]}>
            {formattedTime}
          </Text>
          {relativeTime && !isPast && (
            <Text style={[styles.stopRelative, { color: isCurrent ? colors.tint : colors.textMuted }]}>
              {relativeTime}
            </Text>
          )}
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.currentBadgeText}>Now boarding</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 18,
    fontWeight: '600',
  },
  destination: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  platformText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 1,
  },
  timelineDotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
  timelineLineTop: {
    marginBottom: -2,
  },
  timelineLineBottom: {
    marginTop: -2,
  },
  stopInfo: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stopInfoPast: {
    opacity: 0.7,
  },
  stopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  stopNameCurrent: {
    fontWeight: '600',
  },
  stopNamePast: {
    fontWeight: '400',
  },
  stopPlatform: {
    fontSize: 12,
    fontWeight: '500',
  },
  stopTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stopTime: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  stopRelative: {
    fontSize: 13,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  noStopsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 8,
  },
  noStopsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
