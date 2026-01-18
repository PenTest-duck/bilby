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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StopSearchModal } from '@/components/stop-search';
import { JourneyCard } from '@/components/trip';
import { useTripPlan } from '@/lib/api/trips';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorView } from '@/components/ui/error-view';
import type { Stop, RankedJourney, RankingStrategy } from '@/lib/api/types';

// Extended stop type for "My Location" with coordinates
interface LocationStop extends Stop {
  isCurrentLocation?: boolean;
  coordinates?: string; // "lat,lng" format for API
}

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
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _insets = useSafeAreaInsets();
  const { defaultStrategy, accessibilityRequired } = usePreferencesStore();
  const { isAuthenticated } = useAuthStore();
  
  const [fromStop, setFromStop] = useState<LocationStop | null>(null);
  const [toStop, setToStop] = useState<LocationStop | null>(null);
  const [strategy, setStrategy] = useState<RankingStrategy>(defaultStrategy);
  const [searchTarget, setSearchTarget] = useState<SearchTarget>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const canSearch = fromStop && toStop;
  
  // Use coordinates if available, otherwise use stop ID
  const fromValue = fromStop?.coordinates || fromStop?.id || '';
  const toValue = toStop?.coordinates || toStop?.id || '';
  
  const { data, isLoading, isError, refetch, isRefetching } = useTripPlan(
    canSearch ? { from: fromValue, to: toValue, strategy, accessible: accessibilityRequired } : null
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

  const handleJourneyPress = useCallback((journey: RankedJourney, index: number) => {
    // Navigate to trip detail screen with journey data
    router.push({
      pathname: '/trip/[id]',
      params: {
        id: String(index),
        journey: JSON.stringify(journey),
      },
    });
  }, [router]);
  
  const handleSaveTrip = useCallback(async () => {
    if (!fromStop || !toStop || !isAuthenticated) return;
    
    setIsSavingTrip(true);
    try {
      const tripName = `${fromStop.disassembledName || fromStop.name} → ${toStop.disassembledName || toStop.name}`;
      await api.post('/api/user/trips', {
        name: tripName,
        origin_id: fromStop.id,
        origin_name: fromStop.name,
        destination_id: toStop.id,
        destination_name: toStop.name,
        preferred_strategy: strategy,
      });
      Alert.alert('Trip Saved', 'Your trip has been saved for quick access.');
    } catch (error) {
      console.error('Save trip error:', error);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    } finally {
      setIsSavingTrip(false);
    }
  }, [fromStop, toStop, isAuthenticated, strategy]);

  const handleUseMyLocation = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      // Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'Please enable location access in your device settings to use this feature.'
        );
        return;
      }
      
      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      
      // Try reverse geocoding to get street address
      let displayName = 'My Location';
      let disassembledName = 'Current Location';
      
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
          // Build a readable street address
          const parts: string[] = [];
          if (address.streetNumber) parts.push(address.streetNumber);
          if (address.street) parts.push(address.street);
          
          if (parts.length > 0) {
            displayName = parts.join(' ');
            disassembledName = address.city || address.subregion || displayName;
          } else if (address.name) {
            displayName = address.name;
            disassembledName = address.city || address.subregion || 'Current Location';
          }
        }
      } catch (geocodeError) {
        // Fallback to coordinates if reverse geocoding fails
        console.warn('Reverse geocoding failed:', geocodeError);
        displayName = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
      
      const myLocation: LocationStop = {
        id: `coord:${latitude},${longitude}`,
        name: displayName,
        disassembledName: disassembledName,
        type: 'singlehouse',
        isCurrentLocation: true,
        coordinates: `${latitude},${longitude}`,
        coord: [latitude, longitude],
      };
      
      setFromStop(myLocation);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

  // Filter out null best journey and combine with alternatives
  const results = data 
    ? [data.best, ...data.alternatives].filter((j): j is RankedJourney => j !== null)
    : [];

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
            onUseMyLocation={handleUseMyLocation}
            isGettingLocation={isGettingLocation}
            showMyLocation
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
          
          {/* Save Trip Button - only show when authenticated and both stops selected */}
          {isAuthenticated && canSearch && (
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleSaveTrip}
              disabled={isSavingTrip}
            >
              <IconSymbol 
                name={isSavingTrip ? "hourglass" : "bookmark"} 
                size={16} 
                color={colors.tint} 
              />
              <Text style={[styles.saveButtonText, { color: colors.tint }]}>
                {isSavingTrip ? 'Saving...' : 'Save Trip'}
              </Text>
            </Pressable>
          )}
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
                key={`journey-${index}`}
                journey={journey}
                onPress={() => handleJourneyPress(journey, index)}
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
          showMyLocation={searchTarget === 'from'}
        />
      </Modal>
    </View>
  );
}

function StopInput({ 
  label, 
  stop, 
  placeholder, 
  onPress,
  onUseMyLocation,
  isGettingLocation,
  showMyLocation,
}: { 
  label: string; 
  stop: Stop | null; 
  placeholder: string;
  onPress: () => void;
  onUseMyLocation?: () => void;
  isGettingLocation?: boolean;
  showMyLocation?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isCurrentLocation = (stop as LocationStop)?.isCurrentLocation;

  return (
    <View style={styles.stopInputContainer}>
      <Pressable 
        style={[styles.stopInput, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
      >
        <View style={styles.stopInputHeader}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
          {showMyLocation && onUseMyLocation && (
            <Pressable 
              onPress={onUseMyLocation} 
              disabled={isGettingLocation}
              style={styles.myLocationButton}
            >
              <IconSymbol 
                name="location.fill" 
                size={14} 
                color={isGettingLocation ? colors.textMuted : colors.tint} 
              />
              <Text style={[styles.myLocationText, { color: isGettingLocation ? colors.textMuted : colors.tint }]}>
                {isGettingLocation ? 'Getting...' : 'My Location'}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.stopInputValue}>
          {isCurrentLocation && (
            <IconSymbol name="location.fill" size={16} color={colors.tint} />
          )}
          <Text 
            style={[
              styles.inputValue, 
              { color: stop ? colors.text : colors.textMuted }
            ]}
            numberOfLines={1}
          >
            {stop?.disassembledName || stop?.name || placeholder}
          </Text>
        </View>
      </Pressable>
    </View>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  stopInputContainer: {
    // Container for stop input
  },
  stopInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopInputValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  myLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  myLocationText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
