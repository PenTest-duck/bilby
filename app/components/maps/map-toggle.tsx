/**
 * Map Toggle Component
 * Toggle button for switching between list and map views
 */

import { StyleSheet, Pressable, View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ViewMode = 'list' | 'map';

interface MapToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
  style?: object;
}

export function MapToggle({ mode, onToggle, style }: MapToggleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }, style]}>
      <Pressable
        style={[
          styles.option,
          mode === 'list' && { backgroundColor: colors.card },
        ]}
        onPress={() => onToggle('list')}
      >
        <IconSymbol 
          name="list.bullet" 
          size={18} 
          color={mode === 'list' ? colors.tint : colors.textMuted} 
        />
        <Text style={[
          styles.label, 
          { color: mode === 'list' ? colors.tint : colors.textMuted }
        ]}>
          List
        </Text>
      </Pressable>
      
      <Pressable
        style={[
          styles.option,
          mode === 'map' && { backgroundColor: colors.card },
        ]}
        onPress={() => onToggle('map')}
      >
        <IconSymbol 
          name="map.fill" 
          size={18} 
          color={mode === 'map' ? colors.tint : colors.textMuted} 
        />
        <Text style={[
          styles.label, 
          { color: mode === 'map' ? colors.tint : colors.textMuted }
        ]}>
          Map
        </Text>
      </Pressable>
    </View>
  );
}

interface MapToggleButtonProps {
  mode: ViewMode;
  onToggle: () => void;
}

export function MapToggleButton({ mode, onToggle }: MapToggleButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable 
      onPress={onToggle}
      style={[styles.toggleButton, { backgroundColor: colors.backgroundSecondary }]}
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
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
