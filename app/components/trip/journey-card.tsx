/**
 * Journey Card
 * Shows a trip option with legs summary
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCountdown } from '@/hooks/use-countdown';
import { ModeIcon } from '@/components/transport/mode-icon';
import { LineBadge } from '@/components/transport/line-badge';
import { formatTime, formatDuration } from '@/lib/date';
import { usePreferencesStore } from '@/stores/preferences-store';
import type { RankedJourney, Leg, OpalCardType } from '@/lib/api/types';

/** Map opal card type to TfNSW fare person type */
const CARD_TYPE_TO_PERSON: Record<OpalCardType, string> = {
  adult: 'ADULT',
  child: 'CHILD',
  concession: 'CONCESSION',
  senior: 'PENSIONER',
  student: 'STUDENT',
};

/** Extract fare for a specific card type from journey fare data */
function extractFareForCardType(journey: RankedJourney, cardType: OpalCardType): number | null {
  // Priority 1: Use enriched fare from GraphQL (most reliable)
  // Use typeof check instead of falsy check to handle $0.00 fares
  if (journey.enrichedFare && typeof journey.enrichedFare.total === 'number') {
    // enrichedFare.total is already the adult fare
    // For other card types, apply approximate discount (GraphQL may have per-type data)
    const baseFare = journey.enrichedFare.total;
    switch (cardType) {
      case 'child':
        return baseFare * 0.5; // Child is 50% off
      case 'concession':
      case 'senior':
      case 'student':
        return baseFare * 0.5; // Concession fares are approx 50% off
      default:
        return baseFare;
    }
  }
  
  // Priority 2: Fall back to REST API fare tickets
  const fare = journey.fare;
  if (!fare?.tickets?.length) return null;
  
  const personType = CARD_TYPE_TO_PERSON[cardType];
  
  // Find the total journey fare ticket for the specified card type
  const totalTicket = fare.tickets.find(
    t => t.person === personType && t.properties?.evaluationTicket
  );
  
  // Use typeof check instead of falsy check to handle $0.00 fares
  if (totalTicket?.properties && typeof totalTicket.properties.priceTotalFare === 'number') {
    return totalTicket.properties.priceTotalFare as number;
  }
  
  // Fallback: find any ticket for this person type
  const anyTicket = fare.tickets.find(t => t.person === personType);
  if (anyTicket && typeof anyTicket.priceBrutto === 'number') {
    return anyTicket.priceBrutto;
  }
  
  return null;
}

interface JourneyCardProps {
  journey: RankedJourney;
  onPress: () => void;
  isBest?: boolean;
}

export function JourneyCard({ journey, onPress, isBest = false }: JourneyCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { opalCardType } = usePreferencesStore();

  // Compute times from legs (backend doesn't include top-level computed fields)
  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const departurePlanned = firstLeg?.origin?.departureTimePlanned ?? '';
  const departureEstimated = firstLeg?.origin?.departureTimeEstimated;
  const departureTime = formatTime(departurePlanned);
  const arrivalTime = formatTime(lastLeg?.destination?.arrivalTimePlanned ?? '');
  
  // Real-time countdown to departure (use estimated if available, otherwise planned)
  const countdown = useCountdown(departureEstimated || departurePlanned);
  
  // Compute total duration from legs (duration is in seconds, convert to minutes)
  const totalDurationSecs = journey.legs.reduce((sum, leg) => sum + (leg.duration ?? 0), 0);
  const duration = formatDuration(Math.round(totalDurationSecs / 60));
  const hasDelay = (journey.realtimeDelayMinutes ?? 0) > 0;
  const hasCancellation = journey.hasCancellations;
  
  // Extract fare from journey if available
  const fare = extractFareForCardType(journey, opalCardType);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: colors.card,
          borderColor: isBest ? colors.tint : colors.border,
          borderWidth: isBest ? 2 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Best Badge */}
      {isBest && (
        <View style={[styles.bestBadge, { backgroundColor: colors.tint }]}>
          <Text style={styles.bestText}>Best</Text>
        </View>
      )}

      {/* Countdown Badge - updates in real-time, positioned below best badge if present */}
      <View style={[
        styles.countdownBadge, 
        isBest && styles.countdownBadgeWithBest,
        { 
          backgroundColor: countdown.isNow 
            ? colors.success 
            : countdown.isPast 
              ? colors.textMuted 
              : colors.backgroundSecondary 
        }
      ]}>
        <Text style={[
          styles.countdownText, 
          { color: countdown.isNow || countdown.isPast ? '#FFFFFF' : colors.text }
        ]}>
          {countdown.display}
        </Text>
      </View>

      {/* Times Row */}
      <View style={styles.timesRow}>
        <View style={styles.timeBlock}>
          <Text style={[styles.time, { color: colors.text }]}>{departureTime}</Text>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Depart</Text>
        </View>
        
        <View style={styles.durationBlock}>
          <View style={[styles.durationLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.duration, { color: colors.textSecondary }]}>{duration}</Text>
          <View style={[styles.durationLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={[styles.timeBlock, styles.timeBlockRight]}>
          <Text style={[
            styles.time, 
            { color: hasDelay ? colors.delayed : hasCancellation ? colors.cancelled : colors.text }
          ]}>
            {arrivalTime}
          </Text>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Arrive</Text>
        </View>
      </View>

      {/* Delay indicator */}
      {hasDelay && (
        <View style={[styles.delayBadge, { backgroundColor: colors.delayed }]}>
          <Text style={styles.delayText}>+{journey.realtimeDelayMinutes} min</Text>
        </View>
      )}

      {/* Legs Summary */}
      <View style={styles.legsRow}>
        {journey.legs.map((leg, index) => (
          <LegIndicator key={index} leg={leg} isLast={index === journey.legs.length - 1} />
        ))}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {(journey.interchanges ?? 0) === 0 
              ? 'Direct' 
              : `${journey.interchanges} change${(journey.interchanges ?? 0) > 1 ? 's' : ''}`}
          </Text>
          {journey.ranking?.why && (
            <Text 
              style={[styles.whyText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {journey.ranking.why}
            </Text>
          )}
        </View>
        {fare !== null && (
          <View style={styles.fareContainer}>
            <Text style={[styles.fareAmount, { color: colors.text }]}>
              ${fare.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function LegIndicator({ leg, isLast }: { leg: Leg; isLast: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Check if walking leg (no transportation or mode 99/100)
  const isWalking = !leg.transportation || 
    leg.transportation.product?.class === 99 || 
    leg.transportation.product?.class === 100;
  
  if (isWalking) {
    return (
      <View style={styles.legItem}>
        <ModeIcon mode="walking" size="sm" />
        {!isLast && <View style={[styles.legConnector, { backgroundColor: colors.border }]} />}
      </View>
    );
  }

  const modeId = leg.transportation?.product?.class || 5;
  const lineNumber = leg.transportation?.number || leg.transportation?.disassembledName || '';

  return (
    <View style={styles.legItem}>
      <LineBadge line={lineNumber} modeId={modeId} size="sm" />
      {!isLast && <View style={[styles.legConnector, { backgroundColor: colors.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  bestBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bestText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  countdownBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownBadgeWithBest: {
    top: 28,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeBlock: {
    alignItems: 'flex-start',
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  durationBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  durationLine: {
    flex: 1,
    height: 1,
  },
  duration: {
    fontSize: 13,
    paddingHorizontal: 8,
  },
  delayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  delayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  legsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 4,
  },
  legItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legConnector: {
    width: 12,
    height: 2,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  footerLeft: {
    flex: 1,
    marginRight: 12,
  },
  footerText: {
    fontSize: 13,
  },
  whyText: {
    fontSize: 12,
    marginTop: 2,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
