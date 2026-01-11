/**
 * Button Component
 */

import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const isDisabled = disabled || loading;
  
  const containerStyles: ViewStyle[] = [
    styles.container,
    styles[`container_${size}` as keyof typeof styles] as ViewStyle,
    {
      backgroundColor: variant === 'primary' 
        ? colors.tint 
        : variant === 'secondary' 
          ? colors.backgroundSecondary 
          : 'transparent',
      opacity: isDisabled ? 0.5 : 1,
    },
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];
  
  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${size}`],
    {
      color: variant === 'primary' 
        ? '#FFFFFF' 
        : colors.text,
    },
  ];
  
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...containerStyles,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#FFFFFF' : colors.tint} 
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  container_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  container_md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  container_lg: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
});
