/**
 * Departure Board Component
 * List of departures for a stop
 */

import { View, Text, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DepartureRow } from './departure-row';
import { SkeletonDeparture } from '@/components/ui/skeleton';
import { EmptyView } from '@/components/ui/empty-view';
import type { Departure, Stop } from '@/lib/api/types';

interface DepartureBoardProps {
  stop: Stop;
  departures: Departure[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onDeparturePress?: (departure: Departure) => void;
}

export function DepartureBoard({
  stop,
  departures,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onDeparturePress,
}: DepartureBoardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (isLoading && departures.length === 0) {
    return (
      <View style={styles.container}>
        <StopHeader stop={stop} />
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonDeparture key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (departures.length === 0) {
    return (
      <View style={styles.container}>
        <StopHeader stop={stop} />
        <EmptyView
          icon="clock"
          title="No departures"
          message="No scheduled departures from this stop right now"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={departures}
        renderItem={({ item }: { item: Departure }) => (
          <DepartureRow 
            departure={item} 
            onPress={onDeparturePress ? () => onDeparturePress(item) : undefined}
          />
        )}
        keyExtractor={(item: Departure) => item.id}
        ListHeaderComponent={<StopHeader stop={stop} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          ) : undefined
        }
      />
    </View>
  );
}

function StopHeader({ stop }: { stop: Stop }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Text style={[styles.stopName, { color: colors.text }]} numberOfLines={2}>
        {stop.disassembledName || stop.name}
      </Text>
      {stop.parent && (
        <Text style={[styles.parentName, { color: colors.textSecondary }]}>
          {stop.parent.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopName: {
    fontSize: 20,
    fontWeight: '700',
  },
  parentName: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
});
