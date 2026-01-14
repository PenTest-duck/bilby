/**
 * Stop Search Modal
 * Full-screen modal for searching stops
 */

import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SearchInput } from './search-input';
import { StopRow } from './stop-row';
import { useStopSearch } from '@/lib/api/stops';
import { Skeleton } from '@/components/ui/skeleton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Stop } from '@/lib/api/types';

interface StopSearchModalProps {
  onSelect: (stop: Stop) => void;
  onClose: () => void;
  placeholder?: string;
  recentStops?: Stop[];
  /** Show "My Location" option (typically for origin selection) */
  showMyLocation?: boolean;
}

// Extended stop type for "My Location" with coordinates
interface LocationStop extends Stop {
  isCurrentLocation?: boolean;
  coordinates?: string;
}

export function StopSearchModal({
  onSelect,
  onClose,
  placeholder,
  recentStops = [],
  showMyLocation = false,
}: StopSearchModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data, isLoading } = useStopSearch(query);
  const stops = data?.stops || [];

  const handleSelect = useCallback((stop: Stop) => {
    Keyboard.dismiss();
    onSelect(stop);
  }, [onSelect]);

  const handleMyLocationSelect = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'Please enable location access in your device settings to use this feature.'
        );
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      
      const myLocation: LocationStop = {
        id: 'my-location',
        name: 'My Location',
        disassembledName: 'Current Location',
        type: 'poi',
        isCurrentLocation: true,
        coordinates: `${latitude},${longitude}`,
        coord: [latitude, longitude],
      };
      
      Keyboard.dismiss();
      onSelect(myLocation);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  }, [onSelect]);

  const showRecent = query.length < 2 && recentStops.length > 0;
  const showResults = query.length >= 2;
  const showEmpty = showResults && !isLoading && stops.length === 0;
  // Show My Location option when no query and showMyLocation is enabled
  const showMyLocationOption = showMyLocation && query.length === 0;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            autoFocus
          />
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.tint }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={showResults ? stops : showRecent ? recentStops : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StopRow 
            stop={item} 
            onPress={handleSelect}
            isRecent={showRecent}
          />
        )}
        ListHeaderComponent={
          <>
            {/* My Location Option - shows when no query and enabled */}
            {showMyLocationOption && (
              <Pressable
                style={({ pressed }) => [
                  styles.myLocationRow,
                  { backgroundColor: pressed ? colors.backgroundSecondary : 'transparent' },
                ]}
                onPress={handleMyLocationSelect}
                disabled={isGettingLocation}
              >
                <View style={[styles.myLocationIcon, { backgroundColor: colors.tint }]}>
                  <IconSymbol name="location.fill" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.myLocationContent}>
                  <Text style={[styles.myLocationTitle, { color: colors.text }]}>
                    My Location
                  </Text>
                  <Text style={[styles.myLocationSubtitle, { color: colors.textSecondary }]}>
                    {isGettingLocation ? 'Getting location...' : 'Use current location'}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
              </Pressable>
            )}
            {/* Recent section header */}
            {showRecent && (
              <View style={styles.sectionHeader}>
                <IconSymbol name="clock" size={16} color={colors.textMuted} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Recent
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loading}>
              <LoadingSkeleton />
            </View>
          ) : showEmpty ? (
            <View style={styles.empty}>
              <IconSymbol name="magnifyingglass" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No stops found
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Try a different search term
              </Text>
            </View>
          ) : !showRecent && !showMyLocationOption ? (
            <View style={styles.empty}>
              <IconSymbol name="tram.fill" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Search for a stop
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Enter at least 2 characters to search
              </Text>
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
      />
    </KeyboardAvoidingView>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={40} height={40} borderRadius={8} />
          <View style={styles.skeletonContent}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
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
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  loading: {
    padding: 16,
  },
  skeletonContainer: {
    gap: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  myLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  myLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myLocationContent: {
    flex: 1,
  },
  myLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  myLocationSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
