/**
 * Trip Detail Screen
 * Shows journey details with list/map toggle
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LegDetail } from '@/components/trip/leg-detail';
import { TripMapView } from '@/components/maps';
import { formatTime, formatDuration } from '@/lib/date';
import type { RankedJourney } from '@/lib/api/types';

type ViewMode = 'list' | 'map';

// Mock journey data for demo (in production, fetch from params or API)
const MOCK_JOURNEY: RankedJourney = {
  interchanges: 1,
  legs: [
    {
      duration: 180,
      origin: {
        id: '10101100',
        name: 'Central Station',
        type: 'stop',
        coord: [-33.8833, 151.2060],
        departureTimePlanned: new Date(Date.now() + 5 * 60000).toISOString(),
      },
      destination: {
        id: '10102000',
        name: 'Town Hall Station',
        type: 'stop',
        coord: [-33.8736, 151.2069],
        arrivalTimePlanned: new Date(Date.now() + 8 * 60000).toISOString(),
      },
      transportation: {
        id: 'T1',
        name: 'T1 North Shore Line',
        number: 'T1',
        product: { class: 1, name: 'Train', iconId: 1 },
        destination: { id: 'ns', name: 'North Sydney', type: 'stop' },
      },
      coords: [
        [-33.8833, 151.2060],
        [-33.8780, 151.2065],
        [-33.8736, 151.2069],
      ],
      stopSequence: [
        { id: '10101100', name: 'Central', type: 'stop', coord: [-33.8833, 151.2060] },
        { id: '10102000', name: 'Town Hall', type: 'stop', coord: [-33.8736, 151.2069] },
      ],
    },
    {
      duration: 120,
      origin: {
        id: '10102000',
        name: 'Town Hall Station',
        type: 'stop',
        coord: [-33.8736, 151.2069],
        departureTimePlanned: new Date(Date.now() + 10 * 60000).toISOString(),
      },
      destination: {
        id: '10102100',
        name: 'Wynyard Station',
        type: 'stop',
        coord: [-33.8664, 151.2063],
        arrivalTimePlanned: new Date(Date.now() + 12 * 60000).toISOString(),
      },
      transportation: {
        id: 'T1',
        name: 'T1 North Shore Line',
        number: 'T1',
        product: { class: 1, name: 'Train', iconId: 1 },
        destination: { id: 'ns', name: 'North Sydney', type: 'stop' },
      },
      coords: [
        [-33.8736, 151.2069],
        [-33.8700, 151.2065],
        [-33.8664, 151.2063],
      ],
    },
  ],
  ranking: {
    total: 0.85,
    factors: {
      arrivalTime: { value: 12, weight: 0.3, score: 0.9 },
      duration: { value: 12, weight: 0.25, score: 0.85 },
      walking: { value: 200, weight: 0.2, score: 0.8 },
      transfers: { value: 1, weight: 0.15, score: 0.7 },
      reliability: { value: 0.95, weight: 0.1, score: 0.95 },
    },
    why: 'Fastest option with minimal walking',
  },
};

export default function TripDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const params = useLocalSearchParams<{ id: string }>();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLegIndex, setSelectedLegIndex] = useState<number | undefined>(undefined);

  // In production, fetch journey by ID
  const journey = MOCK_JOURNEY;

  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const departureTime = formatTime(firstLeg.origin?.departureTimePlanned ?? '');
  const arrivalTime = formatTime(lastLeg.destination?.arrivalTimePlanned ?? '');
  const totalDuration = journey.legs.reduce((sum, leg) => sum + (leg.duration || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Trip Details',
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
            </View>
          </Card>

          {/* Legs Detail */}
          <View style={styles.legsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Journey Details
            </Text>
            {journey.legs.map((leg, index) => (
              <LegDetail 
                key={index} 
                leg={leg} 
                isFirst={index === 0}
                isLast={index === journey.legs.length - 1}
              />
            ))}
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
});
