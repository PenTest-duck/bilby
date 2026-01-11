/**
 * Plan Tab - Trip Planning
 */

import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StopSearchModal } from '@/components/stop-search';
import { JourneyCard } from '@/components/trip';
import { useTripPlan } from '@/lib/api/trips';
import { usePreferencesStore } from '@/stores/preferences-store';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorView } from '@/components/ui/error-view';
import type { Stop, RankedJourney, RankingStrategy } from '@/lib/api/types';

type SearchTarget = 'from' | 'to' | null;

const STRATEGIES: { value: RankingStrategy; label: string; icon: string }[] = [
  { value: 'best', label: 'Best', icon: 'star.fill' },
  { value: 'fastest', label: 'Fastest', icon: 'hare.fill' },
  { value: 'least_walking', label: 'Less Walking', icon: 'figure.walk' },
  { value: 'fewest_transfers', label: 'Direct', icon: 'arrow.right' },
];

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { defaultStrategy } = usePreferencesStore();

  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const [strategy, setStrategy] = useState<RankingStrategy>(defaultStrategy);
  const [searchTarget, setSearchTarget] = useState<SearchTarget>(null);

  const canSearch = fromStop && toStop;
  
  const { data, isLoading, isError, refetch, isRefetching } = useTripPlan(
    canSearch ? { from: fromStop.id, to: toStop.id, strategy } : null
  );

  const handleStopSelect = useCallback((stop: Stop) => {
    if (searchTarget === 'from') {
      setFromStop(stop);
    } else if (searchTarget === 'to') {
      setToStop(stop);
    }
    setSearchTarget(null);
  }, [searchTarget]);

  const handleSwap = useCallback(() => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  }, [fromStop, toStop]);

  const handleJourneyPress = useCallback((journey: RankedJourney) => {
    // TODO: Navigate to trip detail screen
    console.log('Journey selected:', journey);
  }, []);

  const results = data ? [data.best, ...data.alternatives] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          canSearch ? (
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.tint}
            />
          ) : undefined
        }
      >
        {/* Search Inputs */}
        <View style={styles.inputsContainer}>
          <StopInput
            label="From"
            stop={fromStop}
            placeholder="Where are you?"
            onPress={() => setSearchTarget('from')}
          />
          
          <Pressable 
            style={[styles.swapButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleSwap}
          >
            <IconSymbol name="arrow.up.arrow.down" size={18} color={colors.tint} />
          </Pressable>
          
          <StopInput
            label="To"
            stop={toStop}
            placeholder="Where to?"
            onPress={() => setSearchTarget('to')}
          />
        </View>

        {/* Strategy Picker */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strategyContainer}
        >
          {STRATEGIES.map((s) => (
            <Pressable
              key={s.value}
              style={[
                styles.strategyChip,
                { 
                  backgroundColor: strategy === s.value ? colors.tint : colors.backgroundSecondary,
                  borderColor: strategy === s.value ? colors.tint : colors.border,
                },
              ]}
              onPress={() => setStrategy(s.value)}
            >
              <IconSymbol 
                name={s.icon as any} 
                size={14} 
                color={strategy === s.value ? '#FFFFFF' : colors.textSecondary} 
              />
              <Text style={[
                styles.strategyLabel,
                { color: strategy === s.value ? '#FFFFFF' : colors.text }
              ]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results */}
        {!canSearch ? (
          <View style={styles.emptyState}>
            <IconSymbol name="map.fill" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Plan your trip
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Enter your origin and destination to find the best route
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loading}>
            <JourneySkeleton />
            <JourneySkeleton />
          </View>
        ) : isError ? (
          <ErrorView
            title="Couldn't plan trip"
            message="Please check your connection and try again"
            onRetry={refetch}
          />
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="exclamationmark.triangle" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No routes found
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Try different stops or adjust your preferences
            </Text>
          </View>
        ) : (
          <View style={styles.results}>
            {results.map((journey, index) => (
              <JourneyCard
                key={journey.id || index}
                journey={journey}
                onPress={() => handleJourneyPress(journey)}
                isBest={index === 0}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <StopSearchModal
          onSelect={handleStopSelect}
          onClose={() => setSearchTarget(null)}
          placeholder={searchTarget === 'from' ? 'Where are you?' : 'Where to?'}
        />
      </Modal>
    </View>
  );
}

function StopInput({ 
  label, 
  stop, 
  placeholder, 
  onPress 
}: { 
  label: string; 
  stop: Stop | null; 
  placeholder: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable 
      style={[styles.stopInput, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text 
        style={[
          styles.inputValue, 
          { color: stop ? colors.text : colors.textMuted }
        ]}
        numberOfLines={1}
      >
        {stop?.disassembledName || stop?.name || placeholder}
      </Text>
    </Pressable>
  );
}

function JourneySkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Skeleton width={70} height={28} />
        <View style={{ flex: 1 }} />
        <Skeleton width={70} height={28} />
      </View>
      <View style={[styles.skeletonRow, { marginTop: 16 }]}>
        <Skeleton width={40} height={24} borderRadius={6} />
        <Skeleton width={40} height={24} borderRadius={6} />
        <Skeleton width={40} height={24} borderRadius={6} />
      </View>
      <Skeleton width="60%" height={16} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  inputsContainer: {
    padding: 16,
    gap: 8,
  },
  stopInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  swapButton: {
    position: 'absolute',
    right: 24,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  strategyContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  strategyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  strategyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  loading: {
    paddingVertical: 8,
  },
  skeletonCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  results: {
    paddingVertical: 8,
  },
});
