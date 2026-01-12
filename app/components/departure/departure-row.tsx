/**
 * Departure Row Component
 * Single departure with countdown
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LineBadge } from '@/components/transport/line-badge';
import { formatTime, formatCountdown } from '@/lib/date';
import type { Departure } from '@/lib/api/types';

interface DepartureRowProps {
  departure: Departure;
  onPress?: () => void;
}

export function DepartureRow({ departure, onPress }: DepartureRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const modeId = departure.transportation.product?.class || 5;
  const lineNumber = departure.transportation.number || 
                     departure.transportation.disassembledName || '';
  const destination = departure.transportation.destination?.name || 'Unknown';
  const platform = departure.platform;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _plannedTime = formatTime(departure.plannedTime);
  
  const countdown = departure.estimatedTime 
    ? formatCountdown(departure.estimatedTime)
    : formatCountdown(departure.plannedTime);
  
  const hasDelay = (departure.delayMinutes ?? 0) > 0;
  const isCancelled = departure.isCancelled;
  const isNow = countdown === 'Now';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && onPress && { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      {/* Mode & Line */}
      <View style={styles.lineContainer}>
        <LineBadge line={lineNumber} modeId={modeId} size="md" />
      </View>

      {/* Destination & Info */}
      <View style={styles.content}>
        <Text 
          style={[
            styles.destination, 
            { color: isCancelled ? colors.cancelled : colors.text }
          ]} 
          numberOfLines={1}
        >
          {destination}
        </Text>
        <View style={styles.infoRow}>
          {platform && (
            <View style={[styles.platformBadge, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.platformText, { color: colors.textSecondary }]}>
                {platform}
              </Text>
            </View>
          )}
          {hasDelay && !isCancelled && (
            <Text style={[styles.delayText, { color: colors.delayed }]}>
              +{departure.delayMinutes}m
            </Text>
          )}
          {isCancelled && (
            <Text style={[styles.cancelledText, { color: colors.cancelled }]}>
              Cancelled
            </Text>
          )}
        </View>
      </View>

      {/* Countdown */}
      <View style={styles.timeContainer}>
        {isCancelled ? (
          <Text style={[styles.countdownCancelled, { color: colors.cancelled }]}>—</Text>
        ) : (
          <>
            <Text 
              style={[
                styles.countdown,
                isNow && styles.countdownNow,
                { color: isNow ? colors.success : hasDelay ? colors.delayed : colors.text }
              ]}
            >
              {countdown}
            </Text>
            {!isNow && (
              <Text style={[styles.countdownUnit, { color: colors.textSecondary }]}>
                min
              </Text>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  lineContainer: {
    width: 50,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  destination: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  delayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  countdown: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  countdownNow: {
    fontSize: 18,
  },
  countdownCancelled: {
    fontSize: 24,
    fontWeight: '700',
  },
  countdownUnit: {
    fontSize: 12,
    marginTop: -2,
  },
});
