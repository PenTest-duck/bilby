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
} from 'react-native';
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
}

export function StopSearchModal({
  onSelect,
  onClose,
  placeholder,
  recentStops = [],
}: StopSearchModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { data, isLoading, isError } = useStopSearch(query);
  const stops = data?.stops || [];

  const handleSelect = useCallback((stop: Stop) => {
    Keyboard.dismiss();
    onSelect(stop);
  }, [onSelect]);

  const showRecent = query.length < 2 && recentStops.length > 0;
  const showResults = query.length >= 2;
  const showEmpty = showResults && !isLoading && stops.length === 0;

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
          showRecent ? (
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock" size={16} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Recent
              </Text>
            </View>
          ) : null
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
          ) : !showRecent ? (
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
  },
  cancelButton: {
    paddingVertical: 8,
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
});
