/**
 * Leg Detail Component
 * Detailed view of a single journey leg
 */

import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModeIcon } from '@/components/transport/mode-icon';
import { LineBadge } from '@/components/transport/line-badge';
import { formatTime, formatDuration } from '@/lib/date';
import { formatDistance, formatWalkingTime } from '@/lib/format';
import type { Leg } from '@/lib/api/types';

interface LegDetailProps {
  leg: Leg;
  isFirst?: boolean;
  isLast?: boolean;
}

export function LegDetail({ leg, isFirst = false, isLast = false }: LegDetailProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Use origin/destination time fields from backend schema
  const departureTime = formatTime(leg.origin?.departureTimePlanned ?? '');
  const arrivalTime = formatTime(leg.destination?.arrivalTimePlanned ?? '');
  
  // Check for realtime delay (may be in properties or computed)
  const hasDelay = false; // TODO: Extract from leg properties if available
  const isCancelled = false; // TODO: Extract from leg properties if available
  
  // Check if walking leg (no transportation or mode 99/100)
  const isWalking = !leg.transportation || 
    leg.transportation.product?.class === 99 || 
    leg.transportation.product?.class === 100;

  if (isWalking) {
    return (
      <View style={styles.container}>
        <View style={styles.timeline}>
          <View style={[styles.timelineDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.content}>
          <View style={styles.walkingRow}>
            <ModeIcon mode="walking" size="sm" />
            <Text style={[styles.walkingText, { color: colors.textSecondary }]}>
              Walk {leg.distance ? formatWalkingTime(leg.distance) : formatDuration(Math.round((leg.duration ?? 0) / 60))}
              {leg.distance && ` (${formatDistance(leg.distance)})`}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const modeId = leg.transportation?.product?.class || 5;
  const lineNumber = leg.transportation?.number || leg.transportation?.disassembledName || '';
  const destination = leg.transportation?.destination?.name || 'Unknown';
  const stopCount = leg.stopSequence?.length || 0;

  return (
    <View style={styles.container}>
      {/* Timeline */}
      <View style={styles.timeline}>
        {!isFirst && <View style={[styles.timelineLineTop, { backgroundColor: colors.border }]} />}
        <View style={[styles.timelineDotLarge, { backgroundColor: colors.tint }]} />
        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        {isLast && <View style={[styles.timelineDotLarge, styles.timelineDotBottom, { backgroundColor: colors.tint }]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Origin */}
        <View style={styles.stationRow}>
          <Text style={[styles.time, { color: colors.text }]}>{departureTime}</Text>
          <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
            {leg.origin.disassembledName || leg.origin.name}
          </Text>
        </View>

        {/* Transport Info */}
        <View style={[styles.transportCard, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.transportHeader}>
            <LineBadge line={lineNumber} modeId={modeId} size="md" />
            <View style={styles.transportInfo}>
              <Text style={[styles.destination, { color: colors.text }]} numberOfLines={1}>
                towards {destination}
              </Text>
              <Text style={[styles.stopsInfo, { color: colors.textSecondary }]}>
                {stopCount > 0 ? `${stopCount} stops · ` : ''}{formatDuration(Math.round((leg.duration ?? 0) / 60))}
              </Text>
            </View>
          </View>
          
          {/* Delay indicator removed - realtimeDelayMinutes not in Leg schema */}
          
          {isCancelled && (
            <View style={[styles.delayIndicator, { backgroundColor: colors.cancelled }]}>
              <Text style={styles.delayText}>Cancelled</Text>
            </View>
          )}
        </View>

        {/* Destination */}
        <View style={styles.stationRow}>
          <Text style={[
            styles.time, 
            { color: hasDelay ? colors.delayed : isCancelled ? colors.cancelled : colors.text }
          ]}>
            {arrivalTime}
          </Text>
          <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
            {leg.destination.disassembledName || leg.destination.name}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineDotBottom: {
    position: 'absolute',
    bottom: 0,
  },
  timelineLine: {
    flex: 1,
    width: 2,
  },
  timelineLineTop: {
    width: 2,
    height: 20,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  walkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  walkingText: {
    fontSize: 14,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 50,
  },
  stationName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  transportCard: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginLeft: 62,
  },
  transportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transportInfo: {
    flex: 1,
  },
  destination: {
    fontSize: 14,
    fontWeight: '500',
  },
  stopsInfo: {
    fontSize: 13,
    marginTop: 2,
  },
  delayIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 8,
  },
  delayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
