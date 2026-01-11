/**
 * Skeleton Loading Component
 */

import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ 
  width = '100%', 
  height = 16, 
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const opacity = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.backgroundTertiary,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for a list item */
export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Skeleton width={60} height={60} borderRadius={8} />
        <View style={styles.listItemText}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for departure row */
export function SkeletonDeparture() {
  return (
    <View style={styles.departure}>
      <View style={styles.departureLeft}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.departureText}>
          <Skeleton width={100} height={16} />
          <Skeleton width={150} height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width={50} height={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  departure: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  departureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  departureText: {
    marginLeft: 12,
    flex: 1,
  },
});
