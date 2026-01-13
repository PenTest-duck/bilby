/**
 * Departures Tab - Live Departures
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StopSearchModal, StopRow } from '@/components/stop-search';
import { DepartureRow, RouteDetailModal } from '@/components/departure';
import { useDepartures } from '@/lib/api/departures';
import { useRecentStops, useAddRecentStop } from '@/lib/api/user';
import { SkeletonDeparture } from '@/components/ui/skeleton';
import { ErrorView } from '@/components/ui/error-view';
import type { Stop, Departure } from '@/lib/api/types';

export default function DeparturesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);

  // Fetch real recent stops from API
  const { data: recentStopsData } = useRecentStops();
  const addRecentStop = useAddRecentStop();
  
  // Convert recent stops to Stop format for display
  const recentStops = useMemo<Stop[]>(() => {
    if (!recentStopsData?.stops) return [];
    return recentStopsData.stops.slice(0, 5).map(stop => ({
      id: stop.stop_id,
      name: stop.stop_name,
      type: 'stop' as const,
      modes: [1], // Default, could be enhanced with stop details
    }));
  }, [recentStopsData]);

  const { data, isLoading, isError, refetch, isRefetching } = useDepartures(
    selectedStop?.id ?? null,
    { enabled: !!selectedStop }
  );

  const departures = data?.departures ?? [];

  const handleStopSelect = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    setShowSearch(false);
    // Track this stop in recents
    addRecentStop.mutate({ stop_id: stop.id, stop_name: stop.name });
  }, [addRecentStop]);
  
  const handleDeparturePress = useCallback((departure: Departure) => {
    setSelectedDeparture(departure);
  }, []);

  const renderDeparture = useCallback(({ item }: { item: Departure }) => (
    <DepartureRow 
      departure={item} 
      onPress={() => handleDeparturePress(item)}
    />
  ), [handleDeparturePress]);

  const handleClearStop = useCallback(() => {
    setSelectedStop(null);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <Pressable 
        style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        onPress={() => setShowSearch(true)}
      >
        <IconSymbol name="magnifyingglass" size={20} color={colors.textMuted} />
        <Text 
          style={[
            styles.searchText, 
            { color: selectedStop ? colors.text : colors.textMuted }
          ]}
          numberOfLines={1}
        >
          {selectedStop?.disassembledName || selectedStop?.name || 'Search for a stop...'}
        </Text>
        {selectedStop && (
          <Pressable onPress={handleClearStop} hitSlop={8}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </Pressable>

      {/* Content */}
      {!selectedStop ? (
        <View style={styles.noStopContainer}>
          {/* Recent Stops */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock" size={16} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Recent Stops
              </Text>
            </View>
            {recentStops.map((stop) => (
              <StopRow
                key={stop.id}
                stop={stop}
                onPress={handleStopSelect}
                isRecent
              />
            ))}
          </View>

          {/* Empty state hint */}
          <View style={styles.emptyHint}>
            <IconSymbol name="clock.fill" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Live departures
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Select a stop to see upcoming departures with real-time updates
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <StopHeader stop={selectedStop} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonDeparture key={i} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <StopHeader stop={selectedStop} />
          <ErrorView
            title="Couldn't load departures"
            message="Please check your connection and try again"
            onRetry={refetch}
          />
        </View>
      ) : departures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <StopHeader stop={selectedStop} />
          <View style={styles.emptyContent}>
            <IconSymbol name="clock" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No departures
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              No scheduled departures from this stop right now
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={departures}
          keyExtractor={(item, index) => `${item.departureTimePlanned}-${item.transportation?.id ?? index}`}
          renderItem={renderDeparture}
          ListHeaderComponent={<StopHeader stop={selectedStop} />}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.tint}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <StopSearchModal
          onSelect={handleStopSelect}
          onClose={() => setShowSearch(false)}
          placeholder="Search for a stop..."
          recentStops={recentStops}
        />
      </Modal>
      
      {/* Route Detail Modal */}
      <Modal
        visible={selectedDeparture !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedDeparture && (
          <RouteDetailModal
            departure={selectedDeparture}
            onClose={() => setSelectedDeparture(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function StopHeader({ stop }: { stop: Stop }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.stopHeader, { borderBottomColor: colors.border }]}>
      <Text style={[styles.stopName, { color: colors.text }]} numberOfLines={2}>
        {stop.disassembledName || stop.name}
      </Text>
      {stop.parent && (
        <Text style={[styles.parentName, { color: colors.textSecondary }]}>
          {stop.parent.name}
        </Text>
      )}
      <View style={styles.liveIndicator}>
        <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
  },
  noStopContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stopHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopName: {
    fontSize: 22,
    fontWeight: '700',
  },
  parentName: {
    fontSize: 14,
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
  listContent: {
    paddingBottom: 24,
  },
});
