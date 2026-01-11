/**
 * Line Badge
 * Shows transport line number with mode-appropriate color
 */

import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TransportColors } from '@/constants/theme';

interface LineBadgeProps {
  line: string;
  modeId?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZES = {
  sm: { minWidth: 32, height: 20, fontSize: 11, paddingH: 6, borderRadius: 4 },
  md: { minWidth: 44, height: 26, fontSize: 14, paddingH: 8, borderRadius: 6 },
  lg: { minWidth: 56, height: 32, fontSize: 17, paddingH: 10, borderRadius: 8 },
};

function getModeColor(modeId: number): string {
  switch (modeId) {
    case 1: return TransportColors.train;
    case 2: return TransportColors.metro;
    case 4: return TransportColors.lightRail;
    case 5: return TransportColors.bus;
    case 7: return TransportColors.coach;
    case 9: return TransportColors.ferry;
    default: return TransportColors.bus;
  }
}

export function LineBadge({ 
  line, 
  modeId = 5, 
  color,
  size = 'md',
  style,
}: LineBadgeProps) {
  const sizeConfig = SIZES[size];
  const bgColor = color || getModeColor(modeId);

  return (
    <View 
      style={[
        styles.container,
        {
          minWidth: sizeConfig.minWidth,
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingH,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Text 
        style={[styles.text, { fontSize: sizeConfig.fontSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
