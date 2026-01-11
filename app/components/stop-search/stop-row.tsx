/**
 * Stop Row Component
 * Single stop result in search list
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModeIcon } from '@/components/transport/mode-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Stop } from '@/lib/api/types';

interface StopRowProps {
  stop: Stop;
  onPress: (stop: Stop) => void;
  showModes?: boolean;
  isRecent?: boolean;
}

export function StopRow({ 
  stop, 
  onPress, 
  showModes = true,
  isRecent = false,
}: StopRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const displayName = stop.disassembledName || stop.name;
  const parentName = stop.parent?.name;
  const modes = stop.modes || [];

  return (
    <Pressable
      onPress={() => onPress(stop)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.backgroundSecondary : 'transparent' },
      ]}
    >
      <View style={styles.iconContainer}>
        {isRecent ? (
          <View style={[styles.recentIcon, { backgroundColor: colors.backgroundTertiary }]}>
            <IconSymbol name="clock" size={20} color={colors.textMuted} />
          </View>
        ) : showModes && modes.length > 0 ? (
          <ModeIcon mode={modes[0]} size="md" />
        ) : (
          <View style={[styles.defaultIcon, { backgroundColor: colors.backgroundTertiary }]}>
            <IconSymbol name="mappin" size={20} color={colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text 
          style={[styles.name, { color: colors.text }]} 
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {parentName && (
          <Text 
            style={[styles.parent, { color: colors.textSecondary }]} 
            numberOfLines={1}
          >
            {parentName}
          </Text>
        )}
      </View>

      {showModes && modes.length > 1 && (
        <View style={styles.modesContainer}>
          {modes.slice(1, 4).map((mode, index) => (
            <ModeIcon key={index} mode={mode} size="sm" />
          ))}
        </View>
      )}

      <IconSymbol 
        name="chevron.right" 
        size={16} 
        color={colors.textMuted} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  parent: {
    fontSize: 13,
  },
  modesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
});
