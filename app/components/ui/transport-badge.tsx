/**
 * Transport Badge Component
 * Shows transport mode indicator with line number
 */

import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { getModeById, getModeColor } from '@/constants/transport';

interface TransportBadgeProps {
  modeId: number;
  lineNumber?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function TransportBadge({
  modeId,
  lineNumber,
  size = 'md',
  style,
}: TransportBadgeProps) {
  const color = getModeColor(modeId);
  const mode = getModeById(modeId);
  const displayText = lineNumber || mode?.label?.charAt(0) || '?';
  
  return (
    <View 
      style={[
        styles.container,
        styles[`container_${size}`],
        { backgroundColor: color },
        style,
      ]}
    >
      <Text 
        style={[
          styles.text,
          styles[`text_${size}`],
        ]}
        numberOfLines={1}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  container_sm: {
    minWidth: 28,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  container_md: {
    minWidth: 40,
    height: 28,
    paddingHorizontal: 6,
  },
  container_lg: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 18,
  },
});
