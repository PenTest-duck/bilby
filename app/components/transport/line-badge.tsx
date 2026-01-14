/**
 * Line Badge
 * Shows transport line number with mode-appropriate color
 */

import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { 
  TransportColors, 
  TrainLineColors, 
  IntercityLineColors, 
  FerryLineColors, 
  LightRailLineColors 
} from '@/constants/theme';

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

/** Get abbreviated line code from full line name */
export function getLineAbbreviation(lineName: string, modeId: number): string {
  const name = lineName.trim();
  
  // Already abbreviated (e.g., "T1", "F1", "M1", "L1", "300")
  if (/^[TFML]\d+$/.test(name) || /^\d+[a-zA-Z]?$/.test(name) || /^NLR$/.test(name)) {
    return name;
  }
  
  // Metro lines
  if (modeId === 2) {
    if (name.includes('Metro')) return 'M1';
    return name.substring(0, 3).toUpperCase();
  }
  
  // Train lines - extract T number
  if (modeId === 1) {
    const tMatch = name.match(/T(\d)/i);
    if (tMatch) return `T${tMatch[1]}`;
    
    // Intercity lines
    if (name.includes('Blue Mountains')) return 'BMT';
    if (name.includes('Central Coast') || name.includes('Newcastle')) return 'CCN';
    if (name.includes('Hunter')) return 'HUN';
    if (name.includes('South Coast')) return 'SCO';
    if (name.includes('Southern Highlands')) return 'SHL';
    
    // Fallback: first 3 chars
    return name.substring(0, 3).toUpperCase();
  }
  
  // Ferry lines - extract F number
  if (modeId === 9) {
    const fMatch = name.match(/F(\d+)/i);
    if (fMatch) return `F${fMatch[1]}`;
    if (name.includes('Manly')) return 'F1';
    if (name.includes('Taronga')) return 'F2';
    if (name.includes('Parramatta')) return 'F3';
    if (name.includes('Pyrmont')) return 'F4';
    if (name.includes('Neutral')) return 'F5';
    if (name.includes('Mosman')) return 'F6';
    if (name.includes('Double Bay')) return 'F7';
    if (name.includes('Cockatoo')) return 'F8';
    if (name.includes('Watsons')) return 'F9';
    if (name.includes('Blackwattle')) return 'F10';
    return name.substring(0, 3).toUpperCase();
  }
  
  // Light Rail - extract L number
  if (modeId === 4) {
    const lMatch = name.match(/L(\d)/i);
    if (lMatch) return `L${lMatch[1]}`;
    if (name.includes('Dulwich')) return 'L1';
    if (name.includes('Randwick')) return 'L2';
    if (name.includes('Kingsford')) return 'L3';
    if (name.includes('Newcastle')) return 'NLR';
    return name.substring(0, 3).toUpperCase();
  }
  
  // Bus - return number or first few chars
  if (modeId === 5 || modeId === 7) {
    const busNum = name.match(/^(\d+[a-zA-Z]?)/); 
    if (busNum) return busNum[1];
    return name.substring(0, 4);
  }
  
  return name.substring(0, 4);
}

/** Get color for a specific line */
export function getLineColor(lineCode: string, modeId: number): string {
  const code = lineCode.toUpperCase();
  
  // Check per-line colors first
  if (modeId === 1 && TrainLineColors[code]) return TrainLineColors[code];
  if (modeId === 1 && IntercityLineColors[code]) return IntercityLineColors[code];
  if (modeId === 9 && FerryLineColors[code]) return FerryLineColors[code];
  if (modeId === 4 && LightRailLineColors[code]) return LightRailLineColors[code];
  
  // Fallback to mode colors
  return getModeColor(modeId);
}

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
