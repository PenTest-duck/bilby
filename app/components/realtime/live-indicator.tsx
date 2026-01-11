/**
 * Live Indicator Component
 * Pulsing dot with "Live" label for real-time data
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LiveIndicatorProps {
  isLive?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function LiveIndicator({ 
  isLive = true, 
  showLabel = true,
  size = 'md',
}: LiveIndicatorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [isLive, pulseAnim]);

  const dotSize = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? 11 : 13;

  if (!isLive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: colors.success,
            opacity: pulseAnim,
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, { color: colors.success, fontSize }]}>
          Live
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    // Dynamic styles applied inline
  },
  label: {
    fontWeight: '600',
  },
});
