/**
 * Fare Display Component
 * Shows Opal fare with card type indicator
 */

import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferencesStore } from '@/stores/preferences-store';
import type { FareInfo, OpalCardType } from '@/lib/api/types';

interface FareDisplayProps {
  fare: FareInfo;
  size?: 'sm' | 'md' | 'lg';
  showPeakIndicator?: boolean;
}

const CARD_COLORS: Record<OpalCardType, string> = {
  adult: '#1A1A1A',
  child: '#00A3E0',
  concession: '#FFB81C',
  senior: '#00A3E0',
  student: '#00A3E0',
};

export function FareDisplay({ 
  fare, 
  size = 'md',
  showPeakIndicator = true,
}: FareDisplayProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { opalCardType } = usePreferencesStore();
  
  const amount = fare[opalCardType];
  const formattedAmount = formatCurrency(amount);
  const cardColor = CARD_COLORS[opalCardType];

  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const indicatorSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

  return (
    <View style={styles.container}>
      <View style={styles.fareRow}>
        <View 
          style={[
            styles.cardIndicator, 
            { 
              width: indicatorSize, 
              height: indicatorSize, 
              borderRadius: indicatorSize / 2,
              backgroundColor: cardColor,
            }
          ]} 
        />
        <Text style={[styles.amount, { color: colors.text, fontSize }]}>
          {formattedAmount}
        </Text>
      </View>
      {showPeakIndicator && fare.isPeak && (
        <Text style={[styles.peakLabel, { color: colors.textMuted }]}>
          Peak
        </Text>
      )}
    </View>
  );
}

interface FareRangeProps {
  fare: FareInfo;
}

export function FareRange({ fare }: FareRangeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const minFare = Math.min(fare.adult, fare.child, fare.concession, fare.senior, fare.student);
  const maxFare = Math.max(fare.adult, fare.child, fare.concession, fare.senior, fare.student);

  if (minFare === maxFare) {
    return (
      <Text style={[styles.rangeText, { color: colors.textSecondary }]}>
        {formatCurrency(minFare)}
      </Text>
    );
  }

  return (
    <Text style={[styles.rangeText, { color: colors.textSecondary }]}>
      {formatCurrency(minFare)} - {formatCurrency(maxFare)}
    </Text>
  );
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardIndicator: {
    // Dynamic styles applied inline
  },
  amount: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  peakLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
