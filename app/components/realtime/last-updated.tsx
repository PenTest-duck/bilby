/**
 * Last Updated Component
 * Shows data freshness with visual indicator
 */

import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDataFreshness } from '@/lib/api/departures';

interface LastUpdatedProps {
  dataUpdatedAt: number | undefined;
  showIcon?: boolean;
}

export function LastUpdated({ dataUpdatedAt, showIcon = false }: LastUpdatedProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { label, isFresh, isStale } = useDataFreshness(dataUpdatedAt);

  const textColor = isStale 
    ? colors.delayed 
    : isFresh 
      ? colors.textMuted 
      : colors.textSecondary;

  return (
    <View style={styles.container}>
      {showIcon && (
        <View 
          style={[
            styles.dot,
            { backgroundColor: isStale ? colors.delayed : isFresh ? colors.success : colors.textMuted }
          ]} 
        />
      )}
      <Text style={[styles.text, { color: textColor }]}>
        Updated {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
  },
});
