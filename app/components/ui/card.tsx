/**
 * Card Component
 */

import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ 
  children, 
  onPress, 
  style,
  padding = 'md',
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const cardStyles: ViewStyle[] = [
    styles.container,
    styles[`padding_${padding}` as keyof typeof styles] as ViewStyle,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];
  
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyles,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  
  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 8,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 24,
  },
  pressed: {
    opacity: 0.9,
  },
});
