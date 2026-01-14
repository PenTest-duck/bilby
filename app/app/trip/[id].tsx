/**
 * Trip Detail Screen
 * Shows journey details with list/map toggle
 * 
 * Receives journey data via route params (serialized as JSON)
 * or fetches fresh data if only origin/destination IDs are provided
 */

import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LegDetail } from '@/components/trip/leg-detail';
import { TripMapView } from '@/components/maps';
import { TripAlerts, AlertDetailModal } from '@/components/alerts';
import { formatTime, formatDuration } from '@/lib/date';
import { useTripPlan } from '@/lib/api/trips';
import type { RankedJourney, DisruptionAlert } from '@/lib/api/types';

type ViewMode = 'list' | 'map';

/** Route params for trip detail screen */
interface TripParams {
  /** Serialized journey data (if coming from trip planner) */
  journey?: string;
  /** Origin stop ID (for refetching) */
  from?: string;
  /** Destination stop ID (for refetching) */
  to?: string;
  /** Journey index in results (if refetching) */
  index?: string;
}

export default function TripDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as unknown as TripParams;
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLegIndex, setSelectedLegIndex] = useState<number | undefined>(undefined);
  const [selectedAlert, setSelectedAlert] = useState<DisruptionAlert | null>(null);

  // Parse journey from params if provided (from trip planner navigation)
  const parsedJourney = useMemo<RankedJourney | null>(() => {
    if (params.journey) {
      try {
        return JSON.parse(params.journey) as RankedJourney;
      } catch {
        console.error('[TripDetail] Failed to parse journey from params');
        return null;
      }
    }
    return null;
  }, [params.journey]);

  // Fetch fresh journey data if we have origin/destination but no parsed journey
  const { data: tripData } = useTripPlan(
    !parsedJourney && params.from && params.to
      ? { from: params.from, to: params.to }
      : null,
    { enabled: !parsedJourney && !!params.from && !!params.to }
  );

  // Get the journey to display (from params or fetched)
  const journey = useMemo<RankedJourney | null>(() => {
    if (parsedJourney) return parsedJourney;
    
    if (tripData) {
      const index = params.index ? parseInt(params.index, 10) : 0;
      if (index === 0 && tripData.best) return tripData.best;
      if (tripData.alternatives?.[index - 1]) return tripData.alternatives[index - 1];
      return tripData.best;
    }
    
    return null;
  }, [parsedJourney, tripData, params.index]);

  // Handle loading/empty state
  if (!journey) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Trip Details' }} />
        <View style={styles.emptyContainer}>
          <IconSymbol name="clock" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading journey details...
          </Text>
        </View>
      </View>
    );
  }

  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const departureTime = formatTime(firstLeg.origin?.departureTimePlanned ?? '');
  const arrivalTime = formatTime(lastLeg.destination?.arrivalTimePlanned ?? '');
  const totalDuration = journey.legs.reduce((sum: number, leg) => sum + (leg.duration || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Trip Details',
          headerBackTitle: 'Back',
          headerRight: () => (
            <ViewToggle 
              mode={viewMode} 
              onToggle={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} 
            />
          ),
        }}
      />

      {viewMode === 'map' ? (
        <TripMapView
          journey={journey}
          selectedLegIndex={selectedLegIndex}
          onLegSelect={setSelectedLegIndex}
        />
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        >
          {/* Summary Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.timeBlock}>
                <Text style={[styles.time, { color: colors.text }]}>{departureTime}</Text>
                <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                  {firstLeg.origin.name}
                </Text>
              </View>
              
              <View style={styles.durationBlock}>
                <View style={[styles.durationLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.duration, { color: colors.textSecondary }]}>
                  {formatDuration(Math.round(totalDuration / 60))}
                </Text>
                <View style={[styles.durationLine, { backgroundColor: colors.border }]} />
              </View>

              <View style={[styles.timeBlock, styles.timeBlockRight]}>
                <Text style={[styles.time, { color: colors.text }]}>{arrivalTime}</Text>
                <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                  {lastLeg.destination.name}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryMeta}>
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {(journey.interchanges ?? 0) === 0 
                  ? 'Direct' 
                  : `${journey.interchanges} change${(journey.interchanges ?? 0) > 1 ? 's' : ''}`}
              </Text>
              {journey.ranking?.why && (
                <Text style={[styles.metaText, { color: colors.tint }]}>
                  {journey.ranking.why}
                </Text>
              )}
              {/* Fare display - prefer enrichedFare from GraphQL */}
              {journey.enrichedFare?.total && (
                <Text style={[styles.fareText, { color: colors.text }]}>
                  ${journey.enrichedFare.total.toFixed(2)} Opal
                </Text>
              )}
            </View>
          </Card>

          {/* Trip Alerts */}
          {journey.alerts && journey.alerts.length > 0 && (
            <TripAlerts
              journey={journey}
              onAlertPress={setSelectedAlert}
            />
          )}

          {/* Legs Detail */}
          <View style={styles.legsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Journey Details
            </Text>
            {journey.legs.map((leg, index) => {
              // Find occupancy for this leg
              const legOccupancy = journey.occupancy?.find(o => o.legIndex === index);
              // Find travel-in-cars info for this leg
              const legTravelInCars = journey.travelInCars?.find(t => t.legIndex === index);
              
              return (
                <LegDetail 
                  key={index} 
                  leg={leg} 
                  isFirst={index === 0}
                  isLast={index === journey.legs.length - 1}
                  occupancy={legOccupancy?.status}
                  travelInCars={legTravelInCars ? {
                    from: legTravelInCars.from,
                    to: legTravelInCars.to,
                    message: legTravelInCars.message,
                  } : undefined}
                />
              );
            })}
          </View>

          {/* Map Preview Button */}
          <Pressable
            style={[styles.mapPreviewButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setViewMode('map')}
          >
            <IconSymbol name="map.fill" size={20} color={colors.tint} />
            <Text style={[styles.mapPreviewText, { color: colors.tint }]}>
              View on Map
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.tint} />
          </Pressable>
        </ScrollView>
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

function ViewToggle({ mode, onToggle }: { mode: ViewMode; onToggle: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable 
      onPress={onToggle}
      style={[styles.viewToggle, { backgroundColor: colors.backgroundSecondary }]}
    >
      <IconSymbol 
        name={mode === 'list' ? 'map.fill' : 'list.bullet'} 
        size={18} 
        color={colors.tint} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeBlock: {
    alignItems: 'flex-start',
    maxWidth: 100,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  durationBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  durationLine: {
    flex: 1,
    height: 1,
  },
  duration: {
    fontSize: 13,
    paddingHorizontal: 8,
  },
  summaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E4E8',
  },
  metaText: {
    fontSize: 13,
  },
  fareText: {
    fontSize: 16,
    fontWeight: '600',
  },
  legsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  mapPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  mapPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
